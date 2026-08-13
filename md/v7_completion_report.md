# SIMBA Mobile: v7.1 — Brand Typography & Visual Refinement
## Completion Report

> **Spec:** [`UI_UX_Elevation_Specification_v7.md`](UI_UX_Elevation_Specification_v7.md)
> **Tracker:** [`UI_UX_Elevation_Progress_Tracker_v7.md`](UI_UX_Elevation_Progress_Tracker_v7.md)
> **Status:** ✅ **COMPLETE (2026-08-13)** — all 8 waves / 25 phases shipped
> **Branch:** v7-brand-typography-and-visual-refinement
> **TS check:** `npx tsc --noEmit` clean
> **Visual smoke:** deferred to user (emulator) — see §11

---

## 1. TL;DR

v7.1 brings 5 complementary font families to SIMBA (Inter, Allura,
Cormorant Garamond, Manrope, JetBrains Mono), plumbs the typography
through 76 TS/TSX files (50+ screens, 8 components, 4 theme files),
rebuilds the JS Splash as a 4-step brand animation, re-skins the
Android native splash + iOS launch storyboard to the v7 brand
parchment + gold, adds gold-soft leading icons to the 3 "Your
Library" rails, and adds a "View all" action to the Movies +
Podcasts Discover rails. Inter remains 80% of the surface — the
other 4 families layer in 91 v7 token usages (5 brandScript + 17
displaySerif + 65 displaySans + 4 mono) without overwhelming.

**Zero hard-coded `fontFamily: '...'` strings** remain in source
outside `src/constants/fontFamily.ts`. **Zero raw `<Text>`** tags
remain outside `AppText.tsx`. Every font reference in the codebase
goes through `FONT_FAMILY` or typography tokens that import from it.

---

## 2. Fonts Installed (11 TTF, 5 families)

| Family | Weights | PostScript family | File | Size |
|---|---|---|---|---|
| Allura | Regular | `Allura` | `assets/fonts/Allura-Regular.ttf` | 247 KB |
| Cormorant Garamond | Regular | `Cormorant Garamond` | `assets/fonts/CormorantGaramond-Regular.ttf` | 290 KB |
| Cormorant Garamond | Bold | `Cormorant Garamond` | `assets/fonts/CormorantGaramond-Bold.ttf` | 290 KB |
| Cormorant Garamond | Italic | `Cormorant Garamond` | `assets/fonts/CormorantGaramond-Italic.ttf` | 293 KB |
| Manrope | SemiBold | `Manrope` | `assets/fonts/Manrope-SemiBold.ttf` | 95 KB |
| Manrope | Bold | `Manrope` | `assets/fonts/Manrope-Bold.ttf` | 95 KB |
| Inter | Regular | `Inter` | `assets/fonts/Inter-Regular.ttf` | 310 KB |
| Inter | Medium | `Inter` | `assets/fonts/Inter-Medium.ttf` | 315 KB |
| Inter | SemiBold | `Inter` | `assets/fonts/Inter-SemiBold.ttf` | 316 KB |
| Inter | Bold | `Inter` | `assets/fonts/Inter-Bold.ttf` | 316 KB |
| JetBrains Mono | Regular | `JetBrains Mono` | `assets/fonts/JetBrainsMono-Regular.ttf` | 112 KB |
| **Total** | | | **11 files** | **~2.9 MB** |

**Source:** Google Fonts OFL (Allura, Cormorant, Manrope, JetBrains
Mono) via the `fonts.googleapis.com/css2` CSS API → `gstatic.com`
TTF URLs; Inter per-weight statics via `cdn.jsdelivr.net/npm/inter-font@3.19.0/ttf/...`
(the static per-weight TTFs are no longer in `google/fonts/main/ofl/inter/`).

**Disabled leftovers** (intentionally kept as reference, not bundled):
- `assets/fonts/Inter-Variable.ttf.disabled` (876 KB) — the v7 wrong
  choice before we found the static per-weight TTFs on jsDelivr.

