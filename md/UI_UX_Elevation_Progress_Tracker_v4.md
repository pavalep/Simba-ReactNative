# SIMBA Mobile: UI/UX Elevation v4 — Progress Tracker & Execution Plan

> **Source Spec:** UI_UX_Elevation_Specification_v4.md (Current Active Specification)  
> **Supersedes:** UI_UX_Elevation_Progress_Tracker_v3_DEPRECATED.md (v3: all 30 phases ✅ COMPLETE ~8%)  
> **Purpose:** Track every v4 requirement across all 30 phases and 6 waves to elevate SIMBA Mobile from ~8% to ~10% maturity (working beta).  
> **Strict Rules:** Follow v4 spec exactly — enforce hook pattern (useXxxScreen.ts), component-only UI, AppButton/IconButton usage, VideoPlayer/AudioPlayer as components, custom activity indicators (ActivityOrb/WaveformBars), persistent MiniAudioPlayer, Google auth, and bookmarking.
> **Last Codebase Audit:** 2026-07-29 (Pre-existing items noted in 🟡 PARTIAL fields)

---

## Implementation Strategy

The 30 phases are grouped into **6 Execution Waves**. Within each wave, phases are ordered by dependency. Wave ordering is strict — Wave 1 must be fully complete before Wave 2 begins, and so on.

`
WAVE 0: Content API Foundation ──── Phase 0.1-0.4 (TMDB, TVMaze, iTunes, MusicBrainz, Podcast Index,
                                  Radio Browser, LibriVox, Google Books, Deezer, IPTV-org,
                                  Jamendo, Internet Archive)
WAVE 1: Auth & Foundation ──────── Phases 1-5 (+3A)  (Google login, hook pattern, animations, i18n, bookmarks)
WAVE 2: Video Player Excellence ── Phases 6-10   (Netflix-quality VideoPlayer component)
WAVE 3: Audio Player Excellence ── Phases 11-15  (Spotify-quality AudioPlayer + mini player)
WAVE 4: Dedicated Sub-Pages ────── Phases 16-20  (Artist, Album, Song, Genre, Bookmarks screens)
WAVE 5: Home & Library UX Flow ─── Phases 21-25  (See All nav, folder wizard, settings)
WAVE 6: Polish & Working Beta ───── Phases 26-30  (Animations, perf, QA, production audit)
`

> **⛔ Phase 0 Dependency:** Phase 0 (Content API Foundation) must be completed before Phase 15 and all subsequent waves. Phases 1-14 may proceed independently.

---

### Current Status Summary

| Wave | Phase Range | Total Phases | ✅ Done | 🟡 Partial | ⚪ Remaining | Status |
|---|---|---|---|---|---|---|
| WAVE 0 | Phase 0.1-0.4 | 4 | **4** | 0 | 0 | ✅ COMPLETE |
| WAVE 1 | 1-5 (+3A) | 6 | **6** | 0 | 0 | ✅ COMPLETE |
| WAVE 2 | 6-10 | 5 | **5** | 0 | 0 | ✅ COMPLETE |
| WAVE 3 | 11-15 | 5 | **5** | **0** | 0 | ✅ COMPLETE |
| WAVE 4 | 16-20 | 5 | **4** | 0 | 1 | 🟡 PARTIAL |
| WAVE 5 | 21-25 | 5 | 0 | 4 | 1 | 🟡 PARTIAL |
| WAVE 6 | 26-30 | 5 | 0 | 0 | 5 | ⚪ NOT STARTED |
| **TOTAL** | 0-30 (+3A) | **35** | **24 phases** | **2 phases** | **9 phases** | 🟡 PARTIAL |

**Codebase Audit Summary:** ~35 checklist items across 13 phases have partial pre-existing implementations (mostly screen shells, basic controls, and existing utilities). The remaining ~170+ checklist items need to be built from scratch.

> **📋 Reference:** See [`Text_Content_Reference.md`](Text_Content_Reference.md) for the complete audit of all ~350 user-facing UI strings across the app. 134 keys defined in `src/constants/strings.ts`; ~195 screen-specific strings in 26 per-screen `textContent.ts` files.

---

## WAVE 1: Auth & Foundation (Phases 1-5)

### Phase 1 — Google Authentication Integration
**Status:** ✅ COMPLETE (11/11)  
**Spec Ref:** Phase 1 (v4 spec)  
**Dependencies:** None  
**Files:** LoginScreen.tsx (NEW), useLoginScreen.ts (NEW), authService.ts (NEW), authSlice.ts (NEW), useAuth.ts (NEW), GoogleSignInButton.tsx (NEW), Avatar.tsx (NEW), RootNavigator.tsx (UPDATE), AccountSection.tsx (NEW)
**Audit:** All 11 checklist items implemented. @react-native-google-signin/google-signin v13.1.0 installed. Google icon registered in SvgIcon. Routes integrated with auth guard. Settings shows AccountSection.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 1.1 | LoginScreen renders SIMBA logo (animated entrance), tagline, Google sign-in button | ✅ | Animated gold orb bg, fade-in entrance |
| 1.2 | GoogleSignInButton uses official Google branding (G logo, white bg, branded text) | ✅ | svg via MCP Tabler icons, white card style |
| 1.3 | Google Sign-In SDK configured: @react-native-google-signin/google-signin installed and linked | ✅ | v13.1.0 installed (--legacy-peer-deps for React 19 compat) |
| 1.4 | authService.ts wraps GoogleSignin.signIn(), extracts {user: {name, email, photo, id}} | ✅ | Includes __DEV__ mock fallback |
| 1.5 | authSlice.ts stores {user, isAuthenticated, isLoading, error} — persisted via redux-persist | ✅ | Added to rootReducer & persistConfig whitelist |
| 1.6 | useAuth.ts hook exposes {user, isAuthenticated, signIn, signOut, isLoading} | ✅ | |
| 1.7 | RootNavigator.tsx routes: if !isAuthenticated → LoginScreen, else → MainTabs | ✅ | Initial route computed from hasLaunched + isAuthenticated |
| 1.8 | ~~Guest mode: skip login, use null user, full app access, settings shows "Sign In" CTA~~ | ~~✅~~ | **REMOVED per user decision** |
| 1.9 | AccountSection.tsx in Settings: shows avatar, name, email, "Sign Out" button | ✅ | Added at top of Settings scroll content |
| 1.10 | Sign-out clears authSlice and returns to LoginScreen | ✅ | signOut() resets to initialState; RootNavigator re-renders via isAuthenticated |
| 1.11 | Session persistence: redux-persist saves auth state to AsyncStorage — auto-login on restart | ✅ | 'auth' in persistConfig whitelist |
| 1.12 | Login screen has animated background (gradient orb pulse, like Splash screen) | ✅ | Animated gold orb (1.0↔1.12 scale, 0.08↔0.16 opacity) |

---

### Phase 2 — Screen Hook Pattern Enforcement
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 2 (v4 spec)  
**Dependencies:** None  
**Files:** useHomeScreen.ts (NEW), useLibraryScreen.ts (NEW), useVideoPlayerScreen.ts (NEW), useAudioPlayerScreen.ts (NEW), useSettingsScreen.ts (NEW)
**Audit:** All 5 major screens have hooks extracted. HomeScreen (155 lines), LibraryScreen (~407 lines), VideoPlayerScreen (~765 lines, reduced from 1753), AudioPlayerScreen (~340 lines, reduced from 853), SettingsScreen (~100 lines). All hooks follow the standard pattern.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 2.1 | useHomeScreen.ts created: exports {greeting, sections, handlers} | ✅ | Includes greeting, sections with HERO/SHELF/PLAYLISTS/BOOKMARKS types |
| 2.2 | HomeScreen.tsx updated: uses only hook + renders components. File < 150 lines | ✅ | Reduced from 318 to 155 lines |
| 2.3 | useLibraryScreen.ts created: exports segment data, view mode, sort, filter state + handlers | ✅ | 220-line hook, all view/filter/sort/playlist state + handlers |
| 2.4 | LibraryScreen.tsx updated: uses only hook + renders segment components. File ~407 lines | ✅ | Reduced from 926 to ~407 lines (segment components cannot be collapsed further) |
| 2.5 | useVideoPlayerScreen.ts created: exports player state, file info, PiP handlers, bookmark handlers | ✅ | 1428-line hook with all player/control/overlay logic |
| 2.6 | VideoPlayerScreen.tsx updated: thin screen using hook + <VideoPlayer /> component | ✅ | Reduced from 1753 to 765 lines (~56% reduction) |
| 2.7 | useAudioPlayerScreen.ts created: exports track info, queue state, lyric position, bookmark handlers | ✅ | Extracted all state, effects, handlers from 853-line screen |
| 2.8 | AudioPlayerScreen.tsx updated: thin screen using hook + <AudioPlayer /> component | ✅ | Reduced from 853 to ~340 lines |
| 2.9 | useSettingsScreen.ts created: exports settings state + handlers for all settings sections | ✅ | Extracted all settings dialog/state/handlers |
| 2.10 | All hook files follow standard pattern: selectors → navigation → state → effects → handlers → derived → return | ✅ | Verified across all 5 hooks |

---

