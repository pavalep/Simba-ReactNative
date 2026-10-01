/**
 * V19 W4 — `SimbaPlayer` (chrome composition orchestrator).
 *
 * W4 fills in the W0 stub: the V19 chrome compositor that owns
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
 *     `SimbaPlayerRef` shape (SPEC §5.3) — consumers can write
 *     `simbaPlayerRef.current?.play()` etc. (W0 had an empty
 *     imperative surface; W4 keeps the shape stable but only
 *     implements the chrome-side hooks the chrome actually
 *     needs today; the rest stay as `throw new Error('W22+')`
 *     stubs so consumers get an explicit "not implemented" if
 *     they reach for them ahead of the binding).
 *
 * What W4 explicitly does NOT change (carried forward):
 *   - The V16 SimbaPlayer (lib) still wraps AppContent in App.tsx.
 *     V19 SimbaPlayer sits as a SIBLING of AppContent inside V16.
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
import {StyleSheet, View} from 'react-native';
import {SimbaStatusBar} from '../../../../components/StatusBar';
import {presetToMpv, useQualityStore} from '../../../../state/useQualityStore';
import {useSkipSilenceStore} from '../../../../state/useSkipSilenceStore';
import {VideoSurface} from '../VideoSurface/VideoSurface';
import {VideoTitleOverlay} from '../VideoTitleOverlay/VideoTitleOverlay';
import {VideoLoadingOverlay} from '../VideoLoadingOverlay/VideoLoadingOverlay';
import {VideoErrorOverlay} from '../VideoErrorOverlay/VideoErrorOverlay';
import {TransportBar} from '../TransportBar/TransportBar';
import {ChromeAutoHideController} from '../ChromeAutoHide/ChromeAutoHideController';
import {VerticalSwipeGestures} from '../Gestures/VerticalSwipeGestures';
import {NextUpOverlay} from '../NextUp/NextUpOverlay';
import {
  ChromeAutoHideProvider,
  useChromeAutoHide,
  usePipBridge,
  usePresentation,
  useTransport,
} from '../../../../infrastructure/player';
import {forwardRef, useImperativeHandle} from 'react';
import type {SimbaPlayerProps, SimbaPlayerRef} from './types';

export type {SimbaPlayerProps, SimbaPlayerRef, VideoSource} from './types';

/**
 * SimbaPlayer — the V19 chrome composition orchestrator. Always-mounted
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
export const SimbaPlayer = forwardRef<SimbaPlayerRef, SimbaPlayerProps>(
  // The function is named (rather than anonymous) so React DevTools
  // shows `SimbaPlayer` for the component. The inner name shadows
  // the outer const, which is intentional — that's why the warning
  // is suppressed for this file.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function SimbaPlayer(_props: SimbaPlayerProps, ref) {
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
        const run = (fn: () => void) => async () => {
          fn();
        };
        return {
          // ── Transport
          play: run(commands.play),
          pause: run(commands.pause),
          togglePlayPause: run(commands.togglePlayPause),
          seek: (positionMs: number) => commands.seek(positionMs),
          seekRelative: (deltaMs: number) => commands.seekBy(deltaMs),
          skip: (direction: 'forward' | 'backward') =>
            direction === 'forward' ? commands.forward10() : commands.rewind10(),

          // ── Output
          setVolume: (volume: number) => commands.setVolume(volume),
          setSpeed: (speed: number) => commands.setSpeed(speed),
          /**
           * Quality is applied through the SAME mpv mapping the
           * More sheet uses (`presetToMpv` → `hwdec` + `profile`),
           * so the imperative path and the UI path can never
           * disagree about what a quality means. Unknown names fall
           * back to the balanced preset rather than silently doing
           * nothing.
           */
          setVideoQuality: (quality: string) => {
            const preset = (['battery-saver', 'balanced', 'high-quality'] as const)
              .find(p => p === quality) ?? 'balanced';
            const {hwdec, profile} = presetToMpv(preset);
            commands.setProperty('hwdec', hwdec);
            commands.setProperty('profile', profile);
            setQualityPreset(preset);
          },
          /**
           * `setLoopMode` takes the lib's vocabulary
           * ('none' | 'file' | 'playlist'); the V19 chrome speaks
           * 'off' | 'one' | 'all'. `repeatMode` is derived from the
           * lib's `loopMode` (there is no separate store), so
           * routing through `commands.setRepeatMode` updates both
           * the native loop and the value the chrome reads back.
           */
          setLoopMode: (mode: 'none' | 'file' | 'playlist') => {
            const v19: Record<typeof mode, 'off' | 'one' | 'all'> = {
              none: 'off',
              file: 'one',
              playlist: 'all',
            };
            commands.setRepeatMode(v19[mode]);
          },
          setShuffle: (enabled: boolean) => commands.setShuffle(enabled),
          /**
           * The public ref takes a trackId STRING; the lib's
           * `selectCaptionTrack` takes a numeric id (null = off).
           * A non-numeric id is therefore "no track" — passing it
           * through as null rather than coercing NaN into the lib.
           */
          selectCaptionTrack: (trackId: string | null) =>
            commands.selectCaptionTrack(
              trackId === null ? null : Number(trackId),
            ),
          /**
           * Audio-description selection is not exposed by the lib
           * (there is no `selectAudioDescription` command), so the
           * AudioDescriptionTrackSelector renders null rather than
           * shipping a control that cannot act. This method
           * therefore reports that explicitly instead of pretending.
           */
          selectAudioDescriptionTrack: async (_trackId: string | null) => {
            throw new Error(
              '[SimbaPlayer.selectAudioDescriptionTrack] the lib exposes no ' +
                'audio-description selection command; the AD selector stays hidden.',
            );
          },
          setSkipSilence: async (enabled: boolean) => {
            // The hook's public surface is `{enabled, toggle}`, but
            // the ref must SET an explicit value rather than flip it,
            // so the persisted store's setter is used directly.
            useSkipSilenceStore.getState().setEnabled(enabled);
          },

          // ── Launch (lib-bridge; owned by useOpenWithResume)
          open: async () => {
            throw new Error(
              '[SimbaPlayer.open] launching is owned by useOpenWithResume(); ' +
                'the chrome compositor does not launch media.',
            );
          },
          openWithResume: async () => {
            throw new Error(
              '[SimbaPlayer.openWithResume] launching is owned by ' +
                'useOpenWithResume(); the chrome compositor does not launch media.',
            );
          },
          openPlaylist: async () => {
            throw new Error(
              '[SimbaPlayer.openPlaylist] launching is owned by ' +
                'useOpenWithResume(); the chrome compositor does not launch media.',
            );
          },
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
          // W6.0: the previous surface also exposed
          // `setPresentation(mode)` taking `'mini' | 'expanded' |
          // 'pip'`. With the mode derived from the host activity, only
          // PiP is something a consumer can select — `'mini'` and
          // `'expanded'` are facts about which activity is running, not
          // choices. A `setPresentation('mini')` that the host then
          // overrides would be a control that lies, so it is removed
          // rather than kept as a no-op.
          enterPip: async () => {
            commands.enterPip();
            setPipActive(true);
          },
          exitPip: async () => {
            commands.exitPip();
            setPipActive(false);
          },

          // ── Read-only for the dock
          getCurrentUri: () => state.currentUri,
          getCurrentTitle: () => state.title || null,
          getCurrentArtwork: () => null,
        } as unknown as SimbaPlayerRef;
      },
      [
        commands,
        setPipActive,
        state.currentUri,
        state.title,
        setQualityPreset,
      ],
    );

    return <SimbaPlayerContent />;
  },
);

