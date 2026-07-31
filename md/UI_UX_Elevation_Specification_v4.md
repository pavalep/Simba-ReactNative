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

## 4. DETAILED ELEVATION ROADMAP (60 Phases)

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
WAVE 7: Player Excellence Refinement ─ Phases 31-32  (Netflix-grade video, Spotify-grade audio)
WAVE 8: Streaming First-Class Content ─ Phases 33-37  (Stream model, collections, podcasts, radio/TV, audiobooks)
WAVE 9: Discovery and Metadata ──────── Phases 38-41  (TVMaze shows, MusicBrainz, unified search, genres/moods)
WAVE 10: Profile, Auth and Settings ─── Phases 42-46  (Profile page, auth hardening, settings truth, equalizer)
WAVE 11: Missing Standard Pages ─────── Phases 47-51  (History, queue, downloads, sleep/stats, help/legal)
WAVE 12: Component System Hardening ─── Phases 52-55  (Dialog unification, core inputs, offline, theme compliance)
WAVE 13: Linking, Flows and Release ─── Phases 56-60  (Share/deep links, nav audit, cross-source flows, beta gate)
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
- [x] 20.1 AllVideosScreen: paginated video library, search + sort + filter. Uses MediaListItem/MediaGridItem
- [x] 20.2 AllAudioScreen: paginated audio library, search + sort + filter
- [x] 20.3 AllPlaylistsScreen: all playlists, create/edit/delete actions
- [x] 20.4 GenreScreen: all tracks matching genre tag, grid display
- [x] 20.5 HomeMediaShelf "See All" navigates to correct screen
- [x] 20.6 Library "Artists" "See All" => AllAudioScreen sorted by artist
- [x] 20.7 Library "Albums" "See All" => full album list
- [x] 20.8 Each screen: loading skeleton, empty state, search/filter controls
- [x] 20.9 AllVideos/AllAudio: grid/list view toggle persisted per screen

---

### Wave 4 Gate Check
**Required:** ArtistScreen, AlbumScreen, SongScreen, BookmarksScreen all functional. Home "See All" navigates correctly. Library artist/album taps navigate to dedicated screens.

---

## WAVE 5: Home and Settings UX Flow (Phases 21-25)

### PHASE 21 — HomeScreen UX Improvements

**Checklist:**
- [x] 21.1 All "See All" buttons navigate to correct dedicated screens
- [x] 21.2 "Browse by Genre" section: horizontal genre chip scroll, tap => GenreScreen
- [x] 21.3 "Continue Watching" hero: thumbnail, circular progress ring, gold "Resume" pill
- [x] 21.4 HomeScreen entrance: stagger — hero fades first, shelves cascade 80ms apart
- [x] 21.5 Home header: user avatar visible if signed in
- [x] 21.6 Tap avatar => Settings (Account section)
- [x] 21.7 Quick Access playlists: tap => PlaylistDetail or AllPlaylistsScreen
- [x] 21.8 Recently Added: file type icon badge on each card
- [x] 21.9 Empty "Continue Watching": subtle animation (no blank hidden header)
- [x] 21.10 Bookmarks shortcut chip in HomeHeader area

---

### PHASE 22 — Settings Screen Redesign

**Goal:** Sectioned, functional settings. Account section at top.

**Settings Sections:** ACCOUNT, APPEARANCE, LIBRARY, PLAYBACK, SUBTITLES, ABOUT

**Checklist:**
- [x] 22.1 AccountSection: avatar/name/email (signed in) OR "Sign In" button (guest)
- [x] 22.2 Settings sections: clear headers + dividers between sections
- [x] 22.3 Appearance: theme toggle (Dark/Light/System), accent color placeholder
- [x] 22.4 Library: linked folders row with count badge, tap => FolderLinkingWizard
- [x] 22.5 Playback: subtitle language picker, audio output picker, skip silence toggle
- [x] 22.6 Subtitles: font size picker, text color, background opacity
- [x] 22.7 About: version + build, Changelog, Licenses
- [x] 22.8 All rows use SettingsRow component (consistent style)
- [x] 22.9 Row types: toggle, picker, info, link (chevron), action (with icon)
- [x] 22.10 Sections stagger-in on entrance animation

---

### PHASE 23 — Folder Linking Wizard (Redesigned)

**Goal:** Replace confusing folder linking with clear step-by-step wizard.

**Wizard Steps:**
1. "Where is your media?" — folder type cards (Music, Videos, Mixed)
2. "Pick the folder" — system picker, path displayed clearly
3. "Scanning..." — ActivityOrb + live file count
4. "You're all set!" — success summary + "Go to Library" CTA

**Checklist:**
- [x] 23.1 FolderLinkingWizard: 4-step wizard component
- [x] 23.2 Step 1: folder type selection (icon cards for Music/Videos/Mixed)
- [x] 23.3 Step 2: system folder picker, selected path clearly displayed
- [x] 23.4 Step 3: ActivityOrb animation + live file count as scanning
- [x] 23.5 Step 4: success summary with file counts + "Go to Library" CTA
- [x] 23.6 Progress dots/step bar at top of wizard
- [x] 23.7 Back button => previous step (not navigate away)
- [x] 23.8 LinkedFoldersScreen: clean folder cards, "Add Folder" button, delete swipe
- [x] 23.9 Folder card: icon, name, file count, last scanned date
- [x] 23.10 Re-scan per folder + global "Scan All" button