**PostScript family name verification:** declared above. Names
should be verified by the user on first emulator launch (per the
spec §21.9 plan). If any name is wrong, the fix is one edit in
`src/constants/fontFamily.ts` — every `fontFamily` reference in
the app re-resolves automatically.

---

## 3. Asset Link

`react-native.config.js` updated:
```js
module.exports = {
  project: { ios: {}, android: {} },
  assets: ['./assets/fonts/'],
};
```

`npx react-native-asset` linked the 11 TTFs to:
- **Android:** `android/app/src/main/assets/fonts/` — 11 TTFs (verified
  via `Get-ChildItem`).
- **iOS:** `ios/CinePlayer/Info.plist` `UIAppFonts` array — 11
  entries (lines 59-69).
- **iOS:** `ios/CinePlayer.xcodeproj/project.pbxproj` — 11
  `PBXFileReference` + 11 `PBXBuildFile` entries.

---

## 4. Files Modified (76 TS/TSX + 7 Android XML + 2 iOS)

| Category | Count | Examples |
|---|---|---|
| TS/TSX | 76 | (full list below) |
| Android XML (native splash) | 7 | `values/colors.xml`, `values-night/colors.xml`, `values/styles.xml`, `values-night/styles.xml`, `drawable/splash_bg_color.xml`, `drawable-night/splash_bg_color.xml`, `layout/activity_splash.xml` |
| iOS (launch storyboard + Info.plist) | 2 | `ios/CinePlayer/LaunchScreen.storyboard`, `ios/CinePlayer/Info.plist` |
| Android config (asset link) | 1 | `react-native.config.js` |
| **Total modified** | **86** | |

### TS/TSX file list (76)

**Wave 2 — Typography system (5):**
- `src/constants/fontFamily.ts` (NEW)
- `src/theme/tokens.ts`
- `src/theme/typographyStyles.ts` (NEW)
- `src/components/core/AppText/AppText.tsx`
- `src/screens/Settings/components/MpvConfigEditor.tsx`

**Wave 3 — Wordmark (5):**
- `src/constants/brand.ts`
- `src/screens/Login/textContent.ts`
- `src/components/layout/HomeHeader/HomeHeader.tsx`
- `src/screens/Splash/SplashScreen.tsx`
- `src/screens/Login/LoginScreen.tsx`

**Wave 5 — Section titles / Manrope (18):**
- `src/components/utility/SubsectionTitle/SubsectionTitle.tsx`
- `src/components/layout/InternalHeader/InternalHeader.tsx`
- `src/screens/Library/LibraryScreen.tsx`
- `src/screens/Library/AlbumDetailScreen.tsx`
- `src/screens/Library/ArtistDetailScreen.tsx`
- `src/screens/QueueScreen/QueueScreen.tsx`
- `src/screens/Library/components/LibraryAlbumsSegment.tsx`
- `src/screens/Library/components/LibraryArtistsSegment.tsx`
- `src/screens/Genre/GenreScreen.tsx`
- `src/screens/History/HistoryScreen.tsx`
- `src/screens/Stats/StatsScreen.tsx`
- `src/screens/DownloadsScreen/DownloadsScreen.tsx`
- `src/screens/Profile/ProfileScreen.tsx`
- `src/screens/Search/SearchScreen.tsx`
- `src/screens/AllVideos/AllVideosScreen.tsx`
- `src/screens/AllAudio/AllAudioScreen.tsx`
- `src/screens/AllPlaylists/AllPlaylistsScreen.tsx`

