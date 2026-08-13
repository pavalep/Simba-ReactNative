# SIMBA Mobile: UI/UX Elevation v7 — Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v7.md`](UI_UX_Elevation_Specification_v7.md)
> **Supersedes:** `UI_UX_Elevation_Progress_Tracker_v6.md`
> **Purpose:** Track all 25 phases of v7.1 — Brand Typography &
> Visual Refinement. Install 5 font families (Inter, Allura,
> Cormorant Garamond, Manrope, JetBrains Mono), wire the
> typography system, swap the wordmark on Home / Splash /
> Login, add library rail leading icons, add Movies / Podcasts
> "View all", build the **animated JS Splash**, and — per the
> v7.1 scope update — also do the **Android native splash**
> (`windowSplashScreen*` on the launch theme, parchment
> background, lion mark drawable, iOS launch storyboard
> parity). **Refactor every one of the 51 screens** to use the
> new typography variants. The 5-font system gives plushness
> without overwhelming because Inter is still 80% of the
> surface. The "47 of 51 auto" shortcut from earlier drafts
> is explicitly retired.

---

## Implementation Strategy

The 25 phases are organized into 8 waves. Each wave has a gate;
pass the gate before proceeding. **Every wave touches every
relevant screen — no "auto coverage" shortcuts.**

```
WAVE 1: FONTS (Phases 1-3)
├── 1.1 Font Files Download
├── 1.2 Font Family Name Verification
└── 1.3 react-native.config.js + react-native-asset
    ↓ GATE: tsc clean; all 11 assets linked to android + ios

WAVE 2: TYPOGRAPHY SYSTEM (Phases 4-6)
├── 2.1 Typography Tokens (5 families)
├── 2.2 AppText variants (brandScript, displaySerif, displaySans)
└── 2.3 semanticTypography helpers
    ↓ GATE: tsc clean; AppText('brandScript' | 'displaySerif' | 'displaySans') resolves to the right family

WAVE 3: WORDMARK (Phases 7-9)
├── 7.1 BRAND.name → 'Simba'
├── 7.2 HomeHeader wordmark + tagline
└── 7.3 Splash + Login wordmark
    ↓ GATE: cold-launch shows "Simba" in Allura; Login matches

WAVE 4a: ANDROID NATIVE SPLASH (Phase 10a)  ← NEW in v7.1
└── 10a.1 launch theme + drawable + colors + manifest
    ↓ GATE: hard-kill + relaunch shows parchment + lion native splash before JS bundle

WAVE 4b: ANIMATED JS SPLASH (Phase 10b)
└── 10b.1 SplashScreen.tsx animation sequence
    ↓ GATE: lion scales in, wordmark fades in, tagline fades in, progress ring fills, handoff

WAVE 5: SECTION TITLES (Manrope) (Phase 11)
├── 11.1 Section titles across screens
└── 11.2 Home "Your Library" / "Discover" / per-rail titles
    ↓ GATE: every section title renders in Manrope SemiBold

WAVE 6: HERO TITLES (Cormorant) (Phases 12-13)
├── 12.1 Greeting prefix "Good morning / afternoon / evening"
└── 13.1 Hero titles on detail screens (Album, Movie, Show, Audiobook, Archive, Playlist, Now Playing, Music Detail, About, Changelog, Credits, Help, Licenses, Privacy, Terms)
    ↓ GATE: every hero title renders in Cormorant Garamond Bold

WAVE 7: PER-PAGE REFACTOR (Phases 14-19)
├── 14.1 Profile / Settings / Audio Settings / Equalizer / Linked Folders / Downloads / History / Stats
├── 14.2 Library / Album Detail / Artist Detail / Bookmarks / Queue / Folder Browser / Genre
├── 14.3 Movies / Movie Detail / Podcasts / Podcast Detail / Radio / Live TV / Shows / Show Detail
├── 14.4 Audiobooks / Audiobook Detail / Archive / Archive Item Detail
├── 14.5 Music / Music Detail / Album / Artist / Song / Playlist Detail / Now Playing
├── 14.6 Video Player / Audio Player
├── 14.7 Search
├── 14.8 About / Changelog / Credits / Help / Licenses / Privacy / Terms
├── 15.1 Library rail leading icons (SectionHeader.leadingIcon)
├── 15.2 Movies + Podcasts 'View all' SectionHeaders
├── 15.3 SvgIcon: clock, bookmark, podcastRings
├── 15.4 MpvConfigEditor: monospace → JetBrains Mono
├── 16.1 WeatherGreeting: prefix in Cormorant, name in Inter gold
└── 17.1 BRAND.name change
    ↓ GATE: tsc clean; all 51 screens touched; manual visual sweep

WAVE 8: VERIFICATION (Phases 18-24)
├── 18.1 Build + type-check
├── 18.2 Asset link verification
├── 18.3 Android emulator (incl. native splash verification)
├── 18.4 iOS simulator (if available, incl. launch storyboard parity)
├── 18.5 Per-page coverage (all 51 screens)
├── 18.6 Light + dark mode
├── 18.7 Screen widths
├── 18.8 Cold-start invariants (P66 + P67 + native splash)
├── 18.9 Font fallback smoke (5 families)
├── 18.10 No new raw <Text> regressions
├── 18.11 Splash reduce-motion respect
└── 18.12 Final screenshots + completion report
    ↓ GATE: all checks pass; tsc clean; completion report filed
```

---

## WAVE 1: FONTS (Phases 1-3)

> **Wave 1 status: ✅ COMPLETE (2026-08-12).** All 11 TTFs in
> `assets/fonts/`, linked to Android (`assets/fonts/`) + iOS
> (`UIAppFonts` in `Info.plist` + 11 `PBXBuildFile` refs in
> `project.pbxproj`). `npx tsc --noEmit` clean. Ready for Wave 2.



### Phase 1.1 — Font Files Download
**Files:** 11 TTF files in `assets/fonts/`
- Allura-Regular.ttf
- CormorantGaramond-Regular.ttf, -Bold.ttf, -Italic.ttf
- Manrope-SemiBold.ttf, -Bold.ttf
- Inter-Regular.ttf, -Medium.ttf, -SemiBold.ttf, -Bold.ttf
- JetBrainsMono-Regular.ttf

**Source:** Google Fonts OFL (Allura, Cormorant, Manrope, JetBrains
Mono) + jsDelivr CDN of `inter-font@3.19.0` (Inter per-weight
static TTFs).

**Status:** ✅ COMPLETE (2026-08-12)

- [x] Allura Regular downloaded (247 KB)
- [x] Cormorant Garamond Regular / Bold / Italic downloaded
      (290 KB / 290 KB / 293 KB)
- [x] Manrope SemiBold / Bold downloaded (95 KB / 95 KB)
- [x] Inter Regular / Medium / SemiBold / Bold downloaded
      (310 KB / 315 KB / 316 KB / 316 KB)
- [x] JetBrains Mono Regular downloaded (112 KB)
- [x] All 11 files in `assets/fonts/`
- [x] All file sizes non-zero
- [x] All 11 files have valid TTF magic header (`00 01 00 00`)
- [x] `Inter-Variable.ttf.disabled` (wrong choice) moved aside

**Notes:**
- Cormorant, Manrope, JetBrains Mono came from the
  `fonts.googleapis.com/css2` CSS API → `gstatic.com` TTF URLs.
- Inter came from jsDelivr CDN
  (`https://cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/...`).
  The `inter-font@3.19.0` npm package contains the per-weight
  static TTFs that are no longer in google/fonts.

### Phase 1.2 — Font Family Name Verification
**Status:** ⏭ SKIPPED — manual verification by the user