---

### PHASE 24 — Library Screen UX Improvements

**Checklist:**
- [x] 24.1 Artist tab: tap card => ArtistScreen (ALREADY DONE — handleArtistPress in hook)
- [x] 24.2 Artist card: initials avatar, name, album count, track count (initials in ArtistGrid.tsx)
- [x] 24.3 Album tab: tap card => AlbumScreen (ALREADY DONE — handleAlbumPress in hook)
- [x] 24.4 Album card: art, name, artist, year, track count (ALREADY DONE — AlbumGrid has all fields)
- [ ] 24.5 Audio tab: tap track => AudioPlayer with album queue context
- [x] 24.6 Audio row: AudioWaveform icon when currently playing track (WaveformBars banner in LibraryAudioSegment)
- [x] 24.7 Folders tab: folder cards — icon, name, path, file count, scan date (LibraryFoldersSegment.tsx)
- [x] 24.8 Folders tab "Link Folder" => FolderLinkingWizard (onLinkFolder → handleLinkFolder)
- [x] 24.9 Segment entrance: stagger animation on first render (Animated.View fade-in in LibraryScreen)
- [x] 24.10 Pull-to-refresh: triggers re-scan for segment data (RefreshControl in LibraryScreen ScrollView)

---

### PHASE 25 — AboutScreen and App Polish

**Checklist:**
- [x] 25.1 AboutScreen: SIMBA lion logo, version, build number, tagline
- [x] 25.2 Changelog: recent version changes list (hardcoded initially)
- [x] 25.3 Licenses: open-source dependency licenses list
- [x] 25.4 "Rate App" button: Play Store link (future release)
- [x] 25.5 "Contact/Feedback": email compose with pre-filled subject
- [x] 25.6 Logo: scale bounce animation on screen load
- [x] 25.7 All screens: consistent back button via InternalHeader onBack prop
- [x] 25.8 All modals/sheets: always have close button (top-right X)
- [x] 25.9 All toasts: positioned above mini player when mini player visible
- [x] 25.10 Every screen: at minimum a fadeIn entrance animation

---

### Wave 5 Gate Check
**Required:** Settings has Account section. Folder wizard is step-by-step. Library taps navigate to dedicated screens. Home "See All" works. About screen functional.

---

## WAVE 6: Polish and Working Beta (Phases 26-30)

### PHASE 26 — Comprehensive Animation Pass

**Checklist:**
- [x] 26.1 LoginScreen: logo fade => tagline slide => button scale (stagger 200ms delays)
- [x] 26.2 HomeScreen: hero first, shelves stagger 80ms apart top-to-bottom
- [x] 26.3 LibraryScreen: tab change => content cross-fade (not instant switch)
- [x] 26.4 ArtistScreen: header parallax, tracks stagger, discography grid stagger
- [x] 26.5 AlbumScreen: hero art scale-in, track list stagger
- [x] 26.6 BookmarksScreen: rows slide from right, staggered per item
- [x] 26.7 AudioPlayer: track change => art cross-fade + scale pulse
- [x] 26.8 VideoPlayer: controls smooth fade + translateY show/hide
- [x] 26.9 MiniAudioPlayer: slide-up from below tab bar on audio start
- [x] 26.10 All AppButton presses: spring scale (0.92 => 1.0) + haptic feedback

---

### PHASE 27 — Performance and Memory Audit

**Checklist:**
- [x] 27.1 All FlatLists: getItemLayout, windowSize=5, maxToRenderPerBatch=10, removeClippedSubviews
- [x] 27.2 MiniAudioPlayer position updates throttled to 1s (not 250ms like player)
- [x] 27.3 All Animated.Values: in useRef, never recreated on re-render
- [x] 27.4 AudioPlayer gradient: updated max once per track change
- [x] 27.5 react-native-fast-image: all artwork with priority levels + immutable cache
- [x] 27.6 useCallback/useMemo: all handlers and derived data memoized
- [x] 27.7 No useEffect without cleanup
- [x] 27.8 Redux selectors: all use createSelector for memoization
- [ ] 27.9 New screens: no memory leak after 10 navigation cycles (profile)
- [ ] 27.10 BookmarksScreen with 100+ bookmarks: smooth scroll verified

---

### PHASE 28 — Bug Fixes and Known Issues

**Checklist:**
- [x] 28.1 BottomSheet backdrop blur: implement with @react-native-community/blur
- [x] 28.2 v3 Phase 12.3 deferred: Deep linking — implement linking.ts all routes
- [x] 28.3 v3 Phase 13.7 deferred: Gesture conflict — priority when sheets open
- [x] 28.4 v3 Phase 16.7 deferred: Screen size compliance — enforce < 200 lines
- [ ] 28.5 v3 Phase 28.8 deferred: RTL layout audit and fix (low priority, deferred)
- [x] 28.6 TypeScript: tsc --noEmit exit 0
- [x] 28.7 ESLint: eslint src/ exit 0
- [x] 28.8 AudioPlayer: smooth queue cycling repeat mode edge cases
- [x] 28.9 Bookmark persistence: verify survive app kill + restart
- [x] 28.10 Auth: sign in => sign out => re-sign in full flow

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

## WAVE 7: Player Excellence Refinement (Phases 31-32)

