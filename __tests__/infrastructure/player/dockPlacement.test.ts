/**
 * `dockStyleFor` — the window→lane conversion for the dock's video slot.
 *
 * ## Why this has its own file
 *
 * The arithmetic was inside `VideoPlayer`, and therefore untested:
 * `measureInWindow` is a native call, and React Native Testing Library
 * **v14 removed `createNodeMock`**, so a test cannot give a host component
 * a `measureInWindow` at all. The geometry was, in effect, untestable where
 * it lived.
 *
 * Pulling it out makes the part that can actually be wrong checkable:
 *
 *   - a unit mix-up (the dock speaks WINDOW pixels; the picture's box is in
 *     the lane's pixels — and the conversion is a subtraction of two
 *     numbers in the SAME space, which is what makes it safe),
 *   - a missing origin (the lane has not measured itself yet),
 *   - a degenerate slot (a 0x0 box is an INVALID libmpv render target).
 */

import {dockStyleFor} from '../../../src/infrastructure/player/dockPlacement';

const SLOT = {x: 16, y: 1800, width: 96, height: 96};

describe('dockStyleFor', () => {
  it('converts a window-space slot into lane-space when the lane is at the window origin', () => {
    expect(dockStyleFor(SLOT, {x: 0, y: 0})).toEqual({
      position: 'absolute',
      left: 16,
      top: 1800,
      width: 96,
      height: 96,
    });
  });

  it('subtracts the lane origin — the two spaces are not assumed to match', () => {
    // A status-bar inset, a non-edge-to-edge window, or any future wrapper
    // would put the lane below the window origin. The picture must still
    // land on the dock's slot.
    expect(dockStyleFor(SLOT, {x: 0, y: 64})).toEqual({
      position: 'absolute',
      left: 16,
      top: 1736,
      width: 96,
      height: 96,
    });
  });

  it('does not leave the picture partly outside its parent', () => {
    // A negative left/top would place part of the picture outside the lane.
    const style = dockStyleFor({x: 0, y: 0, width: 96, height: 96}, {x: 40, y: 24});
    expect(style).toMatchObject({left: 0, top: 0});
  });

  it('returns null when the dock has not published a slot', () => {
    expect(dockStyleFor(null, {x: 0, y: 0})).toBeNull();
  });

  it('returns null when the lane has not measured its origin', () => {
    // Until both are known there is no honest answer, and the caller keeps
    // the previous geometry rather than collapsing the picture.
    expect(dockStyleFor(SLOT, null)).toBeNull();
  });

  it('returns null for a zero-sized slot — an invalid libmpv render target', () => {
    expect(dockStyleFor({x: 0, y: 0, width: 0, height: 96}, {x: 0, y: 0})).toBeNull();
    expect(dockStyleFor({x: 0, y: 0, width: 96, height: 0}, {x: 0, y: 0})).toBeNull();
  });

  it('does not use right/bottom — they would fight the measured width', () => {
    // `StyleSheet.absoluteFill` sets right/bottom to 0. Left together with
    // a width and a left, Yoga over-constrains the box. The dock style
    // must specify exactly one of each pair.
    const style = dockStyleFor(SLOT, {x: 0, y: 0}) as Record<string, unknown>;
    expect(style.right).toBeUndefined();
    expect(style.bottom).toBeUndefined();
    expect(style.width).toBe(96);
    expect(style.height).toBe(96);
  });
});