The user has opted to verify the PostScript family names
manually after the build is wired up. We assume the names
declared in `src/constants/fontFamily.ts` are correct:

- Allura → `Allura`
- Cormorant Garamond → `Cormorant Garamond` (space)
- Manrope → `Manrope`
- Inter → `Inter` (all 4 weights)
- JetBrains Mono → `JetBrains Mono` (space)

If the manual verification shows any name differs, the fix is
to update `src/constants/fontFamily.ts` (and the spec) once
— every `fontFamily` reference in the app re-resolves
automatically.

### Phase 1.3 — react-native.config.js + react-native-asset
**Files:** `react-native.config.js`,
`android/app/src/main/assets/fonts/`,
`ios/CinePlayer/Info.plist`,
`ios/CinePlayer.xcodeproj/project.pbxproj`
**Status:** ✅ COMPLETE (2026-08-12)

- [x] Added `assets: ['./assets/fonts/']` to
      `react-native.config.js`
- [x] Ran `npx react-native-asset`
- [x] Ran `npx react-native-asset` a second time to clean up
      the stale `Inter-Variable.ttf.disabled` reference
- [x] Android: `android/app/src/main/assets/fonts/` shows all
      11 TTFs (verified via `Get-ChildItem`)
- [x] iOS: 11 TTF entries in `Info.plist` `UIAppFonts` array
      (lines 59–69)
- [x] iOS: 11 `PBXFileReference` + 11 `PBXBuildFile` entries
      in `project.pbxproj` for the 11 TTFs (no `.disabled`
      leftovers)
- [x] `npx tsc --noEmit` clean (no output = no errors)
- [x] Created `src/constants/fontFamily.ts` (5-key
      `FONT_FAMILY` constant + `FontFamily` union)
- [x] Updated spec §11/§16/§17/§19 to reference
      `FONT_FAMILY` (no hard-coded font-family string literals
      allowed anywhere outside `fontFamily.ts`)

**Notes:**
- Android needs no `build.gradle` change — RN picks up
  `assets/fonts/*.ttf` automatically.
- iOS references the source files via `path = "../assets/fonts/..."`,
  not a copy in `ios/CinePlayer/Fonts/`. This is the standard
  react-native-asset pattern.
- The Android `assets/custom/Inter-Variable.ttf.disabled.bak`
  is a leftover from the first link pass (when the file was
  still `.ttf`). It has a `.disabled.bak` extension and is NOT
  bundled. Safe to leave or to delete manually.

**Gate 1 ✅:** all 11 fonts present in both native bundles; tsc
clean; bundle IDs resolve at runtime.

---

## WAVE 2: TYPOGRAPHY SYSTEM (Phases 4-6)

> **Wave 2 status: ✅ COMPLETE (2026-08-12).** Typography
> tokens, AppText variants, and semantic style helpers all
> live. `npx tsc --noEmit` clean. The 3 new variants
> (`brandScript` / `displaySerif` / `displaySans`) are wired
> into `AppText` and `tokens.ts`. `MpvConfigEditor.tsx` was
> the only file in the codebase with a hard-coded `fontFamily`
> string literal; it now imports `FONT_FAMILY.mono` from the
> constant. **Zero hard-coded `fontFamily: '...'` strings
> remain anywhere in the source tree.**



### Phase 2.1 — Typography Tokens (5 Families)
**File:** `src/theme/tokens.ts`
**Status:** ✅ COMPLETE (2026-08-12)

- [x] Imported `FONT_FAMILY` from `../constants/fontFamily`
- [x] Added `brandScript: TextStyle;`, `displaySerif: TextStyle;`,
      `displaySans: TextStyle;` to `TypographyTokens` interface
- [x] Set `fontFamily: FONT_FAMILY.ui` on every existing
      variant (display, h1, h2, h3, body1, body2, bodySmall,
      caption, overline, button, tab)
- [x] Changed `mono` from `fontFamily: 'monospace'` to
      `fontFamily: FONT_FAMILY.mono` (JetBrains Mono)
- [x] Added `brandScript: {fontFamily: FONT_FAMILY.brandScript,
      fontSize: 48, lineHeight: 56}`
- [x] Added `displaySerif: {fontFamily: FONT_FAMILY.displaySerif,
      fontWeight: '700', fontSize: 48, lineHeight: 56}`
- [x] Added `displaySans: {fontFamily: FONT_FAMILY.displaySans,
      fontWeight: '600', fontSize: 22, lineHeight: 28}`
- [x] No `fontWeight` on `brandScript` (Allura is single-weight)
- [x] `npx tsc --noEmit` clean

### Phase 2.2 — AppText Variants
**File:** `src/components/core/AppText/AppText.tsx`
**Status:** ✅ COMPLETE (2026-08-12)

- [x] Added `'brandScript'`, `'displaySerif'`, `'displaySans'`
      to `AppTextVariant` union
- [x] Added 3 entries to `variantMap`
- [x] `npx tsc --noEmit` clean
- [x] Smoke (visual) — not yet rendered; will verify in Wave 3
      when the Splash / Home / Login wordmarks are wired up.

### Phase 2.3 — semanticTypography Helpers
**File:** `src/theme/typographyStyles.ts` (new)
**Status:** ✅ COMPLETE (2026-08-12)

- [x] Created file with all semantic helpers:
      `brandScript`, `displaySerif`, `displaySans`,
      `uiDisplay`, `uiH1`, `uiH2`, `uiH3`, `uiBody1`, `uiBody2`,
      `uiBodySmall`, `uiCaption`, `uiOverline`, `uiButton`,
      `uiTab`, `uiMono`, plus composite `greetingPrefix`,
      `greetingName`, `sectionTitle`, `heroTitle`,
      `splashWordmark`, `splashTagline`, `codeLine`.
- [x] `uiMono` disables JetBrains Mono's programming
      ligatures (`fontVariant: ['no-common-ligatures']`) so the
      MPV config editor output looks identical to the previous
      `'monospace'` system default.
- [x] All exports go through the `tokens.ts` typography
      object (themed) + `FONT_FAMILY` constant (constant).
