# SIMBA Mobile: UI/UX Elevation v7 — Brand Typography Refinement

> **Document Version:** 7.0.0
> **Supersedes:** `UI_UX_Elevation_Specification_v6.md`
> **Reference:** [`UI_UX_Elevation_Reference_v7_Addendum.md`](UI_UX_Elevation_Reference_v7_Addendum.md)
> **Tracker:** [`UI_UX_Elevation_Progress_Tracker_v7.md`](UI_UX_Elevation_Progress_Tracker_v7.md)
> **Target Platform:** React Native 0.86 (Android-primary, iOS-compatible)
> **Core Focus:** Introduce a script/cursive font for the SIMBA
> wordmark only; keep the rest of the app on a clean modern sans-serif
> (Inter). Add small circular leading icons to the three "Your
> Library" rails and a "View all" affordance on Movies + Podcasts.
> **No layout, navigation, color, or business-logic changes.**

---

## TABLE OF CONTENTS

1. Scope and Non-Goals
2. Design Philosophy v7
3. The Two-Font System
4. Reference Grounding
5. Wordmark Spec
6. UI Typography Spec
7. Library Rail Icon Spec
8. Discover "View all" Spec
9. Typography Token Changes
10. Font Installation
11. Font Linking (react-native-asset)
12. Per-Component Change List
13. Risks and Edge Cases
14. Verification Suite

---

## 1. SCOPE AND NON-GOALS

### In scope

- Replace the "SIMBA" wordmark with a script/cursive "Simba" in gold.
- Install Allura (or fallback) and Inter as the project fonts.
- Extend the typography token system with semantic style keys.
- Add a small circular icon to the left of each "Your Library"
  rail title (Recently Played, Bookmarks, Followed Podcasts).
- Add a "View all" link on Movies and Podcasts rows.
- Verify on Android emulator + iOS sim, light + dark mode, small
  + large device widths.

### Explicitly out of scope (do NOT touch)

- Navigation stack, auth flow, weather card, Lottie animations,
  CategoryCard art, bottom tab nav, splash screen, login screen,
  profile screen, settings, search, mini player, all player screens,
  bookmarks list, category list, genre screen, Archive, Radio, Live TV,
  Shows, Audiobooks, Discover rows other than Movies / Podcasts.
- Color palette.
- State management.
- API layer.
- Media playback.
- Animations on the wordmark itself (the reference is static).

---

## 2. DESIGN PHILOSOPHY v7

```
SIMBA
 ↓
 Brand personality
 ↓
 Modern UI typography
 ↓
 Content
```

The brand wordmark carries identity. Everything below it is
functional, modern, and consistent.

> **One font creates the identity.**
> **One font handles the entire interface.**
> This distinction is the whole point of v7.

The Home screen, the splash, the login, the player, the settings —
every screen — uses the same two-font system. The script font
appears **only** on the wordmark. No serif typography anywhere. No
additional script. No third font.

---

## 3. THE TWO-FONT SYSTEM

| Role | Family | Weights installed | Where it appears |
|---|---|---|---|
| **Brand script** | Allura (fallback Great Vibes → Alex Brush) | Regular only | Wordmark "Simba" only |
| **UI sans** | Inter | Regular, Medium, SemiBold, Bold | Everything else |

### Why Allura first

- Elegant, premium, slightly cinematic (matches the cinematic
  CategoryCard art already in the app).
- Readable at mobile header size (~44–58 px).
- Not a wedding invitation, not a retro diner, not a kids app.
- Open source (OFL 1.1, downloadable from Google Fonts).

### Why Great Vibes / Alex Brush as fallback

If Allura's available weights are limited or its rendering at small
sizes is illegible:

1. **Great Vibes** — slightly more dramatic, more stroke contrast.
2. **Alex Brush** — slightly less dramatic, more readable at small
   sizes.

We pick exactly **one**. We do NOT add a fallback chain in the
fontFamily prop — Allura is the binding choice; Great Vibes /
Alex Brush are the candidates we evaluate at install time, and
we keep the winning one.

### Why Inter

Already the de-facto modern UI sans. Tighter spacing than system
sans, designed for screen reading. We use it everywhere else.

---

## 4. REFERENCE GROUNDING

See [`UI_UX_Elevation_Reference_v7_Addendum.md`](UI_UX_Elevation_Reference_v7_Addendum.md)
for the manager's reference screenshot (annotated) and the
verbatim prompt.