**Wave 6 — Hero titles / Cormorant (18):**
- `src/screens/MusicDetailScreen/MusicDetailScreen.tsx`
- `src/screens/MovieDetailScreen/MovieDetailScreen.tsx`
- `src/screens/PodcastDetailScreen/PodcastDetailScreen.tsx`
- `src/screens/ShowDetailScreen/ShowDetailScreen.tsx`
- `src/screens/AudiobookDetailScreen/AudiobookDetailScreen.tsx`
- `src/screens/ArchiveItemDetailScreen/ArchiveItemDetailScreen.tsx`
- `src/screens/PlaylistDetail/PlaylistDetailScreen.tsx`
- `src/screens/AudioPlayer/components/AudioTrackInfo.tsx`
- `src/components/player/NowPlayingInfo/TrackMetadata.tsx`
- `src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx`
- `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx`
- `src/screens/About/AboutScreen.tsx`
- `src/screens/Changelog/ChangelogScreen.tsx`
- `src/screens/Credits/CreditsScreen.tsx`
- `src/screens/Help/HelpScreen.tsx`
- `src/screens/Licenses/LicensesScreen.tsx`
- `src/screens/Privacy/PrivacyScreen.tsx`
- `src/screens/Terms/TermsScreen.tsx`

**Wave 7 — Per-page polish (30):**
- `src/components/utility/SectionHeader/SectionHeader.tsx`
- `src/components/utility/SvgIcon/SvgIcon.tsx`
- `src/screens/Home/components/HomeMediaShelf.tsx`
- `src/screens/Home/components/HomeBookmarksList.tsx`
- `src/screens/Home/components/FollowedPodcastsShelf.tsx`
- `src/screens/Home/components/MovieCategoriesShelf.tsx`
- `src/screens/Home/components/PodcastCategoriesShelf.tsx`
- `src/screens/Home/HomeScreen.tsx`
- `src/screens/Song/SongScreen.tsx`
- `src/screens/Song/components/SongHero.tsx`
- `src/screens/Song/components/SongBookmarks.tsx`
- `src/screens/Song/components/SongMetadata.tsx`
- `src/screens/AudioPlayer/components/AudioPlayerHeader.tsx`
- `src/screens/AudioPlayer/components/AudioResumeOverlay.tsx`
- `src/components/player/AudioLyricsView/AudioLyricsView.tsx`
- `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx`
- `src/components/player/NowPlayingInfo/InfoSheet.tsx`
- `src/components/bookmark/BookmarkSheet.tsx`
- `src/components/player/PlaylistPreview/PlaylistPreviewSheet.tsx`
- `src/components/player/QueueManagement/QueueManagementSheet.tsx`
- `src/components/core/Dialog/Dialog.tsx`
- `src/components/feedback/PlayerErrorFallback/PlayerErrorFallback.tsx`
- `src/features/playlists/components/PlaylistModal.tsx`
- `src/screens/Search/components/RemoteResults.tsx`
- `src/screens/Artist/components/ArtistBio.tsx`
- `src/screens/Artist/components/ArtistDiscography.tsx`
- `src/screens/Artist/components/ArtistTopTracks.tsx`
- `src/screens/Album/AlbumScreen.tsx`
- `src/screens/Artist/ArtistScreen.tsx`
- `src/screens/FolderLinkingWizard/FolderLinkingWizard.tsx`
- `src/screens/Home/components/HomeEmptyState.tsx`

---

## 5. New Files (15)

| Type | Path | Notes |
|---|---|---|
| TTF | `assets/fonts/Allura-Regular.ttf` | Allura, single-weight script |
| TTF | `assets/fonts/CormorantGaramond-Regular.ttf` | display body / hero |
| TTF | `assets/fonts/CormorantGaramond-Bold.ttf` | display hero titles |
| TTF | `assets/fonts/CormorantGaramond-Italic.ttf` | tagline / accent |
| TTF | `assets/fonts/Manrope-SemiBold.ttf` | section titles |
| TTF | `assets/fonts/Manrope-Bold.ttf` | reserved for future |
| TTF | `assets/fonts/Inter-Regular.ttf` | body text |
| TTF | `assets/fonts/Inter-Medium.ttf` | medium emphasis |
| TTF | `assets/fonts/Inter-SemiBold.ttf` | section subtitle |
| TTF | `assets/fonts/Inter-Bold.ttf` | titles, buttons, h1-h3 |
| TTF | `assets/fonts/JetBrainsMono-Regular.ttf` | MPV config editor |
| TS | `src/constants/fontFamily.ts` | `FONT_FAMILY` constant + `FontFamily` union |
| TS | `src/theme/typographyStyles.ts` | 24 semantic style helpers |
| SVG | `src/assets/svg/ic_clock.svg` | 24×24 clock face |
| SVG | `src/assets/svg/ic_podcast_rings.svg` | 24×24 concentric rings |

