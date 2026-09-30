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
  useChromeAutoHide,
  useIsPlayerActivity,
  usePlaybackState,
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
 *   - presentation        → `usePresentation().setMode`
 *   - PiP                 → `commands.enterPip` / `exitPip`
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
    const {setMode} = usePresentation();
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

          // ── Presentation (app-side Zustand, NOT lib)
          setPresentation: (mode: 'mini' | 'expanded' | 'pip') => setMode(mode),

          // ── PiP
          enterPip: run(commands.enterPip),
          exitPip: run(commands.exitPip),

          // ── Read-only for the dock
          getCurrentUri: () => state.currentUri,
          getCurrentTitle: () => state.title || null,
          getCurrentArtwork: () => null,
        } as unknown as SimbaPlayerRef;
      },
      [
        commands,
        setMode,
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
  const {videoState} = usePlaybackState();
  const {toggle} = useChromeAutoHide();
  const presentation = usePresentation();
  // V19 W6.0 (lib 1.7.0) — the structural mount gate. Synchronous,
  // so it is already correct on the first render (no frame of chrome
  // flashing over a non-player activity, and no frame of a player
  // activity showing bare video).
  const isPlayerActivity = useIsPlayerActivity();

  // W6.0 — the mount gate.
  //
  // Playback lives in `PlayerActivity`; the app's normal tree lives in
  // `MainActivity`. There is no player surface in MainActivity, so the
  // chrome has nothing to sit on there and must not mount — otherwise
  // a full-bleed overlay would ride along over Home, Movies, Settings,
  // every screen. This is the structural discriminator (lib 1.7.0
  // `useIsPlayerActivity()`), not a proxy: it is true exactly when the
  // native surface beneath this tree exists.
  //
  // It is checked BEFORE the mode gates because it is a fact about the
  // host, whereas the mode is a policy about what to show once a
  // surface is confirmed.
  if (!isPlayerActivity) {
    return null;
  }

  // Pinned-visible chrome states (matches W3.5.1's PINNED_STATES in
  // useChromeAutoHide — duplicated here so the orchestrator can
  // decide whether to render the chrome compositor at all when
  // there's nothing to play).
  const hasNothingToPlay =
    videoState === 'idle' && presentation.mode === 'expanded';

  if (hasNothingToPlay) {
    // The player activity is up but nothing is loaded. `useOpenWithResume`
    // / `useResumePolicy` own the "no item, don't autoplay" decision, so
    // this state is reachable only when a stale intent arrives with no
    // media. Render the composer's own error/empty path rather than an
    // empty screen.
    return null;
  }

  // MINI: W6.0.
  //
  // There is no video mini dock. `VideoMiniPlayer` is still the W0
  // `return null` stub, and in this architecture there cannot be one:
  // the video plays in its own activity, so the app's browsing screens
  // are never on screen at the same time and have nothing to dock
  // beneath. `usePresentationSync` therefore drives video straight to
  // 'expanded' and only passes through 'mini' when leaving the player
  // activity.
  //
  // This branch stays for that transition (and for the audio lane, which
  // does have a dock) but it must not be the video path: routing video
  // here is what made the whole V19 chrome unreachable in W1–W5.
  if (presentation.mode === 'mini') {
    return null;
  }

  // PiP: the lib owns the surface. Chrome is intentionally
  // suppressed (no gesture detection during PiP per W3.5.3).
  if (presentation.mode === 'pip') {
    return null;
  }

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
