// ─── Font family constants ────────────────────────────────────────
// Single source of truth for every fontFamily string used in the
// app. v8 architecture: per-family, per-weight nested map. The
// `fontWeight` axis has been REMOVED from the typography tokens —
// each leaf key maps to exactly one TTF, so Android's font manager
// picks the right file by family-name + style lookup (no axis
// ambiguity).
//
// The 5 families are the v7 brand typography:
//
//   Allura              — wordmark (script, single weight)
//   Cormorant Garamond  — cinematic display / hero titles
//   Manrope             — section titles
//   Inter               — UI body (workhorse, ~80% of all text)
//   JetBrains Mono      — code / monospace
//
// USAGE
//
//   import { FONT_FAMILY } from '@/constants/fontFamily';
//   ...
//   <Text style={{ fontFamily: FONT_FAMILY.cormorant.bold }}> ... </Text>
//   <Text style={{ fontFamily: FONT_FAMILY.allura }}>Simba</Text>
//
// Why per-weight keys (not a flat "Inter" + fontWeight: '700'):
//   • Android's font-weight picker is biased to Bold for weights
//     > 500 when the family has only 2 weight files. So
//     `fontFamily: 'Manrope' + fontWeight: '600'` resolves to
//     Manrope-Bold.ttf (chunky) instead of Manrope-SemiBold.ttf
//     (correct). Encoding the weight in the family key eliminates
//     the cross-axis ambiguity — there's only one TTF that
//     matches the family, so the pick is deterministic.
//   • iOS is stricter, so the bug doesn't show there. v8 is a
//     no-op for iOS (the family name is the same string).
//
// ⚠️  CRITICAL: each leaf key MUST match the TTF's `name` table
// `nameId=1` (family name) EXACTLY. Android's font manager
// matches the `fontFamily` string against `nameId=1` byte-for-byte.
// Some Google Fonts TTFs (Inter Medium, Inter SemiBold, Manrope
// SemiBold) bake the weight into `nameId=1` (e.g. "Inter Medium"),
// while the regular/bold variants of the same family use a plain
// family name (e.g. "Inter"). Verify with:
//   `node scripts/dump-ttf-name.js <path-to-ttf>`
// and look for the `(family)` row.
//
// Role aliases (`FONT_ROLE`):
//   • The v7 per-role keys (`FONT_FAMILY.displaySans`, etc.) are
//     still exported as deprecated flat aliases for callers that
//     haven't migrated yet. The `FONT_ROLE` map is the intentional,
//     non-deprecated way to refer to a role's default family.
//
// See also:
//   • `src/theme/tokens.ts` — typography variants reference these.
//   • `src/components/core/AppText/AppText.tsx` — `AppText variant="..."`.
//   • `md/UI_UX_Elevation_Specification_v8.md` for the full rationale.

export const FONT_FAMILY = {
  // ─── Allura (single weight, no fontWeight) ────────────────────
  /** Brand wordmark — Allura. Single weight; never set `fontWeight`. */
  allura: 'Allura',

  // ─── Cormorant Garamond (3 weights) ───────────────────────────
  /** Cormorant Garamond weight variants. */
  cormorant: {
    /** Cormorant Garamond Regular (400). */
    regular: 'Cormorant Garamond',
    /** Cormorant Garamond Bold (700). Use for hero titles. */
    bold: 'Cormorant Garamond',
    /** Cormorant Garamond Italic (400). Use for tagline accent. */
    italic: 'Cormorant Garamond',
  },

  // ─── Manrope (2 weights) ──────────────────────────────────────
  /** Manrope weight variants. */
  manrope: {
    /** Manrope SemiBold (600). Use for section titles.
     *  ⚠️  nameId=1 in Manrope-SemiBold.ttf is "Manrope SemiBold"
     *  (not "Manrope"). Android matches the family name byte-
     *  for-byte, so we use the full name from the TTF. */
    semibold: 'Manrope SemiBold',
    /** Manrope Bold (700). nameId=1 in Manrope-Bold.ttf is plain
     *  "Manrope" with subfamily "Bold". */
    bold: 'Manrope',
  },

  // ─── Inter (4 weights, workhorse) ─────────────────────────────
  /** Inter weight variants.
   *  ⚠️  Inter Medium + Inter SemiBold bake the weight into
   *  nameId=1 (e.g. "Inter Medium"); Inter Regular + Inter Bold
   *  use plain "Inter" with subfamily "Regular"/"Bold". */
  inter: {
    /** Inter Regular (400). nameId=1 = "Inter". */
    regular: 'Inter',
    /** Inter Medium (500). nameId=1 = "Inter Medium". */
    medium: 'Inter Medium',
    /** Inter SemiBold (600). nameId=1 = "Inter SemiBold". */
    semibold: 'Inter SemiBold',
    /** Inter Bold (700). nameId=1 = "Inter", subfamily "Bold". */
    bold: 'Inter',
  },

  // ─── JetBrains Mono (1 weight) ────────────────────────────────
  /** JetBrains Mono weight variants. */
  jetbrainsMono: {
    /** JetBrains Mono Regular (400). Code / monospace. */
    regular: 'JetBrains Mono',
  },

  // ─── v7 DEPRECATED flat aliases (kept for backward compat) ────
  // These resolve to the same string the v7 map exposed, so any
  // caller still using `FONT_FAMILY.ui` / `displaySans` / etc.
  // keeps working until migrated. Remove once v7 callers are gone.

  /** @deprecated use FONT_FAMILY.allura */
  brandScript: 'Allura',
  /** @deprecated use FONT_FAMILY.cormorant.bold */
  displaySerif: 'Cormorant Garamond',
  /** @deprecated use FONT_FAMILY.manrope.semibold */
  displaySans: 'Manrope',
  /** @deprecated use FONT_FAMILY.inter.regular */
  ui: 'Inter',
  /** @deprecated use FONT_FAMILY.jetbrainsMono.regular */
  mono: 'JetBrains Mono',
} as const;

// ─── Per-role default family (the new, non-deprecated way) ────
// Use these in the typography tokens (e.g. `brandScript:
// FONT_ROLE.brandScript`) so the role-to-family mapping is
// explicit. Components that need a specific weight can use the
// nested FONT_FAMILY keys directly.
export const FONT_ROLE = {
  /** Brand wordmark role — Allura. */
  brandScript: 'Allura' as const,
  /** Cinematic display / hero titles role — Cormorant Garamond Bold. */
  displaySerif: 'Cormorant Garamond' as const,
  /** Section titles role — Manrope SemiBold. */
  displaySans: 'Manrope SemiBold' as const,
  /** UI body role — Inter Regular (token variants override to specific weights). */
  ui: 'Inter' as const,
  /** Code / monospace role — JetBrains Mono. */
  mono: 'JetBrains Mono' as const,
};

// ─── FontFamily union (covers every leaf string) ──────────────
export type FontFamily =
  | typeof FONT_FAMILY.allura
  | typeof FONT_FAMILY.cormorant[keyof typeof FONT_FAMILY.cormorant]
  | typeof FONT_FAMILY.manrope[keyof typeof FONT_FAMILY.manrope]
  | typeof FONT_FAMILY.inter[keyof typeof FONT_FAMILY.inter]
  | typeof FONT_FAMILY.jetbrainsMono[keyof typeof FONT_FAMILY.jetbrainsMono];
