/**
 * V19 W4 — `VideoPlayer` (chrome composition orchestrator).
 *
 * W4 fills in the W0 stub: the video chrome compositor that owns
 * the chrome subtree (ChromeAutoHideController, VerticalSwipeGestures,
 * NextUpOverlay, Title/Loading/Error overlays, TransportBar) so it
 * survives screen navigation. Per audit §5, this is the load-bearing
 * architectural fold: the chrome is hoisted out of NowPlayingScreen
 * and rendered here, at the App.tsx shell level.
 *
 * What ships in W4:
 *   - Presentation-aware rendering (per `usePresentation`):
 *       - `expanded`   → render the chrome compositor, as a
 *                        TRANSPARENT full-bleed overlay above the
 *                        native `MpvRenderView` (W6.0: it used to be
 *                        opaque, which covered the video)
 *       - `pip`        → render nothing; the native PiP window owns
 *                        the surface (`commands.enterPip()` /
 *                        `exitPip()`)
 *       - `mini`       → render nothing. W6.0: there is no video
 *                        mini dock, and there cannot be one while
 *                        playback lives in its own activity.
 *   - `forwardRef` + `useImperativeHandle` exposes the canonical
 *     `VideoPlayerRef` shape (SPEC §5.3) — consumers can write
 *     `videoPlayerRef.current?.play()` etc. (W0 had an empty
 *     imperative surface; W4 keeps the shape stable but only
 *     implements the chrome-side hooks the chrome actually
 *     needs today; the rest stay as `throw new Error('W22+')`
 *     stubs so consumers get an explicit "not implemented" if
 *     they reach for them ahead of the binding).
 *
 * What W4 explicitly does NOT change (carried forward):
 *   - The V16 VideoPlayer (lib) still wraps AppContent in App.tsx.
 *     V19 VideoPlayer sits as a SIBLING of AppContent inside V16.
 *     Per audit §5: V19 chrome compositor shouldn't depend on V16's
 *     PlayerActivity lifecycle (the chrome's auto-hide timer +
 *     NextUpOverlay + VerticalSwipeGestures want to keep ticking
 *     even when the user navigates NowPlayingScreen → a music
 *     detail → NowPlayingScreen).
 *   - NowPlayingScreen becomes a thin route (sets presentation on
 *     mount; the chrome overlay renders from the shell).
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_V19_SPECIFICATION.md` §3 + §5 +
 *   `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §4.D + §5.
 */

import * as React from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import type {ViewStyle} from 'react-native';
import {SimbaStatusBar} from '../../../../components/StatusBar';
import {presetToMpv, useQualityStore} from '../../../../state/useQualityStore';
import {useSkipSilenceStore} from '../../../../state/useSkipSilenceStore';
import {useNowPlayingStore} from '../../../../state/nowPlayingStore';
import {dockStyleFor} from '../../../../infrastructure/player/dockPlacement';
import {useClosePlayback} from '../../../../infrastructure/player/useClosePlayback';
import {VideoSurface} from '../VideoSurface/VideoSurface';
import {PlayerScrim} from '../PlayerScrim/PlayerScrim';
import {VideoTitleOverlay} from '../VideoTitleOverlay/VideoTitleOverlay';
import {VideoLoadingOverlay} from '../VideoLoadingOverlay/VideoLoadingOverlay';
import {VideoErrorOverlay} from '../VideoErrorOverlay/VideoErrorOverlay';
import {TransportBar} from '../TransportBar/TransportBar';
import {ChromeAutoHideController} from '../ChromeAutoHide/ChromeAutoHideController';
import {VerticalSwipeGestures} from '../Gestures/VerticalSwipeGestures';
import {NextUpOverlay} from '../NextUp/NextUpOverlay';
import {VideoDock} from '../VideoDock/VideoDock';
import {
  ChromeAutoHideProvider,
  useChromeAutoHide,
  usePipBridge,
  useCaptionStyleBridge,
  usePresentation,
  useTransport,
} from '../../../../infrastructure/player';
// Imported from its MODULE, not from the facade barrel, and deliberately.
//
// The barrel is mocked wholesale by 23 suites (the facade exists to be the
// one place that imports the player MODULE; this hook imports no player
// module at all — it reads two of the app's own stores). Routing it through
// the barrel would mean every one of those mocks had to learn about it, and
// a mock that forgets is a crash in a suite that has nothing to do with the
// window. `useClosePlayback` is imported the same way, for the same reason.
import {useVideoOwnsWindow} from '../../../../infrastructure/player/useVideoOwnsWindow';
import {forwardRef, useImperativeHandle} from 'react';
import type {VideoPlayerProps, VideoPlayerRef} from './types';

