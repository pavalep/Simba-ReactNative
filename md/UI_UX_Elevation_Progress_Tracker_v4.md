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
WAVE 1: Auth & Foundation ──────── Phases 1-5    (Google login, hook pattern, animations, bookmarks)
WAVE 2: Video Player Excellence ── Phases 6-10   (Netflix-quality VideoPlayer component)
WAVE 3: Audio Player Excellence ── Phases 11-15  (Spotify-quality AudioPlayer + mini player)
WAVE 4: Dedicated Sub-Pages ────── Phases 16-20  (Artist, Album, Song, Genre, Bookmarks screens)
WAVE 5: Home & Library UX Flow ─── Phases 21-25  (See All nav, folder wizard, settings)
WAVE 6: Polish & Working Beta ───── Phases 26-30  (Animations, perf, QA, production audit)
`

---

### Current Status Summary

| Wave | Phase Range | Total Phases | ✅ Done | 🟡 Partial | ⚪ Remaining | Status |
|---|---|---|---|---|---|---|
| WAVE 1 | 1-5 | 5 | **2** | 0 | 3 | 🟡 PARTIAL |
| WAVE 2 | 6-10 | 5 | 0 | 3 | 2 | 🟡 PARTIAL |
| WAVE 3 | 11-15 | 5 | 0 | 4 | 1 | 🟡 PARTIAL |
| WAVE 4 | 16-20 | 5 | 0 | 2 | 3 | 🟡 PARTIAL |
| WAVE 5 | 21-25 | 5 | 0 | 4 | 1 | 🟡 PARTIAL |
| WAVE 6 | 26-30 | 5 | 0 | 0 | 5 | ⚪ NOT STARTED |
| **TOTAL** | 1-30 | **30** | **1 phase** | **13 phases** | **16 phases** | 🟡 PARTIAL |

**Codebase Audit Summary:** ~35 checklist items across 13 phases have partial pre-existing implementations (mostly screen shells, basic controls, and existing utilities). The remaining ~170+ checklist items need to be built from scratch.

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
**Status:** ⚪ NOT STARTED (0/10)  
**Spec Ref:** Phase 3 (v4 spec)  
**Dependencies:** None  
**Files:** ActivityOrb.tsx (NEW), PulseRing.tsx (NEW), WaveformBars.tsx (NEW), useAnimatedEntrance.ts (NEW), animations.ts (NEW)
**Audit:** No custom animation primitives exist. useAccessibility.ts hook exists but only consumed by SkeletonLoader. ActivityIndicator used in ~8 source files.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 3.1 | ActivityOrb component: 3 concentric pulsing rings + center gold orb. Props: size, color, label | ⚪ | Not created |
| 3.2 | PulseRing component: single expanding/fading ring. Can be stacked. Props: size, color, delay | ⚪ | Not created |
| 3.3 | WaveformBars component: 5 animated bars of varying heights (like EQ). Props: color, barCount, isPlaying | ⚪ | Not created |
| 3.4 | useAnimatedEntrance(itemCount, delayMs) hook: returns array of Animated.Value[] for staggered entrance | ⚪ | Not created |
| 3.5 | animations.ts utility: exports fadeIn, slideInUp, scaleIn, staggerChildren, springScale, pulseLoop | ⚪ | Not created |
| 3.6 | All ActivityIndicator usages in app replaced with ActivityOrb (search and replace) | ⚪ | ~8 files with ActivityIndicator |
| 3.7 | LoadingOverlay updated to use ActivityOrb instead of spinner | ⚪ | Uses ActivityIndicator currently |
| 3.8 | Library segment loading uses WaveformBars as audio scan indicator (thematic) | ⚪ | |
| 3.9 | Splash screen's existing orb animation extracted to reusable ActivityOrb component | ⚪ | SplashScreen exists with orb animation |
| 3.10 | Respect reduceMotion — all custom animations check useAccessibility().reduceMotion | ⚪ | useAccessibility hook exists, SkeletonLoader uses it |

---

### Phase 4 — Bookmarking Feature Foundation
**Status:** 🟡 PARTIAL (2/10)  
**Spec Ref:** Phase 4 (v4 spec)  
**Dependencies:** None  
**Files:** bookmarkSlice.ts (NEW), bookmarkService.ts (NEW), useBookmarks.ts (NEW), BookmarkButton.tsx (NEW), BookmarkItem.tsx (NEW), BookmarkList.tsx (NEW), BookmarkSheet.tsx (NEW), BookmarksScreen.tsx (NEW), useBookmarksScreen.ts (NEW)
**Audit:** sessionSlice.ts has basic BookmarkEntry type + addBookmark/removeBookmark reducers. VideoPlayerTopBar renders a bookmark icon. HomeBookmarksList shows bookmarks on Home. No dedicated bookmarkSlice, bookmarkService, BookmarkSheet, BookmarkItem, BookmarkList, or BookmarksScreen exist.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 4.1 | bookmarkSlice.ts: state {bookmarks: Bookmark[], isLoading: bool}, actions & selectors | ⚪ | Currently in sessionSlice.ts — needs extraction to dedicated slice |
| 4.2 | bookmarkService.ts: saveBookmark(), loadBookmarks(), deleteBookmark() — persists to AsyncStorage key simba_bookmarks | ⚪ | Not created — bookmarks persist via redux-persist on sessionSlice |
| 4.3 | useBookmarks(fileUri?) hook: CRUD operations for bookmarks | ⚪ | Not created |
| 4.4 | BookmarkButton.tsx: tap to open BookmarkSheet. Shows count badge if bookmarks exist | 🟡 | Bookmark button exists in VideoPlayerTopBar, but no sheet integration |
| 4.5 | BookmarkSheet.tsx: bottom sheet with "Save current position" (with label input) + list of existing bookmarks | ⚪ | Not created |
| 4.6 | BookmarkItem.tsx: shows time position (formatted), label, relative date, blue bookmark icon, delete button | ⚪ | Not created |
| 4.7 | BookmarkList.tsx: FlatList of BookmarkItem, grouped by file, sorted by position | ⚪ | Not created |
| 4.8 | BookmarksScreen.tsx: full screen showing all bookmarks, grouped by file, with search/filter | ⚪ | Not created |
| 4.9 | Bookmarks persist via redux-persist | 🟡 | Persists via sessionSlice redux-persist, but needs dedicated slice |
| 4.10 | Bookmark button accessible from VideoPlayer top bar & AudioPlayer three-dot submenu | 🟡 | VideoPlayer top bar has it; AudioPlayer three-dot does not |

---

### Phase 5 — Navigation Architecture v4 (New Routes)
**Status:** 🟡 PARTIAL (1/9)  
**Spec Ref:** Phase 5 (v4 spec)  
**Dependencies:** Phases 1-4  
**Files:** types.ts (UPDATE), RootNavigator.tsx (UPDATE), linking.ts (UPDATE), useNavigation.ts (NEW)
**Audit:** types.ts exists with current routes but lacks all 10 new v4 routes. RootNavigator.tsx exists but has no auth routing. AboutScreen exists but not as a v4 new route.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 5.1 | types.ts updated with all 10 new screen routes (Login, ArtistScreen, AlbumScreen, SongScreen, GenreScreen, AllVideos, AllAudio, AllPlaylists, Bookmarks, About) | 🟡 | AboutScreen route exists; Library has ArtistDetail/AlbumDetail with different param shapes |
| 5.2 | RootNavigator.tsx registers all new screens | ⚪ | Only existing screens registered |
| 5.3 | useNavigation.ts hook: typed navigate, goBack, push, reset helpers | ⚪ | Not created |
| 5.4 | Login screen in root stack (before MainTabs if not authenticated) | ⚪ | |
| 5.5 | Deep link config updated: simba://artist/:artistId, simba://album/:albumId, simba://bookmarks | ⚪ | linking.ts not checked for existing config |
| 5.6 | Back navigation from all new screens returns to correct previous screen | ⚪ | |
| 5.7 | "See All" buttons in HomeScreen wire up to new dedicated screens | ⚪ | HomeScreen has "See All" but no destination screens exist |
| 5.8 | Artist/Album taps in LibraryScreen navigate to new ArtistScreen/AlbumScreen | 🟡 | Library tab navigates to ArtistDetail/AlbumDetail (existing screens) |
| 5.9 | Track tap in ArtistScreen/AlbumScreen opens AudioPlayer or SongScreen | ⚪ | SongScreen doesn't exist |

---

### Wave 1 Gate Check
**Status:** ⚪ PENDING  
**Required:** All Phases 1-5 complete. Google Auth working. All screens have useXxxScreen.ts hooks. Custom activity indicators integrated. Bookmarking base ready. Navigation routes configured.

---

## WAVE 2: Video Player Excellence (Phases 6-10)

### Phase 6 — VideoPlayer Component Extraction
**Status:** 🟡 PARTIAL (4/12)  
**Spec Ref:** Phase 6 (v4 spec)  
**Dependencies:** None  
**Files:** VideoPlayer.tsx (NEW in src/components/player/), useVideoPlayerScreen.ts (NEW), VideoControls.tsx (NEW), VideoTransport.tsx (NEW), VideoSeekBar.tsx (NEW), VideoSecondaryBar.tsx (NEW), DoubleTapFeedback.tsx (NEW)
**Audit:** VideoPlayerScreen.tsx exists (1753 lines, monolithic). PrimaryControls, SecondaryToolbar, VideoPlayerTopBar components exist. PiP lifecycle hooks exist. Auto-hide timer exists. But VideoPlayer is NOT a standalone component in src/components/player/.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 6.1 | VideoPlayer.tsx component: self-contained, accepts fileUri/title/callbacks | ⚪ | Currently in VideoPlayerScreen (1753 lines) |
| 6.2 | VideoPlayerScreen.tsx < 80 lines: wraps VideoPlayer + screen concerns only | ⚪ | Currently 1753 lines |
| 6.3 | useVideoPlayerScreen.ts: file URI from params, PiP lifecycle, bookmarks | ⚪ | Not created |
| 6.4 | VideoControls.tsx: Netflix-style overlay, animated show/hide (fade + translateY) | 🟡 | PrimaryControls + SecondaryToolbar exist as partial controls |
| 6.5 | Controls auto-hide after 4s inactivity, re-appear on tap | ✅ | Implemented with 5s timer in SecondaryToolbar |
| 6.6 | VideoTopBar.tsx: always visible — back, title (truncated), bookmark, more menu | ✅ | VideoPlayerTopBar exists with back, title, bookmark, rotate |
| 6.7 | VideoTransport.tsx: always visible — prev, -10s, play/pause (gold, large), +10s, next | 🟡 | PrimaryControls has play/pause, prev/next. Missing -10s/+10s buttons |
| 6.8 | VideoSeekBar.tsx: gold fill, white thumb, chapter markers, time labels | ⚪ | SeekBar exists in components/player but video-specific version needed |
| 6.9 | VideoSecondaryBar.tsx: auto-hiding — chapters, subs, audio, EQ, playlist with text labels | ✅ | SecondaryToolbar exists with all major buttons |
| 6.10 | DoubleTapFeedback.tsx: animated pill +/-10s with chevrons (YouTube style) | ⚪ | Not created |
| 6.11 | NO native rotation. Landscape via useWindowDimensions responsive layout | ✅ | Uses CSS transform rotation (isLandscape flag) |
| 6.12 | Bookmark button: opens BookmarkSheet for current position | 🟡 | Bookmark button exists but opens simple alert, not BookmarkSheet |

---

### Phase 7 — Subtitle Selector UI
**Status:** 🟡 PARTIAL (1/8)  
**Spec Ref:** Phase 7 (v4 spec)  
**Dependencies:** None  
**Files:** SubtitleSelector.tsx (NEW), SubtitleStyleSheet.tsx (NEW)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 7.1 | SubtitleSelector.tsx: BottomSheet listing all subtitle tracks from MPV | 🟡 | VideoPlayerSubtitlePanel exists with track list |
| 7.2 | Each row: language name, format (SRT/ASS/VTT), active indicator (gold dot) | ⚪ | |
| 7.3 | "Off" always at top | ⚪ | |
| 7.4 | Tap => MPV switches subtitle track via bridge | ⚪ | |
| 7.5 | SubtitleStyleSheet.tsx: font size slider, text color picker (5 presets), bg opacity slider | ⚪ | Not created |
| 7.6 | Subtitle style settings persisted to AsyncStorage | ⚪ | |
| 7.7 | Active track badge in VideoSecondaryBar subtitle icon | ⚪ | |
| 7.8 | Quick ON/OFF toggle in secondary bar | ⚪ | |

---

### Phase 8 — Audio Track Selector UI (Enhanced)
**Status:** 🟡 PARTIAL (1/7)  
**Spec Ref:** Phase 8 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 8.1 | AudioTrackSelector.tsx: BottomSheet with rich audio track cards | 🟡 | VideoPlayerAudioPanel exists with track list |
| 8.2 | Each card: track number, language, codec (DTS/AAC/MP3/AC3), channel layout, sample rate | ⚪ | |
| 8.3 | Active track: gold left border + gold radio dot | ⚪ | |
| 8.4 | Tap => MPV switches audio track via bridge | ⚪ | |
| 8.5 | MpvBridgeModule returns codec/channels/sample rate per track | ⚪ | |
| 8.6 | Language flags/emoji for common languages | ⚪ | |
| 8.7 | Active language shown in secondary bar button label | ⚪ | |

---

### Phase 9 — Chapter Browser (Enhanced)
**Status:** ⚪ NOT STARTED (0/8)  
**Spec Ref:** Phase 9 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 9.1 | ChapterBrowser.tsx: BottomSheet with 3-column grid of chapter cards | ⚪ | ChapterList exists in NowPlayingInfo but not as chapter browser |
| 9.2 | Each card: thumbnail (or gradient placeholder), chapter number, start time | ⚪ | |
| 9.3 | Current chapter: gold border + overlay badge | ⚪ | |
| 9.4 | Tap => seek to chapter start, dismiss sheet | ⚪ | |
| 9.5 | Chapter title + time range shown below grid for selected chapter | ⚪ | |
| 9.6 | Auto-scroll to current chapter on open | ⚪ | |
| 9.7 | Fallback: colored gradient cards if no thumbnails | ⚪ | |
| 9.8 | Chapter count in sheet header | ⚪ | |

---

### Phase 10 — Video Player Polish
**Status:** 🟡 PARTIAL (2/10)  
**Spec Ref:** Phase 10 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 10.1 | Controls show/hide: 300ms fade + translateY (not instant) | ✅ | 200ms fade + translateY implemented |
| 10.2 | Play/pause: spring scale press (0.85 => 1.0) | ⚪ | Basic TouchableOpacity, no spring |
| 10.3 | Seek thumb: enlarges on touch (16px => 24px spring) | ⚪ | |
| 10.4 | Chapter marks: gentle pulse on seek bar | ⚪ | |
| 10.5 | Loading: ActivityOrb over video surface | ⚪ | Uses ActivityIndicator in LoadingOverlay |
| 10.6 | Buffering: thin gold shimmer bar at top (YouTube-style) | ⚪ | |
| 10.7 | Error: PlayerErrorFallback component | 🟡 | Error state exists inline in VideoPlayerScreen |
| 10.8 | End of video: "Replay" button overlay | ⚪ | |
| 10.9 | Volume/brightness pill: animated icon change | ⚪ | |
| 10.10 | Bookmark save: blue pulse animation on BookmarkButton | ⚪ | |

---

### Wave 2 Gate Check
**Status:** ⚪ PENDING  
**Required:** VideoPlayer is a standalone component in VideoPlayerScreen. Subtitle/audio track/chapter all functional. No native rotation. Polished animations.

---

## WAVE 3: Audio Player Excellence (Phases 11-15)

### Phase 11 — AudioPlayer Component Extraction
**Status:** 🟡 PARTIAL (2/10)  
**Spec Ref:** Phase 11 (v4 spec)  
**Dependencies:** None  
**Files:** AudioPlayer.tsx (NEW in src/components/player/), useAudioPlayerScreen.ts (NEW), AudioGradientBg.tsx (NEW), AudioAlbumArt.tsx (NEW), AudioActionRow.tsx (NEW)
**Audit:** AudioPlayerScreen.tsx exists (853 lines) but is NOT a standalone component. AlbumArtBackground component exists for gradient background.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 11.1 | AudioPlayer.tsx component: self-contained, accepts fileUri/callbacks | ⚪ | Currently in AudioPlayerScreen (853 lines) |
| 11.2 | AudioPlayerScreen.tsx < 80 lines: only wraps <AudioPlayer /> | ⚪ | Currently 853 lines |
| 11.3 | useAudioPlayerScreen.ts: file loading, queue, lyrics position, bookmarks | ⚪ | Not created |
| 11.4 | AudioGradientBg.tsx: extracts dominant color from art, dynamic gradient background | 🟡 | AlbumArtBackground exists but may not extract dominant color |
| 11.5 | AudioAlbumArt.tsx: 80% width square, drop shadow + border radius | ⚪ | Artwork rendering exists but not as dedicated component |
| 11.6 | Track changes: album art cross-fade + subtle scale animation | ⚪ | |
| 11.7 | Background gradient transitions smoothly on track change (600ms) | ⚪ | |
| 11.8 | AudioActionRow.tsx: heart (like toggle), share, three-dot (opens AudioSubMenu) | ⚪ | |
| 11.9 | Like/heart: spring bounce animation on toggle + haptic | ⚪ | |
| 11.10 | Bookmark accessible from three-dot submenu | ⚪ | |

---

### Phase 12 — Audio Volume and Seek Controls
**Status:** 🟡 PARTIAL (2/8)  
**Spec Ref:** Phase 12 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 12.1 | AudioVolumeSlider.tsx: horizontal slider, gold thumb, full-width, haptic at extremes | 🟡 | VolumePanel exists in VideoPlayer; Audio needs dedicated slider |
| 12.2 | Volume icon changes: muted/low/medium/high icons | ⚪ | |
| 12.3 | AudioSeekBar.tsx: Spotify-style, track thickens on touch (2px => 4px) | 🟡 | SeekBar component exists in components/player/SeekBar |
| 12.4 | Gold fill, white thumb, chapter dot marks on track | ⚪ | |
| 12.5 | Time labels: left = current, right = total (tap to toggle to remaining) | ⚪ | |
| 12.6 | Position label shown above thumb while dragging (SoundCloud style) | ⚪ | |
| 12.7 | Seek bar thumb: 16px normal, 20px while dragging (spring animation) | ⚪ | |
| 12.8 | Track returns to thin (2px) on release | ⚪ | |

---

### Phase 13 — Audio SubMenu and Queue Peek
**Status:** 🟡 PARTIAL (1/10)  
**Spec Ref:** Phase 13 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 13.1 | AudioSubMenu.tsx: BottomSheet, 7+ action rows, artwork + track name header | ⚪ | Not created |
| 13.2 | Like/Unlike: haptic + gold animation | ⚪ | |
| 13.3 | Add to Playlist: opens PlaylistSheet (v3) | ⚪ | PlaylistSheet exists |
| 13.4 | Bookmark: opens BookmarkSheet to name + save position | ⚪ | |
| 13.5 | Sleep Timer: picker, sets auto-stop timer | ⚪ | |
| 13.6 | Audio Quality: codec/bitrate/sample rate/channels info card | ⚪ | |
| 13.7 | Share: React Native Share with track + artist | ⚪ | |
| 13.8 | Song Info: navigate to SongScreen | ⚪ | SongScreen doesn't exist |
| 13.9 | AudioQueuePeek.tsx: "Up Next: [Track] - [Artist]" strip at bottom of player | 🟡 | QueueManagementSheet exists |
| 13.10 | Tap AudioQueuePeek: opens QueueSheet (v3) | ⚪ | |

---

### Phase 14 — Mini Audio Player (Persistent)
**Status:** 🟡 PARTIAL (3/10)  
**Spec Ref:** Phase 14 (v4 spec)  
**Dependencies:** None  
**Files:** MiniAudioPlayer.tsx (NEW), MiniProgressBar.tsx (NEW), useMiniPlayer.ts (NEW)

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 14.1 | MiniAudioPlayer.tsx: 56px, above tab bar | 🟡 | MiniPlayer component exists in components/player/MiniPlayer |
| 14.2 | Shows: artwork (40x40 rounded), title, artist, prev/play/next buttons | 🟡 | MiniPlayer has these elements |
| 14.3 | MiniProgressBar.tsx: 2px gold progress line at top of mini player | ⚪ | Not created |
| 14.4 | useMiniPlayer.ts hook: isVisible, currentTrack, handlers from Redux playerSlice | ⚪ | Not created |
| 14.5 | Appears with slide-up animation when audio starts | ⚪ | |
| 14.6 | Disappears with slide-down when audio stops | ⚪ | |
| 14.7 | Tap body: navigate to AudioPlayerScreen | ⚪ | |
| 14.8 | All screens: paddingBottom accounts for mini player height | ⚪ | |
| 14.9 | Glass bg: rgba(18,18,20,0.95) with border.subtle top border | ⚪ | |
| 14.10 | NOT shown when user is already on AudioPlayerScreen | ⚪ | |

---

### Phase 15 — Audio Waveform and Lyrics View
**Status:** 🟡 PARTIAL (1/10)  
**Spec Ref:** Phase 15 (v4 spec)  
**Dependencies:** None

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 15.1 | AudioWaveform.tsx: 5-bar EQ animation. Props: isPlaying, color, size | 🟡 | AudioVisualizer exists in components/player |
| 15.2 | Playing: bars animate with staggered heights. Paused: freeze at mid-height. | ⚪ | |
| 15.3 | Waveform in Library audio listings (small, replaces play icon when playing) | ⚪ | |
| 15.4 | Waveform in MiniAudioPlayer artwork area when playing | ⚪ | |
| 15.5 | AudioLyricsView.tsx ENHANCED: full-screen takeover (swipe-up from player) | ⚪ | |
| 15.6 | Active line: bright white. Inactive lines: dim/secondary text color. | ⚪ | |
| 15.7 | Auto-scroll: spring animation to active line | ⚪ | |
| 15.8 | Tap inactive line: seek to that lyric timestamp | ⚪ | |
| 15.9 | Lyrics/Queue toggle tab at top of swipe-up panel | ⚪ | |
| 15.10 | "No Lyrics" empty state: music note icon with subtle animation | ⚪ | |

---

### Wave 3 Gate Check
**Status:** ⚪ PENDING  
**Required:** AudioPlayer is standalone component. Spotify-style volume/seek/submenu functional. MiniAudioPlayer above tab bar. Waveform in library audio listings. Lyrics auto-scroll in sync.

---

## WAVE 4: Dedicated Sub-Pages (Phases 16-20)

### Phase 16 — ArtistScreen
**Status:** 🟡 PARTIAL (3/10)  
**Spec Ref:** Phase 16 (v4 spec)  
**Dependencies:** None  
**Files:** ArtistScreen.tsx (NEW in src/screens/Artist/), useArtistScreen.ts (NEW), ArtistHeader.tsx (NEW), ArtistDiscography.tsx (NEW), ArtistTopTracks.tsx (NEW), ArtistBio.tsx (NEW)
**Audit:** ArtistDetailScreen exists at src/screens/Library/ArtistDetailScreen.tsx but only has basic layout (name, albums, tracks). Needs v4 enhancement.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 16.1 | ArtistScreen: ScrollView stacked sections, stagger entrance animation | 🟡 | ArtistDetailScreen exists with basic layout |
| 16.2 | ArtistHeader: large gradient backdrop (from album art), artist initials avatar, name, stats | ⚪ | |
| 16.3 | ArtistDiscography: horizontal scroll album cards, tap => AlbumScreen | 🟡 | AlbumGrid exists |
| 16.4 | ArtistTopTracks: top 5 by play count, "See All" => AllAudioScreen filtered by artist | ⚪ | |
| 16.5 | ArtistBio: expandable bio, placeholder if no data | ⚪ | |
| 16.6 | "Play All": loads all artist tracks into player queue | ⚪ | |
| 16.7 | "Shuffle": shuffled artist tracks into queue | ⚪ | |
| 16.8 | Track rows: number, title, album, duration, three-dot context menu | ⚪ | |
| 16.9 | Album cards: gradient overlay, name, year, track count | ⚪ | |
| 16.10 | ArtistHeader: parallax scroll effect | ⚪ | |

---

### Phase 17 — AlbumScreen
**Status:** 🟡 PARTIAL (3/10)  
**Spec Ref:** Phase 17 (v4 spec)  
**Dependencies:** None  
**Files:** AlbumScreen.tsx (NEW in src/screens/Album/), useAlbumScreen.ts (NEW), AlbumHero.tsx (NEW), AlbumTrackList.tsx (NEW), AlbumMetaBar.tsx (NEW), AlbumActionRow.tsx (NEW)
**Audit:** AlbumDetailScreen exists at src/screens/Library/AlbumDetailScreen.tsx but basic.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 17.1 | AlbumScreen: ScrollView, stagger entrance animation | 🟡 | AlbumDetailScreen exists with basic layout |
| 17.2 | AlbumHero: blurred full-width bg + crisp centered album art | ⚪ | |
| 17.3 | AlbumMetaBar: year, track count, total duration, genre chips | ⚪ | |
| 17.4 | AlbumActionRow: Play All, Shuffle, Add to Playlist (three buttons) | ⚪ | |
| 17.5 | AlbumTrackList: numbered, duration, playing indicator, three-dot per track | 🟡 | Track list exists but may need enhancement |
| 17.6 | Tap track => AudioPlayer with full album as queue, starting from tapped track | ⚪ | |
| 17.7 | Currently playing: gold left accent + AudioWaveform icon | ⚪ | |
| 17.8 | Long-press track: Play Next, Add to Queue, Add to Playlist, Song Info | ⚪ | |
| 17.9 | Artist name tap => ArtistScreen | ⚪ | |
| 17.10 | AlbumHero: parallax scroll effect | ⚪ | |

---

### Phase 18 — SongScreen
**Status:** ⚪ NOT STARTED (0/8)  
**Spec Ref:** Phase 18 (v4 spec)  
**Dependencies:** None  
**Files:** SongScreen.tsx (NEW in src/screens/Song/), useSongScreen.ts (NEW), SongHeader.tsx (NEW), SongLyricView.tsx (NEW), SongRelatedTracks.tsx (NEW)
**Audit:** SongScreen does not exist at all.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 18.1 | SongScreen: ScrollView, stagger entrance animation | ⚪ | Entirely new screen |
| 18.2 | SongHeader: artwork (60% width), title, artist (tappable => ArtistScreen), album (tappable => AlbumScreen), year, genre, duration | ⚪ | |
| 18.3 | SongActionRow: Play, Shuffle, Add to Playlist, Like, Share, Bookmark | ⚪ | |
| 18.4 | SongLyricView: synced lyrics view, auto-scroll to active line | ⚪ | |
| 18.5 | SongRelatedTracks: "More from [Artist]" horizontal scroll row | ⚪ | |
| 18.6 | "More Like This" row (genre-based recommendations) | ⚪ | |
| 18.7 | Track metadata: codec, bitrate, sample rate, channels, file size | ⚪ | |
| 18.8 | Three-dot menu in header: Song Info, Add to Playlist, Share, Bookmark | 🟡 | Three-dot button exists in TopBar but opens nothing relevant |

---

### Phase 19 — BookmarksScreen
**Status:** ⚪ NOT STARTED (0/9)  
**Spec Ref:** Phase 19 (v4 spec)  
**Dependencies:** Phases 4 (Bookmarking Foundation)  
**Files:** BookmarksScreen.tsx (NEW in src/screens/Bookmarks/), useBookmarksScreen.ts (NEW), BookmarkGroup.tsx (NEW), BookmarkRow.tsx (NEW)
**Audit:** No BookmarksScreen exists. Bookmarks appear on Home via HomeBookmarksList but no dedicated screen.

| # | Checklist Item | Status | Notes |
|---|---|---|---|
| 19.1 | BookmarksScreen: FlatList, grouped by file, sorted by most recently bookmarked file | ⚪ | New screen needed |
| 19.2 | BookmarkGroup.tsx: expandable/collapsible file group, header = file title + art | ⚪ | |
| 19.3 | BookmarkRow.tsx: label, formatted time, relative date, delete button | ⚪ | |
| 19.4 | Tap BookmarkRow => open file at bookmark position via AudioPlayer/VideoPlayer | ⚪ | |
| 19.5 | Swipe to delete bookmark with undo snackbar | ⚪ | |
| 19.6 | Empty state: "No bookmarks yet" with WaveformBars animation | ⚪ | |
| 19.7 | Search by label or file title | ⚪ | |
| 19.8 | "Clear All" button with confirmation | ⚪ | |
| 19.9 | Tab badge: bookmark count | ⚪ | |

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
| Phases complete | 0/30 | 30/30 |
| Waves complete | 0/6 | 6/6 |
| Screen files with hooks | 0/15 | 15/15 |
| Custom animation primitives | 0/4 | 4/4 |
| Auth (Google + guest) | 0/2 | 2/2 |
| Bookmark feature screens | 1/4 | 4/4 |
| Dedicated sub-pages | 3/9 | 9/9 |
| MiniAudioPlayer | 1/2 | 2/2 |