> **Quality bar:** The VideoPlayer must match the **feel, mood, and effortlessness of Netflix**; the AudioPlayer must match the **polish and delight of Spotify**. Every control must be intuitive and easy to understand for ALL users — simple, discoverable, no hidden-only interactions. Based on the 2026-07-31 player UX audit.

### PHASE 31 — Video Player Netflix-Grade Refinement

**Checklist:**
- [ ] 31.1 Lock controls: padlock toggle in SecondaryToolbar — locked state ignores all touches/gestures except a persistent unlock chip (prevents accidental touches during viewing)
- [ ] 31.2 Netflix-style resume: when a saved position exists, show "Resume from MM:SS / Start Over" choice overlay on load (instead of silent auto-seek)
- [ ] 31.3 Auto-advance: end-of-video "Next in 5s" countdown card with thumbnail + Cancel when a next queue/playlist item exists
- [ ] 31.4 Scrub preview polish: timestamp + chapter-title bubble follows finger while scrubbing; ActivityOrb buffering indicator on playback stalls
- [ ] 31.5 Cinematic mood: fade-from-black on file load, dimmed ambient backdrop behind sheets, control fade transitions per §5.3 timings (200ms in / 150ms out)
- [ ] 31.6 Friendly error state: in-player error card (message + Retry + Back) replaces raw Alert.alert; error boundary wraps player surface
- [ ] 31.7 Accessibility: accessibilityState on all toggles (mute, loop, rotate, subtitles); accessibilityHint for double-tap seek and swipe gestures
- [ ] 31.8 Performance: memoize derived values in useVideoPlayerScreen (1500+ lines); throttle position-driven re-renders; verify 60fps control show/hide on device
- [ ] 31.9 Mixed-queue handoff (video side): when the next queue item is audio, replace-navigate to AudioPlayer seamlessly (no stack growth, playback continues)
- [ ] 31.10 Gate: every control reachable in ≤ 2 taps; tsc --noEmit + eslint src/ exit 0; on-device smoothness pass

---

### PHASE 32 — Audio Player Spotify-Grade Refinement

**Checklist:**
- [ ] 32.1 MiniAudioPlayer touch targets: increase all buttons from 36×36 to ≥ 44×44 (WCAG 2.1 AA) with proportional layout adjustment
- [ ] 32.2 Functional sleep timer: wire AudioSubMenu selection (15/30/45/60 min) to a real countdown that pauses playback at zero; show remaining-time badge; cancel option
- [ ] 32.3 Audio playback speed control: 0.5×–2.0× selector in AudioSubMenu wired to MpvPlayer.setSpeed (persists per session)
- [ ] 32.4 MiniAudioPlayer gestures: swipe-down to dismiss (stops playback + clears state); swipe left/right for next/previous track
- [ ] 32.5 Accessibility: accessibilityState for shuffle/repeat/like toggles; screen-reader announcement on track change
- [ ] 32.6 Spotify mood: dynamic gradient extracted from album art on every track change (600ms interpolation per §5.3), marquee scroll for overflowing titles, art cross-fade
- [ ] 32.7 Instant-feel transitions: preload next track metadata + art; transport controls respond < 100ms perceived; no blank frames between tracks
- [ ] 32.8 Lyrics performance: per-line memoization in LyricsQueuePanel — only the active line re-renders on position tick
- [ ] 32.9 Mixed-queue handoff (audio side): when the next queue item is video, replace-navigate to VideoPlayer seamlessly
- [ ] 32.10 Gate: Spotify-parity checklist verified on device (mini player, speed, sleep timer, gradient, gestures); tsc --noEmit + eslint src/ exit 0

---

### Wave 7 Gate Check
**Required:** VideoPlayer feels Netflix-grade (lock, resume prompt, auto-advance, cinematic transitions). AudioPlayer feels Spotify-grade (functional sleep timer, speed control, 44dp mini player, dynamic gradient). Mixed queues hand off between players in both directions. All controls intuitive and discoverable for every user. Gates clean.

---

## WAVE 8: Streaming as First-Class Content (Phases 33-37)

> **Mission guard:** Streaming items become full citizens of playlists, recents, bookmarks, and position tracking — identical UX to local files. **No dummy data anywhere** — every screen shows real API/library data or a designed empty state. Based on the 2026-07-31 full-app gap audit: only 2/9 API services wired (Jamendo, Audius; PodcastIndex partial), no add-to-playlist/bookmark for streams, podcast episodes cannot play.

### PHASE 33 — Unified Streaming Media Model

**Checklist:**
- [ ] 33.1 `isRemoteUri()` util + `source` field ('local'|'jamendo'|'audius'|'podcast'|'radio'|'iptv'|'librivox'|'archive'|'tvmaze') on PlaylistItem, SessionEntry, Bookmark, and queue entries
- [ ] 33.2 Player intake: skip `validateMediaFile()` for remote URIs — both players accept http(s) fileUri via a stream-aware load path
- [ ] 33.3 Stream error handling: network timeout / CDN failure → friendly in-player error card with Retry (exponential backoff) — never raw Alert
- [ ] 33.4 Stream buffering UX: BufferingBar + ActivityOrb on stalls in both players (wire mpv cache/buffering events)
- [ ] 33.5 `savePlaybackPosition` verified and fixed for remote URLs — stream positions persist across app restarts
- [ ] 33.6 Recents: streaming plays enter session recents with correct mediaType, source, and remote artwork
- [ ] 33.7 Remote artwork cache service: disk LRU cache for API thumbnails/album art (no repeat fetches, offline-safe)
- [ ] 33.8 Gate: play a Jamendo/Audius track, kill app, relaunch → appears in recents with art and resumes at position; tsc + eslint exit 0

