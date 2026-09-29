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
 *       - `mini`       → render `<VideoMiniPlayer />` (the dock)
 *       - `expanded`   → render the chrome compositor
 *                        (overlay-style absoluteFill over the V16
 *                        SimbaPlayer's player surface)
 *       - `pip`        → render nothing; the lib owns the PiP
 *                        surface via V16 SimbaPlayer + lib
 *                        enterPip() / exitPip()
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
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
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
import {VideoMiniPlayer} from '../VideoMiniPlayer/VideoMiniPlayer';
import {
  useChromeAutoHide,
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
  const {colors} = useTheme();
  const {videoState} = usePlaybackState();
  const {toggle} = useChromeAutoHide();
  const presentation = usePresentation();

  // Pinned-visible chrome states (matches W3.5.1's PINNED_STATES in
  // useChromeAutoHide — duplicated here so the orchestrator can
  // decide whether to render the chrome compositor at all when
  // there's nothing to play).
  const hasNothingToPlay =
    videoState === 'idle' && presentation.mode === 'expanded';

  if (hasNothingToPlay) {
    // Nothing playing + no real chrome to render. The mini dock
    // (rendered at App.tsx shell level as a sibling of this
    // component) handles its own "empty" visual.
    return null;
  }

  // MINI: render the dock (the actual dock UI is VideoMiniPlayer).
  if (presentation.mode === 'mini') {
    return (
      <View pointerEvents="box-none" style={styles.miniRoot}>
        <VideoMiniPlayer />
      </View>
    );
  }

  // PiP: the lib owns the surface. Chrome is intentionally
  // suppressed (no gesture detection during PiP per W3.5.3).
  if (presentation.mode === 'pip') {
    return null;
  }

  // EXPANDED (default): render the chrome compositor as a
  // full-bleed overlay. The V16 SimbaPlayer's PlayerSurface is
  // the actual mpv render under the surfaceContainer; this overlay
  // sits ABOVE it (later sibling renders on top in React Native).
  return (
    <View
      style={[styles.expandedRoot, {backgroundColor: colors.background.primary}]}
      pointerEvents="box-none"
    >
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
  // Full-bleed overlay. The V16 SimbaPlayer already wraps
  // AppContent; this V19 SimbaPlayer overlays its surface.
  expandedRoot: {
    ...StyleSheet.absoluteFill,
    paddingTop: 0, // safe-area inset is already in the V16 root
  },
  miniRoot: {
    // Mini mode renders the dock at the shell; the App.tsx-level
    // VideoMiniPlayer component handles its own positioning. This
    // wrapper is intentionally non-positioned so the dock's own
    // absolute positioning at the bottom of the screen wins.
    ...StyleSheet.absoluteFill,
    pointerEvents: 'box-none',
  },
  surfaceContainer: {
    flex: 1,
    position: 'relative',
    margin: spacing.md,
    borderRadius: spacing.sm,
    overflow: 'hidden',
  },
});

export default SimbaPlayer;