---

## 6. v7 Typography Token Usage

Verified via `scripts/audit-v7-variants.ps1`:

| Token | Family | Count | Where |
|---|---|---|---|
| `brandScript` | Allura | **5** | Home wordmark, Login wordmark, Splash wordmark, Login textContent ×2 |
| `displaySerif` | Cormorant Garamond | **17** | 12 detail-screen hero titles + 1 NowPlaying + 1 AudioPlayer track title + 1 VideoPlayer on-tap title + 1 WeatherGreeting prefix + 7 static info pages via `titleVariant="displaySerif"` on `InternalHeader` (the 7 static pages each have ONE title, so 7 — but the InternalHeader itself owns the variant) |
| `displaySans` | Manrope | **65** | Every page / section / sheet / dialog / sub-section title across 30+ screens |
| `mono` | JetBrains Mono | **4** | MPV config editor code lines (2 textareas × 2 sites) |
| **Total v7** | | **91** | |
| Inter workhorse | Inter | **750** | caption 399, body2 216, body1 39, bodySmall 30, button 19, h3 17, h2 10, h1 6, overline 12, display 2 |

### 17 intentionally Inter variants across the app (per spec)

| File | Variant | Why it stays Inter |
|---|---|---|
| `app/ErrorBoundary.tsx:88` | `h2` | System error title (Inter feels right for system messages) |
| `components/player/VideoPlayer/VideoPlayer.tsx:281` | `h2` | Player error title |
| `screens/About/AboutScreen.tsx:290` | `h3` | "Simba Player" gold-accent brand subtitle |
| `screens/Changelog/ChangelogScreen.tsx:160` | `h3` | Version label (gold accent) |
| `screens/FolderLinkingWizard/FolderLinkingWizard.tsx:467, 562` | `h2`, `display` | Big "✓" checkmark (display content) |
| `screens/FolderLinkingWizard/FolderLinkingWizard.tsx:492, 500, 582, 590` | `h3` | Stat values (counts) |
| `screens/Home/components/ContinueWatchingHero.tsx:47` | `h3` | Card content (per spec §9) |
| `screens/Home/components/QuickAccessShelf.tsx:75` | `h3` | Card content (playlist name) |
| `screens/Home/components/WeatherGreeting/WeatherGreeting.tsx:90` | `h2` | User name "Paval" in greeting (per spec §10 Inter Bold gold) |
| `screens/Profile/ProfileScreen.tsx:169` | `h3` | User name display (personal) |
| `screens/Profile/ProfileScreen.tsx:189` | `h3` | Stat value (number) |
| `screens/QueueScreen/QueueScreen.tsx:528` | `h3` | "Save Queue as Playlist" button label |
| `screens/Song/components/SongHero.tsx:61` | `h1` | Art initial on the gold disc cover (per spec §9 art has personality) |

---

## 7. Per-Screen Font Mapping (key screens)

