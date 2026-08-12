# SIMBA Mobile: UI/UX Elevation v7 — Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v7.md`](UI_UX_Elevation_Specification_v7.md)
> **Reference:** [`UI_UX_Elevation_Reference_v7_Addendum.md`](UI_UX_Elevation_Reference_v7_Addendum.md)
> **Supersedes:** `UI_UX_Elevation_Progress_Tracker_v6.md`
> **Purpose:** Track all 16 phases of v7 — Brand Typography Refinement.
> Install Allura + Inter, wire the typography tokens, swap the
> wordmark, add library rail leading icons, add Movies / Podcasts
> "View all". Execute without waiting for further orders.

---

## Implementation Strategy

The 16 phases are organized into 6 waves (3 phases per wave, with the
last wave being 2 phases). Each wave has a gate; pass the gate before
proceeding.

```
WAVE 1: FONTS (Phases 1-3)
├── 1.1 Font Files Download
├── 1.2 Font Family Name Verification
└── 1.3 react-native.config.js + react-native-asset
    ↓ GATE: tsc clean; assets linked to android + ios

WAVE 2: TYPOGRAPHY SYSTEM (Phases 4-6)
├── 2.1 Typography Tokens + brandScript variant
├── 2.2 AppText brandScript wiring
└── 2.3 semanticTypography helpers
    ↓ GATE: tsc clean; AppText('brandScript') renders Allura

WAVE 3: WORDMARK (Phases 7-9)
├── 3.1 BRAND.name → 'Simba'
├── 3.2 HomeHeader wordmark + tagline
└── 3.3 Splash + Login wordmark
    ↓ GATE: cold-launch shows "Simba" in script; Login matches

WAVE 4: LIBRARY RAIL ICONS (Phases 10-12)
├── 4.1 SvgIcon: clock, bookmark, podcastRings
├── 4.2 SectionHeader.leadingIcon prop
└── 4.3 HomeScreen wiring for 3 rails
    ↓ GATE: each "Your Library" rail shows a circular gold icon

WAVE 5: DISCOVER "VIEW ALL" (Phases 13-15)
├── 13.1 Movies SectionHeader
├── 13.2 Podcasts SectionHeader
└── 13.3 Browse-route handlers
    ↓ GATE: Movies + Podcasts rows have "View all" affordance

WAVE 6: VERIFICATION (Phase 16)
└── 16.1 Full verification suite
    ↓ GATE: all checks pass on Android emulator + iOS sim
```

---

## WAVE 1: FONTS (Phases 1-3)

### Phase 1.1 — Font Files Download
**Files:** `assets/fonts/Allura-Regular.ttf`,
`assets/fonts/Inter-Regular.ttf`, `assets/fonts/Inter-Medium.ttf`,
`assets/fonts/Inter-SemiBold.ttf`, `assets/fonts/Inter-Bold.ttf`
**Source:** Google Fonts (Allura) + Inter official distribution
(Inter). Both OFL 1.1.
**Status:** ⬜ not started

- [ ] Download Allura Regular TTF
- [ ] Download Inter Regular TTF
- [ ] Download Inter Medium TTF
- [ ] Download Inter SemiBold TTF
- [ ] Download Inter Bold TTF
- [ ] Place all 5 in `assets/fonts/`
- [ ] Verify file sizes are non-zero (Inter is ~300 KB each)

### Phase 1.2 — Font Family Name Verification
**Status:** ⬜ not started

- [ ] Inspect Allura TTF PostScript family name (expected:
  `Allura`)
- [ ] Inspect Inter Regular family name (expected: `Inter Regular`
  → family `Inter`)
- [ ] Inspect Inter Medium family name (expected: `Inter Medium`
  → family `Inter`)
- [ ] Inspect Inter SemiBold family name (expected: `Inter
  SemiBold` → family `Inter`)
- [ ] Inspect Inter Bold family name (expected: `Inter Bold` →
  family `Inter`)
- [ ] If any name is different from expected, update the spec and
  note in the final report

### Phase 1.3 — react-native.config.js + react-native-asset
**Files:** `react-native.config.js`, `android/app/src/main/assets/fonts/`,
`ios/CinePlayer/Info.plist` (if needed)
**Status:** ⬜ not started