export type {VideoPlayerProps, VideoPlayerRef, VideoSource} from './types';

/**
 * VideoPlayer — the video chrome composition orchestrator. Always-mounted
 * at App.tsx (W4 contract). Owns the chrome subtree; no consumer
 * composes chrome (audit §5 Rule 6).
 *
 * **W5/W6 cleanup — the imperative ref is now fully real.**
 *
 * Every method used to be `notImplemented('…')`, i.e. a ref whose
 * entire surface throws. That is the worst shape a public component
 * API can have: the methods are typed, documented, and discoverable,
 * and every one of them fails at runtime. They are now routed
 * through the real facade:
 *
 *   - transport / output  → `useTransport().commands.*`
 *   - PiP                 → `commands.enterPip` / `exitPip`, plus
 *                            `usePresentation().setPipActive` so the
 *                            native window and the JS chrome move
 *                            together
 *   - close               → `commands.close()` (lib stop + clear)
 *   - read-only getters   → the real `state.currentUri` / `state.title`
 *
 * The three `open*` launch methods are the only ones still not
 * implemented here: they are a lib-bridge concern owned by
 * `useOpenWithResume` (the 1-wrapper facade rule), and the chrome
 * compositor is not the right owner for launching. They are the
 * documented remaining gap.
 */
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  // The function is named (rather than anonymous) so React DevTools
  // shows `VideoPlayer` for the component. The inner name shadows
  // the outer const, which is intentional — that's why the warning
  // is suppressed for this file.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function VideoPlayer(_props: VideoPlayerProps, ref) {
    const {state, commands} = useTransport();
    const {setPipActive} = usePresentation();
    const setQualityPreset = useQualityStore(s => s.setPreset);

    useImperativeHandle(
      ref,
      () => {
        // The lib commands are synchronous; the public ref type is
        // Promise-returning (it mirrors the lib's async launch API).
        // Wrap so the public contract is honoured without inventing
        // an async boundary that does not exist.
        //
        // W9.3: EVERY void-returning member routes through `run`.
        // They did not before — nine of them were plain arrows — and
        // the mismatch stayed invisible because the whole object was
        // closed with `as unknown as VideoPlayerRef`. That double cast
        // disabled the one check that would have caught it. It is now
        // `satisfies VideoPlayerRef`, so a future member that forgets
        // `run` fails `tsc` instead of silently returning `undefined`
        // to a caller that awaited it.
        const run = (fn: () => void) => async () => {
          fn();
        };
        return {
          // ── Transport
          play: run(commands.play),
          pause: run(commands.pause),
          togglePlayPause: run(commands.togglePlayPause),
          seek: (positionMs: number) => run(() => commands.seek(positionMs))(),
          seekRelative: (deltaMs: number) =>
            run(() => commands.seekBy(deltaMs))(),
          skip: (direction: 'forward' | 'backward') =>
            run(() =>
              direction === 'forward' ? commands.forward10() : commands.rewind10(),
            )(),

          // ── Output
          setVolume: (volume: number) => run(() => commands.setVolume(volume))(),
          setSpeed: (speed: number) => run(() => commands.setSpeed(speed))(),
          /**
           * Quality is applied through the SAME mpv mapping the
           * More sheet uses (`presetToMpv` → `hwdec` + `profile`),
           * so the imperative path and the UI path can never
           * disagree about what a quality means. Unknown names fall
           * back to the balanced preset rather than silently doing
           * nothing.
           */
          setVideoQuality: (quality: string) =>
            run(() => {
              const preset = (
                ['battery-saver', 'balanced', 'high-quality'] as const
              ).find(p => p === quality) ?? 'balanced';
              const {hwdec, profile} = presetToMpv(preset);
              commands.setProperty('hwdec', hwdec);
              commands.setProperty('profile', profile);
              setQualityPreset(preset);
            })(),
          /**
           * `setLoopMode` takes the lib's vocabulary
           * ('none' | 'file' | 'playlist'); the video chrome speaks
           * 'off' | 'one' | 'all'. `repeatMode` is derived from the
           * lib's `loopMode` (there is no separate store), so
           * routing through `commands.setRepeatMode` updates both
           * the native loop and the value the chrome reads back.
           */
          setLoopMode: (mode: 'none' | 'file' | 'playlist') =>
            run(() => {
              const v19: Record<typeof mode, 'off' | 'one' | 'all'> = {
                none: 'off',
                file: 'one',
                playlist: 'all',
              };
              commands.setRepeatMode(v19[mode]);
            })(),
          setShuffle: (enabled: boolean) =>
            run(() => commands.setShuffle(enabled))(),
          /**
           * The public ref takes a trackId STRING; the lib's
           * `selectCaptionTrack` takes a numeric id (null = off).
           *
           * W9.3: the `Number.isFinite` guard is NEW. The comment here
           * claimed a non-numeric id becomes "no track" rather than
           * being coerced into the lib, but the code did no such thing -
           * `Number('not-a-number')` is `NaN`, and `NaN` was being passed
           * straight into mpv's track selector. Found by
           * `VideoPlayerRef.test.tsx`, which was written from the comment
           * and failed. A comment that describes a guard the code does
           * not have is worse than no comment: it makes the next reader
           * believe they are protected.
           */
          selectCaptionTrack: (trackId: string | null) =>
            run(() => {
              const numeric = trackId === null ? null : Number(trackId);
              commands.selectCaptionTrack(
                numeric === null || !Number.isFinite(numeric) ? null : numeric,
              );
            })(),
          setSkipSilence: async (enabled: boolean) => {
            // The hook's public surface is `{enabled, toggle}`, but
            // the ref must SET an explicit value rather than flip it,
            // so the persisted store's setter is used directly.
            useSkipSilenceStore.getState().setEnabled(enabled);
          },

          // ── close
          //
          // W9.3: the launch trio (`open` / `openWithResume` /
          // `openPlaylist`) and `selectAudioDescriptionTrack` were
          // REMOVED, not kept as throwers. Each one compiled and then
          // threw unconditionally, which is strictly worse than being
          // absent: `tsc` endorsed the call site and the app died when
          // the user pressed play. Launching belongs to the app's
          // launch seam, and the lib exposes no AD-selection command at
          // all. Neither had a single caller. See `types.ts` for the
          // full account; this file set the precedent in W6.0 when
          // `setPresentation` was removed for exactly this reason.
          close: run(commands.close),

          // ── PiP
          //
          // Entering PiP is a TWO-part transition and a consumer has no
          // business knowing that: the native PiP window, AND the JS
          // chrome going away. Doing only the first leaves the full
          // chrome painted over the PiP window; doing only the second
          // leaves the activity black behind a floating window. Both
          // halves are therefore owned here, so `enterPip()` is one
          // honest call.
          //
          // The chrome follows the OS's ANSWER, not an assumption. The
          // native side used to swallow every refusal, so a request that
          // never produced a PiP window looked identical to one that did
          // — and hiding the chrome for a window that does not exist is
          // a one-way door: the only thing that brings the chrome back
          // is the PiP-exit event, and for a request that never happened
          // that event never comes.
          //
          // W6.0: the previous surface also exposed
          // `setPresentation(mode)` taking `'mini' | 'expanded' |
          // 'pip'`. With the mode derived from the host activity, only
          // PiP is something a consumer can select — `'mini'` and
          // `'expanded'` are facts about which activity is running, not
          // choices. A `setPresentation('mini')` that the host then
          // overrides would be a control that lies, so it is removed
          // rather than kept as a no-op.
          enterPip: async () => {
            setPipActive(commands.enterPip());
          },
          exitPip: async () => {
            commands.exitPip();
            setPipActive(false);
          },

          // ── Read-only for the dock
          getCurrentUri: () => state.currentUri,
          getCurrentTitle: () => state.title || null,
          getCurrentArtwork: () => null,
        } satisfies VideoPlayerRef;
      },
      [
        commands,
        setPipActive,
        state.currentUri,
        state.title,
        setQualityPreset,
      ],
    );

    return <VideoPlayerChrome />;
  },
);

