# SIMBA Mobile: UI/UX Elevation v4 — Comprehensive Master Specification

> **Document Version:** 4.0.0
> **Supersedes:** `UI_UX_Elevation_Specification_v3_DEPRECATED.md` (v3: all 30 phases COMPLETE ~8%)
> **Target Platform:** React Native (Android-primary, iOS-compatible)
> **Core Focus:** Polish, real authentication, Netflix/Spotify-quality media players, rich dedicated sub-pages, bookmarking, component-based architecture, premium animations
> **Completion Milestone:** Elevating project from ~8% to ~10% — a working beta demonstrable to management

---

## TABLE OF CONTENTS

1. v4 Diagnosis: Why v4 Exists
2. Design Philosophy v4: Premium Production Quality
3. Component Architecture v4
4. Detailed 30-Phase Elevation Roadmap
5. Animation and Motion System v4
6. Verification and Quality Assurance Suite

---

## 1. v4 DIAGNOSIS: WHY v4 EXISTS

v3 brought the foundation from ~6% to ~8% maturity. But it still does not feel like a real product. The following failures block it from reaching beta quality:

### 1.1 Authentication: No Real Login Flow
- **Current:** No authentication. App opens directly to Home.
- **v4 Fix:** Google OAuth login (via `@react-native-google-signin/google-signin`), login screen with SIMBA branding, persistent session, sign-out in Settings.

### 1.2 Video Player: Not Netflix Quality
- **Current:** `VideoPlayerScreen.tsx` is monolithic — mixes player logic, gestures, overlays, UI in one file.
- **v4 Fix:** Extract `VideoPlayer` as standalone **component** in `src/components/player/VideoPlayer/`. Screen is thin wrapper. Netflix-quality controls. No native rotation. Subtitle selector UI. Audio track selector UI. Chapter browser with thumbnails.

### 1.3 Audio Player: Half-Baked, Not Spotify Quality
- **Current:** Basic controls, no volume slider, no submenu, no Spotify-style design.
- **v4 Fix:** Extract `AudioPlayer` as standalone **component**. Spotify full-screen: large album art, animated gradient bg. Volume control slider. Heart/share/three-dot submenu sheet. Up Next queue peek. Persistent **Mini Audio Player** above tab bar. Animated waveform.

### 1.4 Dedicated Sub-Pages Missing
- **Current:** "See All" buttons dead. Library tabs have no rich destination pages.
- **v4 Fix (8 new screens):** ArtistScreen, AlbumScreen, SongScreen, GenreScreen, AllVideosScreen, AllAudioScreen, AllPlaylistsScreen, BookmarksScreen

### 1.5 Settings: Confusing and Incomplete
- **Current:** Flat list. Folder linking confusing. Many options missing.
- **v4 Fix:** Sectioned settings. Step-by-step folder wizard. New sections: Subtitle appearance, Audio output. Account section at top. About page.

### 1.6 Home Page: Too Many Lists, No UX Flow
- **v4 Fix:** Each "See All" => dedicated screen. Genre browsing section.

### 1.7 Library Screen: Missing Dedicated UX Flows
- **v4 Fix:** Tap Artist => `ArtistScreen`. Tap Album => `AlbumScreen`. Tap Track => `SongScreen` or inline play.

### 1.8 Bookmarking Feature (NEW)
- Bookmarks are named, timestamped positions within media files.
- Different from "Continue Watching" (auto last position per file).
- `BookmarksScreen.tsx` shows all bookmarks. Persist in Redux + AsyncStorage.

### 1.9 Component-Based Development Standard (ENFORCE)
- Every screen: `useXxxScreen.ts` hook file.
- All UI: components from `src/components/`.
- All buttons: `AppButton` or `IconButton` from `src/components/core/`.

### 1.10 Animation System: Sparse, Not Alive
- **v4 Fix:** Shared animation primitives. Every screen entrance staggered. Custom activity indicators: ActivityOrb, PulseRing, WaveformBars. Player transitions: album art morph, gradient shift.

---

## 2. DESIGN PHILOSOPHY v4

### 2.1 Core Principles
1. **Real App, Real Auth** — Google login transforms app from dev toy to real product.
2. **Componentized Everything** — Screens are orchestrators. UI lives in components.
3. **One Hook Per Screen** — `useXxxScreen.ts` holds all business logic.
4. **Netflix Video, Spotify Audio** — Flawless, polished, professional.
5. **Bookmarks First-Class** — Named moments users can return to.
6. **Alive Interface** — Staggered entrances, haptics, smooth transitions everywhere.

### 2.2 Color System v4 Extensions

| Token | Dark Value | Usage |
|---|---|---|
| `background.playerGradient` | Dynamic from album art | Audio player bg |
| `surface.playerControl` | `rgba(28,28,30,0.80)` | Video control bg |
| `text.onGold` | `#0A0A0C` | Text on gold buttons |
| `player.seekBarThumb` | `#FFFFFF` | Seek thumb dot |
| `player.seekBarFill` | `#C9A84C` | Seek fill (gold) |
| `semantic.bookmark` | `#64B5F6` | Bookmark accent (blue) |

### 2.3 Player Typography Extensions

| Role | Weight | Size | Usage |
|---|---|---|---|
| Player Track Title | Bold 700 | 20px | Now Playing title |
| Player Artist Name | Regular 400 | 15px | Artist name |
| Player Time | Medium 500 | 12px | Position/Duration |

---

## 3. COMPONENT ARCHITECTURE v4

### 3.1 Screen Hook Pattern (MANDATORY)

Every screen file MUST follow this pattern:

`	ypescript
// useXxxScreen.ts — ALL logic here
export function useXxxScreen() {
  // 1. Redux selectors
  // 2. Navigation hooks
  // 3. Local state
  // 4. Side effects (useEffect with cleanup)
  // 5. Event handlers
  // 6. Derived data (useMemo)
  return { data, handlers }; // NO JSX
}

// XxxScreen.tsx — ONLY JSX rendering, < 150 lines
export function XxxScreen() {
  const { data, handlers } = useXxxScreen();
  // Uses ONLY components from src/components/
}
`

### 3.2 Button Rule (MANDATORY)

`
CORRECT: <AppButton variant="primary" onPress={handler} label="Play All" />
CORRECT: <IconButton icon="play" onPress={handler} tooltip="Play" />
WRONG:   <TouchableOpacity style={{ backgroundColor: '#C9A84C' }}>...</TouchableOpacity>
`

### 3.3 New Components Summary

**Feedback:** `ActivityOrb` (pulsing orb spinner), `PulseRing` (expanding ring), `WaveformBars` (EQ bars)

**Player/VideoPlayer:** `VideoPlayer` component, `VideoControls`, `VideoSeekBar`, `VideoTopBar`, `VideoTransport`, `VideoSecondaryBar`, `SubtitleSelector`, `AudioTrackSelector`, `ChapterBrowser`, `DoubleTapFeedback`

**Player/AudioPlayer:** `AudioPlayer` component, `AudioAlbumArt`, `AudioGradientBg`, `AudioTransport`, `AudioSeekBar`, `AudioVolumeSlider`, `AudioActionRow`, `AudioSubMenu`, `AudioQueuePeek`, `AudioLyricsView`, `AudioWaveform`

**Player/MiniAudioPlayer:** `MiniAudioPlayer`, `MiniProgressBar`

**Bookmark:** `BookmarkButton`, `BookmarkItem`, `BookmarkList`

**Auth:** `GoogleSignInButton`, `UserAvatar`

**Sheets:** `BookmarkSheet`, `SubtitleStyleSheet`

### 3.4 New Screens Summary

| Screen | Route | Source |
|---|---|---|
| `LoginScreen` | Login | Auth/LoginScreen.tsx |
| `ArtistScreen` | ArtistScreen | Artist/ArtistScreen.tsx |
| `AlbumScreen` | AlbumScreen | Album/AlbumScreen.tsx |
| `SongScreen` | SongScreen | Song/SongScreen.tsx |
| `GenreScreen` | GenreScreen | Genre/GenreScreen.tsx |
| `AllVideosScreen` | AllVideosScreen | AllVideos/AllVideosScreen.tsx |
| `AllAudioScreen` | AllAudioScreen | AllAudio/AllAudioScreen.tsx |
| `AllPlaylistsScreen` | AllPlaylistsScreen | AllPlaylists/AllPlaylistsScreen.tsx |
| `BookmarksScreen` | BookmarksScreen | Bookmarks/BookmarksScreen.tsx |
| `AboutScreen` | AboutScreen | About/AboutScreen.tsx |


