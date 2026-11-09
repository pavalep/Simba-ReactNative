// ─── Font family constants ────────────────────────────────────────
// Single source of truth for every fontFamily string used in the app,
// and for the weight that selects the file.
//
// ─── HOW A FONT IS ACTUALLY RESOLVED (verified against the sources,
//     not against documentation) ─────────────────────────────────────
//
// Android (React Native):
//   ReactFontManager.kt builds the asset path FROM the family string:
//     "fonts/" + <fontFamily> + <styleSuffix> + <fileExtension>
//   (node_modules/react-native/ReactAndroid/src/main/java/com/facebook/
//    react/common/assets/ReactFontManager.kt:162-178)
//   styleSuffix comes from the weight, via `nearestStyle` (same file,
//   :138-144):  weight < 700 -> "" | "_italic";  weight >= 700 ->
//   "_bold" | "_bold_italic".
//   If the asset is missing, RN falls back to the SYSTEM font
//   (same file, :187) — silently. The TTF's internal name table
//   (nameId=1) is never consulted on Android.
//
// iOS (React Native):
//   RCTFont.mm resolves the family against the REGISTERED families
//   (node_modules/react-native/React/Views/RCTFont.mm:478-491) and
//   picks the face whose weight is closest to the requested one. With
//   no fontWeight in the style the requested weight is 400 (same file,
//   :401, :426), so a family that contains a Bold face still renders
//   its Regular face.
//
// ─── THE RULE THIS FILE ENFORCES ───────────────────────────────────
//
//   1. The family string is the TTF's `nameId=1` family name.
//   2. The shipped file is named `<family><styleSuffix>.ttf`, so the
//      path RN builds is exactly the path that exists.
//   3. Where one family ships several files (Inter Regular + Bold,
//      Cormorant Garamond Regular + Bold + Italic), the weight is
//      carried by the typography token's `fontWeight` (see
//      `src/theme/tokens.ts`) — which is what picks the file.
//   4. Where the weight is baked into the family name by the font
//      vendor (Inter Medium, Inter SemiBold, Manrope SemiBold), the
//      family name alone is the selector, and the weight stays below
//      700 so the suffix stays empty.
//
// `scripts/check-font-resolution.js` resolves every usage in `src/`
// against the shipped Android assets and fails if any of them falls
// back to the system font.
//
// USAGE
//
//   import {FONT_FAMILY} from '@/constants/fontFamily';
//   ...
//   <Text style={{fontFamily: FONT_FAMILY.cormorant.bold}}> ... </Text>
//   <Text style={{fontFamily: FONT_FAMILY.allura}}>Simba</Text>
//
// See also:
//   • `src/theme/tokens.ts` — the typography variants carry the weights.
//   • `src/components/core/AppText/AppText.tsx` — `AppText variant="..."`.
//   • `md/SIMBA_APP_PAGE_ISSUE_SCAN.md` — S-025 … S-028, the evidence
//     for the rule above.

export const FONT_FAMILY = {
  // ─── Allura (single weight) ───────────────────────────────────
  /** Brand wordmark — Allura. Single weight; never set `fontWeight`.
   *  Ships as `fonts/Allura.ttf`; the TTF's nameId=1 family is
   *  "Allura", which is also the name iOS resolves it by. */
  allura: 'Allura',

  // ─── Cormorant Garamond (3 weights) ───────────────────────────
  /** Cormorant Garamond weight variants. The family string is shared
   *  by all three — the weight selects the file:
   *    regular → fonts/Cormorant Garamond.ttf
   *    bold    → fonts/Cormorant Garamond_bold.ttf   (weight 700)
   *    italic  → fonts/Cormorant Garamond_italic.ttf (style italic) */
  cormorant: {
    /** Cormorant Garamond Regular (400). */
    regular: 'Cormorant Garamond',
    /** Cormorant Garamond Bold (700). Use for hero titles.
     *  Needs `fontWeight: '700'` on the style, or the Regular file is
     *  picked instead. */
    bold: 'Cormorant Garamond',
    /** Cormorant Garamond Italic (400). Use for tagline accent.
     *  Needs `fontStyle: 'italic'` on the style. */
    italic: 'Cormorant Garamond',
  },

  // ─── Manrope (2 weights) ──────────────────────────────────────
  /** Manrope weight variants. */
  manrope: {
    /** Manrope SemiBold (600). Use for section titles.
     *  `Manrope-SemiBold.ttf` bakes the weight into `nameId=1`
     *  ("Manrope SemiBold"), so the family name alone selects the
     *  file — provided the weight stays below 700. */
    semibold: 'Manrope SemiBold',
    /** Manrope Bold (700). `Manrope-Bold.ttf` uses the plain family
     *  "Manrope" with subfamily "Bold", so this needs
     *  `fontWeight: '700'` to reach `fonts/Manrope_bold.ttf`. */
    bold: 'Manrope',
  },

  // ─── Inter (4 weights, workhorse) ─────────────────────────────
  /** Inter weight variants. */
  inter: {
    /** Inter Regular (400). `fonts/Inter.ttf`. */
    regular: 'Inter',
    /** Inter Medium (500). `Inter-Medium.ttf` bakes the weight into
     *  `nameId=1` ("Inter Medium"), so the family name alone selects
     *  the file — provided the weight stays below 700. */
    medium: 'Inter Medium',
    /** Inter SemiBold (600). `Inter-SemiBold.ttf` bakes the weight
     *  into `nameId=1` ("Inter SemiBold"), so the family name alone
     *  selects the file — provided the weight stays below 700. */
    semibold: 'Inter SemiBold',
    /** Inter Bold (700). `fonts/Inter_bold.ttf`. Needs
     *  `fontWeight: '700'` on the style. */
    bold: 'Inter',
  },

  // ─── JetBrains Mono (1 weight) ─────────────────────────────────
  /** JetBrains Mono weight variants. */
  jetbrainsMono: {
    /** JetBrains Mono Regular (400). Code / monospace.
     *  `fonts/JetBrains Mono.ttf`. */
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
  displaySans: 'Manrope SemiBold',
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
  /** Brand wordmark role — Allura (single weight). */
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