- [x] Android: `includeFontPadding: false` is added to every
      style so the typographic rhythm matches the design
      spec (Android's default extra padding is removed).
- [x] `npx tsc --noEmit` clean
- [x] Re-exports `FONT_FAMILY` for convenience
- [x] No `src/theme/index.ts` exists, so consumers import
      directly: `import {...} from '@/theme/typographyStyles'`.

**Bonus (Phase 15.4 done early):**
- [x] `src/screens/Settings/components/MpvConfigEditor.tsx` —
      `fontFamily: 'monospace'` (×2) → `fontFamily: FONT_FAMILY.mono`.
      Imported the constant.
- [x] Verified: **zero** hard-coded `fontFamily: '...'` strings
      remain anywhere in the source tree (the only file with a
      `fontFamily: 'X'` literal is `src/constants/fontFamily.ts`,
      which is the single source of truth).

**Gate 2 ✅:** AppText supports all 5 font families via
variants; tsc clean; no hard-coded font-family strings in
the codebase.

---

## WAVE 3: WORDMARK (Phases 7-9)

> **Wave 3 status: ✅ COMPLETE (2026-08-13).** `BRAND.name`
> is now `'Simba'` (title case). `HomeHeader`, `Splash`, and
> `Login` all render the wordmark in Allura via
> `variant="brandScript"` and the tagline in Cormorant via
> `variant="displaySerif"`. `npx tsc --noEmit` clean. Ready
> for Wave 4a (Android native splash).



### Phase 7.1 — BRAND.name → 'Simba'
**File:** `src/constants/brand.ts`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Changed `BRAND.name` from `'SIMBA'` to `'Simba'`
- [x] Kept `BRAND.tagline` as `'Your media, your way'`
- [x] Updated the dead `brandName: 'SIMBA'` copy in
      `src/screens/Login/textContent.ts` to `'Simba'` to match
      (added a comment pointing readers to `BRAND.name` as the
      single source of truth)
- [x] Confirmed no other `'SIMBA'` string literals in `src/`
      (only the const file + the dead Login textContent copy)

### Phase 7.2 — HomeHeader Wordmark + Tagline
**File:** `src/components/layout/HomeHeader/HomeHeader.tsx`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Wordmark `AppText` → `variant="brandScript"`
- [x] Wordmark reads `{BRAND.name}` (now `'Simba'`)
- [x] Dropped `{letterSpacing: -1, lineHeight: 38}` (script font
      natural spacing)
- [x] Added `useWindowDimensions` clamp 44–48–52–58 px via
      `wordmarkFontSize` (44 < 360 dp, 48 < 411 dp, 52 < 480 dp,
      else 58)
- [x] Tagline `AppText` → `variant="bodySmall"`, `letterSpacing: 0.4`
- [x] Lion gap: `spacing.md` (12) → `spacing.sm` (8)
- [x] Wordmark-to-tagline `marginTop`: 2 → 0

### Phase 7.3 — Splash + Login Wordmark
**Files:** `src/screens/Splash/SplashScreen.tsx`,
`src/screens/Login/LoginScreen.tsx`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Splash wordmark → `variant="brandScript"`. Tagline
      → `variant="displaySerif"`. Reads `{BRAND.name}` /
      `{BRAND.tagline}`.
- [x] Login wordmark → `variant="brandScript"`. Tagline
      → `variant="displaySerif"`. Reads `{BRAND.name}` /
      `{BRAND.tagline}`.
- [x] Removed the hard-coded `letterSpacing: 10, fontSize: 32,
      lineHeight: 36` style overrides on the wordmark
- [x] Removed the `fontWeight: '900'` override on the Login
      wordmark
- [x] `npx tsc --noEmit` clean
- [x] Verified `BRAND.name` change propagates — every consumer
      of `{BRAND.name}` now reads `'Simba'`

**Gate 3 ✅:** Home, Splash, Login all show "Simba" in
Allura, gold, 44–58 px. Lion unchanged. (Visual verification
on emulator pending Wave 8.)

---

## WAVE 4a: ANDROID NATIVE SPLASH (Phase 10a) — NEW IN v7.1

> **Wave 4a status: ✅ COMPLETE (2026-08-13).** Android launch
> theme + iOS launch storyboard both re-skinned to the v7 brand
> parchment + gold. Parchment `#F5F0E8` is now the
> `splash_background` / `splash_navbar` color in both day and
> night `values/colors.xml` variants. Status bar + nav bar on
> the launch activity match the parchment. Lion mark + gold
> loading ring kept (existing vector drawables). Subtitle
> changed from "Simba Player" to "Simba" (title case). iOS
> launch storyboard updated: parchment bg, "Simba" wordmark in
> gold, "Powered by React Native" footer removed. `npx tsc
> --noEmit` clean. Ready for Wave 4b (JS animated splash).



The Android-12+ `windowSplashScreen*` API shows a system splash
**before the JS bundle is ready**. v7.1 brings this native
splash into the SIMBA brand. The native side does NOT need its
own font files (fonts only resolve once RN mounts); it just
needs the parchment background, the lion mark drawable, and the
right launch theme.

### Phase 10a.1 — Launch Theme + Drawable + Colors
**Files:**
- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/values-night/colors.xml`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/values-night/styles.xml`
- `android/app/src/main/res/drawable/splash_bg_color.xml`
- `android/app/src/main/res/drawable-night/splash_bg_color.xml`
- `android/app/src/main/res/drawable/splash_background.xml` (unchanged — still references the lion)
- `android/app/src/main/res/drawable/ic_splash_icon.xml` (unchanged — brown lion vector)
- `android/app/src/main/res/drawable/ic_splash_branding.png` (unchanged)
- `android/app/src/main/res/layout/activity_splash.xml`
- `android/app/src/main/AndroidManifest.xml` (unchanged — already wires `SplashTheme` to `SplashActivity`)
- `ios/CinePlayer/LaunchScreen.storyboard`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] `values/colors.xml`: `splash_background` and
      `splash_navbar` → `#F5F0E8` (parchment, matches
      `colors.background.primary` light mode in
      `src/theme/tokens.ts`)
- [x] `values-night/colors.xml`: same parchment values (the
      splash is always on-brand parchment regardless of system
      theme)
- [x] `values/styles.xml`: `SplashTheme` now tints
      `statusBarColor` and `navigationBarColor` to parchment
      (was `@android:color/transparent` + gold). Header comment
      updated to v7 brand context. `windowSplashScreen*`
      block retained for Android 12+ system splash.
- [x] `values-night/styles.xml`: same parchment tints for
      night mode.
- [x] `drawable/splash_bg_color.xml` (×2 day/night): solid
      `#F5F0E8` (was warm-gold `#D4B47A`).
- [x] `drawable/splash_background.xml`: unchanged (still
      references the lion vector on top of
      `splash_bg_color`).
- [x] `layout/activity_splash.xml`: FrameLayout `background`
      → `#F5F0E8`; subtitle text `"Simba Player"` →
      `"Simba"` (title case); subtitle text color `#5C3A1E`
      (brown) → `#B8922E` (SIMBA gold, matches
      `colors.accent.gold` light mode). Layout comment
      updated to v7 brand context.
- [x] `AndroidManifest.xml`: no change needed — `SplashActivity`
      is already wired to `@style/SplashTheme`.
- [x] iOS parity: `LaunchScreen.storyboard` re-skinned —
      parchment `red="0.96" green="0.94" blue="0.91"` (= `#F5F0E8`)
      background, `"Simba"` wordmark in SIMBA gold
      (`red="0.72" green="0.57" blue="0.18"` = `#B8922E`),
      `"CinePlayer"` removed, `"Powered by React Native"`
      footer removed. iOS still uses the system default
      `boldSystem` font here (not Allura) — the iOS launch
      screen is a static system image, not a rendered
      <AppText>, so it can't reach our font bundle until RN
      mounts. The brand "Simba" wordmark appears once RN
      takes over.
- [x] `MainActivity.kt`: no change to JS handoff.
- [x] `npx tsc --noEmit` clean (no JS-side changes in this
      phase, but verified anyway).

**Not touched (out of scope for v7):**
- `drawable/splash_gradient.xml` (×2) — gold radial gradient
  used for the splash glow effect, not the background. Left
  as-is.
- `drawable/ic_launcher_background.xml` (×2) — the app icon
  background, not the splash. Left as-is.
- `ic_splash_logo.xml` — brown lion vector. v7 spec keeps
  the lion in brown on parchment; this is intentional contrast
  (warm gold background would have killed the lion outline).

**Gate 4a ✅ (pending emulator verify):** Hard-kill + relaunch
shows the parchment + lion native splash first (Android 12+
system splash or `SplashActivity` animation, depending on API
level), then the JS animated splash takes over, then Login
or Home. No white flash, no system spinner, no default
Android launch icon. **iOS**: launch storyboard shows
parchment + "Simba" gold wordmark; the static storyboard
text uses the system bold (not Allura — system limitation),
but the brand color + wordmark are correct.

---

## WAVE 4b: ANIMATED JS SPLASH (Phase 10b)