### What the reference shows that v7 must produce

1. **Wordmark "Simba"** in a script font, title case, gold.
2. **Small circular icons** next to Recently Played, Bookmarks,
   Followed Podcasts rail titles.
3. **"View all" link** on Movies and Podcasts rows.

### What the reference shows that v7 must NOT change

Everything else — lion, tagline, greeting, weather, card art,
bottom nav, dividers, spacing, colors. v7 is a brand-typography
refinement, not a redesign.

---

## 5. WORDMARK SPEC

### Casing

- **Title case** "Simba" — not "SIMBA", not "simba".
- Reason: script fonts look more natural and elegant in title case.
  Allura specifically looks stiff and stencil-like in all-caps
  because its strokes are designed to flow.

### Font

- Allura Regular.
- fontFamily PostScript name as reported by the TTF metadata
  (verify at install time; do not assume `Allura-Regular` is the
  family name).

### Color

- The existing SIMBA gold (`#B8922E` = `colors.accent.gold`).
- Do not introduce a second gold tone.

### Size

- Target **44–58 px** on mobile, scaled to the existing
  responsive typography system.
- Current `typography.display` is `36px`. We do NOT change that —
  the wordmark uses its own semantic style.
- The semantic `brandScript` style is added with a `fontSize`
  driven by `useWindowDimensions` or by the existing
  `moderateScale()` if it exists. The spec targets:
  - Small phones (≤ 360 dp): 44 px
  - Default phones (375–414 dp): 48 px
  - Large phones / small tablets (≥ 480 dp): 52 px
  - The reference shows ~52 px on a 1080 dp screen, so our
    default is **48 px** with a clamp to 60 px max.

### Weight

- Allura ships in Regular only. The fontFamily in the style does
  NOT set `fontWeight` — Allura is a single-weight font.

### Line height

- The script font has high ascenders/descenders. We use
  `lineHeight: 56` for a 48 px font to keep the wordmark + tagline
  composition tight (the reference has no visible gap between
  "Simba" and "Your media, your way").

### Vertical alignment with the lion

- The lion's optical center is at the geometric center of its
  48×48 coin. The script wordmark's cap-height is roughly 70% of
  fontSize, so for a 48 px font, the cap-height is ~34 px, optical
  center at ~17 px from the top.
- The lion's optical center is at 24 px from the top of the 48 px
  coin. So the wordmark baseline should sit **at the same level**
  as the lion's optical center. In RN, this means we use
  `alignItems: 'center'` on the brand row and a single lineHeight
  that matches the lion's center to the script's optical middle.

### Spacing

- Lion-to-wordmark gap: **8 px** (was 12 px; tighten by 4 px so the
  composition feels closer, like one mark).
- Wordmark-to-tagline gap: **2 px** (was implicit; lock it).

---

## 6. UI TYPOGRAPHY SPEC

All UI text uses Inter. Existing weights in the project today have
**no** `fontFamily` set on the typography tokens — the `AppText`
component falls back to the system default. v7 sets
`fontFamily: 'Inter'` on every variant in the typography token set.

### Token → fontFamily / weight map

| Variant | Size | Weight | fontFamily |
|---|---|---|---|
| display | 36 | 800 | Inter (kept for future use) |
| h1 | 32 | 700 | Inter |
| h2 | 24 | 700 | Inter |
| h3 | 20 | 600 | Inter |
| body1 | 17 | 400 | Inter |
| body2 | 15 | 400 | Inter |
| bodySmall | 14 | 400 | Inter |
| caption | 13 | 400 | Inter |
| overline | 11 | 500 | Inter |
| button | 15 | 600 | Inter |
| tab | 13 | 500 | Inter |
| mono | 14 | 400 | monospace (unchanged) |
| **brandScript** *(new)* | 48 | — | **Allura** |

### Semantic style helpers (new, in `src/theme/typographyStyles.ts`)

```ts
export const semanticTypography = {
  brandScript: {fontFamily: 'Allura', fontSize: 48, lineHeight: 56},
  uiRegular:   {fontFamily: 'Inter',   fontWeight: '400'},
  uiMedium:    {fontFamily: 'Inter',   fontWeight: '500'},
  uiSemiBold:  {fontFamily: 'Inter',   fontWeight: '600'},
  uiBold:      {fontFamily: 'Inter',   fontWeight: '700'},
} as const;
```

