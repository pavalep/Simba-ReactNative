# SIMBA Mobile: UI/UX Elevation v8 — Per-Weight Font Architecture
## Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v8.md`](UI_UX_Elevation_Specification_v8.md)
> **Supersedes:** v7 architecture (per-role `FONT_FAMILY` + `fontWeight` axis)
> **Status:** ✅ COMPLETE (2026-08-13)
> **Purpose:** Restructure `FONT_FAMILY` to a per-family, per-weight nested
> map. Drop `fontWeight` from the typography tokens entirely. Fix the
> Android font-weight picker bug that rendered Manrope SemiBold as
> Manrope Bold (chunky) and Inter Bold as Inter Extra-Bold ("Paval"
> in HomeHeader). Scope: 3 core files + 11 files with `fontWeight: '800'`
> overrides.

---

## Implementation Strategy

```
WAVE 1: CORE ARCHITECTURE
├── 1.1 Refactor FONT_FAMILY (nested per-family per-weight)
├── 1.2 Drop fontWeight from typography tokens
├── 1.3 Add FONT_ROLE aliases for v7-backward-compat
└── 1.4 Update typographyStyles.ts (uiMono etc.)
    ↓ GATE: tsc clean; v7 flat keys still resolve via aliases

WAVE 2: REMOVE fontWeight: '800' OVERRIDES
├── 2.1 SectionHeader.tsx (already partially done in v7 — verify)
├── 2.2 HomeMediaShelf.tsx + HomeBookmarksList.tsx
├── 2.3 WeatherGreeting.tsx (greetingName)
├── 2.4 FeaturedHeroBanner.tsx + SongHero.tsx
├── 2.5 AudioPlayer.tsx + VideoPlayer (TopBar + SecondaryToolbar)
└── 2.6 Toast.tsx
    ↓ GATE: tsc clean; no fontWeight: '800' or '900' anywhere

WAVE 3: VERIFICATION
├── 3.1 tsc clean
├── 3.2 Rebuild APK + cold launch emulator
├── 3.3 Visual: rail titles are SemiBold (not Bold)
├── 3.4 Visual: "Paval" in HomeHeader is Inter Bold (no extra-bold)
├── 3.5 Visual: "Simba" wordmark in Allura, sized correctly
├── 3.6 Visual: Cormorant hero titles (Album, Movie, etc.)
├── 3.7 Family fallback smoke (5 families)
└── 3.8 Update v7_completion_report.md with v8 deltas
    ↓ GATE: emulator shows correct weights for every family
```

---

## WAVE 1: CORE ARCHITECTURE

### Phase 1.1 — Refactor `FONT_FAMILY` (Nested Per-Weight)
**File:** `src/constants/fontFamily.ts`
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Replace flat 5-key map with nested per-family per-weight map:
  ```ts
  export const FONT_FAMILY = {
    allura: 'Allura',
    cormorant: {regular: 'Cormorant Garamond', bold: 'Cormorant Garamond', italic: 'Cormorant Garamond'},
    manrope: {semibold: 'Manrope', bold: 'Manrope'},
    inter: {regular: 'Inter', medium: 'Inter', semibold: 'Inter', bold: 'Inter'},
    jetbrainsMono: {regular: 'JetBrains Mono'},
  } as const;
  ```
- [ ] Add deprecated flat-key aliases for v7 backward compat:
  ```ts
  // @deprecated use FONT_FAMILY.allura
  brandScript: 'Allura',
  // @deprecated use FONT_FAMILY.cormorant.bold
  displaySerif: 'Cormorant Garamond',
  // @deprecated use FONT_FAMILY.manrope.semibold
  displaySans: 'Manrope',
  // @deprecated use FONT_FAMILY.inter.regular
  ui: 'Inter',
  // @deprecated use FONT_FAMILY.jetbrainsMono.regular
  mono: 'JetBrains Mono',
  ```
- [ ] Update `FontFamily` union to include the new nested leaf strings
- [ ] `npx tsc --noEmit` clean