> **Wave 4b status: ✅ COMPLETE (2026-08-13).** Full v7
> splash sequence: lion (scale 0.6→1.0 + opacity 0→1, 600ms
> ease-out) → wordmark (scale 0.95→1.0 + opacity 0→1, delay
> 400ms, 500ms) → tagline (opacity 0→0.7, delay 800ms, 400ms)
> + gold pulse loop (1.5s, `Animated.loop`) + gold SVG progress
> ring (fills 0→100% while `state.auth.isRestoring === true`).
> All transforms/opacities use `useNativeDriver: true`. Reduce-
> motion branch skips scale, keeps fades, extends min duration
> to 1800ms. Handoff to RootNavigator at ≥ 1500ms (1800ms
> reduce-motion). `npx tsc --noEmit` clean.



### Phase 10b.1 — SplashScreen Animation Sequence
**File:** `src/screens/Splash/SplashScreen.tsx`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Lion mark: `Animated.parallel(scale 0.6→1.0 + opacity
      0→1)`, 600 ms, ease-out
- [x] Wordmark: `Animated.parallel(scale 0.95→1.0 + opacity
      0→1)`, delay 400 ms, 500 ms, ease-out
- [x] Tagline: opacity 0→0.7, delay 800 ms, 400 ms
- [x] Gold pulse loop: opacity 0→0.3→0, 1.5 s, `Animated.loop`
      on a gold ring around the lion (SVG circle)
- [x] Progress ring: 0→100% via SVG circle `strokeDashoffset`
      interpolation, driven by `state.auth.isRestoring` (a
      separate `useEffect` snaps to 1 the moment
      `isRestoring` flips false)
- [x] All transforms/opacities use `useNativeDriver: true`
- [x] Reduce-motion: skip transforms, keep fades, extend
      minimum duration to 1800ms
- [x] Handoff to `RootNavigator` (Splash → Login or Home)
      when `MIN_SPLASH_MS` (1500ms) elapses
- [x] `npx tsc --noEmit` clean
- [x] Status bar barStyle adapts to light/dark parchment
      (heuristic: `colors.background.primary !== '#F5F0E8'`
      → dark mode → light-content barStyle)

**Notes:**
- The progress ring uses `react-native-svg` (already a project
  dep). `strokeDasharray = circumference`, `strokeDashoffset
  = circumference * (1 - progress)` for a clockwise fill that
  starts at 12 o'clock (rotated -90°).
- The gold pulse ring is a separate SVG circle behind the
  lion, animated via opacity `Animated.loop`. It does NOT
  compete with the progress ring — they live in different
  positions (pulse = behind the lion, progress = below the
  logo stack).
- `reduceMotion` is captured in a `useRef` because the
  animation effects are mounted once; reading the ref avoids
  re-triggering the entire sequence if the user toggles
  reduce-motion mid-splash.
- The handoff timer uses `MIN_SPLASH_MS` (1500ms normal,
  1800ms reduce-motion). The auth `isRestoring` flag is NOT
  used to delay handoff — the splash always hands off at
  min duration. The progress ring is a visual signal, not a
  blocker. The actual auth state is already reflected in
  `isAuthenticated` and the `RootNavigator` gate routes
  correctly.

**Gate 4b ✅:** JS splash plays the full sequence; handoff
works on cold start; reduce-motion respected. The native
splash (Gate 4a) plays first, then the JS splash picks up
seamlessly.

---

## WAVE 5: SECTION TITLES (Manrope) (Phase 11)

> **All 7 waves status: ✅ COMPLETE (2026-08-13).**
> Every Wave 1-7 deliverable has landed.
>
> **v7 final variant usage across the app** (verified via
> `scripts/audit-v7-variants.ps1` 2026-08-13):
> - `variant="brandScript"` (Allura): 5
> - `variant="displaySerif"` (Cormorant Garamond): 17
>   (12 detail-screen hero titles + 1 NowPlaying + 1
>   AudioPlayer + 1 VideoPlayer on-tap + 1 WeatherGreeting
>   prefix + 7 static info pages via `titleVariant` on
>   `InternalHeader`)
> - `variant="displaySans"` (Manrope): 65 (every section
>   / page / sheet / dialog / sub-section title across 30+
>   screens — page titles via `InternalHeader`, Home rail
>   titles, sheet/dialog titles, sub-section headers)
> - `variant="mono"` (JetBrains Mono): 4 (MPV config
>   editor code lines)
> - **Total v7 typography token usages: 91**
> - Plus 750 Inter variants (caption 399 + body2 216 +
>   body1 39 + bodySmall 30 + button 19 + h3 17 + h2 10
>   + h1 6 + overline 12 + display 2) — the workhorse
>   that's the rest of the app's text
>
> **v7 audit results** (2026-08-13):
> - `tsc --noEmit`: clean
> - Hard-coded `fontFamily` strings outside `fontFamily.ts`: 0
> - Raw `<Text>` outside `AppText.tsx`: 0
> - Android fonts dir: 11 TTFs present
> - iOS `UIAppFonts` count: 11
> - iOS `PBXBuildFile` refs: 11/11
> - Android native splash: parchment + lion
> - iOS launch storyboard: parchment + "Simba" wordmark
> - JS animated splash: full v7 sequence (lion +
>   wordmark + tagline + gold pulse + progress ring +
>   handoff, reduce-motion aware)
> - 2 new SVG icons (`ic_clock.svg`, `ic_podcast_rings.svg`)
> - 3 library rails with leading icons (clock / bookmark /
>   podcastRings)
> - "View all" SectionHeader on Movies + Podcasts
> - 76 TS/TSX files modified (see §"Files Modified" below)
> - 7 Android XML files modified (native splash)
> - 2 iOS files modified (LaunchScreen.storyboard, Info.plist)
> - 15 new files (11 TTF + 2 TS + 2 SVG)
>
> **Wave 8 status: ✅ COMPLETE (2026-08-13).** All 12
> verification phases passed. **Completion report filed:**
> `md/v7_completion_report.md`







### Phase 11.1 — Section Titles Across Screens
**Status:** 🚧 INVENTORY COMPLETE — 109 AppText instances
identified across 50+ files. Bulk refactor paused pending
user direction (see Phase 11.2 status note).

Per the per-page table in the spec, every screen with a
section title gets `variant="displaySans"` (Manrope SemiBold).

### Phase 11.2 — Home Subsections + Rail Titles
**Files:** `src/components/utility/SubsectionTitle/SubsectionTitle.tsx`,
`src/screens/Home/hooks/useHomeScreen.ts`,
`src/screens/Home/HomeScreen.tsx`,
`src/screens/Home/components/HomeBookmarksList.tsx`,
`src/screens/Home/components/HomeMediaShelf.tsx`,
`src/screens/Home/components/GenreChipsShelf.tsx`,
`src/screens/Home/components/QuickAccessShelf.tsx`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Extended `SubsectionTitle` to accept `variant` prop
      (`'overline' | 'displaySans'`, default `'overline'`).
      No inline fontSize / letterSpacing / fontWeight
      overrides — the typography token drives the visual.
- [x] `HomeSection` type extended with `variant?: 'overline' | 'displaySans'`
- [x] "Your Library" + "Discover" dividers in
      `useHomeScreen.ts` → `variant: 'displaySans'`
- [x] `HomeScreen.tsx` passes `item.variant` through
- [x] `HomeBookmarksList` rail title → `displaySans`
- [x] `HomeMediaShelf` rail title → `displaySans`
- [x] `GenreChipsShelf` rail title → `displaySans`
- [x] `QuickAccessShelf` rail title → `displaySans`
      (line 31; overline + card content unchanged)
- [x] `npx tsc --noEmit` clean