- [ ] Add `assets: ['./assets/fonts/']` to `react-native.config.js`
- [ ] Run `npx react-native-asset`
- [ ] Verify Android: `ls android/app/src/main/assets/fonts/` shows
  all 5 TTFs
- [ ] Verify iOS: TTFs added to Xcode project, "Copy Bundle
  Resources" phase, `UIAppFonts` entries in `Info.plist` (RN's
  asset linker handles this)
- [ ] `npx tsc --noEmit` still clean

**Gate 1 ✅:** all 5 fonts present in both native bundles; tsc
clean; bundle IDs resolve to Allura + Inter at runtime.

---

## WAVE 2: TYPOGRAPHY SYSTEM (Phases 4-6)

### Phase 2.1 — Typography Tokens + brandScript Variant
**File:** `src/theme/tokens.ts`
**Status:** ⬜ not started

- [ ] Add `brandScript: TextStyle;` to `TypographyTokens` interface
- [ ] Add `fontFamily: 'Inter'` to every existing variant in the
  `typography` object (display, h1, h2, h3, body1, body2,
  bodySmall, caption, overline, button, tab). `mono` stays as
  `monospace`.
- [ ] Add `brandScript: {fontFamily: 'Allura', fontSize: 48,
  lineHeight: 56}` to the typography object
- [ ] No `fontWeight` on `brandScript` (Allura is single-weight;
  faking bold looks bad)
- [ ] `npx tsc --noEmit` clean

### Phase 2.2 — AppText brandScript Wiring
**File:** `src/components/core/AppText/AppText.tsx`
**Status:** ⬜ not started

- [ ] Add `'brandScript'` to the `AppTextVariant` union
- [ ] Add `brandScript: 'brandScript'` to the `variantMap`
- [ ] `npx tsc --noEmit` clean
- [ ] Smoke: any `AppText variant="brandScript"` renders in Allura

### Phase 2.3 — semanticTypography Helpers (new file)
**File:** `src/theme/typographyStyles.ts` (new)
**Status:** ⬜ not started

- [ ] Create the file with `semanticTypography` object exporting
  `brandScript`, `uiRegular`, `uiMedium`, `uiSemiBold`, `uiBold`
- [ ] Add an index export to `src/theme/index.ts` if that file
  exists
- [ ] `npx tsc --noEmit` clean

**Gate 2 ✅:** AppText supports `variant="brandScript"`; every
other variant resolves to Inter; tsc clean.

---

## WAVE 3: WORDMARK (Phases 7-9)

### Phase 7 — BRAND.name → 'Simba'
**File:** `src/constants/brand.ts`
**Status:** ⬜ not started

- [ ] Change `BRAND.name` from `'SIMBA'` to `'Simba'`
- [ ] Keep `BRAND.tagline` as `'Your media, your way'`
- [ ] `npx tsc --noEmit` clean

### Phase 8 — HomeHeader Wordmark + Tagline
**File:** `src/components/layout/HomeHeader/HomeHeader.tsx`
**Status:** ⬜ not started

- [ ] Change the wordmark `AppText` from `variant="display"` to
  `variant="brandScript"`
