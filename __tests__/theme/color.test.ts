/**
 * `withAlpha` — the ONE way to ask for "this colour, but softer".
 *
 * ## Why this is pinned
 *
 * The Home divider used to carry its own pair of `rgba(...)` literals for
 * the brand gold — one for light mode, one for dark — and the pair was
 * **swapped**: light mode drew the dark theme's gold and dark mode drew
 * the light one's. Nothing caught it, because a hard-coded colour is
 * indistinguishable from a correct one at the call site.
 *
 * Reading the theme's own token and adding the alpha to it cannot be
 * wrong that way. These tests pin that arithmetic, so the helper cannot
 * quietly stop being the helper.
 */

import {withAlpha} from '../../src/theme/color';

describe('withAlpha', () => {
  it('applies the alpha to a six-digit hex', () => {
    // The app's dark-theme gold: #C9A84C = (201, 168, 76).
    expect(withAlpha('#C9A84C', 0.9)).toBe('rgba(201, 168, 76, 0.9)');
  });

  it('applies the alpha to the app\'s light-theme gold', () => {
    // The app's light-theme gold: #B8922E = (184, 146, 46).
    expect(withAlpha('#B8922E', 0.9)).toBe('rgba(184, 146, 46, 0.9)');
  });

  it('expands a three-digit hex', () => {
    expect(withAlpha('#C9A', 0.5)).toBe('rgba(204, 153, 170, 0.5)');
  });

  it('replaces the alpha of an rgba colour', () => {
    expect(withAlpha('rgba(201, 168, 76, 0.25)', 0.9)).toBe('rgba(201, 168, 76, 0.9)');
  });

  it('adds the alpha to an rgb colour', () => {
    expect(withAlpha('rgb(201, 168, 76)', 0.9)).toBe('rgba(201, 168, 76, 0.9)');
  });

  it('clamps the alpha into 0…1', () => {
    expect(withAlpha('#C9A84C', 1.5)).toBe('rgba(201, 168, 76, 1)');
    expect(withAlpha('#C9A84C', -0.5)).toBe('rgba(201, 168, 76, 0)');
  });

  it('leaves a colour it does not understand alone', () => {
    // An unknown format is not this function's to reinterpret: guessing
    // would produce a colour nobody asked for.
    expect(withAlpha('rebeccapurple', 0.5)).toBe('rebeccapurple');
  });
});
