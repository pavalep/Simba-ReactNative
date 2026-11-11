// ─── Brand constants ──────────────────────────────────────────────
// Single source of truth for the SIMBA brand text. Used by the
// Login screen, the Home header, and any future surface that
// needs the official wordmark + tagline. Keep these strings in
// sync with the marketing copy — do not duplicate them in
// component files.
//
// v7: the wordmark is now title-case "Simba" (rendered in the
// Allura script font via `variant="brandScript"` on `AppText`).
// Script fonts are designed for title case — all-caps looks
// stiff and weird in Allura.

import type {TextStyle} from 'react-native';
import {FONT_FAMILY} from './fontFamily';

export const BRAND = {
  /** The wordmark shown in the header / login splash. Title case. */
  name: 'Simba',
  /** The brand tagline — all lowercase, no terminal punctuation. */
  tagline: 'Your media, your way',
} as const;

/**
 * The tagline's type — the ONE owner of the lockup tagline.
 *
 * The Login draws the brand lockup: the lion, the wordmark "Simba", and
 * the tagline "Your media, your way". The tagline was the one part of that
 * lockup each screen owned for itself, and the JS Splash's copy did not fit
 * on the screen.
 *
 * Measured on the real font file — the advance widths Android lays the
 * line out from, not an estimate:
 *
 *   Cormorant Garamond Bold 48/56  ->  414.6 dp wide
 *   usable width on a 411 dp screen  ->  347 dp   (411 - 2 x 32 padding)
 *
 * so the Splash's tagline wrapped onto two lines inside the lockup. That
 * screen is gone now (2026-11-11) — the native `SplashActivity` is the
 * app's splash — but the shared owner stays: a per-screen copy of the type
 * is exactly how the two diverged in the first place.
 *
 * The face is Cormorant Garamond ITALIC: the `displaySerif` token is the
 * Bold face, and a bold serif at this size outweighs the wordmark above
 * it — the Login screen says so in its own words.
 *
 * `fontWeight: '400'` is required: 700 + italic resolves to
 * `Cormorant Garamond_bold_italic.ttf`, which does not ship — RN would
 * fall back to the system font silently.
 *
 * At 22/28 with 0.4 letter spacing the line is 182.8 dp wide: one line,
 * and quiet enough to sit under the name.
 */
export const LOCKUP_TAGLINE: TextStyle = {
  fontFamily: FONT_FAMILY.cormorant.italic,
  fontStyle: 'italic',
  fontWeight: '400',
  fontSize: 22,
  lineHeight: 28,
  letterSpacing: 0.4,
  textAlign: 'center',
};