---

### PHASE 34 — Streaming in User Collections

**Checklist:**
- [ ] 34.1 Add-to-playlist action on MusicDetail and track long-press in MusicScreen (streams saved with source + cached art)
- [ ] 34.2 Bookmarking streaming items verified end-to-end in AudioPlayer (fileUri = URL; position restore works)
- [ ] 34.3 PlaylistDetail renders remote items correctly: cached art, artist, duration; play routes to the correct player
- [ ] 34.4 Playlist kind auto-upgrade (MIXED) works for stream+local mixes; queue built from a mixed playlist plays both
- [ ] 34.5 Offline behavior: streaming items in collections show an offline badge and skip gracefully when no network
- [ ] 34.6 BookmarksScreen and recents shelves render streaming entries identically to local (art, resume, long-press menu)
- [ ] 34.7 Long-press context menu parity: identical actions (play, queue, playlist, bookmark, share) for local and stream items
- [ ] 34.8 Gate: playlist with 2 local + 2 streaming items plays through fully (incl. handoff); collections survive restart

---

### PHASE 35 — Podcast Playback Completion

**Checklist:**
- [ ] 35.1 PodcastDetail episode list from PodcastIndex feed — real episodes with title, date, duration, art
- [ ] 35.2 Episode playback: tap → AudioPlayer with enclosureUrl; episode metadata shown in player (audit: no play mechanism exists today)
- [ ] 35.3 Per-episode resume position (savePlaybackPosition keyed by enclosure URL)
- [ ] 35.4 Played/unplayed state + progress indicator on episode rows
- [ ] 35.5 Follow/favorite podcasts (persisted) + Followed shelf on Home
- [ ] 35.6 Episode actions: add to playlist, bookmark, queue next
- [ ] 35.7 Podcast search + category browse polish: skeletons, empty, and error states
- [ ] 35.8 Gate: follow a podcast, play an episode, kill app, resume from the episode list at the saved position

---

### PHASE 36 — Radio and Live TV (wire RadioBrowser + IPTV-org)

**Checklist:**
- [ ] 36.1 RadioScreen: top stations, by-country, by-genre browse + search (RadioBrowser service — currently dead code)
- [ ] 36.2 Radio playback: AudioPlayer live mode — seek bar hidden, LIVE badge, station art/name
- [ ] 36.3 Radio favorites persisted; favorites shelf; stations addable to playlists and recents
- [ ] 36.4 LiveTVScreen: IPTV-org channels by category/country + search (service — currently dead code)
- [ ] 36.5 Live TV playback: VideoPlayer live mode (no seek/scrub, LIVE badge, channel up/down switcher)
- [ ] 36.6 Stream health: unreachable station/channel → friendly error + skip-to-next; no fake/placeholder channels
- [ ] 36.7 Home shelves, routes, and deep links for Radio and Live TV; entry points from Home and Search
- [ ] 36.8 Gate: radio station and IPTV channel play end-to-end; favorites survive restart; gates clean

---

### PHASE 37 — Audiobooks and Internet Archive (wire LibriVox + InternetArchive)

**Checklist:**
- [ ] 37.1 AudiobooksScreen: LibriVox search/browse by title, author, genre (service — currently dead code)
- [ ] 37.2 Audiobook detail: chapter list with durations; play chapter → AudioPlayer
- [ ] 37.3 Cross-chapter resume: continue exactly where left off; auto-advance to the next chapter
- [ ] 37.4 ArchiveScreen: Internet Archive audio + video collections browse/search (service — currently dead code)
- [ ] 37.5 Archive item detail + playback routed to the correct player by mediaType
- [ ] 37.6 Audiobook/Archive items in collections: playlists, per-chapter bookmarks, recents
- [ ] 37.7 Home discovery shelves for Audiobooks and Archive; routes + deep links registered
- [ ] 37.8 Gate: finish a chapter → auto-advance; relaunch → resume mid-chapter; gates clean

---

### Wave 8 Gate Check
**Required:** 7/9 API services have live consumer screens (Jamendo, Audius, PodcastIndex, RadioBrowser, IPTV-org, LibriVox, InternetArchive). Any streaming item can be played, bookmarked, playlisted, and appears in recents with persisted position. Zero dummy data.

---

## WAVE 9: Discovery and Metadata Completion (Phases 38-41)

> Wire the last 2 dead API services (TVMaze, MusicBrainz), resurrect the dead `searchAggregator`, and make every content source discoverable through search and genre browse.

### PHASE 38 — TV Shows Discovery (wire TVMaze)

**Checklist:**
- [ ] 38.1 ShowsScreen: search + popular browse via TVMaze (service — currently dead code)
- [ ] 38.2 ShowDetail: poster, summary, seasons → episode list with air dates
- [ ] 38.3 Today's schedule shelf (TVMaze schedule endpoint)
- [ ] 38.4 Episode metadata enrichment: match local video files to TVMaze episodes by name (enrich MovieDetail/video tiles)
- [ ] 38.5 Image fallbacks: themed placeholder when TVMaze art is missing — no broken images
- [ ] 38.6 Shows in collections: bookmark shows; episode references addable where a playable source exists
- [ ] 38.7 Routes + deep links + Home shelf for Shows
- [ ] 38.8 Gate: search show → detail → episodes browse; local-file enrichment verified; gates clean