/**
 * The actual chrome composition. Separated from the forwardRef so
 * `usePresentation` / `usePlaybackState` hooks can subscribe without
 * being entangled with the imperative ref's empty-stub closure.
 *
 * Named `VideoPlayerChrome`, not `VideoPlayer`: the exported forwardRef
 * is the public surface, and an inner component sharing that name is a
 * merged declaration as far as TypeScript is concerned.
 */
const VideoPlayerChrome: React.FC = () => {
  const videoOwnsWindow = useVideoOwnsWindow();
  const closePlayback = useClosePlayback();

  // W6.1 — the single owner of PiP reconciliation.
  //
  // It lives HERE, and not in the expanded chrome, because this is the only
  // component in the player subtree that is mounted for the whole app
  // session: `AppRoot` renders `<VideoPlayer />` unconditionally, and
  // nothing below this point is conditional on the presentation mode.
  //
  // That matters because of what PiP does to the tree. `pipActive` is an
  // input to the DERIVED presentation mode:
  //
  //     mode = pipActive ? 'pip' : (expanded ? 'expanded' : 'mini')
  //
  // so `pipActive === true` makes the mode `'pip'`, which makes
  // `isExpanded` false, which unmounts the expanded chrome. If the PiP
  // reconciliation lived in the expanded chrome, entering PiP would tear
  // down the listener that reports PiP ending — and the app would latch:
  // the native side would correctly announce `isInPip=false` to nobody,
  // `pipActive` would stay `true`, and the fullscreen player would come
  // back with no transport bar, no top bar and no way out.
  //
  // That is not a hypothetical: it is what the PiP exit did on device. The
  // native log said `onPictureInPictureModeChanged: isInPip=false` and
  // `emit succeeded`, and the user came back to a fullscreen player with
  // no chrome at all.
  //
  // The rule: a listener that reconciles a state must not be mounted inside
  // a subtree that the state unmounts. One owner, one subscriber, and it
  // outlives every mode the state can put the tree into.
  usePipBridge();

  // Hardware back must be the SAME verb as the header's back chevron.
  //
  // V22 W22 (2026-10-21): both are now the CLOSE. The header's back
  // stopped minimising when the minimise verb moved into the transport
  // bar (in both lanes), and back is the platform's "leave this screen"
  // verb — so back closes.
  //
  // The reasoning below records what the two verbs used to be, because the
  // difference is exactly what F5 turned into a single owner.
  //
  // Before F3, back had to reach the same verb as the header button, because
  // RN's default popped `PlayerActivity` directly: the window closed while
  // the process-global engine kept playing, with the notification posted and
  // no window left to stop it. Two behaviours for one user intent.
  //
  // After F3 there is no window to pop — video plays in `MainActivity` — so
  // the OS default now navigates the app's own back stack. That is correct
  // and must be intercepted, or back from a fullscreen video silently lands
  // the user on the previous screen with the video still playing fullscreen
  // underneath.
  //
  // Registered only while the video OWNS the window, so back from the
  // browsing stack — or from the mini dock, where navigation is what the user
  // means — is not swallowed. Returning `true` consumes the event so the OS
  // does not also navigate.
  //
  // The gate is `videoOwnsWindow`, not `isExpanded`. The REQUEST for a
  // fullscreen video outlives the session on purpose: the close verb ends the
  // session without rewriting it. Keying the gate on the request therefore
  // kept swallowing back presses after the player was gone — the user was on
  // the browsing stack and the hardware back did nothing at all.
  // `useVideoOwnsWindow()` asks the question the window actually needs
  // answered: is there a video here to be left?
  React.useEffect(() => {
    if (!videoOwnsWindow) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closePlayback();
      return true;
    });
    return () => sub.remove();
  }, [closePlayback, videoOwnsWindow]);

  // D9 — ONE mounted picture per lane.
  //
  // `ChromeAutoHideProvider` sits ABOVE every chrome consumer, and the
  // compositor is a child of it, because the surface's tap handler has to
  // read the very state the tap is meant to toggle.
  return (
    <ChromeAutoHideProvider>
      <VideoLane />
    </ChromeAutoHideProvider>
  );
};

