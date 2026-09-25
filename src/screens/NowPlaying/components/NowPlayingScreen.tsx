/**
 * V19 W1 Phase 1.4 — `NowPlayingScreen` (chrome composition).
 *
 * The screen is now a THIN composition of the V19 chrome primitives.
 * NO local state. NO `TouchableOpacity` for the seek track. NO
 * `pointerEvents="none"` anti-patterns (V11 §13 fix). NO emoji icons.
 *
 * The five primitives (each one is a sibling, not a child of the
 * others — this is what allows the chrome to auto-hide in W3.5
 * without unmounting the surface):
 *
 *   - `VideoSurface`         (W1 — real)        — the frame area
 *   - `VideoTitleOverlay`    (W1 stub → W3)     — top bar
 *   - `TransportBar`         (W1 stub → W2)     — bottom transport row
 *   - `VideoLoadingOverlay`  (W1 — real)        — spinner when buffering
 *   - `VideoErrorOverlay`    (W1 — real)        — terminal error scrim
 *
 * `VideoMiniPlayer` is NOT mounted here — it's the shell-level dock
 * (App.tsx), per SPEC §3.4.1.
 *
 * W2/W3 will fill in the title overlay + transport bar. W4 will
 * fold this into the V19 SimbaPlayer consumer (one mount, not
 * per-screen).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.1-3.6 + audit doc §5.
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
import {usePlaybackState} from '../../../infrastructure/player';
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

  return (
    <View style={[styles.root, {paddingTop: insets.top, backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="player" />

      {/* VideoSurface owns the frame area. Geometry is `flex:1` so
          siblings stack vertically without an explicit layout. */}
      <View style={styles.surfaceContainer}>
        <VideoSurface accessibilityLabel={fileTitle ?? 'Video'} />

        {/* Title overlay + transport bar are W3/W2 stubs that render
            null in W1. The chrome composition shape is in place. */}
        <VideoTitleOverlay />

        {/* Loading overlay sits on top of the surface (sibling, not
            child — keeps the surface mounted). */}
        <VideoLoadingOverlay />

        {/* Error overlay is the terminal scrim. Only renders when
            videoState === 'error'. */}
        <VideoErrorOverlay />
      </View>

      {/* TransportBar lives at the bottom, BELOW the surface. W2 will
          fill this in with seek + 5 controls + mode row. */}
      <TransportBar />

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
