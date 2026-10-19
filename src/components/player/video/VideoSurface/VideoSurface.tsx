/**
 * `VideoSurface` — the video picture, and the tap target over it.
 *
 * ## What changed on 2026-10-16, and why
 *
 * This used to render a **transparent placeholder** for a native
 * `MpvRenderView` that Kotlin mounted at `android.R.id.content` index 0 —
 * a *sibling* of the React root. The placeholder could only reserve layout
 * space and forward taps, because React Native had no view to own. It
 * therefore had to guess: it used to paint a placeholder colour, had no way
 * to know whether a frame existed, and the colour stayed forever, covering
 * every decoded frame.
 *
 * The picture is now `<SimbaVideo>` — a real native view component in the
 * React tree (`codegenNativeComponent('SimbaVideoView')`, registered by the
 * lib's `PlayerPackage`). React Native owns its layout, its z-order and its
 * lifecycle. That is what removes the whole class of bug this component used
 * to be a workaround for:
 *
 *   - no sibling surface for an opaque root to paint over
 *   - no `measureInWindow` -> window-pixel -> `setVideoBounds` hand-off, and
 *     with it the coordinate translation and the "refused: extents must be > 0"
 *     failure mode that hid a real layout bug behind a black frame
 *   - no manual 0x0 hide/show lifecycle
 *
 * The transparent placeholder is gone because there is nothing left to
 * stand in for.
 *
 * ## The tap layer
 *
 * `SimbaVideo` is a native view; it has no `onPress`. Taps are therefore a
 * sibling `Pressable` laid over the picture, rendered only when a handler is
 * supplied so the surface stays a passive primitive when nobody wants taps.
 * It sits directly above the picture and below the gestures and chrome, so a
 * vertical swipe still reaches `VerticalSwipeGestures` and the chrome's
 * tap-to-toggle still lands.
 *
 * The tap layer is hidden from the accessibility tree, and that is deliberate
 * rather than an omission. It carries no label of its own, so giving it the
 * picture's label would announce "Video" twice — once for the content and
 * once for a control that says nothing the content does not. Every action the
 * tap triggers is already reachable as a real button in the chrome (minimise,
 * close, play/pause), so nothing is lost by keeping this one for touch only.
 *
 * That is also why this layer must not grow a label: inventing "Toggle
 * player controls" here would duplicate what the chrome's own buttons
 * already announce, and would add an affordance no shipping player needs.
 */

import * as React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {SimbaVideo} from '@simba-dev/react-native-media-player';

export interface VideoSurfaceProps {
  /** Optional override style. Geometry is owned by the parent layout. */
  style?: object;
  /** Optional accessibility label — defaults to `"Video"` for screen readers. */
  accessibilityLabel?: string;
  /**
   * How the frame is fitted to the view. `contain` letterboxes (the whole
   * frame, with bars), `cover` fills (cropping the overflow), `stretch`
   * distorts.
   *
   * This exists because the SAME view is now sized two different ways: the
   * fullscreen lane is wide, and the dock's slot is a square. `contain` in a
   * square leaves transparent bars inside the dock's hole, and what shows
   * through those bars is the browsing screen behind — so the dock uses
   * `cover` and the fullscreen lane uses `contain`.
   */
  resizeMode?: 'contain' | 'cover' | 'stretch';
  /**
   * Optional tap handler. When provided, a tap target is laid over the
   * picture so a tap anywhere toggles the chrome. When absent, the picture
   * stays a passive visual primitive with zero gesture cost.
   */
  onPress?: () => void;
}

export const VideoSurface: React.FC<VideoSurfaceProps> = ({
  style,
  accessibilityLabel = 'Video',
  resizeMode = 'contain',
  onPress,
}) => (
  <>
    <SimbaVideo
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      resizeMode={resizeMode}
      style={[StyleSheet.absoluteFill, styles.surface, style]}
    />

    {onPress ? (
      <Pressable
        testID="video-surface-tap"
        onPress={onPress}
        // See the module docstring: this layer is for touch only. Hiding it
        // from the a11y tree is what keeps the picture's label unique.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      />
    ) : null}
  </>
);

const styles = StyleSheet.create({
  surface: {
    // Geometry is owned by the parent layout (`flex:1` or `absoluteFill`).
    // The picture fills its parent; `overflow` clips a video whose aspect
    // does not match the frame to the resizeMode's letterbox/crop anyway.
    overflow: 'hidden',
  },
});

export default VideoSurface;