These are **advisory**. The primary change is in the typography
token set (which is what `AppText` consumes). The semantic
helpers exist for places that need `fontFamily` directly without
going through `AppText` (e.g. `Text` from RN, or a
`react-native-svg` `<Text>`).

### AppText variant extension

- `AppText` gains a new `'brandScript'` variant (mapped to the
  typography token `brandScript`).
- All other variants pick up the Inter `fontFamily` automatically
  via the typography token.

### Tagline spec

- Font: Inter Regular (weight 400).
- Size: existing overline (11 px) is too small; bump to 13 px
  body2 weight 500 OR keep overline size and add letter-spacing.
- Decision: **use bodySmall (14 px) weight 400, letterSpacing
  +0.4**. This is closer to the reference which has a clearly
  readable but muted tagline. The existing `caption` variant is
  13 px / 400 and could also work; we pick bodySmall for the
  slight size bump.

---

## 7. LIBRARY RAIL ICON SPEC

The three "Your Library" rails in the reference each have a
small circular icon immediately to the left of the title.

### Icons (24 px diameter circular badge)

| Rail | Icon | SVG asset |
|---|---|---|
| Recently Played | clock face | `icons/clock.svg` (or `SvgIcon` `name='clock'`) |
| Bookmarks | bookmark ribbon | `icons/bookmark.svg` |
| Followed Podcasts | concentric rings | `icons/podcastRings.svg` |

If the exact `SvgIcon` names don't exist today, add them in the
same pass — this is a tiny addition to the icon set, not a
re-design.

### Visual treatment

- 32×32 px circular badge, gold-soft fill (`colors.accent.goldSoft` =
  `rgba(184,146,46,0.08)`) matching the bottom-nav active style.
- 18 px icon glyph in gold (`colors.accent.gold`).
- 8 px gap between the badge and the rail title.

### Where it lives

- `SectionHeader` gains an optional `leadingIcon` prop.
- `leadingIcon` is a `SvgIcon` name string; the component renders
  the badge + glyph to the left of the title.
- The 3 rails that need this pass the prop from
  `HomeScreen.tsx` / their respective shelf component.

### Out of scope

- Discover rails (Movies, Podcasts, etc.) do NOT get leading
  icons. The reference shows them without leading icons.
- Other internal pages do NOT get leading icons. v7 is Home-only.

---

## 8. DISCOVER "VIEW ALL" SPEC

The reference shows "View all →" on Movies and Podcasts rows.

### Today

- `MovieCategoriesShelf` has an "All" + curated tile row but does
  NOT surface a "View all" link above it. (Confirm at
  implementation time — the addendum says it's there in the
  reference.)
- `PodcastCategoriesShelf` is the same.

### v7 change

- Add a `SectionHeader` above the `MovieCategoriesShelf` row with
  `label="Movies"`, `actionLabel="View all"`, and the existing
  Movies-browse route handler.
- Add the same above `PodcastCategoriesShelf` for "Podcasts".
- Use the existing `SectionHeader` component (no new component).

### "View all" navigation

- Movies "View all" → `AllVideosScreen` (or the existing movies
  browse route) — confirm at implementation.
- Podcasts "View all" → `AllPodcastsScreen` (or existing) —
  confirm at implementation.

---

## 9. TYPOGRAPHY TOKEN CHANGES

File: `src/theme/tokens.ts`.

```ts
export interface TypographyTokens {
  display: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  overline: TextStyle;
  button: TextStyle;
  tab: TextStyle;
  mono: TextStyle;
  brandScript: TextStyle;       // NEW
}

export const typography: TypographyTokens = {
  display:   {fontFamily: 'Inter', fontSize: 36, fontWeight: '800', lineHeight: 44},
  h1:        {fontFamily: 'Inter', fontSize: 32, fontWeight: '700', lineHeight: 40},
  h2:        {fontFamily: 'Inter', fontSize: 24, fontWeight: '700', lineHeight: 32},
  h3:        {fontFamily: 'Inter', fontSize: 20, fontWeight: '600', lineHeight: 28},
  body1:     {fontFamily: 'Inter', fontSize: 17, fontWeight: '400', lineHeight: 24},
  body2:     {fontFamily: 'Inter', fontSize: 15, fontWeight: '400', lineHeight: 22},
  bodySmall: {fontFamily: 'Inter', fontSize: 14, fontWeight: '400', lineHeight: 20},
  caption:   {fontFamily: 'Inter', fontSize: 13, fontWeight: '400', lineHeight: 18},
  overline:  {fontFamily: 'Inter', fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5},
  button:    {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', lineHeight: 22, letterSpacing: 0.3},
  tab:       {fontFamily: 'Inter', fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: 0.2},
  mono:      {fontSize: 14, fontWeight: '400', lineHeight: 20, fontFamily: 'monospace'},
  brandScript: {fontFamily: 'Allura', fontSize: 48, lineHeight: 56},  // NEW
};
```

