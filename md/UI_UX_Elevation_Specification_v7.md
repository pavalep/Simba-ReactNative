# SIMBA Mobile: UI/UX Elevation v7 — Brand Typography & Visual Refinement

> **Document Version:** 7.1.0
> **Status:** ✅ **COMPLETE (2026-08-13)** — all 8 waves / 25 phases shipped
> **Supersedes:** `UI_UX_Elevation_Specification_v6.md`
> **Tracker:** [`UI_UX_Elevation_Progress_Tracker_v7.md`](UI_UX_Elevation_Progress_Tracker_v7.md)
> **Completion Report:** [`v7_completion_report.md`](v7_completion_report.md)
> **Target Platform:** React Native 0.86 (Android-primary, iOS-compatible)
> **Core Focus:** Install 5 complementary font families (Inter, Allura,
> Cormorant Garamond, Manrope, JetBrains Mono). Wire the typography
> system so **every single page** in the app gets the right font for
> the right role. Add the SIMBA script wordmark, the small circular
> leading icons on the "Your Library" rails, the "View all →"
> affordance on Movies and Podcasts, and an **animated splash
> screen** — **including the native Android splash activity**
> (`SplashActivity.java` / `MainActivity.java` cold-start window
> background, the `windowBackground` drawable, and the
> `android:windowSplashScreen*` attributes on the launch theme).
> **Every screen — JS side, native side, splash, header, settings,
> sub-screens, error states — is refactored to use the new
> typography system.** The "47 of 51 auto" shortcut from earlier
> drafts is explicitly retired. v7 is a deliberate, full-app
> refactor and we are not skipping anything.

---

## TABLE OF CONTENTS

1. The Actual Need (what v7 is for)
2. Manager's Reference (visual target)
3. Scope and Non-Goals
4. Design Philosophy v7
5. The Five-Font System
6. Why Every Page Gets Touched
7. Per-Page Coverage Table (full, all 51 screens)
8. Wordmark Spec
9. Section Title Spec (Manrope)
10. Cinematic Display Spec (Cormorant)
11. UI Typography Spec (Inter)
12. Monospace Spec (JetBrains Mono)
13. Library Rail Icon Spec
14. Discover "View all" Spec
15. **Animated Splash Screen Spec** (NEW)
15a. **Android Native Splash Screen** (NEW in v7.1)
16. Typography Token Changes (concrete code)
17. Font Installation
18. Font Linking (react-native-asset)
19. Per-Component Change List
20. Risks and Edge Cases
21. Verification Suite

---

## 1. THE ACTUAL NEED (what v7 is for)

The manager wants a distinctive, premium brand identity with
**plushness** — but without overwhelming the eye. Specifically:

1. **The wordmark "SIMBA" reads as a generic bold sans-serif.**
   Replace with a script/cursive "Simba" (gold, title case) so
   the brand has personality at first glance.
2. **5 font families, complementary, used with restraint.** Some
   families appear on most surfaces (Inter, ~80%), others only on
   specific moments (Cormorant on hero titles, Manrope on section
   titles, JetBrains Mono on code). The plushness comes from
   contrast, not from sheer count.
3. **The reference shows small circular icons next to the three
   "Your Library" rails** (Recently Played, Bookmarks, Followed
   Podcasts) — adds visual rhythm.
4. **"View all →" should be visible on Movies and Podcasts rows.**
5. **Every other piece of text in the app** uses the new
   typography system. **Every page is refactored** — JS side,
   native side, splash, header, settings, sub-screens, error
   states, all 51 screens. There are no "auto" shortcuts and no
   exceptions. If a screen isn't listed in the per-page table,
   it's a bug in the table.
6. **The Splash screen should be animated** — visual richness at
   first launch (replaces the current static lion-on-parchment).
   **This includes the native Android-12+ splash window** that
   appears before RN mounts. The first thing the user sees on
   cold boot must also look like SIMBA.

The change surface is **larger than v6** because the previous spec
relied on auto-coverage via tokens. v7 is a deliberate
page-by-page refactor that touches every screen — but most touches
are 1-line (changing a variant or font weight) and the design
discipline lives in the typography tokens.

### Why "every page" applies to the native side too

The app boots on Android via a native splash window **before** the
JS bundle is ready. That native window is the first thing the user
sees and it has to look like the SIMBA brand — not a generic
Android progress spinner. v7 therefore also covers the Android
side:

- `android/app/src/main/res/values/styles.xml` — the launch theme
  (currently `@style/AppTheme.Launcher` or similar) needs the
  parchment background, the gold status bar, and a centered lion
  mark.