/**
 * The video lane: ONE `<SimbaVideo>`, mounted for as long as a video is
 * loaded, and MOVED rather than replaced.
 *
 * ## Why this is not a conditional switch
 *
 * Before D9 this component returned `null` unless the video was expanded, so
 * minimising it unmounted the picture and expanding it mounted a second one.
 * Two `SimbaVideo` views would then have existed at different moments,
 * both bound to the same mpv handle — and the lib's
 * `attachSurfaceLocked` rebinds on every `setNativePtr`, so the second mount
 * would steal the surface from the first. Two owners of one picture is the
 * defect D9 exists to remove.
 *
 * The one legal unmount is `nowPlaying == null`: there is no video, so there
 * is no picture to keep.
 *
 * ## How the two presentations are expressed
 *
 * The picture is a child of a wrapper `View`, and the WRAPPER carries the
 * geometry. React Native lays the wrapper out, so the picture is resized and
 * repositioned by an ordinary style change:
 *
 *   - expanded / PiP → the wrapper is full-bleed
 *   - mini           → the wrapper is the dock's measured slot
 *
 * `VideoSurface` itself is unchanged by this: it fills whatever box it is
 * given, and the wrapper is what moves.
 *
 * ## The coordinate translation, and why it is measured rather than assumed
 *
 * The dock publishes its slot in WINDOW pixels (`measureInWindow`), because
 * that is the only space a view that lives in a different subtree can be
 * described in. This lane's wrapper is positioned relative to ITS OWN
 * parent, which is not necessarily the window origin — a status-bar inset or
 * a non-edge-to-edge window would make the two spaces differ.
 *
 * So the lane measures its own window origin once per layout and subtracts.
 * Assuming the root sits at (0, 0) would be a silent assumption, and this
 * codebase has been bitten by exactly that class of assumption before.
 *
 * The window→lane translation is done HERE, in JavaScript, because the native
 * side no longer has a `setVideoBounds` to convert into. That hand-off is
 * gone along with the Kotlin-mounted surface.
 */