- [ ] Update wordmark style: drop the existing
  `{letterSpacing: -1, lineHeight: 38}` (script fonts are not
  letter-spaced the same way; Allura's natural spacing is correct)
- [ ] Apply a `useWindowDimensions` clamp to the brandScript
  fontSize to land in 44–58 px range (≤360 dp → 44, 361–479 dp
  → 48, ≥480 dp → 52)
- [ ] Change the tagline `AppText` from `variant="overline"` to
  `variant="bodySmall"` with `letterSpacing: 0.4`
- [ ] Tighten the lion-to-wordmark `gap` from `spacing.md` (12) to
  `spacing.sm` (8)
- [ ] Tighten the wordmark-to-tagline `marginTop` from 2 to 0
  (let the lineHeight do the work; script fonts need extra
  vertical space)
- [ ] Verify the wordmark + tagline composition on a 1080 dp
  emulator screenshot — match the reference

### Phase 9 — Splash + Login Wordmark
**Files:** `src/screens/Splash/SplashScreen.tsx` (or equivalent),
`src/screens/Login/LoginScreen.tsx`
**Status:** ⬜ not started

- [ ] Splash: replace the wordmark with `AppText
  variant="brandScript"`. Match the Home header's size + color.
- [ ] Login: replace the wordmark with `AppText
  variant="brandScript"`. Match.
- [ ] Both: verify `BRAND.name` change (`'Simba'`) propagates

**Gate 3 ✅:** Home, Splash, and Login all show "Simba" in
script, gold, sized 44–58 px. Lion unchanged.

---

## WAVE 4: LIBRARY RAIL ICONS (Phases 10-12)

### Phase 10 — SvgIcon Additions
**File:** `src/components/utility/SvgIcon/SvgIcon.tsx` (and the
icon registry)
**Status:** ⬜ not started

- [ ] Confirm whether `clock`, `bookmark`, and `podcastRings`
  icon names already exist in the registry
- [ ] If not, add SVG paths for each (24×24 viewBox)
- [ ] Verify the icons render in the SvgIcon smoke test
- [ ] Icons: gold (`#B8922E`) on a 32×32 gold-soft circular
  badge

### Phase 11 — SectionHeader.leadingIcon Prop
**File:** `src/components/utility/SectionHeader/SectionHeader.tsx`
**Status:** ⬜ not started

- [ ] Add `leadingIcon?: string` to `SectionHeaderProps`
- [ ] When `leadingIcon` is set, render a 32×32 circular gold-soft
  badge to the left of the title, with the named icon as an 18 px
  glyph
- [ ] 8 px gap between the badge and the title
- [ ] Align the badge to the title baseline (center the badge
  vertically in the header row)
- [ ] `npx tsc --noEmit` clean

### Phase 12 — HomeScreen Wiring for 3 Rails
**File:** `src/screens/Home/HomeScreen.tsx`
**Status:** ⬜ not started

- [ ] Find the `SectionHeader` for "Recently Played" and add
  `leadingIcon="clock"`
- [ ] Find the `SectionHeader` for "Bookmarks" and add
  `leadingIcon="bookmark"`
- [ ] Find the `SectionHeader` for "Followed Podcasts" and add
  `leadingIcon="podcastRings"`
- [ ] Verify the rendering on a 1080 dp emulator

**Gate 4 ✅:** the three "Your Library" rails each show a small
circular gold icon to the left of the title; the rest of the
header is unchanged.

---

## WAVE 5: DISCOVER "VIEW ALL" (Phases 13-15)

### Phase 13 — Movies SectionHeader
**File:** `src/screens/Home/HomeScreen.tsx`
**Status:** ⬜ not started

- [ ] Confirm `MovieCategoriesShelf` is rendered with or without
  a `SectionHeader` above it
- [ ] If no header: add a `SectionHeader` with `label="Movies"`,
  `actionLabel="View all"`, `onAction={handleMoviesSeeAll}`
- [ ] Wire `handleMoviesSeeAll` if it does not exist (route to
  the movies browse screen — `AllVideosScreen` or equivalent)
- [ ] Verify on the emulator

### Phase 14 — Podcasts SectionHeader
**File:** `src/screens/Home/HomeScreen.tsx`
**Status:** ⬜ not started

- [ ] Same as Phase 13 but for "Podcasts" and `PodcastCategoriesShelf`
- [ ] `handlePodcastsSeeAll` route to the podcasts browse screen
- [ ] Verify on the emulator

### Phase 15 — Browse-Route Handlers
**Files:** `src/screens/Home/HomeScreen.tsx`,
`src/screens/Home/hooks/useHomeScreen.ts`
**Status:** ⬜ not started

- [ ] Confirm `handleMoviesSeeAll` and `handlePodcastsSeeAll`
  exist or add them
- [ ] Each handler navigates to the appropriate browse route
- [ ] Tap-test on the emulator: "View all" navigates to the right
  screen

**Gate 5 ✅:** "Movies" and "Podcasts" rows each have a
"View all →" link that navigates to the corresponding browse
screen.

---

## WAVE 6: VERIFICATION (Phase 16)

### Phase 16 — Full Verification Suite
**Status:** ⬜ not started

- [ ] `npx tsc --noEmit` clean
- [ ] `npx react-native-asset` reports 5 fonts linked
- [ ] Android emulator: cold launch → Home → wordmark "Simba"
  in script, gold
- [ ] Android emulator: 3 library rails each have a circular
  gold icon
- [ ] Android emulator: Movies + Podcasts each have a "View all"
- [ ] Android emulator: every other text element renders in Inter
  (no system fallback)
- [ ] Android emulator: light mode OK
- [ ] Android emulator: dark mode OK
- [ ] iOS simulator (if available): same checks
- [ ] Header does not overflow on 320 dp, 360 dp, 411 dp, 480 dp
- [ ] Wordmark does not collide with search/avatar on any width
- [ ] P67 invariant: cold start lands on Home for authed user
- [ ] P66 invariant: weather chip renders correctly
- [ ] Font-fallback smoke: temporarily disable Allura TTF,
  confirm wordmark shows a visible (non-Inter) fallback. Restore.
- [ ] Capture final Home screenshot, compare to manager reference
- [ ] File the completion report (see below)

**Gate 6 ✅:** all of the above pass; final screenshot matches
the reference on the wordmark, the rail icons, and the
"View all" links; tsc clean; P66 + P67 invariants intact.

---

## COMPLETION REPORT TEMPLATE

When all gates pass, file a completion report in
`md/v7_completion_report.md` with:

1. Exact fonts installed (Allura + 4 Inter weights)
2. Actual `fontFamily` PostScript names (e.g. `'Allura'`,
   `'Inter'`)
3. Font directory used (`assets/fonts/`)
4. `npx react-native-asset` output summary
5. `react-native.config.js` change
6. Typography / theme files modified
7. Components modified
8. Android / iOS changes
9. Spacing adjustments (lion gap, wordmark-to-tagline)
10. Confirmation that the rest of the UI remains on Inter
11. Final screenshot of the Home screen

---

## DEPENDENCIES

- v7 depends on v6 (Home screen, weather card, library rails) and
  v5 (typography tokens, AppText, theme system) being in place.
- v7 does not depend on P61 (weather) or P64 (chip gradients) —
  those touch the chip, not the typography.
- v7 is independent of P67 (auth) and P66 (chip) — those are
  orthogonal fixes already shipped.

---

## RISKS

1. **Allura not loading.** If the TTF is not linked, the wordmark
   falls back to system serif. The font-fallback smoke in Wave 6
   catches this.
2. **Inter not loading.** If Inter fails, every text element falls
   back to the system default. Same fallback smoke catches it.
3. **Header overflow.** A 48 px script wordmark on a 320 dp screen
   may push the search/avatar off the right. The
   `useWindowDimensions` clamp + `flexShrink: 1` on the brand
   block should handle this. If it doesn't, lower the floor to
   40 px (the reference target is 44 px).
4. **SectionHeader vertical alignment.** The 32×32 leading icon
   badge is 4 px shorter than the 36 px text line. Align
   `alignItems: 'center'` on the row. If the title text shifts
   down 2 px, add `paddingVertical` to the badge.
5. **iOS UIAppFonts ordering.** `react-native-asset` may not
   register the TTFs in alphabetical order in `Info.plist`. If
   one font is missing on iOS, manually edit `UIAppFonts` in
   `ios/CinePlayer/Info.plist` to add the missing entry.

---

## ROLLBACK

If v7 needs to be reverted, the rollback is:

1. Revert the typography tokens (drop `brandScript`; drop
   `fontFamily: 'Inter'` from each variant).
2. Revert `BRAND.name` to `'SIMBA'`.
3. Revert `HomeHeader`, `Splash`, `Login` wordmark changes.
4. Drop `leadingIcon` from `SectionHeader`.
5. Revert `HomeScreen.tsx` rail + movies/podcasts wiring.
6. Drop the new TTFs from `assets/fonts/` and re-run
   `npx react-native-asset`.
7. `npx tsc --noEmit` clean.

The rollback does not delete the TTFs from `node_modules` (none
of v7 is npm-installed). It only touches source files and the
asset link.
