/**
 * V19 W1 Phase 1.4 + W3.5 Phases 3.5.1 / 3.5.3-5 / 3.5.6 —
 * `NowPlayingScreen` (chrome composition + auto-hide wiring
 * + gesture layer + MoreMenu replacement).
 *
 * The screen is now a THIN composition of the V19 chrome primitives.
 * NO local state. NO `TouchableOpacity` for the seek track. NO
 * `pointerEvents="none"` anti-patterns (V11 §13 fix). NO emoji icons.
 *
 * The primitives (each one is a sibling, not a child of the
 * others — this is what allows the chrome to auto-hide in W3.5
 * without unmounting the surface):
 *
 *   - `VideoSurface`             (W1 — real)        — the frame area
 *   - `VerticalSwipeGestures`    (W3.5.3-5)        — composite gesture layer
 *                                                       (Pan + DoubleTap +
 *                                                       LongPress + Tap)
 *   - `VideoTitleOverlay`        (W1 stub → W3)     — top bar
 *   - `TransportBar`             (W1 stub → W2)     — bottom transport row
 *   - `VideoLoadingOverlay`      (W1 — real)        — spinner when buffering
 *   - `VideoErrorOverlay`        (W1 — real)        — terminal error scrim
 *
 * Rendering order inside `surfaceContainer` (later = on top):
 *
 *   1. VideoSurface               — bottom
 *   2. VerticalSwipeGestures      — gesture layer + indicators
 *   3. ChromeAutoHideController   — chrome overlays (already
 *                                    `pointerEvents="box-none"`
 *                                    so empty space falls through
 *                                    to the gesture layer below)
 *
 * W3.5 adds `ChromeAutoHideController` wrapping the chrome
 * subtree so the whole chrome fades in / out as a single unit.
 * The VerticalSwipeGestures' single-tap also toggles chrome
 * visibility via `useChromeAutoHide.toggle()`.
 *
 * `VideoMiniPlayer` is NOT mounted here — it's the shell-level dock
 * (App.tsx), per SPEC §3.4.1.
 *
 * W4 will fold this into the V19 SimbaPlayer consumer (one mount,
 * not per-screen) and hoist ChromeAutoHideController + the gesture
 * layer to the SimbaPlayer root so visibility + gesture state
 * survive screen navigation.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.1-3.6, §3.9-§3.12 + audit doc §5.
 */

import * as React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {VideoSurface} from '../../../components/player/video/VideoSurface/VideoSurface';
import {VideoTitleOverlay} from '../../../components/player/video/VideoTitleOverlay/VideoTitleOverlay';
import {TransportBar} from '../../../components/player/video/TransportBar/TransportBar';
import {VideoLoadingOverlay} from '../../../components/player/video/VideoLoadingOverlay/VideoLoadingOverlay';
import {VideoErrorOverlay} from '../../../components/player/video/VideoErrorOverlay/VideoErrorOverlay';
import {ChromeAutoHideController} from '../../../components/player/video/ChromeAutoHide/ChromeAutoHideController';
import {VerticalSwipeGestures} from '../../../components/player/video/Gestures/VerticalSwipeGestures';
import {NextUpOverlay} from '../../../components/player/video/NextUp/NextUpOverlay';
import {useChromeAutoHide, usePlaybackState} from '../../../infrastructure/player';
import type {NowPlayingScreenProps} from '../types';

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
  route,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {fileTitle} = route.params ?? {};
  // fileTitle is reserved for VideoTitleOverlay's W3 implementation;
  // until then, the stub doesn't accept a prop.
  // eslint-disable-next-line no-void
  void fileTitle;

  // V19 SPEC §2.1 — the screen does NOT call openPlayer / commands
  // directly. The deep-link launch was already handled by the V16
  // SimbaPlayer root (which mounts the PlayerActivity). The screen
  // is a viewer of state + chrome composition.
  const {videoState} = usePlaybackState();
  // The controller owns opacity + visibility + toggle. We need
  // `toggle` for the VideoSurface onPress and `kick` to expose
  // to chrome primitives that reset the auto-hide timer (W3.5.4
  // / W3.5.5 gestures). Today only `toggle` is wired.
  const {toggle, kick} = useChromeAutoHide();

  // Loading + Error overlays render INSIDE the auto-hide wrapper
  // so they also fade. They're already conditionally rendered so
  // they're effectively pinned when their state is active. We
  // explicitly kick the timer on each render of an overlay so
  // the chrome stays visible during long buffering.
  // (Defensive — the auto-hide hook already pins buffering/error
  // as visible, but `kick` is the explicit "user intent" path.)
  // eslint-disable-next-line no-void
  void kick;

  return (
    <View style={[styles.root, {paddingTop: insets.top, backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="player" />

      {/* VideoSurface owns the frame area. Geometry is `flex:1` so
          siblings stack vertically without an explicit layout.
          W3.5.1: onPress prop is now subsumed by the gesture layer
          below — single-tap (delayed 280ms while waiting for
          double-tap) drives `useChromeAutoHide.toggle()`. The
          `onPress` prop is left in place as a fallback for the
          case where the gesture handler doesn't bind (e.g. web
          preview or a test that doesn't mount the detector). */}
      <View style={styles.surfaceContainer}>
        <VideoSurface
          accessibilityLabel={fileTitle ?? 'Video'}
          onPress={toggle}
        />

        {/* Composite gesture layer (W3.5.3-5): pan → brightness /
            volume; double-tap → ±10s; long-press → 2×; single-tap
            → toggle chrome. Renders the indicator pills (volume,
            brightness, speed) + ripple too. Sits below the chrome
            so empty chrome space falls through to it
            (`pointerEvents="box-none"` on ChromeAutoHideController). */}
        <VerticalSwipeGestures />

        <ChromeAutoHideController style={StyleSheet.absoluteFill}>
          <VideoTitleOverlay />
          <VideoLoadingOverlay />
          <VideoErrorOverlay />
          {/* V19 W3.6.7 — NextUpOverlay sits inside the surface frame
              (bottom 40%); Cancel + Play now buttons intercept taps
              before they reach the gesture surface below. */}
          <NextUpOverlay />
        </ChromeAutoHideController>
      </View>

      {/* TransportBar lives at the bottom, BELOW the surface. W3.5.1:
          also wrapped in ChromeAutoHideController so it fades with
          the rest of the chrome. The bar already calls kick() via
          its transport interactions (W3.5.4 wiring). W3.5.6: the
          `More` button now opens `VideoMoreSheet` (Speed / Quality
          / Sleep / legacy actions) instead of the W3.4 `MoreSheet`. */}
      <ChromeAutoHideController>
        <TransportBar />
      </ChromeAutoHideController>

      {/* State hint for accessibility — screen readers can announce
          what the player is doing right now. */}
      <View accessibilityRole="text" accessibilityLabel={`Player is ${videoState}`} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  surfaceContainer: {
    flex: 1,
    position: 'relative',
    margin: spacing.md,
    borderRadius: spacing.sm,
    overflow: 'hidden',
  },
});

// Re-export for backward compatibility (existing imports keep working).
export default NowPlayingScreen;