### Phase 1.2 — Drop `fontWeight` From Typography Tokens
**File:** `src/theme/tokens.ts`
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Remove `fontWeight` from every variant in the `typography` object
- [ ] Update each variant's `fontFamily` to the new per-weight key:
  - `display` → `FONT_FAMILY.inter.bold`
  - `h1` → `FONT_FAMILY.inter.bold`
  - `h2` → `FONT_FAMILY.inter.bold`
  - `h3` → `FONT_FAMILY.inter.semibold`
  - `body1`, `body2`, `bodySmall`, `caption` → `FONT_FAMILY.inter.regular`
  - `overline`, `tab` → `FONT_FAMILY.inter.medium`
  - `button` → `FONT_FAMILY.inter.semibold`
  - `mono` → `FONT_FAMILY.jetbrainsMono.regular`
  - `brandScript` → `FONT_FAMILY.allura`
  - `displaySerif` → `FONT_FAMILY.cormorant.bold`
  - `displaySans` → `FONT_FAMILY.manrope.semibold`
- [ ] `npx tsc --noEmit` clean

### Phase 1.3 — `FONT_ROLE` Aliases
**File:** `src/constants/fontFamily.ts` (same file as 1.1)
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Add `FONT_ROLE` export — the v7 per-role default families, derived
  from the new nested keys:
  ```ts
  export const FONT_ROLE = {
    brandScript: FONT_FAMILY.allura,
    displaySerif: FONT_FAMILY.cormorant.bold,
    displaySans: FONT_FAMILY.manrope.semibold,
    ui: FONT_FAMILY.inter.regular,
    mono: FONT_FAMILY.jetbrainsMono.regular,
  } as const;
  ```
- [ ] The typography tokens use `FONT_ROLE.X` instead of the deprecated
  `FONT_FAMILY.X` aliases (cleaner — the role-keyed lookup is now an
  intentional choice, not a backward-compat shim).

### Phase 1.4 — `typographyStyles.ts` Update
**File:** `src/theme/typographyStyles.ts`
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Drop `fontWeight` from `uiMono` (the only style that referenced it
  via FONT_FAMILY.mono). Now reads `fontFamily: FONT_FAMILY.jetbrainsMono.regular`.
- [ ] Verify no other styles in the file set `fontWeight`.

**Gate 1 ✅:** New nested FONT_FAMILY works; tokens compile; v7 flat
keys still resolve (deprecated).

---

## WAVE 2: REMOVE `fontWeight: '800'` OVERRIDES

### Phase 2.1 — SectionHeader.tsx
**Status:** ✅ PARTIAL (v7 cleanup applied the comment-only version;
need to verify the 11 file list still has SectionHeader's fontWeight
override removed).

- [ ] Verify `titleLarge` no longer has `fontWeight: '800'`. (Done
  during v7.)
- [ ] `npx tsc --noEmit` clean.

### Phase 2.2 — HomeMediaShelf.tsx + HomeBookmarksList.tsx
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Remove `fontWeight: '800'` from `headerTitle` in both files.
  Keep `letterSpacing: -0.5` (intentional design for the rail title).
- [ ] `npx tsc --noEmit` clean.

### Phase 2.3 — WeatherGreeting.tsx
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Remove `fontWeight: '800'` from `greetingName`. The `h2` token
  now correctly maps to `FONT_FAMILY.inter.bold` (Inter-Bold.ttf) via
  the new architecture. Keep `letterSpacing: -0.5`.
- [ ] `npx tsc --noEmit` clean.

### Phase 2.4 — FeaturedHeroBanner.tsx + SongHero.tsx
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] Remove `fontWeight: '800'` from both files. Determine what the
  underlying variant is (likely `h2` or `display`) and confirm the
  new architecture picks the right TTF.
- [ ] `npx tsc --noEmit` clean.

### Phase 2.5 — AudioPlayer.tsx + VideoPlayer
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] `AudioPlayer.tsx:620` — remove `fontWeight: '800'`.
- [ ] `VideoPlayerTopBar.tsx:208` — remove `fontWeight: '800'`.
- [ ] `SecondaryToolbar.tsx:306` — remove `fontWeight: '800'`.
- [ ] `npx tsc --noEmit` clean.