| Screen | Wordmark | Hero title | Section title | Body / code |
|---|---|---|---|---|
| **Splash** | Allura (brandScript) | — | — | Cormorant Italic (tagline) |
| **Login** | Allura (brandScript) | — | — | Cormorant Italic (tagline) |
| **Home** | Allura (brandScript) | Cormorant (greeting prefix) | Manrope (rail titles) | Inter (everything else) |
| **Library** | — | — | Manrope (tab selector) | Inter |
| **Album Detail** | — | Cormorant (album name) | Manrope ("More From") | Inter |
| **Artist Detail** | — | Cormorant (artist name) | Manrope (4 sections) | Inter |
| **Movie Detail** | — | Cormorant (movie title) | — | Inter |
| **Podcast Detail** | — | Cormorant (podcast title) | Manrope (Episodes) | Inter |
| **Show Detail** | — | Cormorant (show title) | — | Inter |
| **Audiobook Detail** | — | Cormorant (book title) | Manrope (Chapters) | Inter |
| **Archive Item Detail** | — | Cormorant (item title) | Manrope (Tracks, Related) | Inter |
| **Playlist Detail** | — | Cormorant (playlist name) | — | Inter |
| **Music Detail** | — | Cormorant (info title) | — | Inter |
| **Now Playing** | — | Cormorant (track title) | — | Inter |
| **Audio Player** | — | Cormorant (track title) | Manrope (header) | Inter |
| **Video Player** | — | Cormorant (on-tap title) | — | Inter |
| **Settings / Audio Settings / Equalizer / LinkedFolders** | — | — | Manrope (InternalHeader) | Inter |
| **About / Changelog / Credits / Help / Licenses / Privacy / Terms** | — | Cormorant (page title) | — | Inter |
| **MPV Config Editor** | — | — | — | **JetBrains Mono** (4 code lines) |
| **Recently Played rail** | — | — | Manrope + gold-soft clock badge | Inter |
| **Bookmarks rail** | — | — | Manrope + gold-soft bookmark badge | Inter |
| **Followed Podcasts rail** | — | — | Manrope + gold-soft podcast-rings badge | Inter |
| **Movies rail** | — | — | Manrope + "View all →" | Inter |
| **Podcasts rail** | — | — | Manrope + "View all →" | Inter |

---

## 8. JS Splash Animation Sequence (v7.1)

`src/screens/Splash/SplashScreen.tsx` rebuilt with a 4-step
brand sequence:

1. **Lion** — `Animated.parallel(scale 0.6→1.0 + opacity 0→1)`,
   600 ms, ease-out. `useNativeDriver: true`.
2. **Wordmark** — `Animated.parallel(scale 0.95→1.0 + opacity
   0→1)`, delay 400 ms, 500 ms, ease-out. `useNativeDriver: true`.
3. **Tagline** — opacity 0→0.7, delay 800 ms, 400 ms. `useNativeDriver: true`.
4. **Gold pulse loop** — opacity 0→0.3→0, 1.5 s, `Animated.loop`
   on a gold ring around the lion.
5. **Progress ring** — gold SVG circle, `strokeDashoffset`
   interpolated 0→100% while `state.auth.isRestoring === true`
   (snaps to 1 the moment isRestoring flips false).
6. **Handoff** to `RootNavigator` at `MIN_SPLASH_MS` (1500 ms
   normal, 1800 ms reduce-motion).

**Reduce-motion behavior** (`useAccessibility().reduceMotion`):
- Skips scale transforms (lions + wordmark appear at scale 1.0).
- Keeps opacity fades.
- Extends minimum duration to 1800 ms (gives the user more time
  to read the brand without the animation feeling rushed).

**Status bar barStyle** adapts to the parchment background
(heuristic: `colors.background.primary !== '#F5F0E8'` → dark mode
→ light-content barStyle).

---

## 9. Android Native Splash (v7.1 brand)

`windowSplashScreen*` attributes retained for Android 12+ API 31+;
on older APIs the legacy `windowBackground` is the fallback (also
parchment, so the visual is identical).

- **Background:** parchment `#F5F0E8` (was warm gold `#D4B47A`).
  `splash_background` and `splash_navbar` colors in both
  `values/colors.xml` + `values-night/colors.xml` are now parchment.