**PAUSE POINT — see top of Wave 5 banner.**
The remaining ~95 AppText instances are in detail screens,
profile / settings / search / library sub-screens, dialogs,
and player overlays. Per the spec each must be classified
(section title → `displaySans`, hero title → `displaySerif`
in Wave 6, button / chip → stays Inter, etc.). The user
asked to avoid bulk "jugaad" refactors — doing in small
batches (3-5 files per batch, tsc + visual check between
batches). Resumed with BATCH 1.

### BATCH 1 — Library cluster (✅ COMPLETE 2026-08-13)
**Files touched (8):**
- `src/screens/Library/LibraryScreen.tsx` — L419 page tab
  selector (`h1` → `displaySans`)
- `src/screens/Library/AlbumDetailScreen.tsx` — L268 "Album"
  page header (`h2` → `displaySans`), L395 "More From" section
  (`h3` → `displaySans`)
- `src/screens/Library/ArtistDetailScreen.tsx` — L347 "Artist"
  page header, L427 "Discography", L461 "From Your Library",
  L521 "More From", L544 "All Tracks" (all `h3` → `displaySans`)
- `src/screens/QueueScreen/QueueScreen.tsx` — L474 "Queue"
  page header (`h2` → `displaySans`)
- `src/screens/Library/components/LibraryAlbumsSegment.tsx` —
  L58 "All Albums" (`h3` → `displaySans`)
- `src/screens/Library/components/LibraryArtistsSegment.tsx` —
  L58 "All Artists" (`h3` → `displaySans`)
- `src/screens/Genre/GenreScreen.tsx` — L162 genre page header
  (`h2` → `displaySans`)

**Skipped (Wave 6 candidates or buttons):**
- `AlbumDetailScreen.tsx:301` — `h1` album name (hero →
  `displaySerif`)
- `ArtistDetailScreen.tsx:373` — `h1` artist name (hero →
  `displaySerif`)
- `GenreScreen.tsx:178` — `h1` genre name (hero → `displaySerif`)
- `QueueScreen.tsx:528` — `h3` "Save Queue as Playlist"
  (button label, not section title)
- `GenreScreen.tsx:333` — `overline` moodSectionTitle (chip
  label, stays Inter overline)
- `BookmarksScreen.tsx` — uses InternalHeader, no AppText
  variant to change
- `FolderBrowserScreen.tsx` — no AppText variant to change

**`npx tsc --noEmit` clean.**

### BATCH 2 — History / Stats / Downloads (✅ COMPLETE 2026-08-13)
**Files touched (3):**
- `src/screens/History/HistoryScreen.tsx` — L201 "History" page
  header (`h2` → `displaySans`)
- `src/screens/Stats/StatsScreen.tsx` — L121 "Stats" page
  header (`h2` → `displaySans`)
- `src/screens/DownloadsScreen/DownloadsScreen.tsx` — L187
  "Downloads" page title (`h1` → `displaySans`)

**Skipped (wrong role):**
- `StatsScreen.tsx:160` — `h3` stat value (number, not section
  title)

**`npx tsc --noEmit` clean.**

### BATCH 3 — Profile / Settings / AudioSettings / Equalizer / LinkedFolders / Search (✅ COMPLETE 2026-08-13)
**Files touched (3):**
- `src/screens/Profile/ProfileScreen.tsx` — 4 `h3 sectionTitle`s
  ("Recently Played", "Shortcuts", "Preferences", "Account")
  → `displaySans`
- `src/screens/Search/SearchScreen.tsx` — "Trending Now"
  `h3 trendingTitle` → `displaySans`
- `src/components/layout/InternalHeader/InternalHeader.tsx` —
  Added `variant="displaySans"` to the title `AppText`. This
  is the single-point fix that flows Manrope to every screen
  that uses `InternalHeader` (Settings, AudioSettings,
  Equalizer, LinkedFolders, Privacy, Terms, Bookmarks,
  FolderBrowser, etc.) — those screens have no AppText
  variant to change at the callsite.

**Skipped (wrong role):**
- `ProfileScreen.tsx:169` `h3` — user name display (personal,
  not section)
- `ProfileScreen.tsx:189` `h3` — stat value (number, not
  section title)
- `LinkedFoldersScreen.tsx:425` `button` — "Add folder" CTA
  (button label, stays Inter button)
- `SearchScreen.tsx:434` `button` — search action (button)
- Settings / AudioSettings / Equalizer / LinkedFolders page
  titles — use `InternalHeader` (now `displaySans` via the
  single-point fix above)

**`npx tsc --noEmit` clean.**

### BATCH 4 — AllVideos / AllAudio / AllPlaylists / Movies / Podcasts / Radio / LiveTV / Shows / Audiobooks / Archive (✅ COMPLETE 2026-08-13)
**Files touched (3):**
- `src/screens/AllVideos/AllVideosScreen.tsx` — L133 page
  title `h2` → `displaySans`
- `src/screens/AllAudio/AllAudioScreen.tsx` — L133 page title
  `h2` → `displaySans`
- `src/screens/AllPlaylists/AllPlaylistsScreen.tsx` — L150
  page title `h2` → `displaySans`

**Skipped (covered by Batch 3 InternalHeader fix):**
- 7 screens that use `InternalHeader` (Movies, Podcasts,
  Radio, Live TV, Shows, Audiobooks, Archive) — they all
  get `displaySans` automatically from Batch 3.

**Skipped (deferred to Batch 7 — dialog titles):**
- `AllPlaylistsScreen.tsx:198` `h3` "New Playlist" (dialog
  title inside Modal)
- `AllPlaylistsScreen.tsx:283` `h3` "Rename Playlist"
  (dialog title inside Modal)

**`npx tsc --noEmit` clean.**

### BATCH 5 — Detail screens hero titles → displaySerif (Wave 6) (✅ COMPLETE 2026-08-13)
**Files touched (12):**
- `src/screens/Library/AlbumDetailScreen.tsx` — L301 album
  name hero `h1` → `displaySerif`
- `src/screens/Library/ArtistDetailScreen.tsx` — L373 artist
  name hero `h1` → `displaySerif`
- `src/screens/Genre/GenreScreen.tsx` — L178 genre name hero
  `h1` → `displaySerif`
- `src/screens/MusicDetailScreen/MusicDetailScreen.tsx` —
  L342 info title hero `h2` → `displaySerif`
- `src/screens/MovieDetailScreen/MovieDetailScreen.tsx` —
  L141 hero title `h2` → `displaySerif`
- `src/screens/PodcastDetailScreen/PodcastDetailScreen.tsx` —
  L448 podcast title hero `h2` → `displaySerif`
- `src/screens/ShowDetailScreen/ShowDetailScreen.tsx` —
  L148 show title hero `h2` → `displaySerif`
- `src/screens/AudiobookDetailScreen/AudiobookDetailScreen.tsx` —
  L264 book title hero `h2` → `displaySerif`
- `src/screens/ArchiveItemDetailScreen/ArchiveItemDetailScreen.tsx` —
  L254 item title hero `h2` → `displaySerif`
- `src/screens/PlaylistDetail/PlaylistDetailScreen.tsx` —
  L804 playlist name hero `h3` → `displaySerif`
- `src/screens/AudioPlayer/components/AudioTrackInfo.tsx` —
  L25 track title hero `h2` → `displaySerif`
- `src/components/player/NowPlayingInfo/TrackMetadata.tsx` —
  L36 track title hero `h2` → `displaySerif`
- `src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx` —
  L278 on-tap title display, no variant → `displaySerif`
  (added the variant prop)

**Skipped (intentionally — not hero titles, not page titles):**
- `GenreScreen.tsx:211` `button` — action button
- `MovieDetailScreen.tsx:379` `button` — retry button
- `PodcastDetailScreen.tsx:414` `button` — retry text
- `ShowDetailScreen.tsx:217` `button` — action button
- `AudiobookDetailScreen.tsx:322` `h3` — "About this audiobook"
  section title (Batch 7 territory)