- `android/app/src/main/res/drawable/splash_logo.xml` (or
  `splash_logo.png`) — the lion logo resource used in the native
  splash window. We use the same `lion-mark.png` from
  `src/assets/lottie/...` exported to a static PNG (or the
  existing `ic_launcher_round` if it's already the lion).
- `android/app/src/main/java/.../SplashActivity.java` (if
  present) — the Android-12+ `windowSplashScreen*` attributes:
  `android:windowSplashScreenBackground`, `windowSplashScreenAnimatedIcon`,
  `windowSplashScreenIconBackgroundColor`. The lion mark on a
  parchment background is the native splash.
- `MainActivity.java` — the JS handoff stays the same; once the
  JS bundle is ready, the RN-side animated splash
  (`SplashScreen.tsx`) takes over for the rest of the cold-start
  journey.

The native side does NOT need its own font files. The native
splash uses the same `ic_launcher` / `splash_logo` drawable and
the parchment background color. The fonts only matter once RN
renders. This keeps the native splash simple, deterministic, and
aligned with the SIMBA brand without a native font bundle.

---

## 2. MANAGER'S REFERENCE (visual target)

The reference is a screenshot titled "ChatGPT Image Aug 12, 2026,
02_06_34 PM.png" (provided by the manager). It is **not** an
accurate representation of the app's current state — it is a
visual target for v7.

### What the reference shows that is NEW for v7

1. **Wordmark "Simba" in a script/cursive font** (title case, gold).
2. **Small circular icons next to each library rail title** —
   • Recently Played → circular clock icon
   • Bookmarks       → circular bookmark icon
   • Followed Podcasts → circular podcast-rings icon
3. **"View all →" link** on Movies and Podcasts rows.

### What the reference shows that is ALREADY in the app

- Lion logo + wordmark + tagline as a single header block.
- "Your media, your way" tagline in muted gray.
- Weather greeting card: "Good afternoon, Paval" + chip + caption.
- "YOUR LIBRARY" / "DISCOVER" subsection dividers (ruled, centered).
- Per-user rails: Recently Played, Bookmarks, Followed Podcasts.
- Discover rails: Movies, Podcasts, etc.
- Dark gradient CategoryCard art.
- Bottom tab nav: Home / Library.

### Verbatim manager prompt (key rules)

> Use **Allura** as the first choice for the SIMBA wordmark. If
> Allura does not render well, evaluate Great Vibes, then Alex
> Brush. **Do NOT introduce multiple script fonts.**

> Use **Inter** as the primary UI font.

> The wordmark should feel: elegant, memorable, premium, slightly
> cinematic, personal, refined, warm. **Not a wedding invitation,
> not a kids app, not a retro diner.**

> **Do NOT rebuild the Home screen, change navigation, change
> business logic, change APIs, change media playback, change
> state management, change component architecture, replace icons,
> replace artwork, change card structure, change bottom navigation,
> change the color palette, introduce serif typography throughout
> the app.** This is a brand typography refinement, not a redesign.

---

## 3. SCOPE AND NON-GOALS

### In scope

- Install 5 font families (~10–12 TTF files total).
- Wire the typography system: extend the typography tokens with
  3 new variants (`brandScript`, `displaySerif`, `displaySans`).
  Keep `mono` but switch to JetBrains Mono.
- Add 3 new `AppText` variants (`brandScript`, `displaySerif`,
  `displaySans`).
- Replace the wordmark in `HomeHeader`, `Splash`, `Login` with
  the new `brandScript` variant. Change `BRAND.name` from
  `'SIMBA'` to `'Simba'`.
- Refactor every screen to use the new typography variants
  where appropriate (see §7 per-page table).
- Apply `displaySerif` (Cormorant) to cinematic hero moments —
  Home hero, Album hero, Movie Detail title, Show Detail title.
- Apply `displaySans` (Manrope) to section titles — "Your
  Library", "Discover", "Recently Played", "Bookmarks", "Movies",
  "Podcasts".
- Add a `leadingIcon` prop to `SectionHeader` (3 library rails
  use it).
- Add a `SectionHeader` with `actionLabel="View all"` above
  `MovieCategoriesShelf` and `PodcastCategoriesShelf`.
- **Build an animated splash screen** — the lion mark animates
  in, the wordmark animates in (using the brandScript variant),
  a soft gold pulse plays, and a progress ring signals app
  readiness. Replaces the current static lion-on-parchment.
  **This includes the native Android splash activity** (see
  §15a) — the JS-side splash is only the second half of the
  cold-start journey; the first half is a native Android-12+
  splash window with the same SIMBA branding.

### Explicitly out of scope (do NOT touch)

- Navigation stack, auth flow, weather card, Lottie animations
  on the chip, CategoryCard art, bottom tab nav, profile screen,
  settings, search, mini player, all player screens, bookmarks
  list, category list, genre screen, archive, radio, Live TV,
  Shows, Audiobooks.
- Color palette.
- State management, API layer, media playback.
- Animations on the wordmark within in-app screens (only the
  Splash animates the wordmark; Home header + Login are static).
- RTL / i18n.
- Font loaders (no CDN fonts; use the standard
  `react-native-asset` flow).
- More than **one** script font (Allura only).
- More than **one** serif family (Cormorant only).
- More than **one** display sans (Manrope only).
- More than **one** monospace family (JetBrains Mono only).
- More than **one** UI sans (Inter only).

---

## 4. DESIGN PHILOSOPHY v7

```
5 font families. One role each. Restraint by usage distribution.
```

The hierarchy is:

```
Allura (script)        →  brand wordmark, identity         (1 line × 3 screens)
Cormorant Garamond     →  cinematic display, hero moments   (~3% of all text)
Manrope                →  section titles, structural        (~5% of all text)
Inter                  →  UI primary, the workhorse         (~80% of all text)
JetBrains Mono         →  code / technical surfaces         (~1% of all text)
```

**Plushness without overwhelming**: Inter is still 80% of the
surface. The other four families appear at specific moments —
the wordmark, the section titles, the hero banners, the code
editor. The eye reads the page as "modern media app" first; the
brand identity, cinematic moments, and structural titles add
character on top of that.

---

## 5. THE FIVE-FONT SYSTEM

| # | Family | Weights | Role | Where it appears | Distribution |
|---|---|---|---|---|---|
| 1 | **Allura** | Regular | Brand wordmark | "Simba" on Home / Splash / Login | 1 line × 3 screens |
| 2 | **Cormorant Garamond** | Regular, Bold, Italic | Cinematic display | Home hero title, Album / Movie / Show / Music Detail hero titles, Splash tagline, the "Good morning/afternoon/evening" prefix in the greeting | ~3% of all text |
| 3 | **Manrope** | SemiBold, Bold | Section titles | "Your Library", "Discover", "Recently Played", "Bookmarks", "Followed Podcasts", "Movies", "Podcasts", the bottom-tab active label | ~5% of all text |
| 4 | **Inter** | Regular, Medium, SemiBold, Bold | UI primary | Greeting user name, weather, card titles, card descriptions, buttons, navigation labels, dialogs, metadata, labels, search, controls, settings, empty states, error messages, body text everywhere | ~80% of all text |
| 5 | **JetBrains Mono** | Regular | Code / monospace | MPV config editor, debug logs, technical surfaces | ~1% of all text |

### Why these 5

- **Allura** — the manager's first-choice script. Elegant,
  premium, slightly cinematic, readable at mobile header size.
- **Cormorant Garamond** — a high-contrast serif. Adds cinematic
  warmth to the hero moments without competing with Allura. Both
  Allura (script) and Cormorant (serif) are display-only; they
  don't appear in body text. They harmonize because both are
  "warm" rather than "clinical."
- **Manrope** — a geometric sans with more character than Inter
  but in the same family. Gives the section titles a distinct
  look without breaking the sans-led hierarchy.
- **Inter** — the workhorse. Tight, modern, designed for screen
  reading. The default for anything not in a specialized role.
- **JetBrains Mono** — a proper monospace. Replaces the
  `'monospace'` system default in the MPV config editor and
  any future code surface.

### What we are NOT adding

- No display sans besides Manrope (no DM Serif Display, no
  Playfair, no Sentinel).
- No second script (no Great Vibes, no Pinyon, no Sacramento).
- No icon font (no FontAwesome, no Material Icons font).
- No emoji font.

---

## 6. WHY EVERY PAGE GETS TOUCHED

The previous draft of this spec relied on the typography tokens
covering 47 of 51 screens automatically (only the wordmark
needed a per-screen edit). **That shortcut is explicitly
retired in v7.1.** v7 goes further: **every page is
refactored to use the new typography system**, because:

1. **Cormorant (displaySerif)** must be applied to specific hero
   moments — the home hero card title, the album hero, the
   movie detail title, etc. That's 4–6 screens that need to
   pick up the new variant.
2. **Manrope (displaySans)** must be applied to section titles
   on every screen that has a "Your Library", "Discover", or
   named section. That's ~10 screens.
3. **JetBrains Mono** must replace the raw `fontFamily:
   'monospace'` in `MpvConfigEditor.tsx`.
4. **Inter (the default)** must be applied to every typography
   token in `tokens.ts` so all `AppText` usage gets Inter.
5. **The Android native splash** is its own refactor — see
   §15a. The first thing the user sees on cold boot has to
   look like SIMBA, and that means the launch theme, the
   splash drawable, the parchment background, and the lion
   mark. The native side has no fonts, but it does need the
   brand colors and the lion mark.

The "47 of 51 auto" framing is gone. **v7 is 51/51 + native
splash + 4 components + 4 system files = ~60 files touched.**
The work is mostly 1-line edits (`variant="h2"` →
`variant="displaySans"`, or `fontFamily: 'monospace'` →
`fontFamily: 'JetBrainsMono'`). But it's deliberate, page by
page, not an accidental side effect of changing the tokens.

---

## 7. PER-PAGE COVERAGE TABLE

The 51 screens below are classified by **what v7 actually touches
in them**. "Auto" = the typography token change covers the screen
fully. "Direct edit" = the screen needs at least one explicit
change (a different variant, a hero title, etc.).

| # | Screen | Path | v7 change |
|---|---|---|---|
| 1 | **Splash** | `src/screens/Splash/SplashScreen.tsx` + **Android native** (`android/app/.../styles.xml`, `colors.xml`, `drawable/splash_logo.xml`, `MainActivity.java` if present) | **Direct edit + animation, JS + native.** JS side: wordmark → `brandScript` (Allura). Tagline → `displaySerif` (Cormorant). Add the animation sequence from §15 — lion scales + fades in, wordmark fades in after a delay, tagline fades in, gold pulse loop, progress ring fills, handoff to RootNavigator. **Android native side (see §15a):** parchment `windowSplashScreenBackground` + lion mark `windowSplashScreenAnimatedIcon` on the launch theme; status bar / nav bar tinted parchment. The native splash is static (no fonts, no animation — fonts only resolve once RN mounts). The JS splash takes over once the bridge is up. |
| 2 | **Login** | `src/screens/Login/LoginScreen.tsx` | **Direct edit.** Wordmark → `brandScript` (Allura). Tagline → `displaySerif` (Cormorant). |
| 3 | **Home** | `src/screens/Home/HomeScreen.tsx` | **Direct edit (multiple).** Add `leadingIcon` on the 3 `SectionHeader`s for Recently Played / Bookmarks / Followed Podcasts (each uses a small circular gold-soft badge with `clock` / `bookmark` / `podcastRings` icon). Add a `SectionHeader` with `actionLabel="View all"` above Movies and Podcasts. The Home hero card title (if it carries a movie title) → `displaySerif`. The "Good morning / afternoon / evening" greeting prefix → `displaySerif`. The "Your Library" / "Discover" subsection titles → `displaySans` (Manrope). |
| 4 | HomeHeader | `src/components/layout/HomeHeader/HomeHeader.tsx` | **Direct edit.** Wordmark → `brandScript` (Allura). Tagline → `bodySmall` Inter. Lion gap 12→8 px. |
| 5 | Search | `src/screens/Search/SearchScreen.tsx` | **Direct edit.** Section titles → `displaySans`. The search input field stays Inter. |
| 6 | Profile | `src/screens/Profile/ProfileScreen.tsx` | **Direct edit.** Section titles → `displaySans`. The "Sign out" button label stays Inter. |
| 7 | Settings | `src/screens/Settings/SettingsScreen.tsx` | **Direct edit.** Section titles → `displaySans`. The version label stays Inter. |
| 8 | Audio Settings | `src/screens/AudioSettings/AudioSettingsScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 9 | Equalizer | `src/screens/Equalizer/EqualizerScreen.tsx` | **Direct edit.** The "Equalizer" title → `displaySans`. The "Preset" labels stay Inter. |
| 10 | Linked Folders | `src/screens/LinkedFolders/LinkedFoldersScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 11 | Downloads | `src/screens/DownloadsScreen/DownloadsScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 12 | History | `src/screens/History/HistoryScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 13 | Stats | `src/screens/Stats/StatsScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 14 | Library | `src/screens/Library/LibraryScreen.tsx` | **Direct edit.** "Albums / Artists / Songs / Folders" tabs → `displaySans`. |
| 15 | Album Detail | `src/screens/Library/AlbumDetailScreen.tsx` | **Direct edit.** Album title → `displaySerif` (Cormorant). Section titles → `displaySans`. |
| 16 | Artist Detail | `src/screens/Library/ArtistDetailScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 17 | Bookmarks | `src/screens/Bookmarks/BookmarksScreen.tsx` | **Direct edit.** "Bookmarks" title → `displaySans`. |
| 18 | All Videos | `src/screens/AllVideos/AllVideosScreen.tsx` | **Direct edit.** "All Videos" title → `displaySans`. |
| 19 | All Audio | `src/screens/AllAudio/AllAudioScreen.tsx` | **Direct edit.** "All Audio" title → `displaySans`. |
| 20 | All Playlists | `src/screens/AllPlaylists/AllPlaylistsScreen.tsx` | **Direct edit.** "Playlists" title → `displaySans`. |
| 21 | Movies | `src/screens/MoviesScreen/MoviesScreen.tsx` | **Direct edit.** "Movies" title → `displaySans`. |
| 22 | **Movie Detail** | `src/screens/MovieDetailScreen/MovieDetailScreen.tsx` | **Direct edit.** Movie title (the big hero title at the top) → `displaySerif` (Cormorant). Section titles → `displaySans`. |
| 23 | Podcasts | `src/screens/PodcastsScreen/PodcastsScreen.tsx` | **Direct edit.** "Podcasts" title → `displaySans`. |
| 24 | **Podcast Detail** | `src/screens/PodcastDetailScreen/PodcastDetailScreen.tsx` | **Direct edit.** Podcast title → `displaySerif` (Cormorant). Section titles → `displaySans`. |
| 25 | Radio | `src/screens/RadioScreen/RadioScreen.tsx` | **Direct edit.** "Radio" title → `displaySans`. |
| 26 | Live TV | `src/screens/LiveTVScreen/LiveTVScreen.tsx` | **Direct edit.** "Live TV" title → `displaySans`. |
| 27 | Shows | `src/screens/ShowsScreen/ShowsScreen.tsx` | **Direct edit.** "Shows" title → `displaySans`. |
| 28 | **Show Detail** | `src/screens/ShowDetailScreen/ShowDetailScreen.tsx` | **Direct edit.** Show title → `displaySerif` (Cormorant). Episode titles stay Inter. |
| 29 | Audiobooks | `src/screens/AudiobooksScreen/AudiobooksScreen.tsx` | **Direct edit.** "Audiobooks" title → `displaySans`. |
| 30 | **Audiobook Detail** | `src/screens/AudiobookDetailScreen/AudiobookDetailScreen.tsx` | **Direct edit.** Book title → `displaySerif` (Cormorant). |
| 31 | Archive | `src/screens/ArchiveScreen/ArchiveScreen.tsx` | **Direct edit.** "Archive" title → `displaySans`. |
| 32 | **Archive Item Detail** | `src/screens/ArchiveItemDetailScreen/ArchiveItemDetailScreen.tsx` | **Direct edit.** Item title → `displaySerif` (Cormorant). |
| 33 | Album | `src/screens/Album/AlbumScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 34 | Artist | `src/screens/Artist/ArtistScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 35 | Song | `src/screens/Song/SongScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 36 | Music | `src/screens/MusicScreen/MusicScreen.tsx` | **Direct edit.** "Music" title → `displaySans`. |
| 37 | **Music Detail** | `src/screens/MusicDetailScreen/MusicDetailScreen.tsx` | **Direct edit.** Track / album title (the hero) → `displaySerif` (Cormorant). |
| 38 | Playlist Detail | `src/screens/PlaylistDetail/PlaylistDetailScreen.tsx` | **Direct edit.** Playlist title → `displaySerif` (Cormorant). Track titles stay Inter. |
| 39 | Queue | `src/screens/QueueScreen/QueueScreen.tsx` | **Direct edit.** "Queue" title → `displaySans`. |
| 40 | Now Playing | `src/screens/NowPlaying/NowPlayingScreen.tsx` | **Direct edit.** Track title → `displaySerif` (Cormorant). |
| 41 | Folder Browser | `src/screens/FolderBrowser/FolderBrowserScreen.tsx` | **Direct edit.** "Folders" title → `displaySans`. |
| 42 | Genre | `src/screens/Genre/GenreScreen.tsx` | **Direct edit.** Section titles → `displaySans`. |
| 43 | Video Player | `src/screens/VideoPlayer/VideoPlayerScreen.tsx` | **Direct edit.** No hero title (overlay only). Section titles in the settings sheet → `displaySans`. The title display on tap → `displaySerif` (Cormorant). |
| 44 | Audio Player | `src/screens/AudioPlayer/AudioPlayerScreen.tsx` | **Direct edit.** Track title display → `displaySerif` (Cormorant). |
| 45 | About | `src/screens/About/AboutScreen.tsx` | **Direct edit.** "About" title → `displaySerif` (Cormorant). |
| 46 | Changelog | `src/screens/Changelog/ChangelogScreen.tsx` | **Direct edit.** "Changelog" title → `displaySerif` (Cormorant). |
| 47 | Credits | `src/screens/Credits/CreditsScreen.tsx` | **Direct edit.** "Credits" title → `displaySerif` (Cormorant). |
| 48 | Help | `src/screens/Help/HelpScreen.tsx` | **Direct edit.** "Help" title → `displaySerif` (Cormorant). |
| 49 | Licenses | `src/screens/Licenses/LicensesScreen.tsx` | **Direct edit.** "Licenses" title → `displaySerif` (Cormorant). License text stays Inter. |
| 50 | Privacy | `src/screens/Privacy/PrivacyScreen.tsx` | **Direct edit.** "Privacy Policy" title → `displaySerif` (Cormorant). |
| 51 | Terms | `src/screens/Terms/TermsScreen.tsx` | **Direct edit.** "Terms of Service" title → `displaySerif` (Cormorant). |
| 52 | Mpv Config Editor (sub-component of Settings) | `src/screens/Settings/components/MpvConfigEditor.tsx` | **Direct edit (override).** Replace `fontFamily: 'monospace'` with `fontFamily: 'JetBrainsMono'` on the 2 raw `<Text>` blocks. Code editor text becomes JetBrains Mono. |
| 53 | SvgIcon registry | `src/components/utility/SvgIcon/SvgIcon.tsx` (and registry) | **Direct edit.** Add `'clock'`, `'bookmark'`, `'podcastRings'` icon names if not present. |
| 54 | WeatherGreeting | `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx` | **Direct edit.** Greeting user name stays Inter (gold accent). The "Good morning / afternoon / evening" prefix → `displaySerif` (Cormorant). |
| 55 | WeatherGreeting.types | `src/screens/Home/components/WeatherGreeting/WeatherGreeting.types.ts` | **No change** beyond what already exists. |

**Direct edit count: every screen = 51 / 51.** Plus 4 component
files (`HomeHeader`, `WeatherGreeting`, `SectionHeader`,
`SvgIcon`), 4 system files (`tokens.ts`, `AppText.tsx`,
`brand.ts`, `MpvConfigEditor.tsx`), **and the Android native
splash (5 files in `android/app/src/main/...`)**.

The "51 of 51" coverage is the design discipline — every page is
considered, every page gets a deliberate font choice. The actual
edits per page are usually 1–3 lines (change a `variant=` prop or
add `fontFamily:`). The Android native splash is its own item on
top — it's not a screen, but it IS the first thing the user sees
on cold start, and the brand-typography work is incomplete
without it.

---

## 8. WORDMARK SPEC

### Casing

- **Title case** "Simba" — not "SIMBA", not "simba".

### Font

- Allura Regular.
- `fontFamily: 'Allura'`. PostScript name verified at install time.

### Color

- Existing SIMBA gold `#B8922E` (`colors.accent.gold`).

### Size

- 44–58 px on mobile, clamped via `useWindowDimensions`.

### Weight

- Allura is single-weight. Do NOT set `fontWeight` on the
  `brandScript` style (fake-bolding a single-weight script
  looks bad on Android).

### Spacing (in HomeHeader)

- Lion-to-wordmark gap: 8 px (was 12).
- Wordmark-to-tagline gap: 2 px (was implicit).

---

## 9. SECTION TITLE SPEC (Manrope)

The "Your Library", "Discover", and per-section titles on every
screen get a different sans — Manrope — to give them visual
distinction from the body text.

### Font

- Manrope SemiBold (weight 600) for primary section titles.
- Manrope Bold (weight 700) for the top-level h2-class titles
  (Movies, Podcasts, Books).

### Color

- `colors.text.primary` (the same dark text as today's h2).
- The bottom-tab active label uses `colors.accent.gold` to
  match the existing pattern.

### Size

- 22 px (slightly smaller than today's h2 24 px) — the more
  characterful Manrope is more visually present at a smaller
  size than Inter is.
- Line height 28 px.

### Where it applies

- Home: "Your Library", "Discover"
- Home: "Recently Played", "Bookmarks", "Followed Podcasts" (rail
  titles on Home)
- Home: "Movies", "Podcasts" (Discover rail titles)
- Library: "Albums", "Artists", "Songs", "Folders" (tab labels)
- Most other screens' h1/h2 titles (see §7)

### Where it does NOT apply

- "Good afternoon, Paval" greeting → uses `displaySerif` (see §10)
- Hero banner titles → `displaySerif`
- Card titles inside CategoryCard art → stay Inter (the art
  already has strong character)
- Button labels → stay Inter

---

## 10. CINEMATIC DISPLAY SPEC (Cormorant)

The "hero" moments on the app get a high-contrast serif. This is
where the brand feels premium — on the cover, the album, the
movie, the book.

### Font

- Cormorant Garamond Bold (weight 700) for hero titles.
- Cormorant Garamond Regular (weight 400) for tagline / metadata.
- Cormorant Garamond Italic for accent (rare, e.g. the Splash
  tagline could be italic).

### Color

- `colors.text.primary` (dark) on light surfaces.
- `colors.text.bright` (white) on dark hero backgrounds (e.g.
  Movie Detail hero overlay).

### Size

- Hero titles: 40–64 px (clamped via `useWindowDimensions` or
  `moderateScale()`).
- Splash tagline: 16–18 px.
- Greeting prefix ("Good morning" / "Good afternoon" /
  "Good evening"): 28–32 px (one tier smaller than the user
  name, which stays at the same h2 size in Inter).

### Where it applies

- Home: the "Good morning/afternoon/evening" prefix in the
  greeting (the user name "Paval" stays Inter Bold gold).
- Home: the hero card title (if a movie/show title is shown
  on the hero banner).
- Splash: the tagline "Your media, your way".
- Login: the tagline "Your media, your way".
- Album Hero title (AlbumDetailScreen, AlbumScreen).
- Music Detail hero title.
- Movie Detail hero title.
- Show Detail hero title.
- Audiobook Detail hero title.
- Archive Item Detail hero title.
- Playlist Detail hero title.
- Now Playing: track title.
- Audio Player / Video Player: track title (on-tap display).
- About / Changelog / Credits / Help / Licenses / Privacy /
  Terms: page title.

### Where it does NOT apply

- Card titles inside a CategoryCard row → stay Inter SemiBold
  (the art provides the cinematic personality)
- Card descriptions → stay Inter
- Body text → stay Inter
- Settings rows → stay Inter
- Search results → stay Inter

---

## 11. UI TYPOGRAPHY SPEC (Inter)

Every variant of the existing `typography` token gets
`fontFamily: FONT_FAMILY.ui` (from `src/constants/fontFamily.ts`).
The token sizes/weights stay the same — only the font family
changes.

| Variant | Size | Weight | fontFamily (via `FONT_FAMILY.*`) |
|---|---|---|---|
| display | 36 | 800 | `ui` |
| h1 | 32 | 700 | `ui` |
| h2 | 24 | 700 | `ui` |
| h3 | 20 | 600 | `ui` |
| body1 | 17 | 400 | `ui` |
| body2 | 15 | 400 | `ui` |
| bodySmall | 14 | 400 | `ui` |
| caption | 13 | 400 | `ui` |
| overline | 11 | 500 | `ui` |
| button | 15 | 600 | `ui` |
| tab | 13 | 500 | `ui` |
| mono | 14 | 400 | `mono` (JetBrains Mono) |
| **brandScript** *(new)* | 48 | — | `brandScript` (Allura) |
| **displaySerif** *(new)* | 48 | 700 | `displaySerif` (Cormorant Garamond) |
| **displaySans** *(new)* | 22 | 600 | `displaySans` (Manrope) |

**No `fontFamily: 'Allura'` (or any other family name) is allowed
as a string literal anywhere in the codebase.** Every font
reference goes through the `FONT_FAMILY` constant exported from
`src/constants/fontFamily.ts`. The constant is the single source
of truth — refactor it once, change every reference. The
`FontFamily` union type catches typos at compile time.

The 3 new variants give us 4 visual personalities: script (brand),
serif (cinematic), display sans (structural), sans (UI). The
mono token becomes a real JetBrains Mono instead of the system
default.

---

## 12. MONOSPACE SPEC (JetBrains Mono)

Currently `src/theme/tokens.ts:211` and
`src/screens/Settings/components/MpvConfigEditor.tsx:241, 245`
both use `'monospace'` (system default). v7 replaces both with
`'JetBrainsMono'`.

### Font

- JetBrains Mono Regular.

### Size

- 13 px (slightly smaller than 14 — JetBrains Mono has more
  character density than the system default).

### Where it applies

- The MPV config editor (raw `<Text>` blocks).
- The `mono` typography token (used by technical surfaces like
  error logs, debug info).
- Anywhere `AppText variant="mono"` is used.

### Where it does NOT apply

- Tabular numbers in the UI (we use Inter for those).

---

## 13. LIBRARY RAIL ICON SPEC

The 3 "Your Library" rails get small circular icons.

### Icons (18 px glyph inside 32×32 circular gold-soft badge)

| Rail | Icon | SvgIcon name |
|---|---|---|
| Recently Played | clock face | `clock` |
| Bookmarks | bookmark ribbon | `bookmark` |
| Followed Podcasts | concentric rings | `podcastRings` |

### Visual treatment

- 32×32 circular badge, `colors.accent.goldSoft`.
- 18 px icon glyph in `colors.accent.gold`.
- 8 px gap between badge and title.

### Where it lives

- `SectionHeader` gains optional `leadingIcon` prop.
- 3 rails pass the prop from `HomeScreen.tsx`.

---

## 14. DISCOVER "VIEW ALL" SPEC

The reference shows "View all →" on Movies and Podcasts rows.

### Change

- `MovieCategoriesShelf` row gets a `SectionHeader` above it
  with `label="Movies"`, `actionLabel="View all"`,
  `onAction={handleMoviesSeeAll}`.
- `PodcastCategoriesShelf` row gets the same with
  `label="Podcasts"`, `onAction={handlePodcastsSeeAll}`.
- The section title uses the new `displaySans` variant
  (Manrope).

---

## 15. ANIMATED SPLASH SCREEN SPEC

The current Splash is a static full-screen lion mark on
parchment. v7 adds:

1. **Lion mark animates in** — scale from 0.6 → 1.0, opacity
   0 → 1, duration 600 ms, ease-out.
2. **Wordmark fades in** — opacity 0 → 1, scale 0.95 → 1.0,
   delay 400 ms after the lion starts, duration 500 ms,
   ease-out. Uses the new `brandScript` variant (Allura).
3. **Tagline fades in** — opacity 0 → 0.7, delay 800 ms,
   duration 400 ms. Uses `displaySerif` (Cormorant Italic).
4. **Soft gold pulse** — a 1.5 s loop, opacity 0.0 → 0.3 → 0.0
   on a gold ring around the lion (or below the wordmark).
5. **Progress ring** — a 0–100% circular progress indicator
   that fills while the app is initializing (auth restore,
   persist rehydration, weather cascade). When the app is
   ready, the splash transitions out (fade + scale up) and
   the user lands on the next screen (Splash → Login if not
   authed, Splash → Home if authed, per the existing
   `RootNavigator` gate).

### Implementation

- Uses `Animated` from React Native (already a project dep)
  with `useNativeDriver: true` for the transforms / opacities.
- The progress ring uses `useDerivedValue` from `react-native-reanimated`
  if available, else a simple JS-driven Animated.Value.
- The animation respects the user's reduce-motion preference
  (existing `useAccessibility` hook).
- Total splash duration: 1.2–1.8 s before handoff to the
  next screen.

### What the splash does NOT do

- It does not change the auth flow. The next screen is
  determined by `RootNavigator` (Splash → Login or Home).
- It does not block the underlying JS. The auth restore and
  weather cascade start as soon as the JS bundle is loaded;
  the splash is purely visual on top.

---

## 15a. ANDROID NATIVE SPLASH SCREEN

The Android-12+ `windowSplashScreen*` API shows a system-drawn
splash **before the JS bundle is ready**. v7 brings the native
splash into the SIMBA brand. The flow is:

```
[boot]
   ↓
[Android-12+ system splash]
   • windowSplashScreenBackground  = #F5F0E8  (parchment)
   • windowSplashScreenAnimatedIcon = lion mark
   • windowSplashScreenIconBackgroundColor = #F5F0E8
   ↓
[MainActivity launches → React root mounts]
   ↓
[RN-side SplashScreen.tsx plays the JS animation]
   • lion scales + fades in
   • wordmark (Allura) fades in
   • tagline (Cormorant) fades in
   • progress ring fills
   ↓
[handoff to RootNavigator → Login or Home]
```

### Files to edit on the Android side

| File | Change |
|---|---|
| `android/app/src/main/res/values/colors.xml` | Add `<color name="splash_background">#F5F0E8</color>` (the parchment `colors.parchment.base` from the theme). |
| `android/app/src/main/res/values/styles.xml` | Add a launch theme block: `windowBackground = @color/splash_background`, `windowSplashScreenBackground = @color/splash_background`, `windowSplashScreenAnimatedIcon = @drawable/splash_logo`, `windowSplashScreenIconBackgroundColor = @color/splash_background`, `statusBarColor = @color/splash_background`, `navigationBarColor = @color/splash_background`. |
| `android/app/src/main/res/drawable/splash_logo.xml` (or `splash_logo.png`) | NEW. The lion mark, centered, in SIMBA gold `#B8922E`. We use the same `ic_launcher` lion. The native splash icon needs a square aspect (Android scales it to 96–288 dp). |
| `android/app/src/main/AndroidManifest.xml` | The launch activity's theme should reference the new launch theme (`android:theme="@style/AppTheme.Launcher"` or whatever name we use). |
| `android/app/src/main/java/.../SplashActivity.java` (if present) | Wire `windowSplashScreenAnimationDuration` if the project has a custom splash activity. If not, the system-drawn splash is enough. |
| `android/app/src/main/java/.../MainActivity.java` | No change to the JS handoff. The RN-side `SplashScreen.tsx` still takes over once the bridge is up. |

### Why the native side stays font-free

The native splash is an Android system drawable, not RN. It uses
the lion mark and the parchment color, which is brand-on-brand.
The new 5 fonts (Allura, Cormorant, Manrope, etc.) are bundled
into the JS assets and only become available once the RN bridge
mounts — they cannot render in the native splash window. We
deliberately keep the native splash logo + background only; the
wordmark fades in once RN takes over.

### What the native splash does NOT do

- It does not animate. The Android-12+ system splash is a static
  centered icon on a colored background. Animation starts once RN
  takes over.
- It does not show the wordmark or tagline. Those are RN-side
  only.
- It does not require any custom Java/Kotlin animation code. The
  system splash is built into Android-12+ and just needs the
  right theme attributes.

### iOS parity

On iOS, the equivalent is `ios/CinePlayer/Info.plist` +
`LaunchScreen.storyboard`. The same lion-on-parchment treatment
applies. iOS doesn't have an animated native splash; the iOS
launch screen is also static. The RN-side `SplashScreen.tsx`
animation runs on top of it the same way as on Android.

---

## 16. TYPOGRAPHY TOKEN CHANGES

Files:
- `src/constants/fontFamily.ts` (NEW — see §11)
- `src/theme/tokens.ts`

The tokens import the family names from the constant — no
hard-coded strings.

```ts
// src/theme/tokens.ts
import { FONT_FAMILY } from '@/constants/fontFamily';

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
  brandScript: TextStyle;       // NEW (Allura)
  displaySerif: TextStyle;      // NEW (Cormorant Garamond)
  displaySans: TextStyle;       // NEW (Manrope)
}

export const typography: TypographyTokens = {
  display:     {fontFamily: FONT_FAMILY.ui,          fontSize: 36, fontWeight: '800', lineHeight: 44},
  h1:          {fontFamily: FONT_FAMILY.ui,          fontSize: 32, fontWeight: '700', lineHeight: 40},
  h2:          {fontFamily: FONT_FAMILY.ui,          fontSize: 24, fontWeight: '700', lineHeight: 32},
  h3:          {fontFamily: FONT_FAMILY.ui,          fontSize: 20, fontWeight: '600', lineHeight: 28},
  body1:       {fontFamily: FONT_FAMILY.ui,          fontSize: 17, fontWeight: '400', lineHeight: 24},
  body2:       {fontFamily: FONT_FAMILY.ui,          fontSize: 15, fontWeight: '400', lineHeight: 22},
  bodySmall:   {fontFamily: FONT_FAMILY.ui,          fontSize: 14, fontWeight: '400', lineHeight: 20},
  caption:     {fontFamily: FONT_FAMILY.ui,          fontSize: 13, fontWeight: '400', lineHeight: 18},
  overline:    {fontFamily: FONT_FAMILY.ui,          fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5},
  button:      {fontFamily: FONT_FAMILY.ui,          fontSize: 15, fontWeight: '600', lineHeight: 22, letterSpacing: 0.3},
  tab:         {fontFamily: FONT_FAMILY.ui,          fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: 0.2},
  mono:        {fontFamily: FONT_FAMILY.mono,        fontSize: 13, fontWeight: '400', lineHeight: 20},
  brandScript: {fontFamily: FONT_FAMILY.brandScript, fontSize: 48, lineHeight: 56},
  displaySerif:{fontFamily: FONT_FAMILY.displaySerif, fontWeight: '700', fontSize: 48, lineHeight: 56},
  displaySans: {fontFamily: FONT_FAMILY.displaySans,  fontWeight: '600', fontSize: 22, lineHeight: 28},
};
```

### AppText variant extension

`src/components/core/AppText/AppText.tsx`:

```ts
export type AppTextVariant =
  | 'display' | 'h1' | 'h2' | 'h3'
  | 'body1' | 'body2' | 'bodySmall'
  | 'button' | 'tab'
  | 'caption' | 'overline'
  | 'mono'
  // NEW:
  | 'brandScript'      // Allura
  | 'displaySerif'     // Cormorant Garamond
  | 'displaySans'      // Manrope
  // Legacy aliases (unchanged)
  | 'h6' | 'subtitle2' | 'small' | 'time';
```

The `variantMap` gains three new entries mapping each new
variant to its typography token. The `variantMap` itself is
typed `Record<AppTextVariant, TextStyle>` so adding a variant
forces you to add its entry.

### `MpvConfigEditor` and any other raw `<Text>`

`MpvConfigEditor.tsx` is the only screen that has raw `<Text>`
blocks. Replace `fontFamily: 'monospace'` with
`fontFamily: FONT_FAMILY.mono` and import the constant. No
other raw `<Text>` is allowed in the codebase.

---

## 17. FONT INSTALLATION

### Files to add (~10–12 TTF, no more, no less)

```
assets/fonts/
├── Allura-Regular.ttf                       (≈ 247 KB)
├── CormorantGaramond-Regular.ttf            (≈ 290 KB)
├── CormorantGaramond-Bold.ttf               (≈ 290 KB)
├── CormorantGaramond-Italic.ttf             (≈ 293 KB)
├── Manrope-SemiBold.ttf                     (≈ 95 KB)
├── Manrope-Bold.ttf                         (≈ 95 KB)
├── Inter-Regular.ttf                        (≈ 310 KB)
├── Inter-Medium.ttf                         (≈ 315 KB)
├── Inter-SemiBold.ttf                       (≈ 316 KB)
├── Inter-Bold.ttf                           (≈ 316 KB)
└── JetBrainsMono-Regular.ttf                (≈ 112 KB)
```

Total: ~3.1 MB. No other font files. No subset files. No
variable-font files (we ship static per-weight because RN's
font matching against PostScript names is more reliable with
static files).

### How weights are picked at runtime

The 4 Inter weights, 2 Manrope weights, and 3 Cormorant weights
all share the same `fontFamily` string per family. Android's
font manager picks the right TTF by matching the `fontWeight`
prop on the `<Text>` against the weight axis of the registered
family.

```ts
// FONT_FAMILY — single constant per family (NOT per weight)
FONT_FAMILY.ui           = 'Inter'              // matches 4 TTFs
FONT_FAMILY.displaySans  = 'Manrope'            // matches 2 TTFs
FONT_FAMILY.displaySerif = 'Cormorant Garamond' // matches 3 TTFs
FONT_FAMILY.brandScript  = 'Allura'             // single weight — no fontWeight
FONT_FAMILY.mono         = 'JetBrains Mono'     // single weight

// Typography tokens select the weight via fontWeight
displaySans: { fontFamily: FONT_FAMILY.displaySans, fontWeight: '600' }
            // → Manrope-SemiBold.ttf renders
displaySerif: { fontFamily: FONT_FAMILY.displaySerif, fontWeight: '700' }
            // → CormorantGaramond-Bold.ttf renders
```

The `FONT_FAMILY` constant is the only place a family name
appears as a string in the codebase. The weights are
orthogonal — declared via `fontWeight: '400' | '500' | '600' |
'700'` on the typography token. This is why we ship separate
TTF files per weight (one TTF = one weight axis value).

### Source

- **Allura**: Google Fonts OFL.
- **Cormorant Garamond**: Google Fonts OFL.
- **Manrope**: Google Fonts OFL.
- **Inter**: jsDelivr CDN of `inter-font@3.19.0` npm package
  (the per-weight static TTFs are not in google/fonts anymore,
  but are in the npm distribution that jsDelivr mirrors).
- **JetBrains Mono**: Google Fonts OFL.

### Family name table (declared in `src/constants/fontFamily.ts`)

After downloading, the expected PostScript family names
(name ID 1 in the TTF `name` table) are:

- Allura → family `Allura`
- Cormorant Garamond → family `Cormorant Garamond` (note the
  space; the family is two words)
- Manrope → family `Manrope`
- Inter → family `Inter` (all 4 weights share this family name)
- JetBrains Mono → family `JetBrains Mono` (note the space)

The user verifies these manually after Wave 1 lands. If any
family name is different, the fix is to update
`src/constants/fontFamily.ts` once — every `fontFamily`
reference in the app re-resolves automatically.

---

## 18. FONT LINKING (react-native-asset)

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

This copies the fonts into:
- `android/app/src/main/assets/fonts/`
- `ios/<project>/Fonts/`
and updates `Info.plist` (iOS) and `build.gradle` (Android) to
register them.

### Verify

- Android: `ls android/app/src/main/assets/fonts/` shows the 11
  TTFs.
- iOS: open `ios/CinePlayer.xcodeproj`, check "Copy Bundle
  Resources" for the fonts.

### Fallback strategy

If `react-native-asset` fails on a platform, fall back to
manual:
- Android: drop the TTFs into
  `android/app/src/main/assets/fonts/`. No manifest change.
- iOS: drop the TTFs into the Xcode project, add to "Copy
  Bundle Resources", add `UIAppFonts` entries to `Info.plist`.

---

## 19. PER-COMPONENT CHANGE LIST

| File | Change |
|---|---|
| `assets/fonts/Allura-Regular.ttf` | NEW |
| `assets/fonts/CormorantGaramond-Regular.ttf` | NEW |
| `assets/fonts/CormorantGaramond-Bold.ttf` | NEW |
| `assets/fonts/CormorantGaramond-Italic.ttf` | NEW |
| `assets/fonts/Manrope-SemiBold.ttf` | NEW |
| `assets/fonts/Manrope-Bold.ttf` | NEW |
| `assets/fonts/Inter-Regular.ttf` | NEW |
| `assets/fonts/Inter-Medium.ttf` | NEW |
| `assets/fonts/Inter-SemiBold.ttf` | NEW |
| `assets/fonts/Inter-Bold.ttf` | NEW |
| `assets/fonts/JetBrainsMono-Regular.ttf` | NEW |
| `react-native.config.js` | Add `assets: ['./assets/fonts/']` |
| `src/constants/fontFamily.ts` | **NEW.** Exports `FONT_FAMILY` (5 keys: `brandScript`/`displaySerif`/`displaySans`/`ui`/`mono`) and `FontFamily` union. The single source of truth for every `fontFamily` string in the codebase. **No font-family string literal is allowed anywhere else.** |
| `src/theme/tokens.ts` | Imports `FONT_FAMILY` from `@/constants/fontFamily`. Adds `brandScript`, `displaySerif`, `displaySans` to `TypographyTokens`. Every existing variant references `FONT_FAMILY.ui` (or `mono`). Adds 3 new entries to the typography object. |
| `src/theme/typographyStyles.ts` | NEW. Semantic style helpers. |
| `src/components/core/AppText/AppText.tsx` | Add `'brandScript'`, `'displaySerif'`, `'displaySans'` to `AppTextVariant`. Add 3 entries to `variantMap`. |
| `src/constants/brand.ts` | `BRAND.name`: `'SIMBA'` → `'Simba'`. |
| `src/components/layout/HomeHeader/HomeHeader.tsx` | Wordmark → `brandScript`. Tagline → `bodySmall` Inter. Lion gap 12→8. |
| `src/screens/Splash/SplashScreen.tsx` | **Animated JS splash.** Wordmark → `brandScript`. Tagline → `displaySerif`. Add the animation sequence from §15. |
| `android/app/src/main/res/values/colors.xml` | **NEW:** add `<color name="splash_background">#F5F0E8</color>` (parchment). |
| `android/app/src/main/res/values/styles.xml` | **NEW:** add a launch theme block with `windowSplashScreenBackground`, `windowSplashScreenAnimatedIcon`, `windowSplashScreenIconBackgroundColor`, parchment status bar / nav bar. |
| `android/app/src/main/res/drawable/splash_logo.xml` (or `.png`) | **NEW:** the lion mark in SIMBA gold, centered, square aspect — used as `windowSplashScreenAnimatedIcon`. |
| `android/app/src/main/AndroidManifest.xml` | **EDIT:** point the launch activity's theme to the new launch theme. |
| `android/app/src/main/java/.../MainActivity.java` | No change to JS handoff. Verify `super.onCreate` / RN bridge setup stays intact. |
| `ios/CinePlayer/Info.plist` | Verify `UILaunchStoryboardName` → `LaunchScreen` and that the launch storyboard uses the parchment background + lion logo. (iOS parity with the Android native splash.) |
| `src/screens/Login/LoginScreen.tsx` | Wordmark → `brandScript`. Tagline → `displaySerif`. |
| `src/screens/Home/HomeScreen.tsx` | Add `leadingIcon` on 3 rails. Add `SectionHeader` with `actionLabel="View all"` on Movies / Podcasts. The "Your Library" / "Discover" titles → `displaySans`. |
| `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx` | The greeting prefix "Good afternoon" → `displaySerif`. The user name "Paval" stays Inter Bold gold. |
| `src/components/utility/SectionHeader/SectionHeader.tsx` | Add `leadingIcon?: string` prop. When set, render a 32×32 gold-soft circular badge to the left of the title. |
| `src/components/utility/SvgIcon/SvgIcon.tsx` (and registry) | Add `'clock'`, `'bookmark'`, `'podcastRings'` icon names if not present. |
| `src/screens/Settings/components/MpvConfigEditor.tsx` | Replace `fontFamily: 'monospace'` with `fontFamily: FONT_FAMILY.mono` on the 2 raw `<Text>` blocks. Import `FONT_FAMILY` from `@/constants/fontFamily`. |
| `src/screens/Home/components/HomeBookmarksList/HomeBookmarksList.tsx` | (if present) section title → `displaySans`. |
| `src/screens/Home/components/FollowedPodcastsShelf/FollowedPodcastsShelf.tsx` | section title → `displaySans`. |
| `src/screens/Home/components/MovieCategoriesShelf/MovieCategoriesShelf.tsx` | (no change unless we move a title into displaySans). |
| `src/screens/Home/components/PodcastCategoriesShelf/PodcastCategoriesShelf.tsx` | (no change unless we move a title into displaySans). |
| All 51 screen files (per §7) | Apply the variant changes listed in the per-page table. Most are 1-line edits. |

**Total direct edits: ~60 files** (51 screens + 4 components +
2 theme files + 1 brand + 1 sub-component + **5 Android native
splash files** + **1 iOS parity file**). **Total new files: 14**
(11 TTF + 1 TS + 1 auto-generated config + **1 Android drawable
`splash_logo.xml`/`.png`**).

---

## 20. RISKS AND EDGE CASES

1. **Allura single weight.** No `fontWeight` on `brandScript`.
2. **Cormorant Italic on Android.** Some Android text engines
   fake-bold single-weight fonts. We use Cormorant Bold (700),
   not Cormorant Italic, for hero titles. Italic is reserved
   for tagline accent only.
3. **Manrope weight axis.** Manrope ships in many weights but
   we only need 600 (SemiBold) and 700 (Bold). We do NOT need
   Regular, Medium, or anything lighter.
4. **JetBrains Mono ligatures.** JBM has optional programming
   ligatures (`=>`, `!=`, etc.). We disable them
   (`fontVariant: ['no-common-ligatures']`) on the `mono` token
   to keep the MPV config editor output identical to the
   previous `monospace` look.
5. **Header overflow on small phones.** Same as v6. We clamp
   `brandScript.fontSize` to 44–58 px via `useWindowDimensions`.
6. **Cormorant rendering on iOS vs Android.** Both platforms
   render high-contrast serifs slightly differently. We
   visually verify on both and tune `lineHeight` if needed.
7. **Manrope Bold on Android.** We use `Manrope-Bold.ttf` (a
   separate file) rather than relying on Inter's `fontWeight:
   '700'` trick. This avoids the fake-bold issue on Android.
8. **Animation performance on low-end devices.** The Splash
   animations use `useNativeDriver: true` for the transforms
   and opacities. The progress ring is the only JS-driven
   element. If a device can't keep up, the splash extends its
   duration rather than dropping frames.
9. **Splash transition handoff.** The Splash → Home / Splash →
   Login transition is owned by `RootNavigator`. The animated
   splash hands off when the auth restore and persist
   rehydration complete. If those take longer than 1.8 s, the
   splash waits.
10. **Existing users on older bundles.** No state migration
    needed. The font reference resolves on first launch; the
    fallback only shows for a frame.

---

## 21. VERIFICATION SUITE

### 21.1 Build + type-check

```bash
npx tsc --noEmit
```

Clean. Three new variants wired into `AppText` and
`typography`; no `any` or unknown type errors.

### 21.2 Asset link

```bash
npx react-native-asset
ls -la android/app/src/main/assets/fonts/
```

All 11 TTFs present.

### 21.3 Android emulator

- **Hard kill the app** (swipe from recents), then re-launch.
- **Native Android-12+ splash appears first** (BEFORE the JS
  bundle): parchment background `#F5F0E8`, centered lion mark
  in SIMBA gold, parchment status bar / nav bar. No spinner
  flicker. No white flash.
- **JS-side splash animation plays** once RN mounts: lion
  scales + fades in, wordmark fades in, tagline fades in,
  progress ring fills, handoff to next screen.
- Login: wordmark "Simba" in Allura (script, gold).
- Home: wordmark "Simba" in Allura. Greeting "Good afternoon"
  in Cormorant, "Paval" in Inter Bold gold. Weather chip
  shows correctly (P66). Library rails each have circular
  gold-soft icons. Movies + Podcasts have "View all →".
- Tap Movies row → "All / Classic Films / Public Domain"
  cards render. Tap a card → Movie Detail opens. Movie title
  in Cormorant.
- Open Settings → all section titles in Manrope. Open
  Audio Settings → equalizer title in Manrope. Open
  Linked Folders → section titles in Manrope.
- Open MpvConfigEditor → text in JetBrains Mono.

### 21.4 Per-page coverage

- Tap through every screen in the per-page table (§7). **All
  51 screens — no exceptions, no skips, no "auto coverage"
  shortcuts.**
- Every screen reads correctly with the right font for its
  role. No visible fallback to system default.

### 21.5 iOS simulator (if available)

- Same as 21.3 and 21.4.
- No `fontFamily` warnings in Xcode console.
- `LaunchScreen.storyboard` shows parchment background + lion
  mark on cold launch (iOS parity with the Android native
  splash).

### 21.6 Light + dark mode

- Switch theme; wordmark still gold; tagline still muted;
  Cormorant hero titles still readable on dark backgrounds.

### 21.7 Screen widths

- 320 dp, 360 dp, 411 dp, 480 dp: wordmark scales 44 → 48 → 52
  px. No collision with search/avatar.

### 21.8 Cold-start invariants

- P67 invariant: cold start lands on Home for authed user.
- P66 invariant: weather chip renders correctly.

### 21.9 Font fallback smoke

- Disable the Allura TTF in the bundle and re-launch. The
  wordmark should fall back to system serif (not Inter) — a
  visible regression. This proves the script is loading
  from the bundle. Restore the TTF.
- Repeat for each of the 5 families. Each fallback should be
  visually distinct from the others.

### 21.10 No new raw `<Text>` regressions

```bash
grep -rn "<Text" src/screens | grep -v AppText
```

Should only return the existing `MpvConfigEditor.tsx` lines
(code editor — now using `FONT_FAMILY.mono`). Any new raw `<Text>`
without `fontFamily` is a regression.

### 21.10a No hard-coded font-family strings

```bash
grep -rn "fontFamily: '" src/ | grep -v fontFamily.ts
```

Should return **zero** results. Every `fontFamily` reference
must go through `FONT_FAMILY` from `src/constants/fontFamily.ts`.
The single source of truth. The only `fontFamily: '...'` string
literals allowed in the codebase live inside
`src/constants/fontFamily.ts` itself.

### 21.11 Splash animation respects reduce-motion

- Toggle "Reduce motion" in the OS settings.
- Re-launch the app: the Splash plays without the
  scale/opacity transforms (fades only, longer duration).

### 21.12 Final screenshots

- Capture the **native Android-12+ splash** (taken before RN
  mounts — kill the app, then snap a screenshot during the
  first ~300 ms), the **JS Splash** (mid-animation), Home,
  Movie Detail, Album Detail, Settings, and MPV Config Editor.
  Compare to the manager reference and the visual targets in
  §7.
