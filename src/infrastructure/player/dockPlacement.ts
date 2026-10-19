/**
 * Where the video picture sits, in the video lane's own coordinates.
 *
 * ## The problem this solves
 *
 * The dock publishes its slot in WINDOW pixels — `measureInWindow` is the
 * only measurement that describes a view in one subtree from another. The
 * picture, however, is positioned relative to ITS OWN parent, and that
 * parent is not necessarily the window origin: a status-bar inset, a
 * non-edge-to-edge window, or any future wrapper would put the two spaces
 * out of step.
 *
 * The old code assumed they were the same. This does not: the lane
 * measures its own window origin once per layout and the conversion happens
 * here.
 *
 * ## Why it is a pure function
 *
 * `measureInWindow` is a native call. React Native Testing Library v14
 * **removed `createNodeMock`**, so a test cannot give a host component a
 * `measureInWindow` at all — the geometry was untestable while it lived
 * inside the component. Pulling the arithmetic out makes the part that
 * can be wrong (a unit mix-up, an off-by-one, a missing origin) checkable
 * with a plain unit test, and leaves the component to do only the one thing
 * that genuinely needs a device.
 *
 * The units are the thing most likely to be wrong. The dock's rect is in
 * WINDOW pixels; the picture's box is in the lane's pixels; and the
 * difference between them is a subtraction of two numbers in the SAME
 * space (window pixels), which is what makes the result safe.
 */

import type {ViewStyle} from 'react-native';
import type {
  VideoLaneOrigin,
  VideoMiniRect,
} from '../../state/usePresentationStore';

/**
 * Where the video lane sits in the window.
 *
 * Re-exported from the store so the measurement and the conversion speak
 * the same type — the lane publishes its origin, the dock publishes its
 * slot, and this function consumes both.
 */
export type LaneOrigin = VideoLaneOrigin;

/**
 * The picture's box when the video is in the dock.
 *
 * Returns `null` when there is nothing to place yet — no published slot, or
 * no measured origin. The caller keeps the previous geometry in that case,
 * because:
 *
 *   - a 0x0 picture is an INVALID libmpv render target (the old "refused:
 *     extents must be > 0" failure), so collapsing it is not an option;
 *   - parking it off-screen would be a lie about where the video is.
 *
 * The slot is CLAMPED to the duration-free bounds of the lane: a negative
 * `left` or `top` would place the picture partly outside its parent, and a
 * zero or negative width would be the invalid target again.
 */
export function dockStyleFor(
  slot: VideoMiniRect | null,
  origin: LaneOrigin | null,
): ViewStyle | null {
  if (!slot || !origin) return null;

  const left = slot.x - origin.x;
  const top = slot.y - origin.y;
  const width = slot.width;
  const height = slot.height;

  if (width <= 0 || height <= 0) return null;

  return {
    position: 'absolute',
    left: Math.max(0, left),
    top: Math.max(0, top),
    width,
    height,
  };
}
