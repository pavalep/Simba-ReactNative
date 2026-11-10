// ─────────────────────────────────────────────────────────────
// Colour helpers — the ONE way to ask for "this colour, but softer".
// ─────────────────────────────────────────────────────────────

/**
 * Apply an alpha to a colour.
 *
 * ## Why this exists
 *
 * The alternative is a second copy of the colour, and a copy is a thing
 * that can be wrong.
 *
 * The Home divider used to carry its own pair of `rgba(...)` literals
 * for the brand gold — one for light mode, one for dark — and they were
 * **swapped**: light mode drew the dark theme's gold and dark mode drew
 * the light one's, because the literals were written from a source that
 * had the two the wrong way round. Nothing caught it, because a hard-coded
 * colour is indistinguishable from a correct one at the call site.
 *
 * Reading the token and adding the alpha to it cannot be wrong that way:
 * the gold lives in `theme/tokens.ts` and nowhere else, and this function
 * only ever changes how transparent it is.
 *
 * ## What it accepts
 *
 *   `#RGB`       → expanded to `#RRGGBB`, then alpha applied
 *   `#RRGGBB`    → alpha applied
 *   `rgb(r,g,b)` → alpha applied
 *   `rgba(r,g,b,a)` → the alpha is REPLACED
 *
 * Anything else is returned unchanged: an unknown colour format is not
 * this function's to reinterpret, and silently guessing would produce a
 * colour nobody asked for.
 *
 * @param color  The colour, in one of the formats above.
 * @param alpha  0…1.
 */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map(ch => ch + ch)
            .join('')
        : hex;
    if (full.length !== 6) {
      return color;
    }
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(part => part.trim());
    const [r, g, b] = parts;
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  return color;
}