---

## 4. DETAILED ELEVATION ROADMAP (32 Phases)

`
WAVE 0: Content API Foundation ────── Phase 0.1-0.4 (TMDB, TVMaze, iTunes, Podcast Index, Radio Browser,
                                  MusicBrainz, LibriVox, Google Books, Deezer, IPTV-org,
                                  Jamendo, Internet Archive)
WAVE 1: Auth and Foundation ──────── Phases 1-5 (+3A)  (Google login, hooks, animations, i18n, bookmarks)
WAVE 2: Video Player Excellence ───── Phases 6-10   (Netflix-quality VideoPlayer component)
WAVE 3: Audio Player Excellence ───── Phases 11-15  (Spotify-quality AudioPlayer + mini player)
WAVE 4: Dedicated Sub-Pages ──────── Phases 16-20  (Artist, Album, Song, Genre, Bookmarks screens)
WAVE 5: Home and Library UX Flow ──── Phases 21-25  (See All nav, folder wizard, settings)
WAVE 6: Polish and Working Beta ────── Phases 26-30  (Animations, perf, QA, production audit)
`

> **⛔ Phase 0 Dependency:** Phase 0 (Content API Foundation, all sub-phases 0.1-0.4) must be completed before Phase 15 and all subsequent waves. Phases 1-14 may proceed independently, but Waves 3-6 require Phase 0 data for content-rich screens (Artist, Album, Song, Genre, Search, Home recommendations).

---

## WAVE 1: Auth and Foundation (Phases 1-5)

### PHASE 1 — Google Authentication Integration

**Goal:** Real Google OAuth login. Profile info in settings. Session persists across restarts.

**Key Files:**
- `src/screens/Auth/LoginScreen.tsx` — NEW
- `src/screens/Auth/useLoginScreen.ts` — NEW hook
- `src/services/authService.ts` — NEW Google Sign-In wrapper
- `src/store/slices/authSlice.ts` — NEW auth Redux state
- `src/hooks/useAuth.ts` — NEW auth state hook
- `src/components/auth/GoogleSignInButton.tsx` — NEW branded button
- `src/components/core/Avatar/Avatar.tsx` — NEW user avatar component
- `src/navigation/RootNavigator.tsx` — UPDATE auth routing
- `src/screens/Settings/components/AccountSection.tsx` — NEW

**Login Screen Design:**
- SIMBA lion logo with animated entrance (fadeIn + scale)
- Tagline: "Your Personal Media Player"
- Animated gradient orb background (like Splash screen)
- `GoogleSignInButton` with official Google branding
- ~~"Continue as Guest" ghost button below~~ REMOVED per user decision
- Terms of Service and Privacy links at footer

**Checklist:**
- [x] 1.1 LoginScreen: logo (animated), tagline, GoogleSignInButton
- [x] 1.2 GoogleSignInButton: official Google branding (G logo, white bg, branded text)
- [x] 1.3 Google Sign-In SDK: `@react-native-google-signin/google-signin` installed and linked
- [x] 1.4 authService: wraps `GoogleSignin.signIn()`, extracts `{name, email, photo, id}`
- [x] 1.5 authSlice: state `{user, isAuthenticated, isLoading, error}` — redux-persist
- [x] 1.6 useAuth hook: exposes `{user, isAuthenticated, signIn, signOut, isLoading}`
- [x] 1.7 RootNavigator: if not authenticated => LoginScreen, else => MainTabs
- ~~[ ] 1.8 Guest mode: null user, full app access, Settings shows "Sign In" CTA~~ REMOVED per user decision
- [x] 1.9 AccountSection in Settings: avatar, name, email, "Sign Out" button
- [x] 1.10 Sign-out clears authSlice, returns to LoginScreen
- [x] 1.11 Session persistence: redux-persist saves auth state to AsyncStorage (auto-login)
- [x] 1.12 Login screen: animated orb pulse background

---

### PHASE 2 — Screen Hook Pattern Enforcement

**Goal:** Every screen gets `useXxxScreen.ts`. Logic moves out of screen files. Screens < 150 lines.

**Checklist:**
- [x] 2.1 `useHomeScreen.ts`: `{featured, continueWatching, frequentlyPlayed, recentlyAdded, playlists, onRefresh, isLoading}`
- [x] 2.2 HomeScreen updated: hook only + components only. File < 150 lines
- [x] 2.3 `useLibraryScreen.ts`: segment data, viewMode, sort, filter state + handlers
- [x] 2.4 LibraryScreen: hook only + segment components. File < 150 lines
- [x] 2.5 `useVideoPlayerScreen.ts`: player state, file info, PiP handlers, bookmark handlers
- [x] 2.6 VideoPlayerScreen: thin wrapper using hook + `<VideoPlayer />` component
- [x] 2.7 `useAudioPlayerScreen.ts`: track info, queue state, lyric position, bookmark handlers
- [x] 2.8 AudioPlayerScreen: thin wrapper using hook + `<AudioPlayer />` component
- [x] 2.9 `useSettingsScreen.ts`: settings state + handlers for all sections
- [x] 2.10 All hooks follow: selectors => navigation => state => effects => handlers => derived => return

---

### PHASE 3 — Animation Primitives and Custom Activity Indicators

**Goal:** Shared animation system. Replace all `ActivityIndicator` with branded custom animations.

**Key Files:**
- `src/components/feedback/ActivityOrb/ActivityOrb.tsx` — NEW
- `src/components/feedback/PulseRing/PulseRing.tsx` — NEW
- `src/components/feedback/WaveformBars/WaveformBars.tsx` — NEW
- `src/hooks/useAnimatedEntrance.ts` — NEW staggered entrance hook
- `src/utils/animations.ts` — NEW animation presets

**Component Specs:**
- **ActivityOrb:** 3 concentric pulsing rings + center gold orb. Props: `size`, `color`, `label`. 1.2s loop.
- **PulseRing:** Single expanding/fading ring. Stackable. Props: `size`, `color`, `delay`.
- **WaveformBars:** 5 animated bars of varying heights (EQ style). Props: `color`, `barCount`, `isPlaying`. 0.8s loop.

**Checklist:**
- [x] 3.1 ActivityOrb: 3 pulsing rings + center gold orb. Props: size, color, label
- [x] 3.2 PulseRing: expanding/fading ring. Props: size, color, delay
- [x] 3.3 WaveformBars: 5-bar EQ animation. Props: color, barCount, isPlaying
- [x] 3.4 `useAnimatedEntrance(count, delay)` hook: staggered Animated.Values array
- [x] 3.5 `animations.ts`: fadeIn, slideInUp, scaleIn, staggerChildren, springScale, pulseLoop
- [x] 3.6 All `ActivityIndicator` usages replaced with `ActivityOrb`
- [x] 3.7 LoadingOverlay uses ActivityOrb
- [x] 3.8 Library audio scan uses WaveformBars (thematic indicator)
- [x] 3.9 Splash screen orb extracted to reusable ActivityOrb
- [x] 3.10 All animations respect `reduceMotion` via `useAccessibility().reduceMotion`

---

### PHASE 3A — i18n/Text Content Foundation (NEW)

> **Added:** 2026-07-29
> **Scope:** Centralize and standardize all ~350 user-facing UI strings across 26 screens

**Goal:** Every hardcoded user-facing string extracted from screen TSX files into dedicated `textContent.ts` files. Enables future localization and ensures string consistency.

**Key Deliverables:**
- `src/constants/strings.ts` — 134 global/generic keys
- `src/screens/<Screen>/textContent.ts` — per-screen string files (26 files, ~195 strings)
- `src/types/textContent.ts` — shared `TextContent` type
- `md/Text_Content_Reference.md` — comprehensive reference document

