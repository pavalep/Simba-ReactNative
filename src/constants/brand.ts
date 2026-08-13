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

export const BRAND = {
  /** The wordmark shown in the header / login splash. Title case. */
  name: 'Simba',
  /** The brand tagline — all lowercase, no terminal punctuation. */
  tagline: 'Your media, your way',
} as const;
