/**
 * V19 W1 Phase 1.1 — `VideoSurface` primitive (the frame, only the frame).
 *
 * Renders the surface area for the video frame. The native surface
 * itself is provided by the lib's `SimbaPlayer` (in the V16 root,
 * which V19 SimbaPlayer replaces in W4). The surface view is bound
 * via the lib's bridge; this component is the JS-side wrapper that
 * guarantees geometry + a placeholder color when the surface has no
 * pixel yet.
 *
 * Does NOT compose chrome (no `TransportBar`, `VideoTitleOverlay`,
 * `VideoLoadingOverlay`, etc.). Chrome is a sibling, NOT a child.
 * That separation lets the chrome auto-hide without unmounting the
 * surface.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.1 + audit doc §4.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';

export interface VideoSurfaceProps {
  /** Optional override style. Geometry is owned by the parent layout. */
  style?: object;
  /** Optional accessibility label — defaults to `"Video"` for screen readers. */
  accessibilityLabel?: string;
  /**
   * V19 W3.5.1 — optional tap handler. When provided, the
   * surface becomes Pressable (chrome tap-anywhere toggle).
   * When absent, the surface stays a plain View (zero gesture
   * cost). The chrome's auto-hide controller owns the toggle
   * logic; the surface just forwards taps.
   */
  onPress?: () => void;
}

export const VideoSurface: React.FC<VideoSurfaceProps> = ({
  style,
  accessibilityLabel = 'Video',
  onPress,
}) => {
  const {colors} = useTheme();

  // When onPress is provided, render a Pressable so taps bubble
  // to the chrome's auto-hide toggle. Otherwise render a plain
  // View — the surface stays a passive visual primitive.
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Tap to toggle player controls"
        style={[
          StyleSheet.absoluteFill,
          styles.surface,
          {backgroundColor: colors.background.surfaceDark},
          style,
        ]}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[
        StyleSheet.absoluteFill,
        styles.surface,
        {backgroundColor: colors.background.surfaceDark},
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  surface: {
    // Geometry is owned by the parent layout (`flex:1` or
    // `absoluteFill`). The surface itself fills its parent.
    overflow: 'hidden',
  },
});

export default VideoSurface;