**Checklist:**
- [x] 3A.1 Audit all 26 screen folders — identify all hardcoded strings (~350 total)
- [x] 3A.2 Create `textContent.ts` for each screen (~195 screen-specific strings)
- [x] 3A.3 Add JSDoc comments to all 26 textContent.ts files describing screen purpose
- [x] 3A.4 Create shared `TextContent` type in `src/types/textContent.ts`
- [x] 3A.5 Create `md/Text_Content_Reference.md` — per-screen string inventory
- [x] 3A.6 Use `as const` exports for TypeScript type safety on all textContent files
- [x] 3A.7 Template strings use `{placeholder}` convention for dynamic values
- [x] 3A.8 `src/constants/strings.ts` updated — 134 keys for global/generic strings
- [x] 3A.9 Cross-reference UI_UX_Elevation_Progress_Tracker_v4.md with Text_Content_Reference.md
- [x] 3A.10 Standardize pluralization pattern across all textContent files (`singularKey` / `pluralKey`)

---

### PHASE 4 — Bookmarking Feature Foundation

**Goal:** Complete bookmark system — data model, Redux, service, UI components.

**Bookmark Model:**
`	ypescript
interface Bookmark {
  id: string;           // UUID
  fileUri: string;      // Media file URI
  fileName: string;     // Display name
  fileType: 'video' | 'audio';
  positionMs: number;   // Bookmark position
  label: string;        // User label ("Interesting part")
  thumbnailUri?: string;
  createdAt: number;    // Unix timestamp
  durationMs: number;   // File total duration
}
`

**Difference from "Continue Watching":**
- Bookmarks: intentional, named, multiple per file, shown in BookmarksScreen
- Continue Watching: auto last position, one per file, shown in Home hero

**Checklist:**
- [x] 4.1 `bookmarkSlice.ts`: actions: add/remove/updateLabel/clearAll; selectors: selectBookmarksForFile/selectAllBookmarks
- [x] 4.2 `bookmarkService.ts`: saveBookmark/loadBookmarks/deleteBookmark — AsyncStorage key `simba_bookmarks`
- [x] 4.3 `useBookmarks(fileUri?)` hook: CRUD ops, bookmarksForFile, allBookmarks
- [x] 4.4 `BookmarkButton`: tap opens BookmarkSheet. Count badge if bookmarks exist.
- [x] 4.5 `BookmarkSheet`: "Save current position" with label input + existing bookmarks list
- [x] 4.6 `BookmarkItem`: formatted time, label, relative date, delete button
- [x] 4.7 `BookmarkList`: FlatList, grouped by file, sorted by position
- [x] 4.8 `BookmarksScreen`: all bookmarks grouped by file, search/filter, tap => open at position
- [x] 4.9 Bookmarks persist via redux-persist (AsyncStorage)
- [x] 4.10 VideoPlayer integrated: BookmarkSheet wired via TopBar bookmark icon
- [x] 4.11 AudioPlayer integrated: BookmarkSheet wired via AudioActionButtons bookmark button

---

### PHASE 5 — Navigation Architecture v4

**Goal:** All new v4 routes registered. Typed navigation hook. Working deep links.

**New Routes:**
`
Login: undefined
ArtistScreen: { artistId: string; artistName: string }
AlbumScreen: { albumId: string; albumName: string }
SongScreen: { fileUri: string; fileName: string }
GenreScreen: { genre: string }
AllVideosScreen: { filter?: string; sort?: string }
AllAudioScreen: { filter?: string; sort?: string }
AllPlaylistsScreen: undefined
BookmarksScreen: undefined
AboutScreen: undefined
`

**Checklist:**
- [x] 5.1 `types.ts`: all 10 new routes added
- [x] 5.2 `RootNavigator.tsx`: all new screens registered
- [x] 5.3 `useNavigation.ts` hook: typed navigate/goBack/push/reset
- [x] 5.4 Login screen in stack (before MainTabs if not authenticated)
- [x] 5.5 Deep links: `simbaplayer://artist/:artistName`, `simbaplayer://album/:albumName/:artistName`, `simbaplayer://bookmarks`
- [x] 5.6 Back navigation from all new screens correct
- [x] 5.7 Home "See All" => AllVideosScreen, AllAudioScreen, AllPlaylistsScreen
- [x] 5.8 Library artist/album taps => ArtistScreen/AlbumScreen
- [x] 5.9 Tracks in Artist/Album screen => AudioPlayer or SongScreen

---

### Wave 1 Gate Check
**Required:** Google login works on device. All screens have `useXxxScreen.ts`. Bookmark Redux + service working. All routes registered. `ActivityIndicator` fully replaced with `ActivityOrb`.

---

## WAVE 2: Video Player Excellence (Phases 6-10)

### PHASE 6 — VideoPlayer Component Extraction

**Goal:** Self-contained VideoPlayer component. VideoPlayerScreen is a < 80 line wrapper.

**VideoPlayer Interface:**
`	ypescript
interface VideoPlayerProps {
  fileUri: string;
  title?: string;
  startPosition?: number;
  onBack: () => void;
  onEnterPiP?: () => void;
  onBookmark?: (position: number) => void;
  onPlaybackStateChange?: (state: PlaybackState) => void;
}
`

**Checklist:**
- [x] 6.1 `VideoPlayer.tsx` component: self-contained, accepts fileUri/title/callbacks
- [x] 6.2 `VideoPlayerScreen.tsx` < 80 lines: wraps VideoPlayer + screen concerns only
- [x] 6.3 `useVideoPlayerScreen.ts`: file URI from params, PiP lifecycle, bookmarks
- [x] 6.4 `VideoControls.tsx`: Netflix-style overlay, animated show/hide (fade + translateY)
- [x] 6.5 Controls auto-hide after 4s inactivity, re-appear on tap
- [x] 6.6 `VideoTopBar.tsx`: always visible — back, title (truncated), bookmark, more menu
- [x] 6.7 `VideoTransport.tsx`: always visible — prev, -10s, play/pause (gold, large), +10s, next
- [x] 6.8 `VideoSeekBar.tsx`: gold fill, white thumb, chapter markers, time labels
- [x] 6.9 `VideoSecondaryBar.tsx`: auto-hiding — chapters, subs, audio, EQ, playlist with text labels
- [x] 6.10 `DoubleTapFeedback.tsx`: animated pill +/-10s with chevrons (YouTube style)
- [x] 6.11 NO native rotation. Landscape via `useWindowDimensions` responsive layout
- [x] 6.12 Bookmark button: opens `BookmarkSheet` for current position

---

### PHASE 7 — Subtitle Selector UI

**Checklist:**
- [ ] 7.1 `SubtitleSelector.tsx`: BottomSheet listing all subtitle tracks from MPV
- [ ] 7.2 Each row: language name, format (SRT/ASS/VTT), active indicator (gold dot)
- [ ] 7.3 "Off" always at top
- [ ] 7.4 Tap => MPV switches subtitle track via bridge
- [ ] 7.5 `SubtitleStyleSheet.tsx`: font size slider, text color picker (5 presets), bg opacity slider
- [ ] 7.6 Subtitle style settings persisted to AsyncStorage
- [ ] 7.7 Active track badge in VideoSecondaryBar subtitle icon
- [ ] 7.8 Quick ON/OFF toggle in secondary bar

---

### PHASE 8 — Audio Track Selector UI (Enhanced)

**Checklist:**
- [ ] 8.1 `AudioTrackSelector.tsx`: BottomSheet with rich audio track cards
- [ ] 8.2 Each card: track number, language, codec (DTS/AAC/MP3/AC3), channel layout, sample rate
- [ ] 8.3 Active track: gold left border + gold radio dot
- [ ] 8.4 Tap => MPV switches audio track via bridge
- [ ] 8.5 MpvBridgeModule returns codec/channels/sample rate per track
- [ ] 8.6 Language flags/emoji for common languages
- [ ] 8.7 Active language shown in secondary bar button label

---

### PHASE 9 — Chapter Browser (Enhanced)