/**
 * The actual chrome composition. Separated from the forwardRef so
 * `usePresentation` / `usePlaybackState` hooks can subscribe without
 * being entangled with the imperative ref's empty-stub closure.
 */
const SimbaPlayerContent: React.FC = () => {
  const presentation = usePresentation();

  // W6.0 — the mount gate. ONE gate, and it is derived.
  //
  // `presentation.isExpanded` is true exactly when
  // `isPlayerActivity && !pipActive` — i.e. when there is a native
  // `MpvRenderView` beneath THIS tree and the PiP window is not
  // owning it. Both inputs are read per-tree, so the background
  // `MainActivity` root and the foreground `PlayerActivity` root
  // cannot disagree, and nothing anywhere writes the mode.
  //
  // This replaces four stacked gates (`!isPlayerActivity`,
  // `hasNothingToPlay`, `'mini'`, `'pip'`), which became redundant
  // the moment the mode stopped being stored:
  //
  //   - `!isPlayerActivity` ⟹ `mode === 'mini'`, so it was already
  //     covered by the mini branch. Kept separate it only gave the
  //     two a chance to drift apart.
  //   - `'mini'` and `'pip'` are precisely the two ways
  //     `isExpanded` is false, so all three collapse to one branch.
  //   - `hasNothingToPlay` (`videoState === 'idle' && mode ===
  //     'expanded'`) was UNREACHABLE, and actively harmful. In the
  //     player activity `hasSession` is structurally true
  //     (`usePlaybackState`: `isPlayerActivity || hasPlaylistEntry`),
  //     so the hook can never DERIVE `'idle'` — the only way to read
  //     it here was the `VideoController`'s own initial state, which
  //     is `'idle'` until its first `observePlayback` effect runs. So
  //     this gate blanked the chrome for one commit on every launch.
  //     Its comment promised to "render the composer's own error/empty
  //     path rather than an empty screen" and then returned `null` —
  //     a comment describing behaviour the code did not have. Removed
  //     rather than kept as fiction.
  if (!presentation.isExpanded) {
    return null;
  }

  // W6.1 — `ChromeAutoHideProvider` is the SINGLE owner of chrome
  // visibility, and it must sit ABOVE every chrome consumer. The
  // compositor itself is a child, because the `VideoSurface` tap
  // handler has to read the very state the tap is meant to toggle.
  return (
    <ChromeAutoHideProvider>
      <ExpandedChrome />
    </ChromeAutoHideProvider>
  );
};