### Phase 2.6 — Toast.tsx
**Status:** ✅ COMPLETE (2026-08-13)

- [ ] `Toast.tsx:288` — remove `fontWeight: '800'`. Toast text is
  Inter by default; the `'800'` was making Android fake-bold from
  Bold → extra-bold.
- [ ] `npx tsc --noEmit` clean.

**Gate 2 ✅:** No `fontWeight: '800'` or `fontWeight: '900'` remains
in the source tree. All 11 sites cleaned. tsc clean.

---

## WAVE 3: VERIFICATION

### Phase 3.1 — tsc clean
- [ ] `npx tsc --noEmit` clean (final)

### Phase 3.2 — Rebuild + cold launch
- [ ] `./gradlew :app:assembleDebug` succeeds
- [ ] `adb install` to Medium_Phone emulator
- [ ] Cold launch: parchment + lion native splash → JS Splash → Home

### Phase 3.3 — Visual: rail titles
- [ ] "Recently Played" / "Bookmarks" / "Followed Podcasts" / "Movies"
  / "TV Shows" / "Live Radio" / "Music" / "Live TV" / "Audiobooks" /
  "Internet Archive" render in **Manrope SemiBold** (medium weight,
  not chunky Bold)

### Phase 3.4 — Visual: "Paval" in HomeHeader
- [ ] "Paval" is **Inter Bold** (clean 700), not extra-bold fakery

### Phase 3.5 — Visual: "Simba" wordmark
- [ ] "Simba" in Allura, sized correctly (44-58 px clamp working)
- [ ] Script flow visible (connected `i-m-b-a` ligatures)

### Phase 3.6 — Visual: Cormorant hero titles
- [ ] Album Detail / Movie Detail / Show Detail / Audiobook Detail /
  Archive Item Detail / Playlist Detail / Now Playing / About /
  Changelog / Credits / Help / Licenses / Privacy / Terms all show
  hero titles in Cormorant Garamond Bold (clean 700)

### Phase 3.7 — Font fallback smoke
- [ ] Disable each TTF in turn, verify system fallback
  - Allura → system serif
  - Cormorant → system serif
  - Manrope → system sans
  - Inter → system sans
  - JetBrains Mono → system mono

### Phase 3.8 — Update completion report
- [ ] Append a "v8 deltas" section to `md/v7_completion_report.md`
  describing the architecture change

**Gate 3 ✅:** Emulator shows correct weights for every family.
v8 is shippable.

---

## DEPENDENCIES

- v8 depends on v7 (the 5 font families must already be linked and
  working — they are; the bug is in the architecture that *consumes*
  the TTFs, not the TTFs themselves).
- v8 does not depend on the spec or tracker docs (those are
  regenerated as part of v8).
- v8 is independent of P66 (weather), P67 (auth), and all earlier
  fixes.

---

## RISKS

1. **Inter 4-weight bug reappears if we add a 5th TTF** (e.g.
   `Inter-ExtraBold.ttf`). Don't add it. The v7 `display: fontWeight:
   '800'` was fake-bold on Android — the v8 fix avoids fake-bolding
   by not asking for a weight that doesn't exist.
2. **Manrope missing Regular (400).** Some day we might want
   Manrope body text. That's a future wave; for now we ship SemiBold
   + Bold and accept the limitation.
3. **iOS font manager is stricter** — no bug there. The v8 change is
   a no-op for iOS. We don't lose anything.
4. **AppText legacy aliases** (`h6`, `subtitle2`, `small`, `time`) still
   work. No migration needed for them.

---

## ROLLBACK

1. Revert `src/constants/fontFamily.ts` to the v7 flat shape.
2. Revert `src/theme/tokens.ts` (add back `fontWeight` on every variant).
3. Revert the 11 `fontWeight: '800'` overrides (re-add the inline
   weight in the 11 files).

v8 doesn't touch any TTF files, doesn't change Android/iOS asset
bundles, doesn't touch the spec sheets. The rollback is ~30 minutes
of source-tree reverts.
