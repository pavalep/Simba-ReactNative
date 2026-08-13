# SIMBA Mobile: UI/UX Elevation v8 — Per-Weight Font Architecture
## Specification

> **Document Version:** 8.0.0
> **Status:** ✅ **COMPLETE (2026-08-13)** — full refactor shipped, emulator-verified
> **Supersedes:** v7 typography architecture (per-role keys + `fontWeight` axis)
> **Source issue:** Manrope SemiBold 22/600 rendered as Manrope **Bold** (chunky) on Android because the typography token's `fontWeight: '600'` is treated as an **axis hint** by Android's font manager, not as a hard selector. The same bug bit the HomeHeader user name "Paval" (`h2` Inter Bold 700 with inline `fontWeight: '800'` override), `SectionHeader.titleLarge` (Inter 800 on `displaySans` Manrope), `HomeMediaShelf.headerTitle`, `HomeBookmarksList.headerTitle`, etc. — 11 files had `fontWeight: '800'` overrides that were designed for Inter and break for the new Manrope / Allura / Cormorant families.

---

## 1. TL;DR

Replace the per-role `FONT_FAMILY` map (5 string keys) with a **per-family, per-weight nested map**. The `fontFamily` field in every `TextStyle` becomes a single string — the specific TTF's family name. The `fontWeight` field **disappears from the typography tokens entirely** (still legal in raw `TextStyle` for callers that need it, but no longer in the brand tokens).

This makes the family name encode the weight: there's no axis to misalign. The font manager picks the one TTF whose family name matches.

```ts
// BEFORE (v7 — cross-axis ambiguity):
fontFamily: FONT_FAMILY.displaySans,   // = 'Manrope'
fontWeight: '600',                     // Android picks Manrope-Bold (closest match)
```

```ts
// AFTER (v8 — weight is the key):
fontFamily: FONT_FAMILY.manrope.semibold,   // = 'Manrope' (only one SemiBold TTF)
                                          // no fontWeight needed; Manrope-SemiBold.ttf
                                          // is the only TTF that satisfies the family
                                          // name + style, so the manager picks it.
```

Same `fontFamily` value (the string `'Manrope'`) as before, but the architecture no longer depends on the `fontWeight` axis being correctly mapped. The PostScript family name is identical because that's how we ship the TTFs.

---

## 2. The Bug (for posterity)

**On Android, `fontWeight` is a hint, not a selector.** When you set `fontFamily: 'Manrope' + fontWeight: '600'`, Android's `Typeface` manager walks the available Manrope TTFs and picks the **closest** one by visual weight. With only `Manrope-SemiBold.ttf` (600) and `Manrope-Bold.ttf` (700) in the bundle, the "closest" pick is biased toward Bold for any weight ≥ 500 — so `'600'`, `'700'`, `'800'`, `'900'` all resolve to `Manrope-Bold.ttf`. That's why "Recently Played", "Bookmarks", "Followed Podcasts", "Movies" all rendered as the chunky Bold.

**On iOS the bug doesn't show** because iOS's font manager is more strict: `fontFamily: 'Manrope' + fontWeight: '600'` looks up the exact font description `(family=Manrope, weight=600)`. The static TTF has a name table entry with `weight=600`, so the manager picks it. Android skips the name-table lookup and does a "closest match" by visual stroke width instead.

**The same problem hits Allura** (single weight): `fontWeight: '700'` would fake-bold a single-weight font. We avoided that in v7 by *not* setting `fontWeight` on `brandScript`. But the same problem hit **Inter** with `fontWeight: '800'` overrides on `h2` / `display` — Android fakes extra-bold from Bold (700) → extra-bold (800), which is what the user saw on "Paval" in the HomeHeader.

The fix is to **encode the weight in the family key itself**. The `fontWeight` axis becomes a structural no-op for the brand typography.

---

## 3. New `FONT_FAMILY` Shape