---

### PHASE 39 — Artist and Album Enrichment (wire MusicBrainz)

**Checklist:**
- [ ] 39.1 ArtistDetail enrichment: MusicBrainz discography (albums, years) merged with local + streaming artist content
- [ ] 39.2 Cover Art Archive integration using the Phase 33 art cache
- [ ] 39.3 AlbumDetail enrichment: release metadata + track listings matched to local files
- [ ] 39.4 Artist page unified sections: Local | Streaming (Jamendo/Audius) | Discography
- [ ] 39.5 "More from this artist" streaming section on Song and Album pages
- [ ] 39.6 Graceful fallback when MusicBrainz has no match — local-only view, no empty holes
- [ ] 39.7 Rate-limit compliance (MusicBrainz 1 req/s) via request queue in apiClient
- [ ] 39.8 Gate: artist with local files shows enriched discography + streaming rows; gates clean

---

### PHASE 40 — Unified Search Completion

**Checklist:**
- [ ] 40.1 Wire `searchAggregator` (currently dead code) into SearchScreen: local library + all wired APIs
- [ ] 40.2 Source filter chips: All / Local / Music / Podcasts / Radio / TV / Audiobooks / Archive
- [ ] 40.3 Debounce + in-flight cancellation; per-source skeletons; partial results render as they arrive
- [ ] 40.4 Search history persisted (recent queries, tap to re-run, clear)
- [ ] 40.5 Every result row routes to the correct detail screen or player for its type
- [ ] 40.6 Per-source empty and error states — one failed API never blanks the whole page
- [ ] 40.7 Trending/suggestions row when the query is empty — from real API data, never hardcoded
- [ ] 40.8 Gate: one query returns mixed local + streaming results, each tappable to a working destination

---

### PHASE 41 — Genre and Mood Browse

**Checklist:**
- [ ] 41.1 GenreScreen full browse: genres from local library + streaming genre catalogs (Jamendo/Audius/Radio)
- [ ] 41.2 Genre detail: local + streaming rows per genre with working See All
- [ ] 41.3 Mood collections (Focus, Chill, Energy, Sleep) built from real genre/tag queries — no hardcoded track lists
- [ ] 41.4 Genre chips on MusicScreen and RadioScreen link into genre detail
- [ ] 41.5 See All coverage audit: every Home/Music/Radio/Podcast shelf has a working See All destination
- [ ] 41.6 Consistent shelf card design across all discovery surfaces (MediaTile variants)
- [ ] 41.7 Deep links for genre/mood pages
- [ ] 41.8 Gate: Home → genre → detail → play stream → appears in recents; gates clean

---

### Wave 9 Gate Check
**Required:** 9/9 API services wired with live consumers — zero dead code in services/api. Unified search reaches every source. Genre/mood browse spans local + streaming.

---

## WAVE 10: Profile, Auth, and Settings Truth (Phases 42-46)

> Every settings row must do something real. Based on the 2026-07-31 audit: 4 dead settings rows (empty onPress), all 9 AudioSettings controls unpersisted local state, no token refresh/session expiry handling, Registration screen is dead weight (app is Google-login-only, no guest mode), no profile page.

### PHASE 42 — Basic Profile Page

**Checklist:**
- [ ] 42.1 ProfileScreen route + entry points (Settings AccountSection tap, Home header avatar)
- [ ] 42.2 Profile header: Google avatar with initials fallback (replace the "?" placeholder), name, email
- [ ] 42.3 Real user stats from store/session data: total watch/listen time, items played, bookmark and playlist counts — no fabricated numbers
- [ ] 42.4 Recently played strip + shortcuts to History, Bookmarks, Playlists
- [ ] 42.5 Appearance quick prefs on profile: theme mode toggle
- [ ] 42.6 Sign out via ConfirmDialog (not raw alert)
- [ ] 42.7 Account data section: clear local data (recents/bookmarks/playlists) behind a destructive confirm
- [ ] 42.8 Gate: profile reachable in ≤ 2 taps; stats match actual store contents; gates clean

---

### PHASE 43 — Auth Hardening (Google-Only Mission)

**Checklist:**
- [ ] 43.1 Silent session restore: `GoogleSignin.signInSilently()` on cold start; route to Login only when it fails
- [ ] 43.2 Session expiry handling: detect invalid/expired token on app foreground; re-auth prompt without data loss
- [ ] 43.3 Sign-in error states: distinct messaging for offline / cancelled / Play-Services-missing, each with Retry
- [ ] 43.4 Remove Registration screen, route, and the Login link to it entirely — dead weight in a Google-only app
- [ ] 43.5 Revoke access flow: sign out + revokeAccess + optional local data wipe (destructive ConfirmDialog)
- [ ] 43.6 Offline grace: a previously-authenticated user can use the local library offline; API features show offline state
- [ ] 43.7 Auth states modeled explicitly in authSlice (authenticated / expired / offline / signed-out) with unit tests
- [ ] 43.8 Gate: airplane-mode launch plays local media; token-expiry path verified; gates clean

---

### PHASE 44 — Settings Dead-UI Elimination