const VideoLane: React.FC = () => {
  const {toggle} = useChromeAutoHide();
  const presentation = usePresentation();
  const nowPlaying = useNowPlayingStore(s => s.current);
  const videoMiniRect = presentation.videoMiniRect;
  const videoLaneOrigin = presentation.videoLaneOrigin;
  const {setVideoLaneOrigin} = presentation;

  const laneRef = React.useRef<View>(null);
  const [dockStyle, setDockStyle] = React.useState<ViewStyle | null>(null);

  // This lane's own window origin. Re-measured on layout and published to
  // the store, which is where the dock's slot also lives — the two
  // measurements are the inputs to `dockStyleFor`, and they only make
  // sense next to each other.
  //
  // It is published rather than kept as local state on purpose: the store
  // makes the placement a pure function of two published facts, which is
  // what lets a test drive it. `measureInWindow` is a native call, and
  // React Native Testing Library v14 removed `createNodeMock`, so a test
  // cannot give a host component a `measureInWindow` at all — a local
  // `useState` would be permanently `null` under test and the wiring
  // between the two measurements would go unverified.
  const handleLaneLayout = React.useCallback(() => {
    const lane = laneRef.current;
    if (!lane) return;
    lane.measureInWindow((x, y) => {
      setVideoLaneOrigin({x, y});
    });
  }, [setVideoLaneOrigin]);

  // The dock placement, once the dock has published a slot AND this lane
  // knows where it is.
  //
  // Until both are true the picture stays where it was. That is deliberate:
  // a 0x0 picture is an invalid libmpv render target (the old
  // "refused: extents must be > 0" failure), so a placeholder rectangle is
  // not an option, and parking it off-screen would be a lie about where the
  // video is.
  React.useEffect(() => {
    if (!presentation.isMini) {
      setDockStyle(null);
      return;
    }
    const style = dockStyleFor(videoMiniRect, videoLaneOrigin);
    if (style) setDockStyle(style);
  }, [presentation.isMini, videoMiniRect, videoLaneOrigin]);

  // The one legal unmount: no video, so no picture.
  if (nowPlaying?.streamType !== 'video') return null;

  return (
    <View
      ref={laneRef}
      style={styles.lane}
      pointerEvents="box-none"
      onLayout={handleLaneLayout}>
      {/* The picture. Always mounted; only its geometry changes. */}
      <View style={dockStyle ?? styles.picture} pointerEvents="box-none">
        <VideoSurface
          accessibilityLabel="Video"
          resizeMode={presentation.isMini ? 'cover' : 'contain'}
          onPress={toggle}
        />

        {/* The gesture layer sits ON THE PICTURE, BELOW the overlays.

            It used to live inside `ExpandedChrome`, which is a LATER
            sibling of this box — so it was painted ABOVE the picture
            and above everything in this box. It is a full-screen native
            gesture view (RNGH `GestureDetector`), and a native gesture
            view claims the touches in its bounds. That made it swallow
            every touch aimed at the picture, INCLUDING the error
            card's "Retry" and "Close" buttons.

            Verified on device (2026-10-20): with the card up, "Retry"
            and "Close" produced NO second `loadFile` in the native
            trace, while the transport bar's "Mute" (a LATER sibling of
            the gesture layer, so above it) worked perfectly. A recovery
            UI whose controls cannot be pressed is worse than no card
            at all, because it promises a way out and does not deliver.

            The layering that actually works is the one every shipping
            video player uses:

                picture < gesture layer < transient overlays < chrome

            so the gesture layer belongs to the PICTURE — it is "touch
            on the video" — not to the chrome. Moving it here puts the
            loading and error overlays above it, so their controls are
            live, and leaves the chrome's controls above everything
            else.

            Expanded-only, exactly as it was inside `ExpandedChrome`:
            in the dock the picture is a 44 pt slot and there is no
            chrome to toggle. */}
        {presentation.isExpanded ? <VerticalSwipeGestures /> : null}

        {/* The loading and error overlays live ON THE PICTURE, not in
            the expanded chrome.

            They used to be inside `ExpandedChrome`, which only renders
            when the player is expanded — so a video that was loading,
            stalled, or FAILED while the player sat in the dock showed
            nothing at all. A cold-start video begins minimised
            (`videoPresentation` starts at `'mini'`), which means a
            cold-start LOAD FAILURE was a black square in the dock
            with no error and no way to act. That is the "silent black
            screen" defect, and it was structural, not a missing
            condition.

            Inside the picture's box they cover the picture wherever the
            picture is — fullscreen AND the 44 pt dock slot — and they
            are not subject to the chrome's auto-hide, which is correct:
            a spinner that hides itself while the video is still
            stalled is not a spinner.

            They are siblings of `VideoSurface`, so they paint above it
            and do not affect the picture's mount — D9 holds. */}
        <VideoLoadingOverlay />
        <VideoErrorOverlay />
      </View>

      {/* The chrome. It comes and goes; the picture does not. */}
      {presentation.isExpanded ? <ExpandedChrome /> : null}

      {/* V22 W22 (2026-10-21) — the video lane's OWN mini presentation.
          It used to be the shared `MiniPlayer`, a separate component
          mounted by `PlayerChrome` that took turns with this lane. Now it
          is a part of the lane: always mounted, visible only in the dock,
          and it never renders a picture — the `<SimbaVideo>` above is the
          only one, which is what keeps the mpv surface bound to a single
          view.

          It is the LAST child so it paints above the picture, which is
          what lets the plates carve the hole the video shows through. */}
      <VideoDock />
    </View>
  );
};