`brandScript.fontSize` is the default for ~375–414 dp devices.
The HomeHeader applies a `moderateScale()`-style clamp at
runtime to land in the 44–58 px range.

---

## 10. FONT INSTALLATION

### Files to add

```
assets/fonts/
├── Allura-Regular.ttf          (≈ 50 KB)
├── Inter-Regular.ttf           (≈ 300 KB)
├── Inter-Medium.ttf            (≈ 300 KB)
├── Inter-SemiBold.ttf          (≈ 300 KB)
└── Inter-Bold.ttf              (≈ 300 KB)
```

### Source

- Allura: Google Fonts (`fonts.google.com/specimen/Allura`), OFL.
- Inter: rsms.me (the Inter project's own distribution) or the
  Google Fonts distribution. OFL.

### Verify the family name

After downloading, inspect the TTF metadata to confirm the
PostScript family name. On macOS:
```bash
mdls -name kMDItemFonts assets/fonts/Allura-Regular.ttf
```
On Linux / Windows: open the TTF in fontforge or use a Node
script with `font-name` package.

If the PostScript name is `Allura-Regular` (most common), the
fontFamily in the style is `'Allura'`. If it's something else,
update the spec.

---

## 11. FONT LINKING (react-native-asset)

### react-native.config.js

```js
module.exports = {
  project: {
    android: {sourceDir: './android'},
    ios: {},
  },
  assets: ['./assets/fonts/'],  // NEW
};
```

### Link

```bash
npx react-native-asset
```

This command copies the fonts into:
- `android/app/src/main/assets/fonts/`
- `ios/<project>/Fonts/`
and updates `Info.plist` (iOS) and `build.gradle` (Android) to
register them.

### Verify

- Android: `ls android/app/src/main/assets/fonts/` shows the 5 TTFs.
- iOS: open `ios/CinePlayer.xcodeproj`, check the "Copy Bundle
  Resources" phase for the fonts.
- Build + cold-launch: the wordmark renders in script; every
  other text element renders in Inter.

### Fallback strategy

If `react-native-asset` fails on a platform, fall back to
manual:
- Android: drop the TTFs into
  `android/app/src/main/assets/fonts/`. No manifest change
  needed (RN auto-loads from there).
- iOS: drop the TTFs into the Xcode project, add to
  "Copy Bundle Resources", and add `UIAppFonts` entries to
  `Info.plist`.

---

## 12. PER-COMPONENT CHANGE LIST

| Component / file | Change |
|---|---|
| `src/theme/tokens.ts` | Add `brandScript` to `TypographyTokens` + the typography map. Set `fontFamily: 'Inter'` on every other variant. |
| `src/theme/typographyStyles.ts` *(new)* | Export `semanticTypography` with `brandScript`, `uiRegular`, `uiMedium`, `uiSemiBold`, `uiBold`. |
| `src/components/core/AppText/AppText.tsx` | Add `'brandScript'` to the `AppTextVariant` union + the `variantMap`. |
| `src/constants/brand.ts` | Change `BRAND.name` from `'SIMBA'` to `'Simba'`. |
| `src/components/layout/HomeHeader/HomeHeader.tsx` | Replace the `display`-variant `AppText` with `brandScript` variant. Tighten the lion-to-wordmark gap from `spacing.md` (12) to `spacing.sm` (8). Update tagline variant to `bodySmall` with letter-spacing. Apply a `useWindowDimensions` clamp on the wordmark font size to land 44–58 px. |
| `src/components/layout/Splash/*` *(if exists)* | Use `brandScript` for any wordmark rendered on the splash. |
| `src/screens/Login/LoginScreen.tsx` | Use `brandScript` for the wordmark on the Login screen. |
| `src/components/utility/SectionHeader/SectionHeader.tsx` | Add an optional `leadingIcon` prop (string — the `SvgIcon` name). When set, render a 32×32 gold-soft circular badge with the icon to the left of the title. |
| `src/screens/Home/HomeScreen.tsx` | Pass `leadingIcon` on the three "Your Library" rail `SectionHeader`s. Add a `SectionHeader` above Movies and Podcasts with `actionLabel="View all"` and the browse-route handler. |
| `src/components/utility/SvgIcon/SvgIcon.tsx` | Add `'clock'`, `'bookmark'`, `'podcastRings'` icons if not already present. (Confirm during implementation.) |
| `assets/fonts/Allura-Regular.ttf` | NEW |
| `assets/fonts/Inter-{Regular,Medium,SemiBold,Bold}.ttf` | NEW |
| `react-native.config.js` | Add `assets: ['./assets/fonts/']`. |
| `tsconfig.json` / `eslint` | No change. |

---

## 13. RISKS AND EDGE CASES

1. **Allura single weight.** Script fonts are almost always
   single-weight. We do not set `fontWeight` on the brandScript
   style — that would cause Android to fake-bold and look bad.
2. **iOS vs Android font rendering.** Inter and Allura may render
   with different vertical metrics on the two platforms. We test
   on both and tune `lineHeight` if the wordmark collides with
   the tagline.
3. **Header overflow on small phones.** A 48 px script wordmark
   with a 32 px tagline on a 320 dp wide screen can overflow
   past the search/avatar buttons. The header `flexShrink: 1`
   already handles the worst case; we verify with `useWindowDimensions`
   and shrink to 44 px below 360 dp.
4. **Font not loaded at first paint.** RN may render with the
   fallback for a frame on cold start. v7 uses a static
   `require()` in the typography token file, so the
   `fontFamily` is resolved synchronously — the fallback only
   shows if the TTF is not actually linked. If the user sees a
   fallback, `npx react-native-asset` was not run.
5. **Existing users on older bundles.** The persisted font
   reference resolves on app launch. No state migration needed.
6. **`BRAND.name` change.** Changing `'SIMBA'` to `'Simba'`
   affects the Login screen too. We update the Login screen in
   the same pass.
7. **SectionHeader.leadingIcon sizing.** The badge is 32×32
   on a 56+ px tall header row. The badge aligns to the title
   baseline. We verify visually that the badge + title + chevron
   fits in the 56 px row height.
8. **RTL / i18n.** Inter and Allura both support Latin only. v7
   does not introduce RTL. The brand wordmark and tagline are
   LTR-only. This is consistent with v6 and earlier.

---

## 14. VERIFICATION SUITE

### 14.1 Build + type-check

```bash
npx tsc --noEmit
```

Clean. New `'brandScript'` variant is wired into `AppText` and
`typography`; no `any` or unknown type errors.

### 14.2 Asset link

```bash
npx react-native-asset
ls -la android/app/src/main/assets/fonts/
```

All 5 TTFs present. iOS `Copy Bundle Resources` includes them
after opening `ios/CinePlayer.xcodeproj`.

### 14.3 Android emulator

- Cold launch the app.
- Home screen renders.
- Wordmark "Simba" appears in script (gold).
- Lion icon is unchanged.
- Tagline "Your media, your way" renders in Inter.
- Three library rails each have a small circular icon to the
  left of the title.
- Movies and Podcasts each have a "View all" link.
- Every other piece of text on the Home screen renders in Inter
  (no system default fallback visible).

### 14.4 iOS simulator (if available)

- Same as 14.3.
- No `fontFamily` warnings in Xcode console.

### 14.5 Light + dark mode

- Switch theme; wordmark still gold; tagline still muted; chip
  still works (P66 invariant).

### 14.6 Screen widths

- 320 dp, 360 dp, 411 dp, 480 dp: wordmark scales 44 → 48 → 52 px.
- No collision with search/avatar.

### 14.7 Cold-start invariants

- P67 invariant: cold start lands on Home if the user is
  authed, Login if not. v7 does not break this.

### 14.8 Font fallback smoke

- Disable the Allura TTF in the bundle and re-launch. The
  wordmark should fall back to system serif (not Inter) — a
  visible regression. This proves the script is loading from
  the bundle. Restore the TTF.

### 14.9 Accessibility / font scaling

- iOS Dynamic Type (Large / Extra Large): wordmark scales but
  does not push search/avatar off screen.
- Android `Settings > Display > Font size = Largest`: same.

### 14.10 Final screenshot

- Capture the Home screen on the Android emulator and compare
  to the reference. The wordmark, the rail icons, and the
  "View all" links should all line up.