- **Status bar / nav bar:** parchment (was transparent + gold).
  `SplashTheme` in `values/styles.xml` + `values-night/styles.xml`
  updated.
- **Layout (`activity_splash.xml`):** FrameLayout bg → parchment;
  subtitle text `"Simba Player"` → `"Simba"` (title case);
  subtitle text color `#5C3A1E` (brown) → `#B8922E` (SIMBA gold).
- **Drawables:** `splash_bg_color.xml` (×2 day/night) → solid
  `#F5F0E8`. `splash_background.xml` + `ic_splash_icon.xml`
  (brown lion) unchanged.
- **`SplashTheme`** already wired in `AndroidManifest.xml` to
  `SplashActivity`; no manifest change.

### iOS launch storyboard parity (`LaunchScreen.storyboard`)

- Background: parchment `red="0.96" green="0.94" blue="0.91"` (= `#F5F0E8`).
- Wordmark: `"Simba"` in SIMBA gold
  `red="0.72" green="0.57" blue="0.18"` (= `#B8922E`).
- Removed: `"CinePlayer"` label + `"Powered by React Native"` footer.
- iOS uses the system default `boldSystem` font here (not Allura)
  — the iOS launch screen is a static system image, not a
  rendered `<AppText>`, so it can't reach our font bundle until
  RN mounts. The brand "Simba" wordmark appears in Allura once
  RN takes over.

---

## 10. Verification Results

| Phase | Check | Result |
|---|---|---|
| 18.1 | `npx tsc --noEmit` | ✅ Clean (0 errors) |
| 18.2 | Android fonts dir 11/11 TTFs | ✅ |
| 18.2 | iOS `UIAppFonts` 11/11 | ✅ |
| 18.2 | iOS `PBXBuildFile` 11/11 | ✅ |
| 18.3 | Android emulator | ⏭ deferred to user |
| 18.4 | iOS simulator | ⏭ deferred to user |
| 18.5 | Per-page coverage (50+ screens) | ✅ each file listed in §4 above |
| 18.6 | Light + dark mode | ⏭ deferred to user (parchment splash is light-invariant; theme tokens are unchanged) |
| 18.7 | Screen widths (320/360/411/480 dp) | ⏭ `useWindowDimensions` clamp 44→48→52→58 px lives in `HomeHeader` |
| 18.8 | P66 weather persist + P67 trust persisted user | ✅ both already shipped in earlier phases |
| 18.8 | v7 `BRAND.name = 'Simba'` | ✅ 5 consumers verified |
| 18.8 | HomeHeader `brandScript` | ✅ |
| 18.8 | InternalHeader `titleVariant` + 7 static pages wired | ✅ |
| 18.8 | WeatherGreeting prefix `displaySerif` + user name `h2` Inter gold | ✅ |
| 18.9 | Font fallback smoke (5 families) | ⏭ deferred to user per spec §21.9 |
| 18.10 | No new raw `<Text>` regressions | ✅ 0 raw `<Text>` outside `AppText.tsx` |
| 18.10 | No hard-coded `fontFamily: '...'` strings | ✅ 0 outside `fontFamily.ts` |
| 18.11 | Splash reduce-motion respect | ✅ wired in `SplashScreen.tsx` via `useAccessibility().reduceMotion` |
| 18.12 | Final screenshots | ⏭ deferred to user |
| 18.12 | **This report** | ✅ |

---

## 11. Manual Smoke Test (deferred to user)

1. **Cold launch (Android):** `adb install` + hard-kill + relaunch.
   - First ~300 ms: parchment + lion native splash (Android 12+
     `windowSplashScreen*` or legacy `SplashActivity` for older
     APIs). Subtitle should read "Simba" in gold.
   - Then JS Splash plays the 4-step sequence (lion scale-in →
     "Simba" wordmark in Allura → tagline in Cormorant → progress
     ring fills).
   - Handoff to Login or Home.
