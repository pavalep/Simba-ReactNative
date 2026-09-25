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
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';

export interface VideoSurfaceProps {
  /** Optional override style. Geometry is owned by the parent layout. */
  style?: object;
  /** Optional accessibility label — defaults to `"Video"` for screen readers. */
  accessibilityLabel?: string;
}

export const VideoSurface: React.FC<VideoSurfaceProps> = ({
  style,
  accessibilityLabel = 'Video',
}) => {
  const {colors} = useTheme();

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