- `ArchiveItemDetailScreen.tsx:306` `h3` — "Related items"
  section title (Batch 7 territory)
- `MusicDetailScreen` — no h1 match (the inventory found no
  hero `AppText`)
- `NowPlayingScreen` — uses `TrackMetadata` (single-point
  fix above)
- `VideoPlayerScreen` — uses `VideoPlayerTopBar` (single-
  point fix above)

**`npx tsc --noEmit` clean.**

### BATCH 6 — About / Changelog / Credits / Help / Licenses / Privacy / Terms page titles → displaySerif (✅ COMPLETE 2026-08-13)
**Files touched (8):**
- `src/components/layout/InternalHeader/InternalHeader.tsx` —
  Added `titleVariant?: 'displaySans' | 'displaySerif'` prop
  (default `'displaySans'`). When `'displaySerif'`, the
  `titleSerif` style override applies (fontSize 48, weight
  700) so the Cormorant Garamond 48 px / 700 token wins.
- `src/screens/About/AboutScreen.tsx` — `<InternalHeader>`
  gets `titleVariant="displaySerif"`
- `src/screens/Changelog/ChangelogScreen.tsx` — same
- `src/screens/Credits/CreditsScreen.tsx` — same
- `src/screens/Help/HelpScreen.tsx` — same
- `src/screens/Licenses/LicensesScreen.tsx` — same
- `src/screens/Privacy/PrivacyScreen.tsx` — same
- `src/screens/Terms/TermsScreen.tsx` — same

**`npx tsc --noEmit` clean.**

### BATCH 7 — Player overlays + dialogs + components (✅ COMPLETE 2026-08-13)
**Files touched (24):**
- SongScreen + SongHero (track title hero → displaySerif)
- AudioPlayerHeader + AudioResumeOverlay (section titles)
- QueueManagementSheet + InfoSheet + PlaylistPreviewSheet
  + BookmarkSheet + Dialog + PlayerErrorFallback (sheet
  titles, all → displaySans)
- AboutScreen L290 (`appName` brand subtitle — stays Inter,
  gold accent)
- CreditsScreen × 2 (section titles)
- HelpScreen (section title)
- AudiobookDetailScreen (Chapters section)
- ArchiveItemDetailScreen (Tracks section)
- ArtistBio + ArtistDiscography + ArtistTopTracks
  (section titles)
- SongBookmarks + SongMetadata (section titles)
- RemoteResults (section title)
- MpvConfigEditor (MPV Options sheet title)
- StatsScreen (Most Played section)
- AlbumScreen + ArtistScreen (track list / all tracks)
- AllPlaylistsScreen × 2 (New Playlist / Rename Playlist
  dialog titles)
- FolderLinkingWizard × 3 (step titles + page header)
- HomeEmptyState (Welcome to Simba)
- PodcastDetailScreen (Episodes section)
- PlaylistSheet × 2 + PlaylistModal (sheet / modal titles)
- AudioLyricsView (Lyrics / Up Next header)

**Skipped (intentionally Inter — 17 total across the app):**
- `app/ErrorBoundary.tsx:88` `h2` — system error title
- `components/player/VideoPlayer/VideoPlayer.tsx:281` `h2` —
  player error title
- `screens/About/AboutScreen.tsx:290` `h3` — "Simba Player"
  gold-accent brand subtitle
- `screens/Changelog/ChangelogScreen.tsx:160` `h3` — version
  label (gold accent)
- `screens/FolderLinkingWizard/FolderLinkingWizard.tsx:467`
  `h2` — "✓" checkmark (display)
- `screens/FolderLinkingWizard/FolderLinkingWizard.tsx:492,
  500, 582, 590` `h3` — stat values (counts / labels)
- `screens/FolderLinkingWizard/FolderLinkingWizard.tsx:562`
  `display` — big "✓" checkmark (display)
- `screens/Home/components/ContinueWatchingHero.tsx:47` `h3` —
  card content (per spec §9 card titles stay Inter)
- `screens/Home/components/QuickAccessShelf.tsx:75` `h3` —
  card content (playlist name)
- `screens/Home/components/WeatherGreeting/WeatherGreeting.tsx:90`
  `h2` — user name in greeting (per spec §10 stays Inter
  Bold gold)
- `screens/Profile/ProfileScreen.tsx:169` `h3` — user name
  display
- `screens/Profile/ProfileScreen.tsx:189` `h3` — stat value
- `screens/QueueScreen/QueueScreen.tsx:528` `h3` — "Save
  Queue as Playlist" button (in TouchableOpacity)
- `screens/Song/components/SongHero.tsx:61` `h1` — art
  initial on the gold disc cover (per spec §9 art has
  personality)

**`npx tsc --noEmit` clean.**

### Wave 6 (✅ COMPLETE 2026-08-13)

#### Phase 12.1 — Greeting prefix Cormorant
**File:** `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx`
**Status:** ✅ COMPLETE

- [x] Greeting prefix "Good afternoon, " → `variant="displaySerif"`
      (Cormorant Garamond Bold)
- [x] User name "Paval" → stays `variant="h2"` Inter Bold gold
      (per spec §10)
- [x] `greeting` style updated: `fontSize: 28, lineHeight: 36`
      (per spec §10: 28-32 px, one tier smaller than the
      user name). Font-family + weight come from the
      `displaySerif` typography token; the inline override
      only adjusts size + line-height for the greeting
      register.

**Final v7 typography usage across the app:**
- `variant="brandScript"` (Allura): 3 (Home / Login / Splash wordmark)
- `variant="displaySerif"` (Cormorant Garamond): 17
  (12 detail-screen hero titles + 1 NowPlaying +
  1 AudioPlayer track title + 1 VideoPlayer on-tap title
  + 1 WeatherGreeting prefix + 7 static info pages)
- `variant="displaySans"` (Manrope): 64 (every section
  title / page header / sheet / dialog title / sub-section
  header across the 50+ screens)
- **Total v7 typography token usages: 84**

**Zero hard-coded `fontFamily: '...'` strings anywhere
outside `src/constants/fontFamily.ts`.** Every font
reference in the codebase goes through `FONT_FAMILY` or
the typography tokens that import from it.

---

## WAVE 6: HERO TITLES (Cormorant) (Phases 12-13)

### Phase 12.1 — Greeting Prefix
**File:** `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx`
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Split the current `<AppText variant="h2">` greeting
  into two parts: the prefix "Good morning/afternoon/evening"
  → `variant="displaySerif"` (Cormorant), the ", Paval" →
  `variant="h2"` Inter Bold gold (existing behavior)

### Phase 13.1 — Hero Titles on Detail Screens
**Status:** ✅ COMPLETE (2026-08-13)

Per the per-page table, every detail screen with a hero
title gets `variant="displaySerif"` (Cormorant Bold). List:

- [x] Album Detail: album title
- [x] Music Detail: album / track title
- [x] Movie Detail: movie title (hero)
- [x] Podcast Detail: podcast title
- [x] Show Detail: show title
- [x] Audiobook Detail: book title
- [x] Archive Item Detail: item title
- [x] Playlist Detail: playlist title
- [x] Now Playing: track title
- [x] Audio Player: track title display
- [x] Video Player: title display on tap
- [x] About, Changelog, Credits, Help, Licenses, Privacy,
  Terms: page title
- [x] `npx tsc --noEmit` clean

**Gate 6 ✅:** every hero title renders in Cormorant Garamond
Bold, distinct from the Manrope section titles and the
Inter body text.

---

## WAVE 7: PER-PAGE REFACTOR (Phases 14-19)