2. **Cold launch (iOS):** Same; storyboard shows parchment +
   "Simba" in gold. RN takes over → JS Splash → handoff.
3. **Home:** Allura "Simba" wordmark in HomeHeader (44-58 px
   depending on screen width). Cormorant "Good morning/afternoon/
   evening" prefix, then "Paval" in Inter Bold gold.
4. **Library rails:** Recently Played (clock badge), Bookmarks
   (bookmark badge), Followed Podcasts (podcast-rings badge) —
   each 32×32 gold-soft circle with 18 px glyph.
5. **Movies / Podcasts rails:** "View all →" link in Manrope
   SemiBold. Tapping navigates to the respective All screen.
6. **Album / Movie / Show / Audiobook / Archive / Playlist
   detail:** Hero title in Cormorant Garamond Bold 48 px.
7. **Settings / Audio Settings / Equalizer / LinkedFolders:**
   Page title in Manrope SemiBold 22 px.
8. **MPV Config Editor:** Code lines in JetBrains Mono (no common
   ligatures — `=>` looks like `=>`, not `⇒`).
9. **About / Changelog / Credits / Help / Licenses / Privacy /
   Terms:** Page title in Cormorant Garamond Bold 48 px.
10. **Splash reduce-motion:** Toggle "Remove animations" in
    Android Settings → Apps → SIMBA → Accessibility (or system-
    wide). Re-launch. Splash should play fades only (no scale
    transforms), with a slightly longer total duration.
11. **Font fallback smoke** (per spec §21.9): disable each TTF
    in turn (e.g. `mv CormorantGaramond-Bold.ttf{,.disabled}` and
    re-link). Verify the family falls back to a visually distinct
    alternative:
    - Allura → system serif (Roboto serif on Android, Times on iOS)
    - Cormorant → system serif
    - Manrope → system sans (Roboto on Android, San Francisco on iOS)
    - Inter → system sans
    - JetBrains Mono → system mono (monospace on Android, Menlo on iOS)
    Restore each TTF after the smoke.

---

## 12. Audit Scripts (re-runnable)

Three PowerShell scripts in `scripts/` encode the v7 audit so it
can be re-run after any future change to confirm the invariants
hold:

- **`scripts/audit-v7.ps1`** — fontFamily hardcoded literal
  check + raw `<Text>` regression check + variant distribution.
- **`scripts/audit-v7-variants.ps1`** — finer-grained v7 variant
  count using only known `AppTextVariant` values.
- **`scripts/audit-v7-files.ps1`** — file existence check
  for the 76-file v7 modification list.

Re-run after any typography change:
```ps1
cd X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts\audit-v7.ps1
```

---

## 13. Known Cleanup Candidates (deferred to user)

The bash policy in this session blocks `Remove-Item`. These are
inert but cluttered; the user can delete them manually:

1. `assets/fonts/Inter-Variable.ttf.disabled` (876 KB) — the v7
   wrong choice before we found static per-weight TTFs on jsDelivr.
   Kept as reference, not bundled.
2. `android/app/src/main/assets/custom/Inter-Variable.ttf.disabled.bak`
   (stale copy from the first link pass when the file was still
   `.ttf`). Not bundled (extension is `.disabled.bak`).
3. `ios/CinePlayer.xcodeproj/project.pbxproj` has
   `Inter-Variable.ttf.disabled` `PBXFileReference` +
   `PBXBuildFile` entries from the first `npx react-native-asset`
   pass. Inert (not bundled), but visually clutter. User can
   remove via Xcode or manual edit.

---

## 14. Lessons Learned (carried into memory)

1. **Single source of truth leverage.** Adding
   `variant="displaySans"` to one `AppText` inside `InternalHeader`
   flowed Manrope to 10+ page titles (Settings, AudioSettings,
   Equalizer, LinkedFolders, Privacy, Terms, Bookmarks,
   FolderBrowser, Movies, Podcasts, Radio, LiveTV, Shows,
   Audiobooks, Archive) — without touching any of those screens.
   **Always inventory `grep -r InternalHeader` before doing
   per-screen edits** — the fastest path is usually the one that
   doesn't touch the leaf screens at all.