**Checklist:**
- [ ] 44.1 Subtitle Language row: real picker dialog wired to settingsSlice + applied via mpv `slang` (currently `onPress={() => {}}`)
- [ ] 44.2 Subtitle Text Color row: color picker wired + applied to subtitle rendering (currently dead)
- [ ] 44.3 Subtitle Background Opacity: slider dialog wired + applied (currently dead)
- [ ] 44.4 Subtitle Font Size: implement the missing dialog (handler exists but opens nothing) + apply via mpv `sub-font-size`
- [ ] 44.5 Accent Color: functional accent selection applied via theme, or converted to an explicit static branding row — no fake affordance
- [ ] 44.6 All subtitle settings persisted and re-applied on player mount
- [ ] 44.7 Every settings row shows a current-value subtitle reflecting real state
- [ ] 44.8 Gate: zero empty onPress handlers in Settings; every row does something visible; gates clean

---

### PHASE 45 — Audio Settings Realization + Equalizer

**Checklist:**
- [ ] 45.1 Wire all AudioSettingsScreen controls to settingsSlice (audit: 9 controls in local state, lost on restart)
- [ ] 45.2 Apply wired values to mpv: volume normalization, dialogue boost, ReplayGain, gapless, audio delay
- [ ] 45.3 EqualizerScreen: band sliders + presets wired to the existing native equalizer support
- [ ] 45.4 EQ preset selection replaces the Alert.alert placeholder; custom presets persist
- [ ] 45.5 Audio device / sample-rate rows show real values from the native layer — or are removed; no fake options
- [ ] 45.6 Replace all 5 Alert.alert placeholders in AudioSettings with real dialogs/screens
- [ ] 45.7 Settings apply live during playback (change while playing → hear the difference)
- [ ] 45.8 Gate: toggle each audio setting, restart app → all persisted; EQ audibly works; gates clean

---

### PHASE 46 — Preferences, Storage, and Library Settings

**Checklist:**
- [ ] 46.1 Persist Larger Controls + High-Contrast Subtitles to settingsSlice and apply app-wide (currently unpersisted local state)
- [ ] 46.2 Theme selection dialog component replaces Alert.alert in PreferencesScreen
- [ ] 46.3 App language row wired to the i18n locale switch (persisted)
- [ ] 46.4 Storage management: cache size display (art cache, thumbnails) + Clear Cache action
- [ ] 46.5 Library scan controls: Rescan Now, scan-on-launch toggle, progress surfaced via ScanProgressBanner
- [ ] 46.6 Notification preferences row (playback notification behavior)
- [ ] 46.7 Privacy section linking to the Privacy/Terms screens (built in Phase 51)
- [ ] 46.8 Gate: preferences survive restart; cache clear frees space and the UI reflects it; gates clean

---

### Wave 10 Gate Check
**Required:** Zero dead settings rows anywhere. Auth is solid: silent restore, expiry handled, Registration removed (Google-only, no guest). Profile page live with real stats.

---

## WAVE 11: Missing Standard Pages (Phases 47-51)

> Audit 2026-07-31: History, Downloads, Notifications, full Queue page, Equalizer, Sleep Timer page, Stats, Help/FAQ, and Privacy/Terms are all missing. Build them with real data and designed empty states.

### PHASE 47 — History Page

**Checklist:**
- [ ] 47.1 HistoryScreen: full playback history (video/audio/stream) from session data, newest first
- [ ] 47.2 Tap resumes at saved position in the correct player; progress bar on each row
- [ ] 47.3 Filters: All / Video / Audio / Streaming; search within history
- [ ] 47.4 Per-item remove + Clear History (destructive confirm)
- [ ] 47.5 Raise recents retention (20 → 200) with a virtualized list — no scroll jank
- [ ] 47.6 Empty state, route, deep link; entry points from Home "Recently Played" See All and Library
- [ ] 47.7 accessibilityLabels + ≥ 44dp row targets
- [ ] 47.8 Gate: play 3 items → all in history with correct positions; clear works; gates clean

---

### PHASE 48 — Full Queue Page

**Checklist:**
- [ ] 48.1 QueueScreen: full-screen now-playing queue (route + deep link) — today only LyricsQueuePanel exists inside AudioPlayer
- [ ] 48.2 Drag-to-reorder with haptic feedback; swipe-to-remove
- [ ] 48.3 Now-playing row highlighted with WaveformBars; tapping any row jumps playback
- [ ] 48.4 "Up Next" vs "Previously Played" sections
- [ ] 48.5 Save Queue as Playlist action
- [ ] 48.6 Entry points: queue buttons in both players + MiniAudioPlayer long-press
- [ ] 48.7 Mixed queue rendering with media badges (video / audio / stream)
- [ ] 48.8 Gate: reorder during playback without glitches; jump works across media types; gates clean

---

### PHASE 49 — Downloads and Offline

**Checklist:**
- [ ] 49.1 Download service: fetch + store streaming media (podcasts, audiobooks, archive, licensed music) with progress events
- [ ] 49.2 DownloadButton core component (idle / progress / done states) on episode, track, and detail rows
- [ ] 49.3 DownloadsScreen: list with size, progress, pause/resume/delete; storage usage bar
- [ ] 49.4 Offline playback: downloaded copy used automatically when offline (fileUri remap)
- [ ] 49.5 Downloaded badge shown in collections, recents, and search results
- [ ] 49.6 Auto-delete policy setting (keep last N episodes)
- [ ] 49.7 Route + deep link + Library entry point + empty state
- [ ] 49.8 Gate: download an episode, enable airplane mode, play it from Downloads; gates clean