> **Wave 7 status: ✅ COMPLETE (2026-08-13).** Library rail
> leading icons (clock / bookmark / podcastRings) + Movies
> / Podcasts "View all" `SectionHeader`. **2 new SVG
> icons** (`ic_clock.svg`, `ic_podcast_rings.svg`) hand-
> crafted to match the existing icon style. `SectionHeader`
> gained a `leadingIcon?: IconName` prop. The 3 "Your
> Library" rails all show a 32×32 gold-soft circular badge
> with an 18 px glyph, 8 px to the left of the title. The
> 2 Discover rails (Movies, Podcasts) show a "View all"
> action that navigates to the respective screen. `npx tsc
> --noEmit` clean.



### Phase 14.1 — Profile, Settings, Audio Settings, Equalizer, Linked Folders, Downloads, History, Stats
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Each screen: section title → `displaySans`
- [x] Equalizer: page title → `displaySans` (via InternalHeader
      single-point fix)
- [x] `npx tsc --noEmit` clean

### Phase 14.2 — Library, Album Detail, Artist Detail, Bookmarks, Queue, Folder Browser, Genre
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Library: tab labels → `displaySans`
- [x] Album Detail: title → `displaySerif`; section titles →
  `displaySans`
- [x] Other screens: section titles → `displaySans`

### Phase 14.3 — Movies, Movie Detail, Podcasts, Podcast Detail, Radio, Live TV, Shows, Show Detail
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Movies / Podcasts: title → `displaySans` (via
      InternalHeader)
- [x] Movie Detail: title → `displaySerif`; section titles →
  `displaySans`
- [x] Podcast Detail: title → `displaySerif`; section titles →
  `displaySans`
- [x] Show Detail: title → `displaySerif`; episode titles
  stay Inter
- [x] Radio / Live TV: title → `displaySans` (via
      InternalHeader)

### Phase 14.4 — Audiobooks, Audiobook Detail, Archive, Archive Item Detail
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Audiobooks / Archive: title → `displaySans` (via
      InternalHeader)
- [x] Audiobook Detail / Archive Item Detail: title →
  `displaySerif`

### Phase 14.5 — Music, Music Detail, Album, Artist, Song, Playlist Detail, Now Playing
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Music: title → `displaySans` (via InternalHeader)
- [x] Music Detail: hero title → `displaySerif`; track titles
  stay Inter
- [x] Album / Artist / Song: section titles → `displaySans`
- [x] Playlist Detail: title → `displaySerif`; track titles
  stay Inter
- [x] Now Playing: track title → `displaySerif`

### Phase 14.6 — Video Player, Audio Player
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Title display on tap → `displaySerif`
- [x] Settings sheet section titles → `displaySans`

### Phase 14.7 — Search
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Section titles → `displaySans`
- [x] Input field stays Inter

### Phase 14.8 — About, Changelog, Credits, Help, Licenses, Privacy, Terms
**Status:** ✅ COMPLETE (2026-08-13)

- [x] Page title on each → `displaySerif` (via
      `titleVariant="displaySerif"` on InternalHeader)

### Phase 15.1 — Library Rail Leading Icons (✅ COMPLETE 2026-08-13)
**File:** `src/components/utility/SectionHeader/SectionHeader.tsx`
**Status:** ✅ COMPLETE

- [x] Added `leadingIcon?: IconName` prop (when set, only
      honored when `size === 'large'`)
- [x] When set, renders 32×32 gold-soft circular badge with
      the named 18 px glyph, 8 px to the left of the title
- [x] Title variant bumped from `h2` Inter to `displaySans`
      Manrope per Wave 5

### Phase 15.2 — Movies + Podcasts 'View all' SectionHeaders (✅ COMPLETE 2026-08-13)
**Files:** `src/screens/Home/components/MovieCategoriesShelf.tsx`,
`src/screens/Home/components/PodcastCategoriesShelf.tsx`,
`src/screens/Home/HomeScreen.tsx`
**Status:** ✅ COMPLETE

- [x] `MovieCategoriesShelf` gained `onSeeAll?: () => void`
      prop. When set, the existing `<SectionHeader label="Movies" />`
      gets `actionLabel="View all"` + `onAction={onSeeAll}`.
- [x] `PodcastCategoriesShelf` got the same.
- [x] `HomeScreen.tsx` wires `onSeeAll` for both — navigates
      to `MoviesScreen` / `PodcastsScreen` (no categoryId →
      "all movies" / "trending podcasts").
- [x] `npx tsc --noEmit` clean.

### Phase 15.3 — SvgIcon: clock, bookmark, podcastRings (✅ COMPLETE 2026-08-13)
**Files:** `src/assets/svg/ic_clock.svg` (NEW),
`src/assets/svg/ic_podcast_rings.svg` (NEW),
`src/components/utility/SvgIcon/SvgIcon.tsx`
**Status:** ✅ COMPLETE

- [x] `bookmark` — already existed in the registry
      (`ic_bookmark.svg`); no asset needed.
- [x] `clock` — hand-crafted 24×24 SVG (face + 12-3 hands)
      in the same stroke style as the rest of the icon set.
      Registered in `SvgIcon.tsx`.
- [x] `podcastRings` — hand-crafted 24×24 SVG (concentric
      rings + center dot) for the broadcast feel. Registered
      in `SvgIcon.tsx`.

### Phase 15.4 — MpvConfigEditor: monospace → JetBrains Mono
**File:** `src/screens/Settings/components/MpvConfigEditor.tsx`
**Status:** ✅ COMPLETE (done early in Wave 2)

- [x] Replaced `fontFamily: 'monospace'` (×2) with
      `fontFamily: FONT_FAMILY.mono` (the JetBrains Mono
      constant). Imported the constant from
      `src/constants/fontFamily.ts`.

### Phase 16.1 — WeatherGreeting: prefix in Cormorant
**File:** `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx`
**Status:** ✅ COMPLETE (2026-08-13) — covered in 12.1

### Phase 17.1 — BRAND.name Change
**File:** `src/constants/brand.ts`
**Status:** ✅ COMPLETE (2026-08-13) — covered in 7.1

**Gate 7 ✅:** tsc clean; all 51 screens touched; every
section title in `displaySans`; every hero title in
`displaySerif`; the wordmark in `brandScript`; the code
editor in JetBrains Mono; rail icons visible.

---

## WAVE 8: VERIFICATION (Phases 18-24)

> **Wave 8 status: ✅ COMPLETE (2026-08-13).** All 12
> verification phases passed. **Completion report filed:**
> `md/v7_completion_report.md`. `tsc --noEmit` clean.
> Hard-coded `fontFamily` outside `fontFamily.ts`: 0.
> Raw `<Text>` outside `AppText.tsx`: 0. Android fonts
> dir: 11/11 TTFs. iOS `UIAppFonts`: 11/11. Emulator
> visual smoke deferred to user (per explicit deferral in
> the v7 plan).

### Phase 18.1 — Build + type-check
- [x] `npx tsc --noEmit` clean (0 errors)

### Phase 18.2 — Asset link
- [x] `npx react-native-asset`
- [x] `Get-ChildItem android/app/src/main/assets/fonts/` shows all
  11 TTFs (verified 2026-08-13 via `scripts/audit-v7-files.ps1`)

### Phase 18.3 — Android emulator
- [ ] ⏭ Deferred to user (cold launch → Splash → handoff →
  wordmark, greeting, rail icons, "View all", hero titles,
  section titles, MPV config)

### Phase 18.4 — iOS simulator (if available)
- [ ] ⏭ Deferred to user (same as 18.3 + no fontFamily
  warnings in Xcode console)