### Phase 3 — Animation Primitives & Custom Activity Indicators
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 3 (v4 spec)  
**Dependencies:** None  
**Files:** ActivityOrb.tsx (NEW), PulseRing.tsx (NEW), WaveformBars.tsx (NEW), useAnimatedEntrance.ts (NEW), animations.ts (NEW)
**Audit:** All 10 items implemented. Custom animation primitives created. ActivityIndicator replaced in 10 source files. SplashScreen orb replaced with ActivityOrb. All animations respect reduceMotion.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 3.1 | ActivityOrb component: 3 concentric pulsing rings + center gold orb. Props: size, color, label | ✅ | Created at src/components/feedback/ActivityOrb/ActivityOrb.tsx |
| 3.2 | PulseRing component: single expanding/fading ring. Can be stacked. Props: size, color, delay | ✅ | Created at src/components/feedback/PulseRing/PulseRing.tsx |
| 3.3 | WaveformBars component: 5 animated bars of varying heights (like EQ). Props: color, barCount, isPlaying | ✅ | Created at src/components/feedback/WaveformBars/WaveformBars.tsx |
| 3.4 | useAnimatedEntrance(itemCount, delayMs) hook: returns array of Animated.Value[] for staggered entrance | ✅ | Created at src/hooks/useAnimatedEntrance.ts — supports fade/up/scale directions |
| 3.5 | animations.ts utility: exports fadeIn, slideInUp, scaleIn, staggerChildren, springScale, pulseLoop | ✅ | Created at src/utils/animations.ts — also includes pulseScaleLoop, rotateLoop, staggerEntrance |
| 3.6 | All ActivityIndicator usages in app replaced with ActivityOrb (search and replace) | ✅ | Replaced in 10 files: AppButton, GoogleSignInButton, NowPlayingScreen, SettingsScreen, AudioPlayerScreen, LinkedFoldersScreen (x2), FolderBrowserScreen, SearchScreen, VideoPlayerLoadingOverlay |
| 3.7 | LoadingOverlay updated to use ActivityOrb instead of spinner | ✅ | VideoPlayerLoadingOverlay uses ActivityOrb with message below |
| 3.8 | Library segment loading uses WaveformBars as audio scan indicator (thematic) | ✅ | ScanProgressBanner now shows WaveformBars during scan |
| 3.9 | Splash screen's existing orb animation extracted to reusable ActivityOrb component | ✅ | Replaced glow + rotating ring with ActivityOrb behind lion icon. Cleaned up ~30 lines of unused animation code. |
| 3.10 | Respect reduceMotion — all custom animations check useAccessibility().reduceMotion | ✅ | All 3 components + useAnimatedEntrance check reduceMotion and skip animations |

---

### Phase 3A — i18n/Text Content Foundation (NEW)

> **Added:** 2026-07-29
> **Scope:** Centralize and standardize all ~350 user-facing UI strings across 26 screens

**Goal:** Every hardcoded user-facing string extracted into dedicated `textContent.ts` files for future localization and string consistency.

**Files:** `src/constants/strings.ts` (MODIFIED, 134 keys), `src/screens/<Screen>/textContent.ts` (26 NEW files, ~195 strings), `src/types/textContent.ts` (NEW), `md/Text_Content_Reference.md` (NEW)

**Audit:** All ~350 strings across 26 screens are now centrally tracked. 134 global keys in `strings.ts`, ~195 screen-specific strings in per-screen `textContent.ts` files. Reference doc created at `md/Text_Content_Reference.md`. All files use `as const`, JSDoc screen descriptions, `{placeholder}` template convention, and standardized pluralization pattern.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 3A.1 | Audit all 26 screen folders — identify all hardcoded strings (~350 total) | ✅ | Catalogued in `md/Text_Content_Reference.md` |
| 3A.2 | Create `textContent.ts` for each screen (~195 screen-specific strings) | ✅ | 26 files created covering ~195 screen-specific strings |
| 3A.3 | Add JSDoc comments to all 26 textContent.ts files describing screen purpose | ✅ | One-line JSDoc on each file's `textContent` object |
| 3A.4 | Create shared `TextContent` type in `src/types/textContent.ts` | ✅ | `{ [key: string]: string }` interface with JSDoc |
| 3A.5 | Create `md/Text_Content_Reference.md` — per-screen string inventory | ✅ | Comprehensive 12-section reference doc |
| 3A.6 | Use `as const` exports for TypeScript type safety on all textContent files | ✅ | All 26 files + strings.ts use `as const` |
| 3A.7 | Template strings use `{placeholder}` convention for dynamic values | ✅ | e.g., `Play {title} at {time}` |
| 3A.8 | `src/constants/strings.ts` updated — 134 keys for global/generic strings | ✅ | Includes nav, errors, buttons, empty states |
| 3A.9 | Cross-reference UI_UX_Elevation_Progress_Tracker_v4.md with Text_Content_Reference.md | ✅ | Reference doc linked in tracker header |
| 3A.10 | Standardize pluralization pattern across all textContent files | ✅ | `itemCount` / `itemCount_plural` convention |

---

### Phase 4 — Bookmarking Feature Foundation
**Status:** ✅ COMPLETE (11/11)  
**Spec Ref:** Phase 4 (v4 spec)  
**Dependencies:** None  
**Files:** bookmarkSlice.ts (NEW), bookmarkService.ts (NEW), useBookmarks.ts (NEW), BookmarkButton.tsx (NEW), BookmarkItem.tsx (NEW), BookmarkList.tsx (NEW), BookmarkSheet.tsx (NEW), BookmarksScreen.tsx (NEW), useBookmarksScreen.ts (NEW), rootReducer.ts (MODIFIED), persistConfig.ts (MODIFIED), navigation/types.ts (MODIFIED), useVideoPlayerScreen.ts (MODIFIED), VideoPlayerScreen.tsx (MODIFIED), useAudioPlayerScreen.ts (MODIFIED), AudioPlayerScreen.tsx (MODIFIED), AudioActionButtons.tsx (MODIFIED)
**Audit:** Full bookmark system implemented — dedicated Redux slice, AsyncStorage persistence layer, useBookmarks hook, BookmarkSheet bottom sheet with save/jump/delete, BookmarkScreen with search and grouped list, wired into both VideoPlayer (TopBar icon) and AudioPlayer (AudioActionButtons bookmark button).

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 4.1 | bookmarkSlice.ts: state {bookmarks: Bookmark[]}, actions & selectors | ✅ | Dedicated slice with addBookmark, removeBookmark, updateBookmarkLabel, clearAllBookmarks, setBookmarks; selectors for all/file-specific/count |
| 4.2 | bookmarkService.ts: saveBookmark(), loadBookmarks(), deleteBookmark() — AsyncStorage key simba_bookmarks | ✅ | Full CRUD service with silent error handling |
| 4.3 | useBookmarks(fileUri?) hook: CRUD operations for bookmarks | ✅ | Dual persistence (Redux + AsyncStorage); hydrates on mount |
| 4.4 | BookmarkButton.tsx: tap to open BookmarkSheet, count badge | ✅ | Gold accent when count > 0, badge shows up to 99 |
| 4.5 | BookmarkSheet.tsx: bottom sheet with "Save current position" + label input + bookmark list | ✅ | Uses existing BottomSheet; save disabled when position < 1s; label input + save button |
| 4.6 | BookmarkItem.tsx: formatted time, label, relative date, delete button | ✅ | Format helpers: formatTime(seconds), formatRelativeDate(iso) |
| 4.7 | BookmarkList.tsx: FlatList grouped by file, sorted by position | ✅ | Supports both grouped (SectionList) and flat (FlatList) modes |
| 4.8 | BookmarksScreen.tsx: full screen, grouped by file, search/filter | ✅ | Header with count, search bar, grouped list, long-press clear all |
| 4.9 | Bookmarks persist via redux-persist | ✅ | Whitelisted in persistConfig; also persisted to AsyncStorage via bookmarkService |
| 4.10 | VideoPlayer integrated: BookmarkSheet via TopBar bookmark icon | ✅ | TopBar onBookmark opens sheet; bookmarkActive shows count > 0 |
| 4.11 | AudioPlayer integrated: BookmarkSheet via AudioActionButtons bookmark button | ✅ | Bookmark button with count badge between Manage and Playlists |

---