---

### PHASE 50 — Sleep Timer Everywhere + Stats

**Checklist:**
- [ ] 50.1 Promote the Phase 32 sleep timer into a global playback service usable from both players + custom minutes input
- [ ] 50.2 End-of-track / end-of-chapter timer option (not just fixed minutes)
- [ ] 50.3 Persistent countdown badge on both players and MiniAudioPlayer
- [ ] 50.4 StatsScreen: listening/watching time by day/week, top artists/items, source breakdown — computed from real session history only
- [ ] 50.5 Streaks and totals cards; designed empty state for new users
- [ ] 50.6 Stats entry point from Profile
- [ ] 50.7 Volume fade-out over the final 10s of the sleep timer
- [ ] 50.8 Gate: timer pauses playback from both players; stats match recorded history; gates clean

---

### PHASE 51 — Help, Legal, and Notifications

**Checklist:**
- [ ] 51.1 HelpScreen: searchable FAQ sections (playback, streaming, collections, gestures)
- [ ] 51.2 PrivacyPolicyScreen + TermsScreen (scrollable; linked from Settings, About, and Login)
- [ ] 51.3 Media-style playback notification with transport controls verified; settings toggle for it
- [ ] 51.4 Notification permission flow (Android 13+) requested contextually, never on launch
- [ ] 51.5 About screen links (website, licenses, changelog) all functional — replace the Alert placeholder
- [ ] 51.6 Contact/feedback action via share sheet or mailto
- [ ] 51.7 Routes + deep links for all new pages
- [ ] 51.8 Gate: every help/legal entry reachable; notification transport controls work from the lock screen; gates clean

---

### Wave 11 Gate Check
**Required:** No missing standard pages. History, Queue, Downloads, Sleep/Stats, Help, and Legal all live with real data, empty states, routes, and deep links.

---

## WAVE 12: Component System Hardening (Phases 52-55)

> Audit 2026-07-31: 12+ raw Alert.alert calls, no shared AppTextInput/SearchBar in core, NoNetworkBanner only on Home, hardcoded colors in 8 component files, 5 empty stub dirs. Enforce the design system everywhere.

### PHASE 52 — Dialog Unification (Kill Alert.alert)

**Checklist:**
- [ ] 52.1 Replace Alert.alert in PlaylistDetailScreen (4×) with ConfirmDialog / PromptDialog / action sheet
- [ ] 52.2 Replace Alert.alert in PreferencesScreen (2×) and AudioSettingsScreen (5×) — coordinated with Phases 45/46 dialogs
- [ ] 52.3 Replace Alert.alert in useVideoPlayerScreen (L732), AboutScreen, MusicDetailScreen, MpvConfigEditor
- [ ] 52.4 Destructive-action styling convention (red confirm) applied across all confirm dialogs
- [ ] 52.5 ESLint `no-restricted-imports` rule bans `Alert` from react-native app-wide
- [ ] 52.6 Toast used consistently for success feedback (add/remove/save actions)
- [ ] 52.7 Dialog accessibility: focus handling + screen-reader announcements
- [ ] 52.8 Gate: `Alert.alert` grep across src/ returns 0 matches; gates clean

---

### PHASE 53 — Core Inputs and Forms

**Checklist:**
- [ ] 53.1 AppTextInput core component: theme tokens, label/error/helper text, clear button, validation support
- [ ] 53.2 Promote SearchBar to src/components/core with built-in debounce + cancel; export from the barrel
- [ ] 53.3 Replace raw TextInput in MpvConfigEditor, PodcastsScreen, AllPlaylistsScreen, BookmarkSheet, PlaylistModal
- [ ] 53.4 Shared keyboard-avoiding wrapper — remove the duplicated KeyboardAvoidingView logic
- [ ] 53.5 Input validation patterns (required, max length) with consistent error display
- [ ] 53.6 SearchBar reused on History, Downloads, and Help searchable lists
- [ ] 53.7 Input accessibility: labels + error announcements
- [ ] 53.8 Gate: zero raw TextInput outside src/components/core; gates clean

---

### PHASE 54 — Global Status and List Components

**Checklist:**
- [ ] 54.1 OfflineBanner rendered at app level — NoNetworkBanner is currently Home-only
- [ ] 54.2 Every API-driven screen handles offline: disabled actions, cached content, auto-retry on reconnect
- [ ] 54.3 Pull-to-refresh on all list screens (themed RefreshControl)
- [ ] 54.4 Infinite scroll / pagination for API browse screens (Music, Radio, Live TV, Audiobooks, Archive, Shows)
- [ ] 54.5 Global long-operation progress pattern (import/sync) beyond the existing scan banner
- [ ] 54.6 Skeleton loading coverage audit across all new screens
- [ ] 54.7 Standard retry/error card component reused everywhere
- [ ] 54.8 Gate: airplane-mode navigation shows correct offline states on every screen; gates clean

---

### PHASE 55 — Theme Compliance and Cleanup Sweep