```ts
// src/constants/fontFamily.ts (v8)

export const FONT_FAMILY = {
  // Allura — single weight, no fontWeight field ever.
  allura: 'Allura',

  // Cormorant Garamond — 3 weights we ship.
  cormorant: {
    regular: 'Cormorant Garamond',
    bold:    'Cormorant Garamond',
    italic:  'Cormorant Garamond',
  },

  // Manrope — 2 weights we ship.
  manrope: {
    semibold: 'Manrope',
    bold:     'Manrope',
  },

  // Inter — 4 weights we ship (the workhorse).
  inter: {
    regular:  'Inter',
    medium:   'Inter',
    semibold: 'Inter',
    bold:     'Inter',
  },

  // JetBrains Mono — 1 weight.
  jetbrainsMono: {
    regular: 'JetBrains Mono',
  },
} as const;

export type FontFamily =
  | typeof FONT_FAMILY.allura
  | typeof FONT_FAMILY.cormorant[keyof typeof FONT_FAMILY.cormorant]
  | typeof FONT_FAMILY.manrope[keyof typeof FONT_FAMILY.manrope]
  | typeof FONT_FAMILY.inter[keyof typeof FONT_FAMILY.inter]
  | typeof FONT_FAMILY.jetbrainsMono[keyof typeof FONT_FAMILY.jetbrainsMono];

// Role-keyed helpers — preserved as the *default* `fontFamily` for
// each typography role. Components can still write `fontFamily:
// FONT_FAMILY.inter.regular` to be explicit.
export const FONT_ROLE = {
  brandScript: FONT_FAMILY.allura,
  displaySerif: FONT_FAMILY.cormorant.bold,
  displaySans: FONT_FAMILY.manrope.semibold,
  ui: FONT_FAMILY.inter.regular,
  mono: FONT_FAMILY.jetbrainsMono.regular,
} as const;
```

**Key points:**
1. The leaf values are still **string family names** (not TTF filenames). The TTFs in `assets/fonts/` are unchanged.
2. Each leaf key maps to one TTF file. `(family='Manrope', style=normal, weight=600)` is unique to `Manrope-SemiBold.ttf`. Android's font manager picks the right one because there's only one match.
3. **`fontWeight` is removed from every typography token** in `tokens.ts`. Callers that need a specific Inter weight now write `fontFamily: FONT_FAMILY.inter.bold` directly.
4. `FONT_ROLE` keeps the per-role aliases for the typography tokens (so `typography.display = { fontFamily: FONT_ROLE.ui, fontSize: 36, ... }` still works, just with no `fontWeight` field).
5. Backward-compat export: `FONT_FAMILY.ui` etc. become deprecated aliases that resolve to the same string. We delete them at the end.

---

## 4. Typography Tokens (v8)

```ts
// src/theme/tokens.ts (v8)

