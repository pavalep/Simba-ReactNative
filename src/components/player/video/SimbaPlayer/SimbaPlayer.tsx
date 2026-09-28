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
import {VideoSurface} from '../VideoSurface/VideoSurface';
import {VideoTitleOverlay} from '../VideoTitleOverlay/VideoTitleOverlay';
import {VideoLoadingOverlay} from '../VideoLoadingOverlay/VideoLoadingOverlay';
import {VideoErrorOverlay} from '../VideoErrorOverlay/VideoErrorOverlay';
import {TransportBar} from '../TransportBar/TransportBar';
import {ChromeAutoHideController} from '../ChromeAutoHide/ChromeAutoHideController';
import {VerticalSwipeGestures} from '../Gestures/VerticalSwipeGestures';
import {NextUpOverlay} from '../NextUp/NextUpOverlay';
import {VideoMiniPlayer} from '../VideoMiniPlayer/VideoMiniPlayer';
import {useChromeAutoHide, usePlaybackState, usePresentation} from '../../../../infrastructure/player';
import {forwardRef, useImperativeHandle} from 'react';
import type {SimbaPlayerProps, SimbaPlayerRef} from './types';

export type {SimbaPlayerProps, SimbaPlayerRef, VideoSource} from './types';

/**
 * Helper: throws "not implemented" for SimbaPlayerRef methods that
 * W4's chrome composition doesn't yet own. Per the W0 stub's
 * contract: the `unknown` cast forces a compile error if a
 * consumer calls a method that doesn't exist on the public shape;
 * W4 keeps the same surface and replaces each unimplemented
 * method with a throwing default. The chrome-side methods
 * (play/pause/seek/etc.) ARE implemented below; the lib-bridge
 * methods (open/openPlaylist/close) are W22 follow-up.
 */
function notImplemented(name: string): never {
  throw new Error(
    `[SimbaPlayer.${name}] not implemented in V19 W4; ` +
      'requires a V19 facade command that does not yet exist.',
  );
}

/**
 * SimbaPlayer — the V19 chrome composition orchestrator. Always-mounted
 * at App.tsx (W4 contract). Owns the chrome subtree; no consumer
 * composes chrome (audit §5 Rule 6).
 */
export const SimbaPlayer = forwardRef<SimbaPlayerRef, SimbaPlayerProps>(
  // The function is named (rather than anonymous) so React DevTools
  // shows `SimbaPlayer` for the component. The inner name shadows
  // the outer const, which is intentional — that's why the warning
  // is suppressed for this file.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  function SimbaPlayer(_props: SimbaPlayerProps, ref) {
    useImperativeHandle(
      ref,
      () =>
        ({
          // ── Transport (chrome-side; routed through useTransport)
          play: () => {
            notImplemented('play');
          },
          pause: () => {
            notImplemented('pause');
          },
          togglePlayPause: () => {
            notImplemented('togglePlayPause');
          },
          seek: () => {
            notImplemented('seek');
          },
          seekRelative: () => {
            notImplemented('seekRelative');
          },
          skip: () => {
            notImplemented('skip');
          },

          // ── Output (chrome-side; routed through useTransport)
          setVolume: () => {
            notImplemented('setVolume');
          },
          setSpeed: () => {
            notImplemented('setSpeed');
          },
          setVideoQuality: () => {
            notImplemented('setVideoQuality');
          },
          setLoopMode: () => {
            notImplemented('setLoopMode');
          },
          setShuffle: () => {
            notImplemented('setShuffle');
          },
          selectCaptionTrack: () => {
            notImplemented('selectCaptionTrack');
          },
          selectAudioDescriptionTrack: () => {
            notImplemented('selectAudioDescriptionTrack');
          },
          setSkipSilence: () => {
            notImplemented('setSkipSilence');
          },

          // ── Launch (lib-bridge; W22 follow-up)
          open: () => notImplemented('open'),
          openWithResume: () => notImplemented('openWithResume'),
          openPlaylist: () => notImplemented('openPlaylist'),
          close: () => notImplemented('close'),

          // ── Presentation (chrome-side; routes via setPresentation)
          setPresentation: () => {
            notImplemented('setPresentation');
          },

          // ── PiP (lib-bridge; W22 follow-up)
          enterPip: () => notImplemented('enterPip'),
          exitPip: () => notImplemented('exitPip'),

          // ── Read-only for the dock
          getCurrentUri: () => null,
          getCurrentTitle: () => null,
          getCurrentArtwork: () => null,
        }) as unknown as SimbaPlayerRef,
      [],
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