/**
 * The expanded chrome compositor. Split out of `SimbaPlayerContent` so
 * it can live INSIDE `ChromeAutoHideProvider` — the surface's tap
 * handler and the two `ChromeAutoHideController`s must all observe the
 * same `Animated.Value`.
 *
 * (Before this split they did not. `SimbaPlayerContent` called
 * `useChromeAutoHide()` for `toggle` while each controller called it
 * again for its own opacity: three independent visibility states, so a
 * tap toggled a value that drove no pixels and the controls only ever
 * moved on their own timers.)
 */
const ExpandedChrome: React.FC = () => {
  const {toggle} = useChromeAutoHide();

  // W6.1 — the single owner of PiP reconciliation. Mounted here, inside
  // the mount gate, because PiP only exists while a player surface
  // does. It must be the one place that subscribes: two subscribers
  // would each call `setPipActive` with the same value, which happens to
  // be harmless, but "one owner" is the property that keeps it
  // harmless.
  usePipBridge();

  // EXPANDED: the chrome compositor, rendered as a TRANSPARENT
  // full-bleed overlay ABOVE the native video surface.
  //
  // W6.0 — this root used to carry `backgroundColor:
  // colors.background.primary`, and `VideoSurface` below it carried
  // `background.surfaceDark`. Both are opaque, so the overlay painted
  // over the `MpvRenderView` that `PlayerActivity` inserts at content
  // index 0: the user would have seen a flat panel where the video
  // should be. The old comment claimed "the V16 SimbaPlayer's
  // PlayerSurface is the actual mpv render" — no such component
  // exists on this path (the V16 `SimbaPlayer` only renders
  // `PlayerProvider`; the surface is purely native). Nothing paints
  // here now; the only opaque chrome is the deliberate scrims
  // (gesture feedback, auto-hide fade) and the overlays themselves.
  return (
    <View style={styles.expandedRoot} pointerEvents="box-none">
      <SimbaStatusBar variant="player" />

      <View style={styles.surfaceContainer}>
        <VideoSurface accessibilityLabel="Video" onPress={toggle} />
        <VerticalSwipeGestures />
        <ChromeAutoHideController style={StyleSheet.absoluteFill}>
          <VideoTitleOverlay />
          <VideoLoadingOverlay />
          <VideoErrorOverlay />
          <NextUpOverlay />
        </ChromeAutoHideController>
      </View>

      <ChromeAutoHideController>
        <TransportBar />
      </ChromeAutoHideController>
    </View>
  );
};

const styles = StyleSheet.create({
  // Full-bleed, transparent chrome overlay. W6.0: no background
  // colour — the native `MpvRenderView` shows through from beneath.
  expandedRoot: {
    ...StyleSheet.absoluteFill,
    paddingTop: 0, // safe-area inset is already in the V16 root
  },
  // W6.0: no `miniRoot` any more — the `mini` branch returns `null`
  // because there is no video dock to render. Reintroduce a style here
  // if the audio lane grows a real mini player.
  surfaceContainer: {
    // W6.0: was `margin: spacing.md + borderRadius + overflow:
    // hidden`, i.e. a rounded inset "card". The video is a full-bleed
    // activity surface, not a card in a feed — the margins letterboxed
    // it and the radius implied a container the app does not have.
    flex: 1,
    position: 'relative',
  },
});

export default SimbaPlayer;