**Checklist:**
- [ ] 55.1 Remove hardcoded colors from the 8 flagged files (Avatar, BookmarkItem, AudioActionRow #FF2D55, AudioGradientBg, AudioSeekBar, AudioSubMenu, AudioLyricsView, FolderLinkingWizard) → theme tokens
- [ ] 55.2 Add missing tokens (e.g. like/heart accent) instead of inline hex values
- [ ] 55.3 Hardcoded spacing/fontSize sweep in components → spacing.* / typography.* tokens
- [ ] 55.4 Delete empty stub dirs: ControlsBar, HeaderBar, SeekBar (components root), TrackSelector, preferences
- [ ] 55.5 Raw `<Text>` / ActivityIndicator audit — replace with AppText / ActivityOrb per project rules
- [ ] 55.6 Component barrel exports complete with consistent naming
- [ ] 55.7 ESLint color-literal guard for src/components and src/screens
- [ ] 55.8 Gate: color-literal grep clean outside src/theme; gates clean

---

### Wave 12 Gate Check
**Required:** Design system fully enforced — zero raw alerts, raw inputs, or literal colors outside theme. Offline status handled globally.

---

## WAVE 13: Linking, UX Flows, and Release (Phases 56-60)

> Close every dead end (share = "coming soon", VideoPlayer back-nav bug), unify cross-source flows, then run the beta release gate. **The no-dummy-data rule is verified as a release blocker.**

### PHASE 56 — Share and Deep Link Completion

**Checklist:**
- [ ] 56.1 Share-link generation service: simbaplayer:// + https fallback for tracks, albums, artists, podcasts, playlists, stations
- [ ] 56.2 Native share sheet integration; fix the MusicDetail "coming soon" share dead-end
- [ ] 56.3 Incoming deep links verified for every registered route (params parsed, auth-gated)
- [ ] 56.4 Share actions available in long-press menus, detail screens, and both players
- [ ] 56.5 Playlist export/import as shareable file (m3u/json)
- [ ] 56.6 Cold-start deep link: opens the target after auth restore without losing the link
- [ ] 56.7 linking.ts coverage extended to all Wave 8-11 routes
- [ ] 56.8 Gate: share a track from the player → open the link on-device → lands on the correct detail; gates clean

---

### PHASE 57 — Navigation Correctness and Empty-State Audit

**Checklist:**
- [ ] 57.1 Fix VideoPlayer back behavior: `goBack()` instead of `navigate('MainTabs')` (audit finding)
- [ ] 57.2 Modal vs push consistency policy (Preferences is the modal outlier)
- [ ] 57.3 Route audit: make every registered route reachable or remove it; register any orphan screens
- [ ] 57.4 Android hardware back verified on every screen (players, sheets, dialogs, wizard)
- [ ] 57.5 Empty states for remaining screens: Library segments, GenreScreen, Settings sub-lists
- [ ] 57.6 Navigation state persistence across process death (react-navigation state restore)
- [ ] 57.7 Screen transition animation consistency per §5
- [ ] 57.8 Gate: full navigation crawl — no dead ends, no traps, every list has an empty state; gates clean

---

### PHASE 58 — Cross-Source UX Flows

**Checklist:**
- [ ] 58.1 Continue Watching/Listening shelf on Home mixing local + streaming with resume positions
- [ ] 58.2 Resume prompt (31.2 pattern) unified for streams and local files in both players
- [ ] 58.3 Mixed-queue handoff regression pass including streaming items (video ↔ audio ↔ stream)
- [ ] 58.4 Long-press menu everywhere: identical action set and ordering on every tile/row in the app
- [ ] 58.5 Play Next / Add to Queue actions from all content surfaces
- [ ] 58.6 MiniAudioPlayer persists across all new screens without layout overlap
- [ ] 58.7 Session continuity: relaunch → Home shows exactly where the user left off
- [ ] 58.8 Gate: 10-step cross-source user journey scripted and passing on device

---

### PHASE 59 — Performance and Accessibility Final Sweep

**Checklist:**
- [ ] 59.1 Virtualization audit on every new list (History 200 items, IPTV thousands) — tuned FlatList/getItemLayout where needed
- [ ] 59.2 Re-render audit on the top 10 screens; memoize hot paths
- [ ] 59.3 Cold start ≤ 2.5s to interactive on a mid-range device
- [ ] 59.4 Image/art loading: cache hits verified; zero flicker while scrolling shelves
- [ ] 59.5 Accessibility sweep of all Wave 8-13 UI: labels, states, hints, ≥ 44dp targets
- [ ] 59.6 TalkBack pass on 5 core journeys (login→play, search→stream, playlist, downloads, settings)
- [ ] 59.7 Reduced-motion preference honored in all new animations
- [ ] 59.8 Gate: perf numbers recorded in the tracker; accessibility checklist signed off

---

### PHASE 60 — Beta Release Gate

**Checklist:**
- [ ] 60.1 No-dummy-data verification sweep: grep + manual pass — every screen shows real data or a designed empty state
- [ ] 60.2 Full-app manual QA script covering all Wave 8-13 surfaces, results recorded in the tracker
- [ ] 60.3 tsc --noEmit, eslint src/, and the full jest suite all exit 0
- [ ] 60.4 Android release build (minified) smoke test — no proguard/hermes crashes
- [ ] 60.5 Crash reporting hooks in place via error boundaries
- [ ] 60.6 Spec + tracker final sync: every 33-60 item statused with completion dates
- [ ] 60.7 Version bump + changelog entry
- [ ] 60.8 Gate: signed beta APK installs clean on device; end-to-end acceptance run passes

---

### Wave 13 Gate Check
**Required:** Shippable beta — all 60 phases complete, zero dummy data, streaming fully integrated into playlists/recents/bookmarks with position tracking, every page linked and reachable, gates green.

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