export const typography: TypographyTokens = {
  // v3 Atlas variants — all Inter, weight selected via family key
  // (NOT via fontWeight). The font manager maps the family name to
  // the unique TTF.
  display:     {fontFamily: FONT_FAMILY.inter.bold,      fontSize: 36, lineHeight: 44},
  h1:          {fontFamily: FONT_FAMILY.inter.bold,      fontSize: 32, lineHeight: 40},
  h2:          {fontFamily: FONT_FAMILY.inter.bold,      fontSize: 24, lineHeight: 32},
  h3:          {fontFamily: FONT_FAMILY.inter.semibold,  fontSize: 20, lineHeight: 28},
  body1:       {fontFamily: FONT_FAMILY.inter.regular,   fontSize: 17, lineHeight: 24},
  body2:       {fontFamily: FONT_FAMILY.inter.regular,   fontSize: 15, lineHeight: 22},
  bodySmall:   {fontFamily: FONT_FAMILY.inter.regular,   fontSize: 14, lineHeight: 20},
  caption:     {fontFamily: FONT_FAMILY.inter.regular,   fontSize: 13, lineHeight: 18},
  overline:    {fontFamily: FONT_FAMILY.inter.medium,    fontSize: 11, lineHeight: 16, letterSpacing: 0.5},
  button:      {fontFamily: FONT_FAMILY.inter.semibold,  fontSize: 15, lineHeight: 22, letterSpacing: 0.3},
  tab:         {fontFamily: FONT_FAMILY.inter.medium,    fontSize: 13, lineHeight: 18, letterSpacing: 0.2},
  mono:        {fontFamily: FONT_FAMILY.jetbrainsMono.regular, fontSize: 13, lineHeight: 20},
  // v7 brand roles — unchanged shape, but family key encodes weight.
  brandScript: {fontFamily: FONT_FAMILY.allura,                  fontSize: 48, lineHeight: 56},
  displaySerif:{fontFamily: FONT_FAMILY.cormorant.bold,          fontSize: 48, lineHeight: 56},
  displaySans: {fontFamily: FONT_FAMILY.manrope.semibold,        fontSize: 22, lineHeight: 28},
};
```

**No `fontWeight` field in any token.** Each token's `fontFamily` is the only selector. Android's font manager picks the TTF whose name table entry matches `(family, style, weight)`, and since each TTF has a unique weight, the pick is deterministic.

---

## 5. AppText Variant Resolution (v8)

`AppText` itself doesn't change shape — `variant` → `variantMap` → `typography[variant]` is the same. The change is in what the typography tokens contain. The `color` resolution is also unchanged.

```ts
// src/components/core/AppText/AppText.tsx (v8)
const variantMap: Record<AppTextVariant, keyof ThemeContextValue['typography']> = {
  // ... unchanged
};
```

---

## 6. Migration Map (v7 → v8)

| v7 string | v8 nested |
|---|---|
| `FONT_FAMILY.brandScript` | `FONT_FAMILY.allura` |
| `FONT_FAMILY.displaySerif` | `FONT_FAMILY.cormorant.bold` (or `.regular` / `.italic` depending on use) |
| `FONT_FAMILY.displaySans` | `FONT_FAMILY.manrope.semibold` (or `.bold`) |
| `FONT_FAMILY.ui` | `FONT_FAMILY.inter.regular` (or `.medium` / `.semibold` / `.bold`) |
| `FONT_FAMILY.mono` | `FONT_FAMILY.jetbrainsMono.regular` |

The `FONT_ROLE` alias map keeps the v7 shape working until callers migrate.

---

## 7. Files to Touch (estimated)

1. **Core (3):**
   - `src/constants/fontFamily.ts` — restructure to nested + add `FONT_ROLE`
   - `src/theme/tokens.ts` — drop `fontWeight` from every token
   - `src/components/core/AppText/AppText.tsx` — unchanged (consumes tokens)

2. **Semantic helpers (1):**
   - `src/theme/typographyStyles.ts` — drop `fontWeight` from `uiMono` etc.

3. **Inline overrides (11):** every file with `fontWeight: '800'`:
   - `src/components/utility/SectionHeader/SectionHeader.tsx` (already partially cleaned in v7)
   - `src/components/feedback/Toast/Toast.tsx:288`
   - `src/components/player/AudioPlayer/AudioPlayer.tsx:620`
   - `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx:176`
   - `src/screens/Home/components/FeaturedHeroBanner.tsx:201`
   - `src/screens/Home/components/HomeBookmarksList.tsx:206`
   - `src/screens/Home/components/HomeMediaShelf.tsx:267`
   - `src/screens/Song/components/SongHero.tsx:122`
   - `src/screens/VideoPlayer/components/SecondaryToolbar.tsx:306`
   - `src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx:208`

4. **Other `fontWeight:` overrides (lighter weights 500/600/700):** leave the
   `fontWeight: '500'` / `'600'` / `'700'` overrides alone where they are
   applied to **Inter** specifically (the Inter TTF family has all 4 weights,
   so the font manager picks the right one). Only the 11 `'800'`/`'900'`
   overrides are problematic (Android fakes-bold from Bold → extra-bold).

---

## 8. Why This Fixes the Bug

The bug is **Android's font-weight picker is biased to Bold for weights > 500 when the family has only 2 weight files**. Two equivalent fixes:

1. **Add more weight TTFs** (e.g. `Manrope-Regular.ttf` at 400 and `Manrope-ExtraBold.ttf` at 800). Doesn't help — we still don't have a 600 TTF (SemiBold is 600 but Android reads the visual weight and rounds it).
2. **Eliminate the `fontWeight` axis for the family.** Make the family key itself encode the weight. Then Android has exactly one TTF per (family, style) tuple, and the pick is deterministic.

v8 takes fix #2 because it requires zero new TTF downloads and works for all 5 families.

---

## 9. Backward Compatibility

The v7 keys (`FONT_FAMILY.ui`, `FONT_FAMILY.displaySans`, etc.) are kept as
deprecated aliases during the migration window:

```ts
// DEPRECATED — use FONT_FAMILY.inter.regular instead.
export const FONT_FAMILY = {
  // ... new nested shape
  ui: 'Inter',            // → FONT_FAMILY.inter.regular
  displaySans: 'Manrope', // → FONT_FAMILY.manrope.semibold
  displaySerif: 'Cormorant Garamond', // → FONT_FAMILY.cormorant.bold
  brandScript: 'Allura',  // → FONT_FAMILY.allura
  mono: 'JetBrains Mono', // → FONT_FAMILY.jetbrainsMono.regular
} as const;
```

The deprecation flag is a `@deprecated` JSDoc comment + a console.warn in
dev mode. We sweep the codebase to remove the old keys once everything
migrates.

---

## 10. Verification (Wave 2 of v8)

1. `npx tsc --noEmit` clean
2. Rebuild APK, cold launch emulator
3. Visual check at every screen: rail titles are now **Manrope SemiBold** (600 visual, the medium-weight version), not Manrope Bold
4. "Paval" in HomeHeader is now **Inter Bold** (clean 700, no extra-bold fakery)
5. All 5 family fallbacks still work: disable each TTF, verify system fallback
6. Splash reduce-motion: unchanged (no impact on this wave)
7. Android logcat: no `FontFamily` warnings

---

## 11. Rollback

If v8 needs to be reverted:

1. Revert `src/constants/fontFamily.ts` to the v7 flat shape.
2. Revert `src/theme/tokens.ts` (add back `fontWeight` on every variant).
3. Revert the 11 `fontWeight: '800'` overrides (re-add the inline weight).

v8 doesn't touch any TTF files, doesn't change Android/iOS asset bundles,
doesn't touch the spec sheets. The rollback is ~30 minutes of source-tree
reverts.