/**
 * The expanded chrome compositor. Split out of `VideoPlayer` so
 * it can live INSIDE `ChromeAutoHideProvider` — the surface's tap
 * handler and the two `ChromeAutoHideController`s must all observe the
 * same `Animated.Value`.
 *
 * (Before this split they did not. `VideoPlayer` called
 * `useChromeAutoHide()` for `toggle` while each controller called it
 * again for its own opacity: three independent visibility states, so a
 * tap toggled a value that drove no pixels and the controls only ever
 * moved on their own timers.)
 *
 * It no longer contains the picture. The picture is a sibling, below it,
 * so that the picture can stay mounted while this comes and goes.
 */
const ExpandedChrome: React.FC = () => {
  // W6.1 — the PiP reconciliation used to be mounted HERE, and that was a
  // deadlock. This component is gated on `presentation.isExpanded`, and
  // `pipActive === true` makes the derived mode `'pip'`, which makes
  // `isExpanded` false — so entering PiP UNMOUNTED the very listener whose
  // job was to tell the app that PiP had ended. The native side was
  // provably correct (`onPictureInPictureModeChanged: isInPip=false` →
  // "emit succeeded"), and the event still had no subscriber, so
  // `pipActive` stayed `true` for good: the fullscreen activity came back
  // with no transport bar, no top bar, and no way out.
  //
  // The rule this encodes: a listener that reconciles a state must not live
  // inside a subtree that the state unmounts. `usePipBridge` now lives in
  // `VideoPlayerChrome`, which is mounted for the whole app session.
  //
  // The caption style bridge stays here, and the asymmetry is deliberate: it
  // re-pushes the whole style on mount, so a remount after PiP restores it.
  // The PiP bridge has no such self-healing — the event it waits for is the
  // one thing that can only arrive while it is listening.

  // W6.2 — the single owner of caption rendering style. Mounted here for
  // the same reason as the PiP bridge: the setting has to be pushed to
  // mpv on every media change, and only a component that lives for the
  // whole session is there when the next file loads.
  useCaptionStyleBridge();

  // EXPANDED: the chrome compositor, rendered as a TRANSPARENT
  // full-bleed overlay ABOVE the picture.
  //
  // W6.0 — this root used to carry `backgroundColor:
  // colors.background.primary`, and the surface below it carried
  // `background.surfaceDark`. Both are opaque, so the overlay painted
  // over the video and the user saw a flat panel where the picture
  // should be. Nothing paints here now; the only opaque chrome is the
  // deliberate scrims (gesture feedback, auto-hide fade) and the
  // overlays themselves.
  //
  // `pointerEvents="box-none"` on both this root and the surface
  // container: the chrome is an overlay ABOVE the picture, and a plain
  // full-size View would swallow the picture's tap-to-toggle before it
  // ever reached the surface. `box-none` keeps the container itself out
  // of hit-testing while its children (gestures, overlays, transport)
  // still receive touches — and a tap that nothing above claims falls
  // through to the picture beneath.
  return (
    <View style={styles.chrome} pointerEvents="box-none">
      <SimbaStatusBar variant="player" />

      <View style={styles.surfaceContainer} pointerEvents="box-none">
        {/* The gesture layer is NOT here. It lives in the picture's box,
            one level down and one layer BELOW the loading/error
            overlays — see the note there. Mounted here it was a
            full-screen native gesture view above the picture, and it
            ate the error card's Retry/Close presses. */}

        {/* V19 W7.2 — the ONE backdrop for the whole chrome. Mounted
            here, directly above the video surface and BELOW every
            overlay, so the gradient sits between the picture and the
            controls. Both chrome bands belong to this one surface: it
            is what removes the "black slab at the top, nothing at the
            bottom" split, and what makes white 80% ink legible on a
            bright film frame.

            It is `pointerEvents="none"`, so the surface's tap — the one
            that toggles the chrome — still lands. */}
        <PlayerScrim />

        <ChromeAutoHideController
          edge="top"
          style={StyleSheet.absoluteFill}
        >
          <VideoTitleOverlay />
          <NextUpOverlay />
        </ChromeAutoHideController>
      </View>

      <ChromeAutoHideController edge="bottom">
        <TransportBar />
      </ChromeAutoHideController>
    </View>
  );
};

const styles = StyleSheet.create({
  // The lane: full-bleed and transparent. It is the positioning context for
  // the picture, so the dock's window-pixel rect can be expressed in this
  // tree's coordinates.
  lane: {
    ...StyleSheet.absoluteFill,
  },
  // The picture's default box: the whole lane.
  picture: {
    ...StyleSheet.absoluteFill,
  },
  // The expanded chrome overlay. Above the picture, transparent.
  chrome: {
    ...StyleSheet.absoluteFill,
    paddingTop: 0, // safe-area inset is already in the V16 root
  },
  surfaceContainer: {
    // W6.0: was `margin: spacing.md + borderRadius + overflow:
    // hidden`, i.e. a rounded inset "card". The video is a full-bleed
    // activity surface, not a card in a feed — the margins letterboxed
    // it and the radius implied a container the app does not have.
    flex: 1,
    position: 'relative',
  },
});

export default VideoPlayer;
