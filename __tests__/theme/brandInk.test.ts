/// <reference types="node" />
/**
 * The brand ink — the ONE owner of the lion mark's colour.
 *
 * ## Why this is pinned
 *
 * The mark used to be drawn in `#5C3A1E` in BOTH themes, with a comment
 * saying it "stays fixed across light/dark so the mark always reads as
 * engraved on the brand surface". The assumption was wrong: the surface
 * is theme-aware. On the dark page (`#0A0A0C`) that ink measured
 * **1.96:1** — the lion was drawn, and it was invisible. Three screens
 * carried the defect, and two of them carried it as a raw literal
 * rather than the token, so there were three owners of one colour.
 *
 * The rule these tests pin:
 *
 *   1. the ink follows the surface it is drawn on — same hue and
 *      saturation, lightness set for the page;
 *   2. it clears WCAG AA on its own surface (4.5:1 — the same ink
 *      draws the wordmark, which is text);
 *   3. it never outranks the gold wordmark beside it, so the mark stays
 *      a mark and the name stays the hero;
 *   4. no screen may go back to hard-coding the ink.
 *
 * Point 4 is the interesting one. A hard-coded colour is
 * indistinguishable from a correct one at the call site — that is
 * exactly how the split literals survived. So the guard scans `src/`.
 */

import {readFileSync, readdirSync, statSync} from 'fs';
import {join} from 'path';

import {darkColors, lightColors} from '../../src/theme/tokens';

const APP_ROOT = join(__dirname, '..', '..');
const SRC_ROOT = join(APP_ROOT, 'src');

/** WCAG 2.1 relative luminance. */
const luminance = (hex: string): number => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    throw new Error(`not a six-digit hex: ${hex}`);
  }
  const int = m[1];
  const channels = [int.slice(0, 2), int.slice(2, 4), int.slice(4, 6)].map(part => {
    const c = parseInt(part, 16);
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

/** WCAG contrast ratio between two six-digit hexes. */
const contrast = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Every `.ts`/`.tsx` file under `src/`, recursively. */
const sourceFiles = (dir: string = SRC_ROOT): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
};

describe('the brand ink', () => {
  it('keeps the shipped light-mode value on parchment', () => {
    // Light mode is unchanged by this fix: #5C3A1E on #F5F0E8 = 8.9:1.
    expect(lightColors.accent.brandInk).toBe('#5C3A1E');
    expect(contrast(lightColors.accent.brandInk, lightColors.background.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('flips the ink on the dark surface instead of staying fixed', () => {
    // The defect: the same #5C3A1E on #0A0A0C measured 1.96:1.
    expect(contrast('#5C3A1E', darkColors.background.primary)).toBeLessThan(3);
    // The fix: a different value, on the same hue and saturation, with
    // the lightness set for a near-black page.
    expect(darkColors.accent.brandInk).not.toBe(lightColors.accent.brandInk);
    expect(darkColors.accent.brandInk).toBe('#B27340');
    expect(contrast(darkColors.accent.brandInk, darkColors.background.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the tagline ink readable on both surfaces', () => {
    // The tagline is text under the lockup, so AA for text is the bar.
    expect(contrast(lightColors.accent.brandInkSoft, lightColors.background.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkColors.accent.brandInkSoft, darkColors.background.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the mark under the name in the dark theme', () => {
    // On a near-black page BOTH the mark and the wordmark are light, so
    // the name has to lead: the gold wordmark is 8.7:1, the mark 5.1:1.
    // If the mark ever passes the gold, the logo starts outshouting the
    // name it is supposed to introduce.
    expect(contrast(darkColors.accent.brandInk, darkColors.background.primary)).toBeLessThan(
      contrast(darkColors.accent.gold, darkColors.background.primary),
    );
  });

  it('keeps the light theme exactly as it shipped', () => {
    // On parchment the relationship is the other way round: the mark is
    // the dark element (8.9:1) and the gold wordmark is the light one
    // (2.6:1). A logotype is exempt from the text contrast minimum
    // (WCAG 1.4.3), and that pairing is the approved light design — this
    // fix must not move it.
    expect(contrast(lightColors.accent.brandInk, lightColors.background.primary)).toBeGreaterThan(
      contrast(lightColors.accent.gold, lightColors.background.primary),
    );
    expect(lightColors.accent.brandInk).toBe('#5C3A1E');
  });

  it('is drawn from the token, never from a literal', () => {
    // The token file is the one place the hexes belong.
    const offenders = sourceFiles()
      .filter(file => !file.endsWith(join('theme', 'tokens.ts')))
      .filter(file => {
        const text = readFileSync(file, 'utf8');
        return text.includes('#5C3A1E') || text.includes('#6B4226');
      })
      .map(file => file.slice(APP_ROOT.length + 1));

    expect(offenders).toEqual([]);
  });

  it('gives the Home header lion the token', () => {
    const header = readFileSync(
      join(SRC_ROOT, 'components', 'layout', 'HomeHeader', 'HomeHeader.tsx'),
      'utf8',
    );
    expect(header).toContain('colors.accent.brandInk');
  });
});