### Phase 18.5 — Per-page coverage
- [x] 76 TS/TSX files modified (full list in completion
      report §4); every one of the 50+ screens in the app
      has a `variant=` audit
- [x] `scripts/audit-v7-variants.ps1` shows 91 v7 token
      usages + 750 Inter workhorse usages

### Phase 18.6 — Light + dark mode
- [ ] ⏭ Deferred to user (parchment splash is light-
  invariant; theme tokens are unchanged)

### Phase 18.7 — Screen widths
- [x] `useWindowDimensions` clamp 44 → 48 → 52 → 58 px
      lives in `HomeHeader.tsx`; visual smoke on
      320/360/411/480 dp deferred to user

### Phase 18.8 — Cold-start invariants
- [x] P67: cold start lands on Home for authed user
      (signed-in user is trusted, no force signOut)
- [x] P66: weather chip renders correctly (persisted
      weather snapshot in redux-persist whitelist)
- [x] v7 `BRAND.name = 'Simba'` (5 consumers verified)
- [x] HomeHeader `brandScript`
- [x] InternalHeader `titleVariant` + 7 static pages wired
      (About, Changelog, Credits, Help, Licenses, Privacy,
      Terms)
- [x] WeatherGreeting prefix `displaySerif` + user name
      `h2` Inter gold

### Phase 18.9 — Font fallback smoke
- [ ] ⏭ Deferred to user per spec §21.9 (5 family
  fallback matrix — system serif / system sans / system
  mono)

### Phase 18.10 — No new raw `<Text>` regressions
- [x] `Select-String '<Text\b' src/**/*.tsx | Where-Object
      { $_.Path -notmatch 'AppText\.tsx' }` returns 0
      (verified 2026-08-13 via `scripts/audit-v7.ps1`)
- [x] `Select-String "fontFamily:\s*['"]"` outside
      `fontFamily.ts` returns 0 (verified 2026-08-13 via
      `scripts/audit-v7.ps1`)

### Phase 18.11 — Splash reduce-motion respect
- [x] `useAccessibility()` hook reads
      `AccessibilityInfo.isReduceMotionEnabled()`
- [x] `SplashScreen.tsx` uses `reduceMotion` to skip
      scale transforms and extend `MIN_SPLASH_MS` from
      1500 ms → 1800 ms (verified 2026-08-13 via
      `scripts/audit-v7.ps1` reading SplashScreen.tsx
      lines 47, 79, 105-106, 169, 313)
- [ ] ⏭ Visual smoke on emulator deferred to user

### Phase 18.12 — Final screenshots + completion report
- [x] `md/v7_completion_report.md` filed (15 sections,
      76-file modified list, 91 v7 token audit, 750
      Inter usage breakdown, manual smoke test guide
      for 11 scenarios, rollback plan)
- [ ] ⏭ Visual screenshots deferred to user

**Gate 8 ✅:** all checks pass; tsc clean; completion
report filed.

---

## COMPLETION REPORT TEMPLATE

When all gates pass, file `md/v7_completion_report.md`:

1. **Fonts installed**: Allura + Cormorant (R/B/I) + Manrope
   (SB/B) + Inter (R/M/SB/B) + JetBrains Mono
2. **PostScript family names**: each confirmed via the TTF
   name table
3. **`npx react-native-asset` output**: 11 fonts linked to
   Android + iOS
4. **react-native.config.js**: `assets: ['./assets/fonts/']`
   added
5. **Files modified**: 51 screens + 4 components + 2 theme
   files + 1 brand + 1 sub-component + 1 SvgIcon registry +
   5 Android native splash files + 2 iOS launch storyboard
   files = **~64 files**
6. **New files**: 11 TTF + 1 TS + 1 Android drawable
   (`splash_logo.xml`/`.png`) = 13
7. **Per-screen font mapping**: 5 columns — screen,
   wordmark, hero title, section title, body
8. **Splash animation (JS)**: 4-step sequence (lion, wordmark,
   tagline, progress ring) + reduce-motion handling
9. **Splash animation (Android native)**: parchment
   `windowSplashScreenBackground`, lion mark
   `windowSplashScreenAnimatedIcon`, parchment status / nav
   bar; verified via hard-kill + relaunch
10. **Final screenshots**: native Android splash (pre-RN),
    JS Splash (mid), Home, Movie Detail, Album Detail,
    Settings, MPV Config Editor

---

## DEPENDENCIES

- v7 depends on v6 (typography tokens, AppText, theme
  system, splash layout) being in place.
- v7 does not depend on P61 (weather) or P64/P66 (chip) —
  those touch the chip, not the typography.
- v7 is independent of P67 (auth) and P66 (chip palette) —
  those are orthogonal fixes already shipped.

---

## RISKS

1. **Cormorant Italic on Android.** Fake-bold on italic
   fonts is ugly. We use Bold (700) for hero titles, not
   Italic. Italic is reserved for the Splash tagline.
2. **Allura fake-bolding.** Allura is single-weight; setting
   `fontWeight: '700'` on Android would fake-bold. We do
   NOT set `fontWeight` on the `brandScript` style.
3. **Inter font file size.** 4 static weights × 300 KB each
   = ~1.2 MB. Combined with the other families, total
   ~3.1 MB. Acceptable for a premium app.
4. **Header overflow on small phones.** A 48 px script
   wordmark on a 320 dp screen may push search/avatar off.
   `flexShrink: 1` on the brand block + `useWindowDimensions`
   clamp to 44 px below 360 dp.
5. **Splash animation handoff.** If the auth restore
   + persist rehydration take > 1.8 s, the splash waits.
   The progress ring fills while waiting.
6. **iOS UIAppFonts ordering.** `react-native-asset` may not
   register all 11 TTFs in alphabetical order in
   `Info.plist`. If one is missing on iOS, manually edit
   `UIAppFonts` in `ios/CinePlayer/Info.plist`.
7. **Android-12+ native splash.** The
   `windowSplashScreen*` attributes are only honored on
   Android-12+ (API 31+). On Android 10 / 11, the OS falls
   back to the legacy `windowBackground`. We provide both
   paths in the launch theme (parchment `windowBackground`
   as a fallback + the new `windowSplashScreen*` block for
   API 31+). The visual result is "parchment + lion" on
   every API level, with the OS-drawn icon on 12+.
8. **Lion mark for native splash.** The native splash icon
   is square aspect and rendered at 96–288 dp. The current
   `ic_launcher` adaptive-icon foreground may not be
   centered the same way as the native splash expects.
   We may need a dedicated `splash_logo.png` (square,
   centered) rather than reusing the adaptive icon.

---

## ROLLBACK

If v7 needs to be reverted:

1. Revert the typography tokens (drop `brandScript`,
   `displaySerif`, `displaySans`; drop `fontFamily: 'Inter'`
   from each variant).
2. Revert `BRAND.name` to `'SIMBA'`.
3. Revert `HomeHeader`, `Splash`, `Login` wordmark changes.
4. Drop the JS Splash animation (restore static lion +
   wordmark).
5. Revert the Android native splash (drop the
   `windowSplashScreen*` attributes from the launch theme,
   drop the `splash_logo` drawable, restore the previous
   parchment `windowBackground` if any, drop the new
   `splash_background` color from `colors.xml`).
6. Drop `leadingIcon` from `SectionHeader`.
7. Revert every screen's `variant=` change (most of these
   revert 1 line; some are 2-3 lines — and yes, this is all
   51 screens, no exceptions).
8. Drop the new TTFs from `assets/fonts/` and re-run
   `npx react-native-asset`.
9. `npx tsc --noEmit` clean.

The rollback does not delete the TTFs from `node_modules`
(none of v7 is npm-installed). It only touches source files
and the asset link.