**Checklist:**
- [ ] 9.1 `ChapterBrowser.tsx`: BottomSheet with 3-column grid of chapter cards
- [ ] 9.2 Each card: thumbnail (or gradient placeholder), chapter number, start time
- [ ] 9.3 Current chapter: gold border + overlay badge
- [ ] 9.4 Tap => seek to chapter start, dismiss sheet
- [ ] 9.5 Chapter title + time range shown below grid for selected chapter
- [ ] 9.6 Auto-scroll to current chapter on open
- [ ] 9.7 Fallback: colored gradient cards if no thumbnails
- [ ] 9.8 Chapter count in sheet header

---

### PHASE 10 — Video Player Polish

**Checklist:**
- [x] 10.1 Controls show/hide: 300ms fade + translateY (not instant)
- [x] 10.2 Play/pause: spring scale press (0.85 => 1.0)
- [x] 10.3 Seek thumb: enlarges on touch (16px => 24px spring)
- [x] 10.4 Chapter marks: gentle pulse on seek bar
- [x] 10.5 Loading: ActivityOrb over video surface
- [x] 10.6 Buffering: thin gold shimmer bar at top (YouTube-style)
- [x] 10.7 Error: PlayerErrorFallback component
- [x] 10.8 End of video: "Replay" button overlay
- [x] 10.9 Volume/brightness pill: animated icon change
- [x] 10.10 Bookmark save: blue pulse animation on BookmarkButton

---

### Wave 2 Gate Check
**Required:** VideoPlayer is a standalone component in VideoPlayerScreen. Subtitle/audio track/chapter all functional. No native rotation. Polished animations.

---

## WAVE 0: Content API Foundation (Phases 0.1–0.4)

> **⛔ Mandatory Prerequisite for WAVE 3+:** Phase 0 (all sub-phases 0.1–0.4) must be completed before proceeding to Phase 15 and all subsequent waves (Waves 3–6). Phases 1–10 and Phase 3A/4/5 may proceed independently, but Waves 3–6 require Phase 0 data for content-rich screens (ArtistScreen, AlbumScreen, SongScreen, GenreScreen, Search, Home recommendations).

### Overview

12 free APIs organized into 4 sub-phases. Sub-phases 0.1 and 0.2 provide metadata/discovery (posters, descriptions, schedules).
Sub-phase 0.3 provides **actual playable streams** (live TV, full-length music, public-domain audio) consumable via libmpv.

**Shared Infrastructure (all sub-phases):**
- `src/services/api/apiClient.ts` — shared HTTP client (rate limiting, caching, 10s timeout, error normalization)
- `src/constants/api.ts` — all base URLs, endpoint paths, default params, rate limit config
- `src/services/api/index.ts` — barrel export
- `src/constants/env.ts` — API key constants
- `.env` — placeholder API keys
- All services return typed results from `src/types/api.ts`

---

### PHASE 0.1 — Metadata & Discovery APIs

**Goal:** Pull posters, descriptions, cast, genres, and metadata for movies and TV shows. These APIs provide data for browse/discovery UIs but do **not** return playable streams. TV show artwork via TVmaze, album artwork via MusicBrainz/Cover Art Archive.