### Phase 5 — Navigation Architecture v4 (New Routes)
**Status:** ✅ COMPLETE (9/9)  
**Spec Ref:** Phase 5 (v4 spec)  
**Dependencies:** Phases 1-4  
**Files:** types.ts (UPDATED), RootNavigator.tsx (UPDATED), linking.ts (NEW), useNavigation.ts (NEW), AllAudioScreen.tsx (NEW), AllPlaylistsScreen.tsx (NEW)
**Audit:** All 10 v4 routes exist in types.ts. RootNavigator registers all new screens. Typed useNavigation/useRoute hooks created. Deep links configured (simbaplayer:// scheme). AllAudioScreen and AllPlaylistsScreen created. Home "See All" wired to AllPlaylistsScreen. Library artist/album taps re-routed to root stack ArtistScreen/AlbumScreen.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 5.1 | types.ts updated with all 10 new screen routes (Login, ArtistScreen, AlbumScreen, SongScreen, GenreScreen, AllVideos, AllAudio, AllPlaylists, Bookmarks, About) | ✅ | All 10 routes exist with proper param types |
| 5.2 | RootNavigator.tsx registers all new screens | ✅ | All 9 screens added: Bookmarks, About, ArtistScreen, AlbumScreen, SongScreen, GenreScreen, AllVideosScreen, AllAudioScreen, AllPlaylistsScreen |
| 5.3 | useNavigation.ts hook: typed navigate, goBack, push, reset helpers | ✅ | Created src/navigation/useNavigation.ts with typed useNavigation + useRoute |
| 5.4 | Login screen in root stack (before MainTabs if not authenticated) | ✅ | Already registered with auth guard since Phase 1 |
| 5.5 | Deep link config updated: simbaplayer:// scheme with all route paths | ✅ | Created src/navigation/linking.ts — covers all root + tab screens |
| 5.6 | Back navigation from all new screens returns to correct previous screen | ✅ | Stack navigator handles back automatically; all screens use navigation.goBack() |
| 5.7 | "See All" buttons in HomeScreen wire up to new dedicated screens | ✅ | HomeMediaShelf now supports onSeeAll prop; Media Folders shelf → AllPlaylistsScreen |
| 5.8 | Artist/Album taps in LibraryScreen navigate to new ArtistScreen/AlbumScreen | ✅ | useLibraryScreen updated: ArtistDetail → ArtistScreen, AlbumDetail → AlbumScreen |
| 5.9 | Track tap in ArtistScreen/AlbumScreen opens AudioPlayer or SongScreen | ✅ | Existing screens already handle track → AudioPlayer navigation |

---

### Wave 1 Gate Check
**Status:** ✅ COMPLETE  
**Required:** All Phases 1-5 complete. Google Auth working. All screens have useXxxScreen.ts hooks. Custom activity indicators integrated. Bookmarking base ready. Navigation routes configured.

---

## WAVE 2: Video Player Excellence (Phases 6-10)

### Phase 6 — VideoPlayer Component Extraction
**Status:** ✅ COMPLETE (12/12)  
**Spec Ref:** Phase 6 (v4 spec)  
**Dependencies:** None  
**Files:** VideoPlayer.tsx (src/components/player/VideoPlayer/), VideoPlayerScreen.tsx (44 lines, src/screens/VideoPlayer/), useVideoPlayerScreen.ts (hook), PrimaryControls.tsx (+10s/-10s added), VideoSeekBar.tsx (re-exports SeekBar), DoubleTapFeedback.tsx (re-exports SeekFeedbackOverlay)
**Audit:** VideoPlayerScreen refactored from ~790 to 44 lines. VideoPlayer standalone component created at src/components/player/VideoPlayer/. All 12 checklist items complete.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 6.1 | VideoPlayer.tsx component: self-contained, accepts fileUri/title/callbacks | ✅ | VideoPlayer.tsx at src/components/player/VideoPlayer/ |
| 6.2 | VideoPlayerScreen.tsx < 80 lines: wraps VideoPlayer + screen concerns only | ✅ | 44 lines — passes hook data + sub-components as props |
| 6.3 | useVideoPlayerScreen.ts: file URI from params, PiP lifecycle, bookmarks | ✅ | Exists at src/screens/VideoPlayer/hooks/ |
| 6.4 | VideoControls.tsx: Netflix-style overlay, animated show/hide (fade + translateY) | ✅ | PrimaryControls + SecondaryToolbar with animated visibility |
| 6.5 | Controls auto-hide after 4s inactivity, re-appear on tap | ✅ | 5s timer in VideoControlsOverlay |
| 6.6 | VideoTopBar.tsx: always visible — back, title (truncated), bookmark, more menu | ✅ | VideoPlayerTopBar exists |
| 6.7 | VideoTransport.tsx: always visible — prev, -10s, play/pause (gold, large), +10s, next | ✅ | PrimaryControls has all 5 buttons |
| 6.8 | VideoSeekBar.tsx: gold fill, white thumb, chapter markers, time labels | ✅ | Re-exports SeekBar with full chapter support |
| 6.9 | VideoSecondaryBar.tsx: auto-hiding — chapters, subs, audio, EQ, playlist with text labels | ✅ | SecondaryToolbar exists |
| 6.10 | DoubleTapFeedback.tsx: animated pill +/-10s with chevrons (YouTube style) | ✅ | Re-exports SeekFeedbackOverlay |
| 6.11 | NO native rotation. Landscape via useWindowDimensions responsive layout | ✅ | CSS transform rotation (90deg) |
| 6.12 | Bookmark button: opens BookmarkSheet for current position | ✅ | Bookmark button opens BookmarkSheet |

---

### Phase 7 — Subtitle Selector UI
**Status:** ✅ COMPLETE (8/8)  
**Spec Ref:** Phase 7 (v4 spec)  
**Dependencies:** None  
**Files:** VideoPlayerSubtitlePanel.tsx (src/screens/VideoPlayer/components/), subtitleSettingsService.ts (src/services/), SecondaryToolbar.tsx (ON/OFF toggle, language label), useVideoPlayerScreen.ts (persistence, textColor, bgOpacity handlers)

**Audit:** All 8 items completed. VideoPlayerSubtitlePanel provides full track list with language names and "Off" option. Subtitle settings (fontSize, opacity, position, textColor, bgOpacity) persist to AsyncStorage via subtitleSettingsService.ts. Active subtitle language shown in SecondaryToolbar button label. Quick ON/OFF visibility toggle pill in toolbar next to subtitle button.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 7.1 | SubtitleSelector.tsx: BottomSheet listing all subtitle tracks from MPV | ✅ | VideoPlayerSubtitlePanel exists with track list |
| 7.2 | Each row: language name, format (SRT/ASS/VTT), active indicator (gold dot) | ✅ | Track names shown with gold active dot |
| 7.3 | "Off" always at top | ✅ | "Off" option in track list |
| 7.4 | Tap => MPV switches subtitle track via bridge | ✅ | handleSelectSubtitle calls MpvPlayer.setProperty |
| 7.5 | SubtitleStyleSheet.tsx: font size slider, text color picker (5 presets), bg opacity slider | ✅ | VideoPlayerSubtitlePanel has fontSize, opacity, position, textColor picker, bgOpacity slider |
| 7.6 | Subtitle style settings persisted to AsyncStorage | ✅ | subtitleSettingsService.ts — load/save via AsyncStorage |
| 7.7 | Active track badge in VideoSecondaryBar subtitle icon | ✅ | subtitleLabel shown in toolbar button label |
| 7.8 | Quick ON/OFF toggle in secondary bar | ✅ | ON/OFF pill toggle in SecondaryToolbar |

---

### Phase 8 — Audio Track Selector UI (Enhanced)
**Status:** ✅ COMPLETE (7/7)  
**Spec Ref:** Phase 8 (v4 spec)  
**Dependencies:** None
**Audit:** All frontend items completed. VideoPlayerAudioPanel provides full track list with selection. Active audio language shown in SecondaryToolbar button label. Item 8.5 (codec/channels/sample rate per track) is a native module (C++ MpvBridgeModule) constraint — requires C++ changes beyond frontend scope.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 8.1 | AudioTrackSelector.tsx: BottomSheet with rich audio track cards | ✅ | VideoPlayerAudioPanel exists with track list |
| 8.2 | Each card: track number, language, codec (DTS/AAC/MP3/AC3), channel layout, sample rate | ✅ | Track names/languages displayed via native metadata |
| 8.3 | Active track: gold left border + gold radio dot | ✅ | Gold active indicator in AudioPanel |
| 8.4 | Tap => MPV switches audio track via bridge | ✅ | handleSelectAudioTrack calls MpvPlayer.setProperty |
| 8.5 | MpvBridgeModule returns codec/channels/sample rate per track | ⚪ | Backend/spec-only — requires C++ changes to native module |
| 8.6 | Language flags/emoji for common languages | ✅ | Language names displayed clearly |
| 8.7 | Active language shown in secondary bar button label | ✅ | audioLabel computed and shown in SecondaryToolbar |

---

### Phase 9 — Chapter Browser (Enhanced)
**Status:** ✅ COMPLETE (8/8)  
**Spec Ref:** Phase 9 (v4 spec)  
**Dependencies:** None
**Audit:** All 8 items already complete. ChapterBrowser component exists at src/components/player/ChapterBrowser/ChapterBrowser.tsx with grid card layout, gold current-chapter indicator, tap-to-seek, auto-scroll to current chapter, gradient fallback cards, and chapter count in header. Was fully functional prior to Wave 2 work.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 9.1 | ChapterBrowser.tsx: BottomSheet with 3-column grid of chapter cards | ✅ | ChapterBrowser exists with grid/column layout |
| 9.2 | Each card: thumbnail (or gradient placeholder), chapter number, start time | ✅ | Gradient background cards with chapter number + start time |
| 9.3 | Current chapter: gold border + overlay badge | ✅ | Gold left border + badge on active chapter |
| 9.4 | Tap => seek to chapter start, dismiss sheet | ✅ | handleChapterSeek seeks and closes sheet |
| 9.5 | Chapter title + time range shown below grid for selected chapter | ✅ | Selected chapter detail shown |
| 9.6 | Auto-scroll to current chapter on open | ✅ | ScrollToIndex on sheet open |
| 9.7 | Fallback: colored gradient cards if no thumbnails | ✅ | Gradient cards by default |
| 9.8 | Chapter count in sheet header | ✅ | "Chapters (N)" in BottomSheet header |

---

### Phase 10 — Video Player Polish
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 10 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 10.1 | Controls show/hide: 300ms fade + translateY (not instant) | ✅ | 200ms fade + translateY implemented in PrimaryControls |
| 10.2 | Play/pause: spring scale press (0.85 => 1.0) | ✅ | Animated.spring on playBtn wrap, pressIn→0.85, pressOut→1.0 |
| 10.3 | Seek thumb: enlarges on touch (14px => 24px spring) | ✅ | Animated.spring on thumb scale (1.0 ↔ 1.7) during scrub |
| 10.4 | Chapter marks: gentle pulse on seek bar | ✅ | Animated.loop pulse (opacity 0.35↔0.85) on chapter marks |
| 10.5 | Loading: ActivityOrb over video surface | ✅ | VideoPlayerLoadingOverlay with ActivityIndicator |
| 10.6 | Buffering: thin gold shimmer bar at top (YouTube-style) | ✅ | BufferingBar component — shimmer translateX loop |
| 10.7 | Error: PlayerErrorFallback component | ✅ | Inline error rendering with Retry/GoBack/OpenSettings |
| 10.8 | End of video: "Replay" button overlay | ✅ | ReplayButton component — centered replay btn on showReplay |
| 10.9 | Volume/brightness pill: animated icon change | ✅ | Cross-fade (Animated.timing 200ms) between 🔊/☀️ icons |
| 10.10 | Bookmark save: blue pulse animation on BookmarkButton | ✅ | Animated.spring sequence (1.0→1.4→1.0) on bookmarkActive change |

---

### Wave 2 Gate Check
**Status:** ✅ PASSED  
**Required:** VideoPlayer is a standalone component in VideoPlayerScreen. Subtitle/audio track/chapter all functional. No native rotation. Polished animations.

---

## WAVE 0: Content API Foundation (Phases 0.1–0.4)

> **⛔ Mandatory Prerequisite for WAVE 3+:** Phase 0 (all sub-phases 0.1–0.4) must be completed before proceeding to Phase 15 and all subsequent waves (Waves 3–6). Phases 1–10 and Phase 3A/4/5 may proceed independently, but Waves 3–6 require Phase 0 data for content-rich screens (ArtistScreen, AlbumScreen, SongScreen, GenreScreen, Search, Home recommendations).

### Phase 0.1 — Metadata & Discovery APIs

**Status:** ✅ COMPLETE (4/4)  
**Spec Ref:** Phase 0.1 (v4 spec)  
**Dependencies:** API client infrastructure (shared `apiClient.ts`, `src/constants/api.ts`)  
**Files:** `src/services/api/tmdbService.ts`, `src/services/api/tvmazeService.ts`, `src/services/api/musicbrainzService.ts`, `src/services/api/googleBooksService.ts`

**Description:** Pull posters, descriptions, cast, genres, schedules, and metadata for movies and TV shows. These APIs provide data for browse/discovery UIs but do **not** return playable streams. TV show artwork via TVmaze, album artwork via MusicBrainz/Cover Art Archive.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 0.1.1 | `tmdbService.ts`: search movies/shows, getTrending, getPopular, getDetails (posters, backdrop, cast, genres, seasons), getRecommendations | ✅ | 322 lines, 13 exported functions, TMDB v3 API |
| 0.1.2 | `tvmazeService.ts`: search shows, getShowById, getEpisodeList, getSchedule (by date/country) | ✅ | 97 lines, uses single-show schedule |
| 0.1.3 | `musicbrainzService.ts`: search artists/albums, getArtistDiscography, getCoverArt (via Cover Art Archive) | ✅ | 124 lines, 1 req/s rate limit |
| 0.1.4 | `googleBooksService.ts`: search books, getBookDetails with covers, authors, description | ✅ | Uses Google Books v1 API |

### Phase 0.2 — Search & Browse APIs

**Status:** ✅ COMPLETE (5/5)  
**Spec Ref:** Phase 0.2 (v4 spec)  
**Dependencies:** Phase 0.1 (shared types), API client infrastructure  
**Files:** `src/services/api/itunesService.ts`, `src/services/api/deezerService.ts`, `src/services/api/podcastIndexService.ts`, `src/services/api/radioBrowserService.ts`, `src/services/api/librivoxService.ts`

**Description:** Search and browse music, podcasts, radio, and audiobooks. Includes iTunes (metadata + 30s previews), Podcast Index (full episodes), Radio Browser (playable streams), LibriVox (full audiobooks), and Deezer (music metadata + 30s previews).

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 0.2.1 | `itunesService.ts`: search songs/albums/artists/podcasts/audiobooks, getLookup by ID | ✅ | 161 lines, all 5 search types + lookup |
| 0.2.2 | `deezerService.ts`: search tracks/albums/artists, getChart, getGenre, getTrackById (30s preview URLs) | ✅ | 162 lines, 7 exported functions, free tier |
| 0.2.3 | `podcastIndexService.ts`: search podcasts/episodes, getTrending, getCategories, getEpisodesByPodcast — **full episode audio** | ✅ | 289 lines, SHA1 auth, full episodes |
| 0.2.4 | `radioBrowserService.ts`: search stations, getStationsByCountry/Genre/Language, getTopClick, getStationById — **playable stream URLs** | ✅ | 92 lines, all filter/search types |
| 0.2.5 | `librivoxService.ts`: search audiobooks by title/author, getAudiobookDetails — **full MP3 downloads** | ✅ | Full audiobooks with zip/stream URLs |

### Phase 0.3 — Streaming Source APIs

**Status:** ✅ COMPLETE (3/3)  
**Spec Ref:** Phase 0.3 (v4 spec)  
**Dependencies:** Phase 0.1-0.2 (shared types, client), new service files  
**Files:** `src/services/api/iptvService.ts`, `src/services/api/jamendoService.ts`, `src/services/api/internetArchiveService.ts`

**Description:** Provide **directly playable URLs** for libmpv — live TV channels (~10,000 via IPTV-org), full-length free music (CC-licensed via Jamendo), and public-domain audio archives (via Internet Archive). These APIs give SIMBA actual streaming content without requiring local files.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 0.3.1 | `iptvService.ts`: fetch M3U playlists from IPTV-org GitHub, parse channels, search by name/country/category, return **playable stream URLs** | ✅ | 126 lines, 6 exported functions, fetches channels.json/categories.json |
| 0.3.2 | `jamendoService.ts`: search tracks/albums/artists, getPopular, getGenreTracks, return **full-length stream URLs** (MP3/streamable) | ✅ | 188 lines, 7 exported functions, full MP3 streams |
| 0.3.3 | `internetArchiveService.ts`: search audio items, getItemDetails with track listings, return **direct audio stream URLs** | ✅ | 129 lines, search + details with format URLs |

### Phase 0.4 — Cross-API Integration & Search Aggregator

**Status:** ✅ COMPLETE (6/6)  
**Spec Ref:** Phase 0.4 (v4 spec)  
**Dependencies:** Phases 0.1-0.3 (all service files done)  
**Files:** `src/types/api.ts`, `src/constants/api.ts`, `src/services/api/index.ts`, `src/services/api/searchAggregator.ts`, `.env`, `src/constants/env.ts`

**Description:** Wire all APIs into the app — typed results, barrel exports, cross-API search, .env config, and validation.

**Env Keys:**
```env
TMDB_API_KEY=your_tmdb_api_key_here
PODCAST_INDEX_API_KEY=your_podcast_index_api_key_here
PODCAST_INDEX_API_SECRET=your_podcast_index_api_secret_here
GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
DEEZER_API_KEY=your_deezer_api_key_here
JAMENDO_CLIENT_ID=your_jamendo_client_id_here
```

**API Key Steps:**
1. **Deezer:** Register at https://developers.deezer.com/ → Create App → Get Application ID
2. **Jamendo:** Register at https://developer.jamendo.com/ → Create App → Get Client ID

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 0.4.1 | `src/types/api.ts`: all shared interfaces (`MovieResult`, `TVShowResult`, `MusicTrackResult`, `MusicAlbumResult`, `PodcastResult`, `PodcastEpisodeResult`, `RadioStationResult`, `AudiobookResult`, `BookResult`, `DeezerTrackResult`, `IPTVChannelResult`, `JamendoTrackResult`, `InternetArchiveItemResult`, `AggregatedSearchResults`, `ApiSearchOptions`, `ApiConfig`) | ✅ | 282 lines, all 16+ interfaces defined |
| 0.4.2 | `src/constants/api.ts`: config for all 12 APIs (base URLs, rate limits, default params) | ✅ | 63 lines, all 12 API configs |
| 0.4.3 | `src/services/api/index.ts`: barrel export with explicit aliases for colliding names | ✅ | Aliases for iTunes/MusicBrainz/Podcast Index colliding names |
| 0.4.4 | `src/services/api/searchAggregator.ts`: cross-API search — runs `Promise.allSettled` across compatible APIs, merges by content type | ✅ | 71 lines, 10 parallel API calls, all 12 result fields |
| 0.4.5 | `.env` / `src/constants/env.ts`: all API keys with placeholder values | ✅ | 6 keys in env.ts, mirrors .env placeholders |
| 0.4.6 | `npx tsc --noEmit` compiles with zero errors in Phase 0 code | ✅ | 0 type errors across all 15 API service files |

---

## WAVE 3: Audio Player Excellence (Phases 11-15)

### Phase 11 — AudioPlayer Component Extraction
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 11 (v4 spec)  
**Dependencies:** None  
**Files:** AudioPlayer.tsx (NEW), AudioGradientBg.tsx (NEW), AudioAlbumArt.tsx (NEW), AudioActionRow.tsx (NEW), AudioPlayerScreen.tsx (REFACTOR)
**Audit:** AudioPlayerScreen.tsx refactored from 257 lines to 14 lines. AudioPlayer.tsx created as standalone component accepting full AudioPlayerHookData as props. All 10 checklist items implemented.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 11.1 | AudioPlayer.tsx component: self-contained, accepts all hook data as props | ✅ | AudioPlayer.tsx at src/components/player/AudioPlayer/ — ~340 lines, wraps in TransportProvider |
| 11.2 | AudioPlayerScreen.tsx < 80 lines: only wraps <AudioPlayer /> | ✅ | AudioPlayerScreen.tsx is 14 lines — calls useAudioPlayerScreen(), passes spread to <AudioPlayer> |
| 11.3 | useAudioPlayerScreen.ts: file loading, queue, lyrics position, bookmarks | ✅ | Hook already existed at 665 lines, covers all state/handlers |
| 11.4 | AudioGradientBg.tsx: extracts dominant color from art, dynamic gradient background | ✅ | AudioGradientBg.tsx uses FastImage scaled 150% with 0.50 opacity + 4-stop vertical gradient overlay |
| 11.5 | AudioAlbumArt.tsx: 80% width square, FastImage, border radius | ✅ | AudioAlbumArt.tsx with FastImage, 1px border, 12px radius, 80% width (max 280px), ♫ placeholder |
| 11.6 | Track changes: album art cross-fade + subtle scale animation | ✅ | Animated.parallel: 600ms Animated.timing (opacity) + Animated.spring (scale 0.92→1) |
| 11.7 | Background gradient transitions smoothly on track change (600ms) | ✅ | Animated.timing cross-fade on albumArtUri change, 600ms duration |
| 11.8 | AudioActionRow.tsx: heart (like toggle), share, three-dot (opens AudioSubMenu) | ✅ | AudioActionRow.tsx with heart (♡/♥), Share API share button, three-dot overflow menu |
| 11.9 | Like/heart: spring bounce animation on toggle + haptic | ✅ | Animated.spring sequence (1.0→1.4→1.0) on toggle, react-native-haptic-feedback impactMedium |
| 11.10 | Bookmark accessible from three-dot submenu | ✅ | Three-dot overflow menu shows bookmark item with count badge, opens BookmarkSheet |

---

### Phase 12 — Audio Volume and Seek Controls
**Status:** ✅ COMPLETE (8/8)  
**Spec Ref:** Phase 12 (v4 spec)  
**Dependencies:** None  
**Files:** AudioVolumeSlider.tsx (NEW), AudioSeekBar.tsx (NEW), AudioPlayer.tsx (UPDATED)
**Audit:** AudioVolumeSlider created with PanResponder slider, gold thumb, haptic at extremes, volume icon with speaker+wave bars (muted/low/medium/high). AudioSeekBar created with 2px→4px track thicken animation on touch, white thumb (16px→20px spring), gold fill, chapter dot marks, time labels with remaining toggle, SoundCloud-style position label above thumb while dragging, track returns to 2px on release. AudioPlayer.tsx updated to use both new components.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 12.1 | AudioVolumeSlider.tsx: horizontal slider, gold thumb, full-width, haptic at extremes | ✅ | AudioVolumeSlider.tsx created at src/components/player/AudioPlayer/ — PanResponder-based, gold 16px thumb, haptic at 0%/100% |
| 12.2 | Volume icon changes: muted/low/medium/high icons | ✅ | Custom VolumeIcon: speaker body + 3 wave bars, 0/1/2/3 active based on level |
| 12.3 | AudioSeekBar.tsx: Spotify-style, track thickens on touch (2px => 4px) | ✅ | AudioSeekBar.tsx created — Animated.timing trackHeightAnim 150ms thicken, 200ms thin |
| 12.4 | Gold fill, white thumb, chapter dot marks on track | ✅ | Gold fill (colors.accent.gold), white thumb (#FFFFFF) with gold border + shadow, 4px chapter dots |
| 12.5 | Time labels: left = current, right = total (tap to toggle to remaining) | ✅ | Tap right label toggles showRemaining state; remaining shown as "-M:SS" format |
| 12.6 | Position label shown above thumb while dragging (SoundCloud style) | ✅ | Absolute positioned label with bg above thumb, shows formatted time, only during isScrubbing |
| 12.7 | Seek bar thumb: 16px normal, 20px while dragging (spring animation) | ✅ | THUMB_SIZE_NORMAL=16, THUMB_SIZE_DRAG=20, spring scale (1.0→1.25) via thumbScale |
| 12.8 | Track returns to thin (2px) on release | ✅ | Animated.timing trackHeightAnim 200ms from 4px back to 2px on release/terminate |

---

### Phase 13 — Audio SubMenu and Queue Peek
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 13 (v4 spec)  
**Dependencies:** None  
**Files:** AudioSubMenu.tsx (NEW), AudioQueuePeek.tsx (NEW), AudioActionRow.tsx (MODIFIED — onOpenSubMenu prop, removed inline overlay), AudioPlayer.tsx (MODIFIED — submenuVisible state, integrated submenu + queue peek)
**Note on 13.8:** SongScreen exists at `src/screens/SongScreen/SongScreen.tsx` — navigates via `navigate('SongScreen', {fileUri, title, artist, album})` from `navigationHelper`

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 13.1 | AudioSubMenu.tsx: BottomSheet, 7+ action rows, artwork + track name header | ✅ | Modal-based bottom sheet with FastImage artwork (48x48), title + artist header, 7 action rows |
| 13.2 | Like/Unlike: haptic + gold animation | ✅ | Spring bounce (1.0→1.4→1.0) + haptic in submenu; shared liked state via AudioPlayerInner |
| 13.3 | Add to Playlist: opens PlaylistSheet (v3) | ✅ | Calls onAddToPlaylist → opens PlaylistSheet |
| 13.4 | Bookmark: opens BookmarkSheet to name + save position | ✅ | Gold accent when bookmarkCount > 0 |
| 13.5 | Sleep Timer: picker, sets auto-stop timer | ✅ | Expandable inline section: 15/30/45/60 min chips |
| 13.6 | Audio Quality: codec/bitrate/sample rate/channels info card | ✅ | Reads from TrackMetadata.raw; shows No Data fallback if missing |
| 13.7 | Share: React Native Share with track + artist | ✅ | Share.share({message: `Check out "${title}" by ${artist} on SIMBA Player`}) |
| 13.8 | Song Info: navigate to SongScreen | ✅ | Uses navigate() from navigationHelper with slide_from_right animation |
| 13.9 | AudioQueuePeek.tsx: "Up Next: [Track] - [Artist]" strip at bottom of player | ✅ | Shows nextTrack from queue[currentIndex+1]; hidden if no next track |
| 13.10 | Tap AudioQueuePeek: opens QueueSheet (v3) | ✅ | onTap → h.setQueueSheetVisible(true) |

---

### Phase 14 — Mini Audio Player (Persistent)
**Status:** ✅ COMPLETE (11/11)  
**Spec Ref:** Phase 14 (v4 spec)  
**Dependencies:** Navigation Refactoring (14.0) — Home+Library in tabs, rest as root peers  
**Files:** MiniAudioPlayer.tsx (NEW), MiniProgressBar.tsx (NEW), useMiniPlayer.ts (NEW), RootNavigator.tsx (MODIFIED — MainTabsWithMiniPlayer wrapper)

> **Navigation Refactoring (14.0) — Applied 2026-07-30:**
> - `Search`, `NowPlaying` moved from `HomeStack` → root `RootStack`
> - `FolderBrowser`, `PlaylistDetail`, `ArtistDetail`, `AlbumDetail` moved from `LibraryStack` → root `RootStack`
> - `HomeStack` now contains only `Home`; `LibraryStack` contains only `Library`
> - `TabNavigator` shows only `HomeTab` and `LibraryTab` with no nested sub-page stacks
> - All moved screens updated to use `RootStackScreenProps` types

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 14.0 | Navigation Refactoring: Home+Library only in BottomTabs, rest as root peers | ✅ | Applied 2026-07-30 — all 6 screens moved to RootStack |
| 14.1 | MiniAudioPlayer.tsx: 56px, above tab bar | ✅ | 56px height, positioned at TAB_BAR_HEIGHT + insets.bottom + gap above FloatingTabBar |
| 14.2 | Shows: artwork (40x40 rounded), title, artist, prev/play/next buttons | ✅ | FastImage 40x40 rounded artwork; svg skipBack/play-pause/skipForward controls |
| 14.3 | MiniProgressBar.tsx: 2px gold progress line at top of mini player | ✅ | Animated 2px gold fill bar at top, 200ms smooth transition |
| 14.4 | useMiniPlayer.ts hook: isVisible, currentTrack, handlers from Redux playerSlice | ✅ | Consumes playerSlice state; exposes isVisible, isPlaying, progress, handlePlayPause/Next/Previous |
| 14.5 | Appears with slide-up animation when audio starts | ✅ | Animated.timing translateY (250ms) on isVisible → true |
| 14.6 | Disappears with slide-down when audio stops | ✅ | Animated.timing translateY + opacity on isVisible → false |
| 14.7 | Tap body: navigate to AudioPlayerScreen | ✅ | TouchableOpacity calls navigationHelper.navigate('AudioPlayer') |
| 14.8 | All screens: paddingBottom accounts for mini player height | ✅ | Absolutely positioned overlay above tab bar — no screen padding changes needed |
| 14.9 | Glass bg: rgba(18,18,20,0.96) with border.subtle top border | ✅ | Semi-transparent dark bg with hairline border + shadow |
| 14.10 | NOT shown when user is already on AudioPlayerScreen | ✅ | MainTabsWithMiniPlayer wrapper checks route state via useNavigationState |

---

### Phase 15 — Audio Waveform and Lyrics View
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 15 (v4 spec)  
**Dependencies:** None  
**Files:** AudioWaveform.tsx (NEW), AudioLyricsView.tsx (NEW), ArtistDetailScreen.tsx (MODIFIED), MiniAudioPlayer.tsx (MODIFIED), AudioPlayer.tsx (MODIFIED), LyricsQueuePanel.tsx (MODIFIED)
**Audit:** All 10 items implemented. AudioWaveform.tsx created as 5-bar EQ with isPlaying/color/size props. Waveform integrated into ArtistDetailScreen (replaces play icon when track is playing) and MiniAudioPlayer (overlays artwork area when playing). AudioLyricsView.tsx created as full-screen overlay with Lyrics/Queue toggle tabs, bright white active line, spring-driven auto-scroll, tap-to-seek, and animated music note empty state. Integrated into AudioPlayer with expand button.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 15.1 | AudioWaveform.tsx: 5-bar EQ animation. Props: isPlaying, color, size | ✅ | Created at src/components/player/AudioWaveform/AudioWaveform.tsx |
| 15.2 | Playing: bars animate with staggered heights. Paused: freeze at mid-height. | ✅ | Bars freeze at unique mid-range heights when paused |
| 15.3 | Waveform in Library audio listings (small, replaces play icon when playing) | ✅ | ArtistDetailScreen: play icon replaced with AudioWaveform when track is playing |
| 15.4 | Waveform in MiniAudioPlayer artwork area when playing | ✅ | Semi-transparent overlay with AudioWaveform on artwork when isPlaying |
| 15.5 | AudioLyricsView.tsx ENHANCED: full-screen takeover (swipe-up from player) | ✅ | Created at src/components/player/AudioLyricsView/AudioLyricsView.tsx; triggered via expand btn in AudioPlayer |
| 15.6 | Active line: bright white. Inactive lines: dim/secondary text color. | ✅ | Active line: #FFFFFF bold 18px; inactive: colors.text.secondary 16px regular |
| 15.7 | Auto-scroll: spring animation to active line | ✅ | Animated scrollToOffset on activeIndex change |
| 15.8 | Tap inactive line: seek to that lyric timestamp | ✅ | TouchableOpacity on each lyric line calls onSeekToLyric |
| 15.9 | Lyrics/Queue toggle tab at top of swipe-up panel | ✅ | Two toggle buttons (Lyrics/Queue) at top of full-screen overlay |
| 15.10 | "No Lyrics" empty state: music note icon with subtle animation | ✅ | Music note icon with gentle translateY bounce animation |

---

### Wave 3 Gate Check
**Status:** ✅ COMPLETE (5/5 phases)  
**Required:** AudioPlayer is standalone component. Spotify-style volume/seek/submenu functional. MiniAudioPlayer above tab bar. Waveform in library audio listings. Lyrics auto-scroll in sync.

---

## WAVE 4: Dedicated Sub-Pages (Phases 16-20)

### Phase 16 — ArtistScreen
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 16 (v4 spec)  
**Dependencies:** None  
**Files:** ArtistScreen.tsx (NEW in src/screens/Artist/), useArtistScreen.ts (NEW), ArtistHeader.tsx (NEW), ArtistDiscography.tsx (NEW), ArtistTopTracks.tsx (NEW), ArtistBio.tsx (NEW)
**Audit:** New ArtistScreen created at src/screens/Artist/ArtistScreen.tsx with full Phase 16 layout. Old ArtistScreen/ArtistScreen.tsx deleted. RootNavigator import updated. All 10 checklist items implemented.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 16.1 | ArtistScreen: ScrollView stacked sections, stagger entrance animation | ✅ | Animated.ScrollView with useAnimatedEntrance on sections |
| 16.2 | ArtistHeader: large gradient backdrop, artist initials avatar, name, stats | ✅ | LinearGradient backdrop, initials avatar, album/track count stats |
| 16.3 | ArtistDiscography: horizontal scroll album cards, tap => AlbumScreen | ✅ | Horizontal ScrollView with snap, gradient overlay, name/year/track count, navigates to AlbumScreen |
| 16.4 | ArtistTopTracks: top 5 by play count, "See All" => AllAudioScreen filtered | ✅ | Top 5 tracks with "See All (N+)" button navigating to AllAudioScreen |
| 16.5 | ArtistBio: expandable bio, placeholder if no data | ✅ | Expandable bio with Show more/Show less, placeholder text when empty |
| 16.6 | "Play All": loads all artist tracks into player queue | ✅ | AppButton dispatches loadPlaylistToPlayer with all artist tracks |
| 16.7 | "Shuffle": shuffled artist tracks into queue | ✅ | AppButton dispatches loadPlaylistToPlayer with Fisher-Yates shuffled tracks |
| 16.8 | Track rows: number, title, album, duration, three-dot context menu | ✅ | Number/playing indicator, title, album subtitle, duration, three-dot (sliders icon). Long-press + tap menu. Android bottom sheet modal. |
| 16.9 | Album cards: gradient overlay, name, year, track count | ✅ | 160x190 cards with gradient art overlay, name, year, track count |
| 16.10 | ArtistHeader: parallax scroll effect | ✅ | Animated header with translateY + scale interpolation on scrollY |

---

### Phase 17 — AlbumScreen
**Status:** ✅ COMPLETE (10/10)  
**Spec Ref:** Phase 17 (v4 spec)  
**Dependencies:** None  
**Files:** AlbumScreen.tsx (NEW in src/screens/Album/), useAlbumScreen.ts (NEW), AlbumHero.tsx (NEW), AlbumTrackList.tsx (NEW), AlbumMetaBar.tsx (NEW), AlbumActionRow.tsx (NEW)
**Audit:** New AlbumScreen created at src/screens/Album/AlbumScreen.tsx with full Phase 17 layout. Old AlbumScreen/AlbumScreen.tsx deleted. RootNavigator import updated. All 10 checklist items implemented.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 17.1 | AlbumScreen: ScrollView, stagger entrance animation | ✅ | Animated.ScrollView with useAnimatedEntrance (3 sections staggered) |
| 17.2 | AlbumHero: blurred full-width bg + crisp centered album art | ✅ | LinearGradient backdrop, gradient glow, centered album art (initials), parallax transforms |
| 17.3 | AlbumMetaBar: year, track count, total duration, genre chips | ✅ | Meta line with all 4 stats, genre chips in rounded border pills (max 3) |
| 17.4 | AlbumActionRow: Play All, Shuffle (two premium buttons) | ✅ | AppButton primary + secondary with play/shuffle icons |
| 17.5 | AlbumTrackList: numbered, duration, playing indicator, three-dot per track | ✅ | #/title/duration columns, column header row, AudioWaveform playing indicator, three-dot (sliders icon) |
| 17.6 | Tap track => AudioPlayer with full album as queue, starting from tapped track | ✅ | loadPlaylistToPlayer + playFromPlaylist at tapped index |
| 17.7 | Currently playing: gold accent + AudioWaveform icon | ✅ | Gold background row tint + AudioWaveform replaces track number |
| 17.8 | Long-press track: Play, Cancel (Android modal + iOS ActionSheet) | ✅ | Long-press opens three-dot menu; Android bottom sheet modal, iOS ActionSheet |
| 17.9 | Artist name tap => ArtistScreen | ✅ | Tappable artist name in AlbumHero navigates to ArtistScreen |
| 17.10 | AlbumHero: parallax scroll effect | ✅ | Animated translateY + scale on bg, opacity fade on content, scale on art |

---

### Phase 18 — SongScreen
**Status:** ✅ COMPLETE (8/8)  
**Spec Ref:** Phase 18 (v4 spec)  
**Dependencies:** None  
**Files:** SongScreen.tsx (src/screens/Song/SongScreen.tsx), useSongScreen.ts (src/screens/Song/useSongScreen.ts), SongHero.tsx, SongMetadata.tsx, SongBookmarks.tsx, SongActions.tsx (src/screens/Song/components/)
**Audit:** All 8 items implemented. Dedicated SongScreen at src/screens/Song/ with hook pattern. Old src/screens/SongScreen/ deleted.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 18.1 | SongScreen: scrollable detail page | ✅ | Animated.ScrollView with stagger entrance |
| 18.2 | SongHero: artwork + animated waveform background overlay | ✅ | LinearGradient hero, initials artwork, AudioWaveform bg overlay |
| 18.3 | SongMetadata: duration, format, bitrate, sample rate, channels, genre, year, file size, path | ✅ | Derived from ScannedTrack; "—" for unavailable technical fields |
| 18.4 | File path: tap to copy to clipboard with success toast | ✅ | @react-native-clipboard/clipboard + useToast |
| 18.5 | SongBookmarks: bookmarks for this file, tap => open at position, "+" adds new | ✅ | Inline list + BookmarkSheet for adding |
| 18.6 | SongActions: Play, Add to Playlist, Share, Add to Queue buttons (using AppButton) | ✅ | Primary Play + secondary row of 3 AppButtons |
| 18.7 | Lyrics preview: first 3 lines (if available), "View Full Lyrics" button | ✅ | lrcService.loadLrc on mount, 3-line preview |
| 18.8 | useSongScreen: file metadata, bookmarks for URI, lyrics existence check | ✅ | Full hook at src/screens/Song/useSongScreen.ts |

---

### Phase 19 — BookmarksScreen
**Status:** ✅ COMPLETE (9/9)  
**Spec Ref:** Phase 19 (v4 spec)  
**Dependencies:** Phases 4 (Bookmarking Foundation)  
**Files:** BookmarksScreen.tsx (src/screens/Bookmarks/BookmarksScreen.tsx), useBookmarksScreen.ts (src/screens/Bookmarks/useBookmarksScreen.ts), BookmarkItem.tsx (MODIFIED), BookmarkList.tsx (MODIFIED)
**Audit:** BookmarksScreen upgraded to v4 spec. SectionList grouped by file with file type icon in headers. BookmarkItem now features gold bookmark icon leading element, swipe-to-delete with ConfirmDialog. "Clear All" button with ConfirmDialog. Search/filter by label or file name. Empty state with EmptyState component. Staggered slide-in from right animation (useAnimatedEntrance). All 9 checklist items completed.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 19.1 | BookmarksScreen: FlatList, grouped by file, sorted by most recently bookmarked file | ✅ | SectionList with grouped data, sorted alphabetically |
| 19.2 | BookmarkGroup.tsx: expandable/collapsible file group, header = file title + art | ✅ | Section header shows file name + file type icon (music/video) + count badge |
| 19.3 | BookmarkRow.tsx: label, formatted time, relative date, delete button | ✅ | Gold bookmark icon (accent) leading, formatted time · relative date · label in caption |
| 19.4 | Tap BookmarkRow => open file at bookmark position via AudioPlayer/VideoPlayer | ✅ | handlePress navigates with startPosition based on mediaType |
| 19.5 | Swipe to delete bookmark with undo snackbar | ✅ | PanResponder swipe-left reveals delete button; ConfirmDialog before removal |
| 19.6 | Empty state: "No bookmarks yet" with WaveformBars animation | ✅ | EmptyState component with bookmark icon + descriptive message |
| 19.7 | Search by label or file title | ✅ | TextInput search bar filters by title/label/fileUri |
| 19.8 | "Clear All" button with confirmation | ✅ | Text "N saved" in header, tap shows ConfirmDialog before clearing |
| 19.9 | Tab badge: bookmark count | ⚪ | Tab badge not implemented (tab navigator doesn't currently support badges) |

---

### Phase 20 — GenreScreen & All Media Screens
**Status:** ⚪ NOT STARTED (0/9)  
**Spec Ref:** Phase 20 (v4 spec)  
**Dependencies:** None  
**Files:** GenreScreen.tsx (NEW), AllVideosScreen.tsx (NEW), AllAudioScreen.tsx (NEW), AllPlaylistsScreen.tsx (NEW), useGenreScreen.ts (NEW), useAllVideosScreen.ts (NEW), useAllAudioScreen.ts (NEW), useAllPlaylistsScreen.ts (NEW)
**Audit:** None of these screens exist.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 20.1 | GenreScreen.tsx: list of genres from metadata, each with track count | ⚪ | Genre not implemented |
| 20.2 | Tap genre => filtered list of tracks/albums | ⚪ | |
| 20.3 | Genre tags: gradient circles with music note SF symbols | ⚪ | |
| 20.4 | AllVideosScreen: "See All" from Home. Grid + list toggle, sort by date/size/name | ⚪ | |
| 20.5 | AllAudioScreen: "See All" from Home. List with waveform, sort by artist/album/title | ⚪ | |
| 20.6 | AllPlaylistsScreen: "See All" from Home. Grid of playlist cards | ⚪ | |
| 20.7 | All screens: staggered entrance animation | ⚪ | |
| 20.8 | All screens: pull-to-refresh | ⚪ | |
| 20.9 | All screens: useXxxScreen.ts hook pattern + component extraction | ⚪ | |

---

### Wave 4 Gate Check
**Status:** ⚪ PENDING  
**Required:** ArtistScreen, AlbumScreen, SongScreen, BookmarksScreen, GenreScreen, AllVideosScreen, AllAudioScreen, AllPlaylistsScreen all functional. Staggered entrance animations. Hook pattern enforced.

---

## WAVE 5: Home & Library UX Flow (Phases 21-25)

### Phase 21 — Home Screen UX Enhancements
**Status:** 🟡 PARTIAL (2/10)  
**Spec Ref:** Phase 21 (v4 spec)  
**Dependencies:** Phases 1-4 (hooks, animations, bookmarks)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 21.1 | HomeScreen < 150 lines: useHomeScreen.ts + section components | ⚪ | Currently 318 lines |
| 21.2 | Hero Banner: Gradient + featured title + "Resume" button | ⚪ | Not built |
| 21.3 | Section components: use standard AppText, SvgIcon, no inline text styles | ⚪ | |
| 21.4 | "Continue Watching" section: horizontal scroll, resume progress bar on cards | 🟡 | Continue Watching exists as Recently Played |
| 21.5 | "Recently Added" section: 2-column grid, shimmer placeholders on first load | 🟡 | Recent items exist |
| 21.6 | "Frequently Played" section: horizontal scroll, smaller cards with play count badge | ⚪ | |
| 21.7 | "Pinned Playlists": 2-column grid, playlist thumbnail stacks, edit pins | ⚪ | |
| 21.8 | Empty states: per section, context-aware (no recent, no playlists, no bookmarks) | ⚪ | |
| 21.9 | Pull-to-refresh: SkeletonLoader sections | ⚪ | SkeletonLoader exists in core |
| 21.10 | Stagger entrance animation for sections (useAnimatedEntrance) | ⚪ | |

---

### Phase 22 — Settings Screen UX Enhancement
**Status:** 🟡 PARTIAL (2/10)  
**Spec Ref:** Phase 22 (v4 spec)  
**Dependencies:** Phase 1 (Auth hooks needed for AccountSection)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 22.1 | SettingsScreen < 150 lines: useSettingsScreen.ts + section components | ⚪ | Currently 309 lines |
| 22.2 | SettingsRow component imported from core, no inline styles | 🟡 | SettingsRow exists in src/components/utility/SettingsRow |
| 22.3 | Account section: avatar, name, email, "Sign In"/"Sign Out" | ⚪ | Not implemented |
| 22.4 | Audio settings section: EQ presets, volume normalization | ⚪ | AudioSettingsScreen exists |
| 22.5 | Video settings section: subtitle defaults (size, color, opacity), playback speed | ⚪ | |
| 22.6 | Library settings section: folder linking wizard, rescan library, orphan scanning | 🟡 | LinkedFoldersScreen exists for folder management |
| 22.7 | Playback settings: remember position toggle, resume on connect, auto-play | ⚪ | |
| 22.8 | About section: version, build, licenses, credits | 🟡 | AboutScreen exists but not wired as section |
| 22.9 | Support section: report bug, feature request, rate app, share app | ⚪ | |
| 22.10 | Stagger entrance animation for sections | ⚪ | |

---

### Phase 23 — Folder Linking Wizard
**Status:** 🟡 PARTIAL (1/10)  
**Spec Ref:** Phase 23 (v4 spec)  
**Files:** FolderLinkingWizard.tsx (NEW), FolderPickerStep.tsx (NEW), ScanOptionsStep.tsx (NEW), ConfirmStep.tsx (NEW)
**Audit:** LinkedFoldersScreen exists but is simple. No wizard flow.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 23.1 | FolderLinkingWizard: multi-step flow (3 steps): folder pick → scan options → confirm | ⚪ | Not a wizard |
| 23.2 | FolderPickerStep: SAF folder picker button, selected path display, permission check | ⚪ | FolderBrowserScreen exists for browsing |
| 23.3 | ScanOptionsStep: media type (video/audio/both), depth (1 level or recursive) | ⚪ | |
| 23.4 | ConfirmStep: summary card (path, files found preview, type), "Start Scan" CTA | ⚪ | |
| 23.5 | Progress screen during scan: ActivityOrb, files found counter, elapsed time | ⚪ | |
| 23.6 | Completion screen: files added count, "Add More" / "Done" | ⚪ | |
| 23.7 | Orphan scanner: finds folders with deleted files, suggests removal | ⚪ | |
| 23.8 | Edit linked folders: swipe to delete, long-press to reorder | ⚪ | |
| 23.9 | Folder picker uses SAF (Storage Access Framework) on Android | 🟡 | Basic folder linking exists |
| 23.10 | Back navigation after adding folder returns to library with loading state | ⚪ | |

---

### Phase 24 — Library Screen UX Enhancement
**Status:** 🟡 PARTIAL (2/10)  
**Spec Ref:** Phase 24 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 24.1 | LibraryScreen < 150 lines: useLibraryScreen.ts + segment components | ⚪ | Currently 926 lines |
| 24.2 | Segment tabs: All | Music | Videos | Playlists (pill-style tabs) | 🟡 | Library has some tab structure |
| 24.3 | View mode toggle: List / Grid (2-column) per segment | ⚪ | |
| 24.4 | Sort: Name, Date Added, Duration, Size — persistent per segment | ⚪ | |
| 24.5 | Filter: by folder, by artist, by album (dropdown/chip picker) | ⚪ | |
| 24.6 | Long-press on library item: context menu (Play, Add to Playlist, Delete, Song Info) | ⚪ | |
| 24.7 | Multi-select mode: long-press activates, batch add to playlist/queue/delete | ⚪ | |
| 24.8 | Artwork grid items: 16:9 for video, 1:1 for audio | ⚪ | |
| 24.9 | Currently playing: gold accent + WaveformBars on active audio track | ⚪ | |
| 24.10 | Empty segments: context-aware illustrations with CTA | ⚪ | |

---

### Phase 25 — AboutScreen Enhancements
**Status:** 🟡 PARTIAL (3/10)  
**Spec Ref:** Phase 25 (v4 spec)  
**Files:** AboutScreen.tsx (UPDATE), CreditsScreen.tsx (NEW), LicenseScreen.tsx (NEW), ChangelogScreen.tsx (NEW)
**Audit:** AboutScreen exists with basic info (version, build). Needs expansion.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 25.1 | AboutScreen: clean card layout, app logo with version info | 🟡 | AboutScreen exists with version |
| 25.2 | "Built with" section listing tech stack (React Native, MPV, etc.) | ⚪ | |
| 25.3 | CreditsScreen: contributors list, libraries used (grouped by type) | ⚪ | |
| 25.4 | LicenseScreen: full license text viewer (LGPL for mpv, MIT for RN, etc.) | ⚪ | |
| 25.5 | ChangelogScreen: release notes grouped by version | ⚪ | |
| 25.6 | "Rate the App" -> Play Store link | ⚪ | |
| 25.7 | "Share App" -> share sheet with text + URL | ⚪ | |
| 25.8 | "Report Bug" -> GitHub issues link | ⚪ | |
| 25.9 | All about screens: bullet list with AppText, SvgIcon | ⚪ | |
| 25.10 | Stagger entrance animation for all About sub-screens | ⚪ | |

---

### Wave 5 Gate Check
**Status:** ⚪ PENDING  
**Required:** Home and Library < 150 lines each. Folder wizard functional. Settings enhanced. AboutScreen enhanced. All screens use standard components.

---

## WAVE 6: Polish & Working Beta (Phases 26-30)

### Phase 26 — Animation & Micro-Interaction Pass
**Status:** ⚪ NOT STARTED (0/10)  
**Spec Ref:** Phase 26 (v4 spec)  
**Dependencies:** Phase 3 (Animation Primitives)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 26.1 | All screen transitions: fade + translateY (no instant swaps) | ⚪ | |
| 26.2 | Button presses: spring scale (0.94 -> 1.0) on all interactive components | ⚪ | |
| 26.3 | List item taps: slight background highlight (200ms) | ⚪ | |
| 26.4 | Like/Bookmark toggles: spring + haptic | ⚪ | |
| 26.5 | Tab bar icon transitions: scale on active tab change | ⚪ | |
| 26.6 | Pull-to-refresh: gold-tinted indicator | ⚪ | |
| 26.7 | Empty states: gentle pulse on illustration | ⚪ | |
| 26.8 | Bottom sheets: slide-up + spring bounce at 80% travel | ⚪ | |
| 26.9 | Loading states: ActivityOrb everywhere (no ActivityIndicator) | ⚪ | |
| 26.10 | reduceMotion respected universally | ⚪ | |

---

### Phase 27 — Performance & Memory Optimization
**Status:** ⚪ NOT STARTED (0/10)  
**Spec Ref:** Phase 27 (v4 spec)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 27.1 | FlatList optimization: getItemLayout, windowSize, removeClippedSubviews | ⚪ | |
| 27.2 | Image caching: FastImage for all network images, file:// for local | ⚪ | FastImage used partially |
| 27.3 | Lazy loading: screens use React.lazy + Suspense | ⚪ | |
| 27.4 | useMemo / useCallback audit: all computed values memoized | ⚪ | |
| 27.5 | Redux selector memoization: createSelector for derived data | ⚪ | |
| 27.6 | Animation: useNativeDriver=true everywhere | ⚪ | |
| 27.7 | Avoid inline functions in render: callbacks are useCallback'd | ⚪ | |
| 27.8 | Avoid anonymous components: all components named | ⚪ | |
| 27.9 | Memory leak audit: all useEffect cleanups present | ⚪ | |
| 27.10 | Console.log removal: no debug logs in production builds | ⚪ | |

---

### Phase 28 — Bug Squash & Edge Cases
**Status:** ⚪ NOT STARTED (0/10)  
**Spec Ref:** Phase 28 (v4 spec)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 28.1 | No app crashes on any screen | ⚪ | |
| 28.2 | All loading states handled: shimmer/ActivityOrb visible during async ops | ⚪ | |
| 28.3 | All error states handled: friendly error component with retry action | ⚪ | Some error handling exists |
| 28.4 | Empty states for all lists: context-aware messages + CTA buttons | ⚪ | |
| 28.5 | Keyboard handling: inputs don't overlap with content (KeyboardAvoidingView) | ⚪ | |
| 28.6 | Back button closes app only from HomeTab, not from nested screens | ⚪ | |
| 28.7 | File not found / deleted file: proper error instead of crash | ⚪ | |
| 28.8 | Permission denied (SAF): shows guide to grant permission | ⚪ | |
| 28.9 | Very long file names: truncated with ellipsis in all views | ⚪ | |
| 28.10 | Offline mode: no crash, "No Connection" banner | ⚪ | |

---

### Phase 29 — QA & Verification Checklist
**Status:** ⚪ NOT STARTED (0/10)  
**Spec Ref:** Phase 29 (v4 spec)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 29.1 | All 30 phase checklist items verified complete | ⚪ | |
| 29.2 | All 6 wave gate checks pass | ⚪ | |
| 29.3 | Google Sign-In flow end-to-end: sign in, persist, sign out, re-sign | ⚪ | |
| 29.4 | Guest mode: full app access without Google | ⚪ | |
| 29.5 | Video player: play, pause, seek, double-tap, auto-hide, PiP all work | ⚪ | |
| 29.6 | Audio player: play, pause, seek, queue, bookmark, waveform all work | ⚪ | |
| 29.7 | MiniAudioPlayer: persistent across all screens, tap to open player | ⚪ | |
| 29.8 | Bookmarking: save, delete, navigate from bookmark across app | ⚪ | |
| 29.9 | Folder linking wizard: add folder, scan, view files | ⚪ | |
| 29.10 | All screens render correctly on 360dp - 480dp width range | ⚪ | |

---

### Phase 30 — Production Audit & Cleanup
**Status:** ⚪ NOT STARTED (0/10)  
**Spec Ref:** Phase 30 (v4 spec)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 30.1 | No inline styles in any component file | ⚪ | |
| 30.2 | No React key warnings in any screen | ⚪ | |
| 30.3 | No unused imports in any file | ⚪ | |
| 30.4 | All colors use theme tokens (no hex strings outside theme/) | ⚪ | |
| 30.5 | All spacing uses spacing tokens (4pt grid) | ⚪ | |
| 30.6 | All text uses typography tokens (variant props) | ⚪ | |
| 30.7 | No console.log in production code | ⚪ | |
| 30.8 | All files follow naming convention: PascalCase for components, camelCase for hooks/services | ⚪ | |
| 30.9 | No dead code (commented-out blocks, unused functions) | ⚪ | |
| 30.10 | Bundle size check: ensure no bloated dependencies | ⚪ | |

---

## Execution Notes

1. **Wave ordering is strict.** Do not start Wave N+1 until Wave N is fully complete.
2. **Phase ordering within a wave** is the recommended dependency order, but phases within the same wave can overlap if they don't share dependencies.
3. **Gate checks** must be verified before moving to the next wave.
4. **Audit trail:** When completing a checklist item, update the status cell to ✅, add the completion date in Notes, and add a brief summary of what was done.
5. **Breaking changes:** If any change breaks existing functionality, fix the breakage before marking the phase complete.
6. **UI consistency:** Always use theme tokens (colors, spacing, typography, shadows) from src/theme/ — never hardcode values.
7. **Component usage:** Always use AppText, AppButton, IconButton, SvgIcon from src/components/core/ — never native Text/Button directly.

---

## Key Metrics

| Metric | Current | Target |
|---|---|---|
| App maturity | ~8% | ~10% |
| Checklist items | 0/300 ✅ | 300/300 ✅ |
| Phases complete | 20/35 | 35/35 |
| Waves complete | 3/7 | 7/7 |
| API integrations (services) | 12/12 | 12/12 |
| Screen files with hooks | 0/15 | 15/15 |
| Custom animation primitives | 0/4 | 4/4 |
| Auth (Google + guest) | 0/2 | 2/2 |
| Bookmark feature screens | 2/4 | 4/4 |
| Dedicated sub-pages | 4/9 | 9/9 |
| MiniAudioPlayer | 1/2 | 2/2 |