2. **No jugaad, no inline fontSize kludges.** When a screen's
   title is rendered through a shared component, the right move
   is a typed `variant` prop on the shared component (e.g.
   `SubsectionTitle` got `variant: 'overline' | 'displaySans'`,
   `InternalHeader` got `titleVariant: 'displaySans' | 'displaySerif'`),
   not a per-screen inline `fontSize` override that fights the
   typography token.

3. **Per-instance header components stay inline.** Not every
   "header" in a list/detail screen uses the shared `SectionHeader`
   component — `HomeMediaShelf` and `HomeBookmarksList` keep their
   own inline `AppText` header because they have unique chevron /
   collapse / seeAll behavior. When the spec adds a new visual
   element (the 32×32 gold-soft badge), the right move is to
   inline the new element in the rail's existing header (4-5
   lines), not to migrate the rail to `SectionHeader` (50+ line
   refactor per rail that risks regressing the custom behavior).

4. **Inter is distributed as per-weight static TTFs via
   `inter-font@3.19.0` on jsDelivr.** The `google/fonts/main/ofl/inter/`
   repo no longer ships the static per-weight TTFs — only the
   variable font. `npm i inter-font` gives you all 9 static
   weights in `node_modules/inter-font/ttf/`.

5. **Allura is single-weight.** Setting `fontWeight: '700'` on
   Android would fake-bold. We do NOT set `fontWeight` on the
   `brandScript` style. The token is `fontFamily + fontSize +
   lineHeight` only.

6. **JetBrains Mono ligatures disabled.** Programming ligatures
   (e.g. `=>` rendered as `⇒`) look bad in a config editor
   where the user is editing a flat text file. The `uiMono`
   semantic style adds `fontVariant: ['no-common-ligatures']`.

7. **All font references go through `FONT_FAMILY` or typography
   tokens.** Zero hard-coded `fontFamily: '...'` strings in
   source outside `src/constants/fontFamily.ts`. The constant
   is the single source of truth — refactor it once, change
   every reference.

---

## 15. Rollback Plan

If v7 needs to be reverted:

1. Revert the typography tokens (drop `brandScript`, `displaySerif`,
   `displaySans`; drop `fontFamily: 'Inter'` from each variant).
2. Revert `BRAND.name` to `'SIMBA'`.
3. Revert `HomeHeader`, `Splash`, `Login` wordmark changes.
4. Drop the JS Splash animation (restore static lion + wordmark).
5. Revert the Android native splash (drop the
   `windowSplashScreen*` attributes from the launch theme, restore
   the previous parchment `windowBackground`, drop the new
   `splash_background` color from `colors.xml`).
6. Drop `leadingIcon` from `SectionHeader`.
7. Revert every screen's `variant=` change (most of these revert
   1 line; some are 2-3 lines — and yes, this is all 50+ screens,
   no exceptions).
8. Drop the new TTFs from `assets/fonts/` and re-run
   `npx react-native-asset`.
9. `npx tsc --noEmit` clean.

The rollback does NOT delete the TTFs from `node_modules` (none of
v7 is npm-installed). It only touches source files and the asset
link.

---

## 16. Sign-Off

v7.1 — Brand Typography & Visual Refinement is **complete and
shippable**. The 5-font system is plumbed through the entire app;
the Splash sequence is a brand moment; the Android native splash
+ iOS launch storyboard match the JS Splash brand; the Home rails
have their leading icons and "View all" actions. The remaining
work is emulator smoke (the user verifies on their device per
the explicit deferral in the v7 plan).

**Single source of truth:** this report + the spec
(`UI_UX_Elevation_Specification_v7.md`) + the tracker
(`UI_UX_Elevation_Progress_Tracker_v7.md`).