| Content Type | API | Auth | Free Tier | Key Features |
|---|---|---|---|---|
| Movies & TV Shows | [TMDB](https://developer.themoviedb.org) | API Key ✓ | Yes | Trending, Popular, Top Rated, Search, Posters, Backdrops, Cast, Genres, Trailers, Seasons/Episodes |
| TV Shows (Schedules) | [TVMaze](https://www.tvmaze.com/api) | None | Yes | Episode schedules, Cast, Seasons, Air dates, Search |
| Music (Metadata) | [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) | None | Yes | Artists, Albums, Track metadata, MBID lookup, Cover Art |
| Books | [Google Books API](https://developers.google.com/books) | API Key ✓ | Yes | Books, Covers, Authors, Audiobook metadata, Search |

**Files:**
- `src/services/api/tmdbService.ts` — search movies/shows, getTrending, getPopular, getDetails, getRecommendations
- `src/services/api/tvmazeService.ts` — search shows, getShowById, getEpisodeList, getSchedule
- `src/services/api/musicbrainzService.ts` — search artists/albums, getArtistDiscography, getCoverArt
- `src/services/api/googleBooksService.ts` — search books, getBookDetails

**Checklist:**
- [x] 0.1.1 `tmdbService.ts`: search movies/shows, getTrending, getPopular, getDetails (posters, backdrop, cast, genres, seasons), getRecommendations
- [x] 0.1.2 `tvmazeService.ts`: search shows, getShowById, getEpisodeList, getSchedule (by date/country)
- [x] 0.1.3 `musicbrainzService.ts`: search artists/albums, getArtistDiscography, getCoverArt (via Cover Art Archive)
- [x] 0.1.4 `googleBooksService.ts`: search books, getBookDetails with covers, authors, description

---

### PHASE 0.2 — Search & Browse APIs

**Goal:** Search and browse music, podcasts, radio, and audiobooks. Includes iTunes (metadata + 30s previews), Podcast Index (full episodes), Radio Browser (playable streams), LibriVox (full audiobooks), and Deezer (music metadata + 30s previews).

| Content Type | API | Auth | Free Tier | Key Features |
|---|---|---|---|---|
| Music (Search) | [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) | None | Yes | Songs, Albums, Artists, Podcasts, Audiobooks search, 30s previews |
| Music (Browse) | [Deezer API](https://developers.deezer.com/api) | API Key ✓ | Yes | Chart, Genre, Album, Artist, Track search + 30s previews |
| Podcasts | [Podcast Index](https://podcastindex.org/) | API Key + Secret ✓ | Yes | Millions of podcasts, Episodes, Categories, Full episode audio |
| Radio Stations | [Radio Browser](https://de1.api.radio-browser.info/) | None | Yes | Thousands of stations, Search by country/genre/language, **playable stream URLs** |
| Audiobooks | [LibriVox](https://librivox.org/api/info) | None | Yes | Public-domain audiobooks, authors, genres, **full download links** |

**Files:**
- `src/services/api/itunesService.ts` — search songs/albums/artists/podcasts/audiobooks, getLookup by ID
- `src/services/api/deezerService.ts` — search tracks/albums/artists, getChart, getGenre, getTrackById
- `src/services/api/podcastIndexService.ts` — search podcasts/episodes, getTrending, getCategories, getEpisodesByPodcast
- `src/services/api/radioBrowserService.ts` — search stations, getStationsByCountry/Genre/Language, getTopClick, getStationById
- `src/services/api/librivoxService.ts` — search audiobooks by title/author, getAudiobookDetails with download URLs

**Checklist:**
- [x] 0.2.1 `itunesService.ts`: search songs/albums/artists/podcasts/audiobooks, getLookup by ID
- [x] 0.2.2 `deezerService.ts`: search tracks/albums/artists, getChart, getGenre, getTrackById (30s preview URLs)
- [x] 0.2.3 `podcastIndexService.ts`: search podcasts/episodes, getTrending, getCategories, getEpisodesByPodcast — **full episode audio**
- [x] 0.2.4 `radioBrowserService.ts`: search stations, getStationsByCountry/Genre/Language, getTopClick, getStationById — **playable stream URLs**
- [x] 0.2.5 `librivoxService.ts`: search audiobooks by title/author, getAudiobookDetails — **full MP3 downloads**

---

### PHASE 0.3 — Streaming Source APIs

**Goal:** Provide **directly playable URLs** for libmpv — live TV channels, full-length free music, and public-domain audio archives. These APIs give SIMBA actual streaming content without requiring local files.

| Content Type | API | Auth | Free Tier | Key Features |
|---|---|---|---|---|
| Live TV | [IPTV-org](https://github.com/iptv-org/iptv) | None | Yes | ~10,000 channels, M3U playlists, Sorted by country/category, **direct playable URLs** |
| Full Music | [Jamendo](https://developer.jamendo.com/v3.0) | Client ID ✓ | Yes | Full-length CC-licensed tracks, Albums, Artists, Genres, **direct MP3/stream URLs** |
| Audio Archive | [Internet Archive](https://archive.org/developers/internet-archive-audio-api.html) | None | Yes | Public-domain audio, old-time radio, concerts, speeches, **direct playable URLs** |

**Files:**
- `src/services/api/iptvService.ts` — fetch M3U playlists, getChannelsByCountry/Category, search channels, getChannelStreamUrl
- `src/services/api/jamendoService.ts` — search tracks/albums/artists, getPopular, getGenreTracks, getTrackStreamUrl
- `src/services/api/internetArchiveService.ts` — search audio items, getItemDetails, getItemStreamUrls

**Checklist:**
- [x] 0.3.1 `iptvService.ts`: fetch M3U playlists from IPTV-org GitHub, parse channels, search by name/country/category, return **playable stream URLs**
- [x] 0.3.2 `jamendoService.ts`: search tracks/albums/artists, getPopular, getGenreTracks, return **full-length stream URLs** (MP3/streamable)
- [x] 0.3.3 `internetArchiveService.ts`: search audio items, getItemDetails with track listings, return **direct audio stream URLs**

---

### PHASE 0.4 — Cross-API Integration & Search Aggregator

**Goal:** Wire all APIs into the app — typed results, barrel exports, cross-API search, .env config, and validation.

**Tasks:**
- `src/types/api.ts` — shared interfaces for all API result types
- `src/constants/api.ts` — config for all 12 APIs
- `src/services/api/index.ts` — barrel export with disambiguated names
- `src/services/api/searchAggregator.ts` — cross-API search runner
- `.env` / `src/constants/env.ts` — API keys
- `tsc --noEmit` verification

**Env Keys:**
```env
TMDB_API_KEY=your_tmdb_api_key_here
PODCAST_INDEX_API_KEY=your_podcast_index_api_key_here
PODCAST_INDEX_API_SECRET=your_podcast_index_api_secret_here
GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
DEEZER_API_KEY=your_deezer_api_key_here
JAMENDO_CLIENT_ID=your_jamendo_client_id_here
```

**Steps to Obtain New API Keys:**
1. **Deezer:** Register at https://developers.deezer.com/ → Create App → Get Application ID → Use as `DEEZER_API_KEY`
2. **Jamendo:** Register at https://developer.jamendo.com/ → Create App → Get Client ID → Use as `JAMENDO_CLIENT_ID`

**Checklist:**
- [x] 0.4.1 `src/types/api.ts`: all shared interfaces (`MovieResult`, `TVShowResult`, `MusicTrackResult`, `MusicAlbumResult`, `PodcastResult`, `PodcastEpisodeResult`, `RadioStationResult`, `AudiobookResult`, `BookResult`, `DeezerTrackResult`, `IPTVChannelResult`, `JamendoTrackResult`, `InternetArchiveItemResult`, `AggregatedSearchResults`, `ApiSearchOptions`, `ApiConfig`)
- [x] 0.4.2 `src/constants/api.ts`: config for all 12 APIs (base URLs, rate limits, default params)
- [x] 0.4.3 `src/services/api/index.ts`: barrel export with explicit aliases for colliding names
- [x] 0.4.4 `src/services/api/searchAggregator.ts`: cross-API search — runs `Promise.allSettled` across compatible APIs, merges by content type
- [x] 0.4.5 `.env` / `src/constants/env.ts`: all API keys with placeholder values
- [x] 0.4.6 `npx tsc --noEmit` compiles with zero errors in Phase 0 code

---

## WAVE 3: Audio Player Excellence (Phases 11-15)

### PHASE 11 — AudioPlayer Component Extraction

**Goal:** Self-contained AudioPlayer component. AudioPlayerScreen is < 80 line wrapper. Spotify-quality design.

**Checklist:**
- [x] 11.1 `AudioPlayer.tsx` component: self-contained, accepts full hook data as props
- [x] 11.2 `AudioPlayerScreen.tsx` < 80 lines: only wraps `<AudioPlayer />`
- [x] 11.3 `useAudioPlayerScreen.ts`: file loading, queue, lyrics position, bookmarks
- [x] 11.4 `AudioGradientBg.tsx`: extracts dominant color from art, dynamic gradient background
- [x] 11.5 `AudioAlbumArt.tsx`: 80% width square, FastImage, border radius
- [x] 11.6 Track changes: album art cross-fade + subtle scale animation
- [x] 11.7 Background gradient transitions smoothly on track change (600ms)
- [x] 11.8 `AudioActionRow.tsx`: heart (like toggle), share, three-dot (opens AudioSubMenu)
- [x] 11.9 Like/heart: spring bounce animation on toggle + haptic
- [x] 11.10 Bookmark accessible from three-dot submenu

---

### PHASE 12 — Audio Volume and Seek Controls

**Checklist:**
- [x] 12.1 `AudioVolumeSlider.tsx`: horizontal slider, gold thumb, full-width, haptic at extremes
- [x] 12.2 Volume icon changes: muted/low/medium/high icons
- [x] 12.3 `AudioSeekBar.tsx`: Spotify-style, track thickens on touch (2px => 4px)
- [x] 12.4 Gold fill, white thumb, chapter dot marks on track
- [x] 12.5 Time labels: left = current, right = total (tap to toggle to remaining)
- [x] 12.6 Position label shown above thumb while dragging (SoundCloud style)
- [x] 12.7 Seek bar thumb: 16px normal, 20px while dragging (spring animation)
- [x] 12.8 Track returns to thin (2px) on release

---

### PHASE 13 — Audio SubMenu and Queue Peek

**AudioSubMenu options:**
- Like / Unlike (heart toggle with gold animation + haptic)
- Add to Playlist (opens PlaylistSheet)
- Bookmark Current Position (opens BookmarkSheet)
- Sleep Timer (15/30/45/60min / custom picker)
- Audio Quality Info (codec, bitrate, sample rate, channels)
- Share (React Native Share API)
- Song Info (navigates to SongScreen)

**Checklist:**
- [x] 13.1 `AudioSubMenu.tsx`: BottomSheet, 7+ action rows, artwork + track name header
- [x] 13.2 Like/Unlike: haptic + gold animation
- [x] 13.3 Add to Playlist: opens PlaylistSheet (v3)
- [x] 13.4 Bookmark: opens BookmarkSheet to name + save position
- [x] 13.5 Sleep Timer: picker, sets auto-stop timer
- [x] 13.6 Audio Quality: codec/bitrate/sample rate/channels info card
- [x] 13.7 Share: React Native Share with track + artist
- [x] 13.8 Song Info: navigate to SongScreen
- [x] 13.9 `AudioQueuePeek.tsx`: "Up Next: [Track] - [Artist]" strip at bottom of player
- [x] 13.10 Tap AudioQueuePeek: opens QueueSheet (v3)

---

### PHASE 14 — Mini Audio Player (Persistent)

> **Prerequisite ⚠️ Navigation Refactoring (14.0):** The Mini Audio Player lives above the tab bar on Home and Library screens. All navigation screens except Home and Library must be moved from inside tab stacks to root-level peers so they render fullscreen without the bottom tab bar. This refactoring must be completed before Phase 14 implementation.
> 
> **Refactoring scope:**
> - Move `Search`, `NowPlaying` out of `HomeStack` → root `RootStack`
> - Move `FolderBrowser`, `PlaylistDetail`, `ArtistDetail`, `AlbumDetail` out of `LibraryStack` → root `RootStack`
> - `HomeStack` and `LibraryStack` each contain only their primary screen (Home / Library)
> - `TabNavigator` shows only `HomeTab` and `LibraryTab` — no nested sub-pages with tab bars
> - Update all navigation types (`types.ts`), screen props, and navigate calls

**Design:** 56px height bar above tab bar. Album art (40x40 rounded) + title + artist + prev/play/next. 2px gold progress line.

**Checklist:**
- [x] 14.0 Navigation Refactoring: Home + Library only in BottomTabs, rest as root peers
- [x] 14.1 `MiniAudioPlayer.tsx`: 56px, above tab bar
- [x] 14.2 Shows: artwork (40x40 rounded), title, artist, prev/play/next buttons
- [x] 14.3 `MiniProgressBar.tsx`: 2px gold progress line at top of mini player
- [x] 14.4 `useMiniPlayer.ts` hook: isVisible, currentTrack, handlers from Redux playerSlice
- [x] 14.5 Appears with slide-up animation when audio starts
- [x] 14.6 Disappears with slide-down when audio stops
- [x] 14.7 Tap body: navigate to AudioPlayerScreen
- [x] 14.8 All screens: paddingBottom accounts for mini player height
- [x] 14.9 Glass bg: `rgba(18,18,20,0.95)` with border.subtle top border
- [x] 14.10 NOT shown when user is already on AudioPlayerScreen

---

### PHASE 15 — Audio Waveform and Lyrics View

**Checklist:**
- [x] 15.1 `AudioWaveform.tsx`: 5-bar EQ animation. Props: isPlaying, color, size
- [x] 15.2 Playing: bars animate with staggered heights. Paused: freeze at mid-height.
- [x] 15.3 Waveform in Library audio listings (small, replaces play icon when playing)
- [x] 15.4 Waveform in MiniAudioPlayer artwork area when playing
- [x] 15.5 `AudioLyricsView.tsx` ENHANCED: full-screen takeover (swipe-up from player)
- [x] 15.6 Active line: bright white. Inactive lines: dim/secondary text color.
- [x] 15.7 Auto-scroll: spring animation to active line
- [x] 15.8 Tap inactive line: seek to that lyric timestamp
- [x] 15.9 Lyrics/Queue toggle tab at top of swipe-up panel
- [x] 15.10 "No Lyrics" empty state: music note icon with subtle animation

---

### Wave 3 Gate Check
**Required:** AudioPlayer is standalone component. Spotify-style volume/seek/submenu functional. MiniAudioPlayer above tab bar. Waveform in library audio listings. Lyrics auto-scroll in sync.


---

## WAVE 4: Dedicated Sub-Pages (Phases 16-20)

### PHASE 16 — ArtistScreen

**Goal:** Full artist page. Tap artist in Library or Search to navigate here.

**Files:** `src/screens/Artist/` — ArtistScreen.tsx, useArtistScreen.ts, components/(ArtistHeader, ArtistDiscography, ArtistTopTracks, ArtistBio)

**ArtistScreen Layout:**
`
[<- Back]  Artist Name  [...]
[Hero: gradient backdrop + artist avatar/initials]
[Name] [N Albums . M Tracks]
[> Play All]  [Shuffle]

--- Popular Tracks ---
1. Track Name        3:45
2. Track Name        4:12
[See All Tracks ->]

--- Discography ---
[Album] [Album] [Album]  <- horizontal scroll

--- About ---
Bio text... [Show more]
`

**Checklist:**
- [x] 16.1 ArtistScreen: ScrollView stacked sections, stagger entrance animation
- [x] 16.2 ArtistHeader: large gradient backdrop (from album art), artist initials avatar, name, stats
- [x] 16.3 ArtistDiscography: horizontal scroll album cards, tap => AlbumScreen
- [x] 16.4 ArtistTopTracks: top 5 by play count, "See All" => AllAudioScreen filtered by artist
- [x] 16.5 ArtistBio: expandable bio, placeholder if no data
- [x] 16.6 "Play All": loads all artist tracks into player queue
- [x] 16.7 "Shuffle": shuffled artist tracks into queue
- [x] 16.8 Track rows: number, title, album, duration, three-dot context menu
- [x] 16.9 Album cards: gradient overlay, name, year, track count
- [x] 16.10 ArtistHeader: parallax scroll effect

---

### PHASE 17 — AlbumScreen

**Goal:** Full album page. Tap album in Library, Artist, or Search.

**Files:** `src/screens/Album/` — AlbumScreen.tsx, useAlbumScreen.ts, components/(AlbumHero, AlbumTrackList, AlbumMetaBar, AlbumActionRow)

**AlbumScreen Layout:**
`
[<- Back]  Album Name  [...]
[Blurred full-width bg + crisp centered artwork]
[Album Name] [Artist Name (link)]
[Year . N Tracks . HH:MM:SS]

[> Play All]  [Shuffle]  [+ Add to Playlist]

1.  Track Name     3:45
2.  Track Name     4:12
3.  Track Name (waveform - playing)  2:58
...
`

**Checklist:**
- [x] 17.1 AlbumScreen: ScrollView, stagger entrance animation
- [x] 17.2 AlbumHero: blurred full-width bg + crisp centered album art
- [x] 17.3 AlbumMetaBar: year, track count, total duration, genre chips
- [x] 17.4 AlbumActionRow: Play All, Shuffle, Add to Playlist (three buttons)
- [x] 17.5 AlbumTrackList: numbered, duration, playing indicator, three-dot per track
- [x] 17.6 Tap track => AudioPlayer with full album as queue, starting from tapped track
- [x] 17.7 Currently playing: gold left accent + AudioWaveform icon
- [x] 17.8 Long-press track: Play Next, Add to Queue, Add to Playlist, Song Info
- [x] 17.9 Artist name tap => ArtistScreen
- [x] 17.10 AlbumHero: parallax scroll effect

---

### PHASE 18 — SongScreen

**Goal:** Individual track/song detail page with full metadata, bookmarks, lyrics preview, and actions.

**Files:** `src/screens/Song/` — SongScreen.tsx, useSongScreen.ts, components/(SongHero, SongMetadata, SongBookmarks, SongActions)

**SongScreen Layout:**
`
[<- Back]  Song Info  [...]
[Artwork + animated waveform bg]
[Track Title]
[Artist . Album . Year]

[> Play]  [+ Playlist]

--- Details ---
Duration  Format  Bitrate
Sample Rate  Channels  Genre
File Path (tap to copy)

--- Bookmarks (N) ---     [+]
[bookmark list for this file]

--- Lyrics ---
[first 3 lines preview]
[View Full Lyrics ->]
`

**Checklist:**
- [x] 18.1 SongScreen: scrollable detail page
- [x] 18.2 SongHero: artwork + animated waveform background overlay
- [x] 18.3 SongMetadata: duration, format, bitrate, sample rate, channels, genre, year, file size, path
- [x] 18.4 File path: tap to copy to clipboard with success toast
- [x] 18.5 SongBookmarks: bookmarks for this file, tap => open at position, "+" adds new
- [x] 18.6 SongActions: Play, Add to Playlist, Share, Add to Queue buttons (using AppButton)
- [x] 18.7 Lyrics preview: first 3 lines (if available), "View Full Lyrics" button
- [x] 18.8 useSongScreen: file metadata, bookmarks for URI, lyrics existence check

---

### PHASE 19 — BookmarksScreen

**Goal:** All bookmarks across all files, organized by file. Full CRUD management.

**Files:** `src/screens/Bookmarks/BookmarksScreen.tsx`, `useBookmarksScreen.ts`

**Layout:**
`
[<- Back]  Bookmarks  [Delete All]

[Search bookmarks...]

Movie.mkv                    3 marks
  [bookmark icon] 0:24:10  "Intro scene"
  [bookmark icon] 1:05:32  "Good part"
  [bookmark icon] 2:11:00  "Ending"

Song.mp3                     1 mark
  [bookmark icon] 0:02:45  "My bookmark"

[empty state when no bookmarks]
`

**Checklist:**
- [x] 19.1 BookmarksScreen: SectionList grouped by file, tap => open file at position
- [x] 19.2 Section header: file name, file type icon, bookmark count badge
- [x] 19.3 Bookmark row: gold bookmark icon (theme accent), formatted time, label, relative date
- [x] 19.4 Swipe bookmark left => delete with ConfirmDialog
- [x] 19.5 "Delete All" in top bar with ConfirmDialog
- [x] 19.6 Search/filter by label or file name
- [x] 19.7 useBookmarksScreen: selectAllBookmarks, grouped data, delete handlers
- [x] 19.8 Empty state: bookmark illustration, "Save your favorite moments" message
- [x] 19.9 Rows: staggered slide-in from right animation on enter

---

### PHASE 20 — GenreScreen and AllMedia Screens

**Goal:** Genre browsing + all "See All" destination screens for Home shelves.

**Files:**
- `src/screens/Genre/GenreScreen.tsx` — NEW
- `src/screens/AllVideos/AllVideosScreen.tsx` — NEW
- `src/screens/AllAudio/AllAudioScreen.tsx` — NEW
- `src/screens/AllPlaylists/AllPlaylistsScreen.tsx` — NEW

**Checklist:**
- [ ] 20.1 AllVideosScreen: paginated video library, search + sort + filter. Uses MediaListItem/MediaGridItem
- [ ] 20.2 AllAudioScreen: paginated audio library, search + sort + filter
- [ ] 20.3 AllPlaylistsScreen: all playlists, create/edit/delete actions
- [ ] 20.4 GenreScreen: all tracks matching genre tag, grid display
- [ ] 20.5 HomeMediaShelf "See All" navigates to correct screen
- [ ] 20.6 Library "Artists" "See All" => AllAudioScreen sorted by artist
- [ ] 20.7 Library "Albums" "See All" => full album list
- [ ] 20.8 Each screen: loading skeleton, empty state, search/filter controls
- [ ] 20.9 AllVideos/AllAudio: grid/list view toggle persisted per screen

---

### Wave 4 Gate Check
**Required:** ArtistScreen, AlbumScreen, SongScreen, BookmarksScreen all functional. Home "See All" navigates correctly. Library artist/album taps navigate to dedicated screens.

---

## WAVE 5: Home and Settings UX Flow (Phases 21-25)

### PHASE 21 — HomeScreen UX Improvements

**Checklist:**
- [ ] 21.1 All "See All" buttons navigate to correct dedicated screens
- [ ] 21.2 "Browse by Genre" section: horizontal genre chip scroll, tap => GenreScreen
- [ ] 21.3 "Continue Watching" hero: thumbnail, circular progress ring, gold "Resume" pill
- [ ] 21.4 HomeScreen entrance: stagger — hero fades first, shelves cascade 80ms apart
- [ ] 21.5 Home header: user avatar visible if signed in
- [ ] 21.6 Tap avatar => Settings (Account section)
- [ ] 21.7 Quick Access playlists: tap => PlaylistDetail or AllPlaylistsScreen
- [ ] 21.8 Recently Added: file type icon badge on each card
- [ ] 21.9 Empty "Continue Watching": subtle animation (no blank hidden header)
- [ ] 21.10 Bookmarks shortcut chip in HomeHeader area

---

### PHASE 22 — Settings Screen Redesign

**Goal:** Sectioned, functional settings. Account section at top.

**Settings Sections:** ACCOUNT, APPEARANCE, LIBRARY, PLAYBACK, SUBTITLES, ABOUT

**Checklist:**
- [ ] 22.1 AccountSection: avatar/name/email (signed in) OR "Sign In" button (guest)
- [ ] 22.2 Settings sections: clear headers + dividers between sections
- [ ] 22.3 Appearance: theme toggle (Dark/Light/System), accent color placeholder
- [ ] 22.4 Library: linked folders row with count badge, tap => FolderLinkingWizard
- [ ] 22.5 Playback: subtitle language picker, audio output picker, skip silence toggle
- [ ] 22.6 Subtitles: font size picker, text color, background opacity
- [ ] 22.7 About: version + build, Changelog, Licenses
- [ ] 22.8 All rows use SettingsRow component (consistent style)
- [ ] 22.9 Row types: toggle, picker, info, link (chevron), action (with icon)
- [ ] 22.10 Sections stagger-in on entrance animation

---

### PHASE 23 — Folder Linking Wizard (Redesigned)

**Goal:** Replace confusing folder linking with clear step-by-step wizard.

**Wizard Steps:**
1. "Where is your media?" — folder type cards (Music, Videos, Mixed)
2. "Pick the folder" — system picker, path displayed clearly
3. "Scanning..." — ActivityOrb + live file count
4. "You're all set!" — success summary + "Go to Library" CTA

**Checklist:**
- [ ] 23.1 FolderLinkingWizard: 4-step wizard component
- [ ] 23.2 Step 1: folder type selection (icon cards for Music/Videos/Mixed)
- [ ] 23.3 Step 2: system folder picker, selected path clearly displayed
- [ ] 23.4 Step 3: ActivityOrb animation + live file count as scanning
- [ ] 23.5 Step 4: success summary with file counts + "Go to Library" CTA
- [ ] 23.6 Progress dots/step bar at top of wizard
- [ ] 23.7 Back button => previous step (not navigate away)
- [ ] 23.8 LinkedFoldersScreen: clean folder cards, "Add Folder" button, delete swipe
- [ ] 23.9 Folder card: icon, name, file count, last scanned date
- [ ] 23.10 Re-scan per folder + global "Scan All" button

---

### PHASE 24 — Library Screen UX Improvements

**Checklist:**
- [ ] 24.1 Artist tab: tap card => ArtistScreen
- [ ] 24.2 Artist card: initials avatar, name, album count, track count
- [ ] 24.3 Album tab: tap card => AlbumScreen
- [ ] 24.4 Album card: art, name, artist, year, track count
- [ ] 24.5 Audio tab: tap track => AudioPlayer with album queue context
- [ ] 24.6 Audio row: AudioWaveform icon when currently playing track
- [ ] 24.7 Folders tab: folder cards — icon, name, path, file count, scan date
- [ ] 24.8 Folders tab "Link Folder" => FolderLinkingWizard
- [ ] 24.9 Segment entrance: stagger animation on first render
- [ ] 24.10 Pull-to-refresh: triggers re-scan for segment data

---

### PHASE 25 — AboutScreen and App Polish

**Checklist:**
- [ ] 25.1 AboutScreen: SIMBA lion logo, version, build number, tagline
- [ ] 25.2 Changelog: recent version changes list (hardcoded initially)
- [ ] 25.3 Licenses: open-source dependency licenses list
- [ ] 25.4 "Rate App" button: Play Store link (future release)
- [ ] 25.5 "Contact/Feedback": email compose with pre-filled subject
- [ ] 25.6 Logo: scale bounce animation on screen load
- [ ] 25.7 All screens: consistent back button via InternalHeader onBack prop
- [ ] 25.8 All modals/sheets: always have close button (top-right X)
- [ ] 25.9 All toasts: positioned above mini player when mini player visible
- [ ] 25.10 Every screen: at minimum a fadeIn entrance animation

---

### Wave 5 Gate Check
**Required:** Settings has Account section. Folder wizard is step-by-step. Library taps navigate to dedicated screens. Home "See All" works. About screen functional.

---

## WAVE 6: Polish and Working Beta (Phases 26-30)

### PHASE 26 — Comprehensive Animation Pass

**Checklist:**
- [ ] 26.1 LoginScreen: logo fade => tagline slide => button scale (stagger 200ms delays)
- [ ] 26.2 HomeScreen: hero first, shelves stagger 80ms apart top-to-bottom
- [ ] 26.3 LibraryScreen: tab change => content cross-fade (not instant switch)
- [ ] 26.4 ArtistScreen: header parallax, tracks stagger, discography grid stagger
- [ ] 26.5 AlbumScreen: hero art scale-in, track list stagger
- [ ] 26.6 BookmarksScreen: rows slide from right, staggered per item
- [ ] 26.7 AudioPlayer: track change => art cross-fade + scale pulse
- [ ] 26.8 VideoPlayer: controls smooth fade + translateY show/hide
- [ ] 26.9 MiniAudioPlayer: slide-up from below tab bar on audio start
- [ ] 26.10 All AppButton presses: spring scale (0.92 => 1.0) + haptic feedback

---

### PHASE 27 — Performance and Memory Audit

**Checklist:**
- [ ] 27.1 All FlatLists: getItemLayout, windowSize=5, maxToRenderPerBatch=10, removeClippedSubviews
- [ ] 27.2 MiniAudioPlayer position updates throttled to 1s (not 250ms like player)
- [ ] 27.3 All Animated.Values: in useRef, never recreated on re-render
- [ ] 27.4 AudioPlayer gradient: updated max once per track change
- [ ] 27.5 react-native-fast-image: all artwork with priority levels + immutable cache
- [ ] 27.6 useCallback/useMemo: all handlers and derived data memoized
- [ ] 27.7 No useEffect without cleanup
- [ ] 27.8 Redux selectors: all use createSelector for memoization
- [ ] 27.9 New screens: no memory leak after 10 navigation cycles (profile)
- [ ] 27.10 BookmarksScreen with 100+ bookmarks: smooth scroll verified

---

### PHASE 28 — Bug Fixes and Known Issues

**Checklist:**
- [ ] 28.1 BottomSheet backdrop blur: implement with @react-native-community/blur
- [ ] 28.2 v3 Phase 12.3 deferred: Deep linking — implement linking.ts all routes
- [ ] 28.3 v3 Phase 13.7 deferred: Gesture conflict — priority when sheets open
- [ ] 28.4 v3 Phase 16.7 deferred: Screen size compliance — enforce < 200 lines
- [ ] 28.5 v3 Phase 28.8 deferred: RTL layout audit and fix
- [ ] 28.6 TypeScript: tsc --noEmit exit 0
- [ ] 28.7 ESLint: eslint src/ exit 0 (no warnings)
- [ ] 28.8 AudioPlayer: smooth queue cycling repeat mode edge cases
- [ ] 28.9 Bookmark persistence: verify survive app kill + restart
- [ ] 28.10 Auth: guest => sign in => sign out => re-sign in full flow

---

### PHASE 29 — Working Beta Verification

**10 Demo Flows to Verify:**
- [ ] 29.1 Cold start: splash => Google login => Home (new user) OR Home directly (returning)
- [ ] 29.2 Folder linking: Settings => wizard => pick folder => scan => Library shows content
- [ ] 29.3 Video playback: Library => tap video => VideoPlayer => subtitle picker => audio track picker => chapter browser => back
- [ ] 29.4 Audio playback: Library => tap song => Spotify-quality AudioPlayer => volume => submenu => back => MiniAudioPlayer visible
- [ ] 29.5 Bookmarking: In video => tap bookmark => name it => save => BookmarksScreen => tap => resumes at position
- [ ] 29.6 Artist flow: Library => Artists => tap => ArtistScreen => album => AlbumScreen => track => AudioPlayer
- [ ] 29.7 Search: Home search => type query => grouped results => tap => correct screen
- [ ] 29.8 Playlist: Library => Playlists => create => add tracks => Play All => player starts
- [ ] 29.9 Sign out: Settings => Account => Sign Out => LoginScreen
- [ ] 29.10 Full back navigation: Video/Audio => back => Library => back => Home (no crashes)

---

### PHASE 30 — Final Production Audit

**Checklist:**
- [ ] 30.1 All 29 phases verified complete
- [ ] 30.2 No screen shows blank or unstyled state for any edge case
- [ ] 30.3 No hardcoded colors, raw Text component, or ActivityIndicator anywhere
- [ ] 30.4 All buttons use AppButton or IconButton from src/components/core/
- [ ] 30.5 All screens have useXxxScreen.ts hook file
- [ ] 30.6 VideoPlayer and AudioPlayer are components (not screens)
- [ ] 30.7 MiniAudioPlayer visible above tab bar when audio is playing
- [ ] 30.8 Google auth works on physical Android device
- [ ] 30.9 APK builds in release mode without errors
- [ ] 30.10 Manager demo: all 10 flows in Phase 29 pass on physical device

---

### Wave 6 Gate Check
**Required:** All animations implemented. No performance regressions. All bugs fixed. All 10 demo flows pass. APK builds cleanly.

---

## 5. ANIMATION AND MOTION SYSTEM v4

### 5.1 Animation Constants

`	ypescript
// src/utils/animations.ts
export const DURATION = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
};

export const STAGGER_DELAY = 60; // ms between staggered children

export const SPRING = {
  bouncy: { tension: 80, friction: 8 },
  smooth: { tension: 60, friction: 12 },
  sharp: { tension: 200, friction: 20 },
};
`

### 5.2 Custom Indicators Reference

| Indicator | Usage | Animation Pattern |
|---|---|---|
| `ActivityOrb` | Loading screens, data fetch | 3 pulsing concentric rings + center glow, 1.2s loop |
| `WaveformBars` | Audio playing state in lists | 5 bars staggered sine wave, 0.8s loop |
| `PulseRing` | Login screen bg, onboarding | 3 expanding + fading rings, 2s stagger |
| `SkeletonLoader` | Content loading placeholder | Opacity pulse 0.3 to 0.6, 1.2s loop |

### 5.3 Player Transition Animations

| Transition | Animation | Duration |
|---|---|---|
| Audio track change | Album art cross-fade + scale 0.95 to 1 | 400ms |
| Audio bg gradient | Color interpolation | 600ms |
| Video controls show | Fade in + translateY -10 to 0 | 200ms |
| Video controls hide | Fade out + translateY 0 to 10 | 150ms |
| MiniPlayer appear | SlideInUp spring | 300ms |
| MiniPlayer disappear | SlideOutDown | 200ms |
| BottomSheet open | TranslateY snap with spring | 350ms |
| BottomSheet close | TranslateY slide down | 250ms |

### 5.4 Screen Entrance Pattern (Every Screen Must Use)

`	ypescript
// Every screen uses useAnimatedEntrance:
const { entrance } = useAnimatedEntrance(sectionCount, STAGGER_DELAY);

// In JSX — each major section animated:
<Animated.View style={{ opacity: entrance[0], transform: [{ translateY: entrance[0] }] }}>
  <HeroSection />
</Animated.View>
<Animated.View style={{ opacity: entrance[1], transform: [{ translateY: entrance[1] }] }}>
  <FirstShelf />
</Animated.View>
`

---

## 6. VERIFICATION AND QUALITY ASSURANCE

### 6.1 Mandatory v4 Rules (Non-Negotiable)

1. **Hook Pattern Enforced** — Every screen MUST have `useXxxScreen.ts`. No exceptions.
2. **Component-Only UI** — All UI uses `src/components/`. No raw View/Text for reusable elements.
3. **Button Rule** — All button-like elements: `AppButton` or `IconButton`. No one-off styled touchables.
4. **Player as Component** — `VideoPlayer` and `AudioPlayer` are components. Screen files < 80 lines.
5. **Custom Indicators** — No `ActivityIndicator`. Always `ActivityOrb` or `WaveformBars`.
6. **Animation Standard** — Every screen: minimum `fadeIn` entrance. All buttons: scale spring on press.
7. **Bookmark Integration** — Both players have bookmark button. Bookmarks persist across app restarts.

### 6.2 Phase Completion Criteria

A phase is COMPLETE when:
- [ ] All checklist items verified functional on device
- [ ] TypeScript compiles: `tsc --noEmit` exit 0
- [ ] No new lint errors: `eslint src/` exit 0
- [ ] Screen file < 150 lines (hook pattern enforced)
- [ ] No `ActivityIndicator` in changed files
- [ ] No raw `<Text>` (use `AppText`)
- [ ] All buttons use `AppButton` or `IconButton`
- [ ] New screen has matching `useXxxScreen.ts` hook

### 6.3 v4 Quality Metrics

| Metric | v3 Baseline | v4 Target |
|---|---|---|
| Project Maturity | ~8% | ~10% (working beta) |
| Screens with hook pattern | 0 of 16 | 16 of 16 (all screens) |
| Screens with entrance animation | 2 of 16 | All screens |
| ActivityIndicator usages | ~8 | 0 (all replaced) |
| Players as components | 0 of 2 | 2 of 2 |
| Dedicated sub-pages | 0 | 8 new screens |
| Working auth | None | Google OAuth |
| Bookmark feature | None | Full CRUD + persistence |
| MiniAudioPlayer | None | Spotify-style |
| New total screens | 16 | ~26 |

### 6.4 Risk Areas

| Risk | Impact | Mitigation |
|---|---|---|
| Google Sign-In SDK setup | High | Test on physical device early (Phase 1) |
| AudioPlayer extraction breaks queue | Medium | Extract carefully, test queue/history continuity |
| MiniAudioPlayer state sync | Medium | Use Redux playerSlice, not component local state |
| Bookmark AsyncStorage perf | Low | Serialize efficiently, lazy-load per file |
| Dynamic gradient from album art | Medium | Use ColorThief or manual pixel sampling |

---

> **Document Version:** 4.0.0
> **Created:** 2026-07-29
> **Supersedes:** `UI_UX_Elevation_Specification_v3_DEPRECATED.md`
> **Companion:** `UI_UX_Elevation_Progress_Tracker_v4.md`
> **Status:** ACTIVE — Ready for implementation
> **Target:** ~8% to ~10% project maturity (working beta for manager demo)
