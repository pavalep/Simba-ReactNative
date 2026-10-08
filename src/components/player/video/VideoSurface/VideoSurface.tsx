/**
 * V19 W1 Phase 1.1 — `VideoSurface` primitive (the frame, only the frame).
 *
 * Renders the surface area for the video frame. The native surface
 * itself is provided by the lib's `SimbaPlayer` (in the V16 root,
 * which VideoPlayer replaces in W4). The surface view is bound
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
  // W6.0 — the frame is TRANSPARENT, deliberately.
  //
  // The real video is a native `MpvRenderView` inserted at content
  // index 0 of `PlayerActivity`, underneath this React tree. This
  // component used to paint `background.surfaceDark` here as a
  // "placeholder colour when the surface has no pixel yet", but it
  // had no way to know whether a pixel existed, so the placeholder
  // was permanent — it covered the video completely. A placeholder
  // that can never yield is not a placeholder, it is an opaque wall.
  //
  // "No pixel yet" is a real state, and it already has an owner:
  // `VideoLoadingOverlay`. Loading is that overlay's job (it owns the
  // `progressbar` role and the spinner); the surface's job is
  // geometry plus the tap target. Keeping one owner per concern is
  // what lets the overlay disappear the instant a frame arrives.
  //
  // The component therefore no longer reads the theme at all.

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
        style={[StyleSheet.absoluteFill, styles.surface, style]}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[StyleSheet.absoluteFill, styles.surface, style]}
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
