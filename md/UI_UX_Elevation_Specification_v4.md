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

## 4. DETAILED 30-PHASE ELEVATION ROADMAP

`
WAVE 1: Auth and Foundation ──────── Phases 1-5    (Google login, hooks, animations, bookmarks)
WAVE 2: Video Player Excellence ───── Phases 6-10   (Netflix-quality VideoPlayer component)
WAVE 3: Audio Player Excellence ───── Phases 11-15  (Spotify-quality AudioPlayer + mini player)
WAVE 4: Dedicated Sub-Pages ──────── Phases 16-20  (Artist, Album, Song, Genre, Bookmarks screens)
WAVE 5: Home and Library UX Flow ──── Phases 21-25  (See All nav, folder wizard, settings)
WAVE 6: Polish and Working Beta ────── Phases 26-30  (Animations, perf, QA, production audit)
`

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
- [ ] 3.1 ActivityOrb: 3 pulsing rings + center gold orb. Props: size, color, label
- [ ] 3.2 PulseRing: expanding/fading ring. Props: size, color, delay
- [ ] 3.3 WaveformBars: 5-bar EQ animation. Props: color, barCount, isPlaying
- [ ] 3.4 `useAnimatedEntrance(count, delay)` hook: staggered Animated.Values array
- [ ] 3.5 `animations.ts`: fadeIn, slideInUp, scaleIn, staggerChildren, springScale, pulseLoop
- [ ] 3.6 All `ActivityIndicator` usages replaced with `ActivityOrb`
- [ ] 3.7 LoadingOverlay uses ActivityOrb
- [ ] 3.8 Library audio scan uses WaveformBars (thematic indicator)
- [ ] 3.9 Splash screen orb extracted to reusable ActivityOrb
- [ ] 3.10 All animations respect `reduceMotion` via `useAccessibility().reduceMotion`

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
- [ ] 4.1 `bookmarkSlice.ts`: actions: add/remove/updateLabel/clearAll; selectors: selectBookmarksForFile/selectAllBookmarks
- [ ] 4.2 `bookmarkService.ts`: saveBookmark/loadBookmarks/deleteBookmark — AsyncStorage key `simba_bookmarks`
- [ ] 4.3 `useBookmarks(fileUri?)` hook: CRUD ops, bookmarksForFile, allBookmarks
- [ ] 4.4 `BookmarkButton`: tap opens BookmarkSheet. Count badge if bookmarks exist.
- [ ] 4.5 `BookmarkSheet`: "Save current position" with label input + existing bookmarks list
- [ ] 4.6 `BookmarkItem`: blue icon, formatted time, label, relative date, delete button
- [ ] 4.7 `BookmarkList`: FlatList, grouped by file, sorted by position
- [ ] 4.8 `BookmarksScreen`: all bookmarks grouped by file, search/filter, tap => open at position
- [ ] 4.9 Bookmarks persist via redux-persist (AsyncStorage)
- [ ] 4.10 Accessible from: VideoPlayer top bar button, AudioPlayer three-dot submenu

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
- [ ] 5.1 `types.ts`: all 10 new routes added
- [ ] 5.2 `RootNavigator.tsx`: all new screens registered
- [ ] 5.3 `useNavigation.ts` hook: typed navigate/goBack/push/reset
- [ ] 5.4 Login screen in stack (before MainTabs if not authenticated)
- [ ] 5.5 Deep links: `simba://artist/:id`, `simba://album/:id`, `simba://bookmarks`
- [ ] 5.6 Back navigation from all new screens correct
- [ ] 5.7 Home "See All" => AllVideosScreen, AllAudioScreen, AllPlaylistsScreen
- [ ] 5.8 Library artist/album taps => ArtistScreen/AlbumScreen
- [ ] 5.9 Tracks in Artist/Album screen => AudioPlayer or SongScreen

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
- [ ] 6.1 `VideoPlayer.tsx` component: self-contained, accepts fileUri/title/callbacks
- [ ] 6.2 `VideoPlayerScreen.tsx` < 80 lines: wraps VideoPlayer + screen concerns only
- [ ] 6.3 `useVideoPlayerScreen.ts`: file URI from params, PiP lifecycle, bookmarks
- [ ] 6.4 `VideoControls.tsx`: Netflix-style overlay, animated show/hide (fade + translateY)
- [ ] 6.5 Controls auto-hide after 4s inactivity, re-appear on tap
- [ ] 6.6 `VideoTopBar.tsx`: always visible — back, title (truncated), bookmark, more menu
- [ ] 6.7 `VideoTransport.tsx`: always visible — prev, -10s, play/pause (gold, large), +10s, next
- [ ] 6.8 `VideoSeekBar.tsx`: gold fill, white thumb, chapter markers, time labels
- [ ] 6.9 `VideoSecondaryBar.tsx`: auto-hiding — chapters, subs, audio, EQ, playlist with text labels
- [ ] 6.10 `DoubleTapFeedback.tsx`: animated pill +/-10s with chevrons (YouTube style)
- [ ] 6.11 NO native rotation. Landscape via `useWindowDimensions` responsive layout
- [ ] 6.12 Bookmark button: opens `BookmarkSheet` for current position

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
- [ ] 10.1 Controls show/hide: 300ms fade + translateY (not instant)
- [ ] 10.2 Play/pause: spring scale press (0.85 => 1.0)
- [ ] 10.3 Seek thumb: enlarges on touch (16px => 24px spring)
- [ ] 10.4 Chapter marks: gentle pulse on seek bar
- [ ] 10.5 Loading: ActivityOrb over video surface
- [ ] 10.6 Buffering: thin gold shimmer bar at top (YouTube-style)
- [ ] 10.7 Error: PlayerErrorFallback component
- [ ] 10.8 End of video: "Replay" button overlay
- [ ] 10.9 Volume/brightness pill: animated icon change
- [ ] 10.10 Bookmark save: blue pulse animation on BookmarkButton

---

### Wave 2 Gate Check
**Required:** VideoPlayer is a standalone component in VideoPlayerScreen. Subtitle/audio track/chapter all functional. No native rotation. Polished animations.

---

## WAVE 3: Audio Player Excellence (Phases 11-15)

### PHASE 11 — AudioPlayer Component Extraction

**Goal:** Self-contained AudioPlayer component. AudioPlayerScreen is < 80 line wrapper. Spotify-quality design.

**Checklist:**
- [ ] 11.1 `AudioPlayer.tsx` component: self-contained, accepts fileUri/callbacks
- [ ] 11.2 `AudioPlayerScreen.tsx` < 80 lines: only wraps `<AudioPlayer />`
- [ ] 11.3 `useAudioPlayerScreen.ts`: file loading, queue, lyrics position, bookmarks
- [ ] 11.4 `AudioGradientBg.tsx`: extracts dominant color from art, dynamic gradient background
- [ ] 11.5 `AudioAlbumArt.tsx`: 80% width square, drop shadow + border radius
- [ ] 11.6 Track changes: album art cross-fade + subtle scale animation
- [ ] 11.7 Background gradient transitions smoothly on track change (600ms)
- [ ] 11.8 `AudioActionRow.tsx`: heart (like toggle), share, three-dot (opens AudioSubMenu)
- [ ] 11.9 Like/heart: spring bounce animation on toggle + haptic
- [ ] 11.10 Bookmark accessible from three-dot submenu

---

### PHASE 12 — Audio Volume and Seek Controls

**Checklist:**
- [ ] 12.1 `AudioVolumeSlider.tsx`: horizontal slider, gold thumb, full-width, haptic at extremes
- [ ] 12.2 Volume icon changes: muted/low/medium/high icons
- [ ] 12.3 `AudioSeekBar.tsx`: Spotify-style, track thickens on touch (2px => 4px)
- [ ] 12.4 Gold fill, white thumb, chapter dot marks on track
- [ ] 12.5 Time labels: left = current, right = total (tap to toggle to remaining)
- [ ] 12.6 Position label shown above thumb while dragging (SoundCloud style)
- [ ] 12.7 Seek bar thumb: 16px normal, 20px while dragging (spring animation)
- [ ] 12.8 Track returns to thin (2px) on release

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
- [ ] 13.1 `AudioSubMenu.tsx`: BottomSheet, 7+ action rows, artwork + track name header
- [ ] 13.2 Like/Unlike: haptic + gold animation
- [ ] 13.3 Add to Playlist: opens PlaylistSheet (v3)
- [ ] 13.4 Bookmark: opens BookmarkSheet to name + save position
- [ ] 13.5 Sleep Timer: picker, sets auto-stop timer
- [ ] 13.6 Audio Quality: codec/bitrate/sample rate/channels info card
- [ ] 13.7 Share: React Native Share with track + artist
- [ ] 13.8 Song Info: navigate to SongScreen
- [ ] 13.9 `AudioQueuePeek.tsx`: "Up Next: [Track] - [Artist]" strip at bottom of player
- [ ] 13.10 Tap AudioQueuePeek: opens QueueSheet (v3)

---

### PHASE 14 — Mini Audio Player (Persistent)

**Design:** 56px height bar above tab bar. Album art (40x40 rounded) + title + artist + prev/play/next. 2px gold progress line.

**Checklist:**
- [ ] 14.1 `MiniAudioPlayer.tsx`: 56px, above tab bar
- [ ] 14.2 Shows: artwork (40x40 rounded), title, artist, prev/play/next buttons
- [ ] 14.3 `MiniProgressBar.tsx`: 2px gold progress line at top of mini player
- [ ] 14.4 `useMiniPlayer.ts` hook: isVisible, currentTrack, handlers from Redux playerSlice
- [ ] 14.5 Appears with slide-up animation when audio starts
- [ ] 14.6 Disappears with slide-down when audio stops
- [ ] 14.7 Tap body: navigate to AudioPlayerScreen
- [ ] 14.8 All screens: paddingBottom accounts for mini player height
- [ ] 14.9 Glass bg: `rgba(18,18,20,0.95)` with border.subtle top border
- [ ] 14.10 NOT shown when user is already on AudioPlayerScreen

---

### PHASE 15 — Audio Waveform and Lyrics View

**Checklist:**
- [ ] 15.1 `AudioWaveform.tsx`: 5-bar EQ animation. Props: isPlaying, color, size
- [ ] 15.2 Playing: bars animate with staggered heights. Paused: freeze at mid-height.
- [ ] 15.3 Waveform in Library audio listings (small, replaces play icon when playing)
- [ ] 15.4 Waveform in MiniAudioPlayer artwork area when playing
- [ ] 15.5 `AudioLyricsView.tsx` ENHANCED: full-screen takeover (swipe-up from player)
- [ ] 15.6 Active line: bright white. Inactive lines: dim/secondary text color.
- [ ] 15.7 Auto-scroll: spring animation to active line
- [ ] 15.8 Tap inactive line: seek to that lyric timestamp
- [ ] 15.9 Lyrics/Queue toggle tab at top of swipe-up panel
- [ ] 15.10 "No Lyrics" empty state: music note icon with subtle animation

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
- [ ] 16.1 ArtistScreen: ScrollView stacked sections, stagger entrance animation
- [ ] 16.2 ArtistHeader: large gradient backdrop (from album art), artist initials avatar, name, stats
- [ ] 16.3 ArtistDiscography: horizontal scroll album cards, tap => AlbumScreen
- [ ] 16.4 ArtistTopTracks: top 5 by play count, "See All" => AllAudioScreen filtered by artist
- [ ] 16.5 ArtistBio: expandable bio, placeholder if no data
- [ ] 16.6 "Play All": loads all artist tracks into player queue
- [ ] 16.7 "Shuffle": shuffled artist tracks into queue
- [ ] 16.8 Track rows: number, title, album, duration, three-dot context menu
- [ ] 16.9 Album cards: gradient overlay, name, year, track count
- [ ] 16.10 ArtistHeader: parallax scroll effect

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
- [ ] 17.1 AlbumScreen: ScrollView, stagger entrance animation
- [ ] 17.2 AlbumHero: blurred full-width bg + crisp centered album art
- [ ] 17.3 AlbumMetaBar: year, track count, total duration, genre chips
- [ ] 17.4 AlbumActionRow: Play All, Shuffle, Add to Playlist (three buttons)
- [ ] 17.5 AlbumTrackList: numbered, duration, playing indicator, three-dot per track
- [ ] 17.6 Tap track => AudioPlayer with full album as queue, starting from tapped track
- [ ] 17.7 Currently playing: gold left accent + AudioWaveform icon
- [ ] 17.8 Long-press track: Play Next, Add to Queue, Add to Playlist, Song Info
- [ ] 17.9 Artist name tap => ArtistScreen
- [ ] 17.10 AlbumHero: parallax scroll effect

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
- [ ] 18.1 SongScreen: scrollable detail page
- [ ] 18.2 SongHero: artwork + animated waveform background overlay
- [ ] 18.3 SongMetadata: duration, format, bitrate, sample rate, channels, genre, year, file size, path
- [ ] 18.4 File path: tap to copy to clipboard with success toast
- [ ] 18.5 SongBookmarks: bookmarks for this file, tap => open at position, "+" adds new
- [ ] 18.6 SongActions: Play, Add to Playlist, Share, Add to Queue buttons (using AppButton)
- [ ] 18.7 Lyrics preview: first 3 lines (if available), "View Full Lyrics" button
- [ ] 18.8 useSongScreen: file metadata, bookmarks for URI, lyrics existence check

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
- [ ] 19.1 BookmarksScreen: SectionList grouped by file, tap => open file at position
- [ ] 19.2 Section header: file name, file type icon, bookmark count badge
- [ ] 19.3 Bookmark row: blue bookmark icon, formatted time, label, relative date
- [ ] 19.4 Swipe bookmark left => delete with ConfirmDialog
- [ ] 19.5 "Delete All" in top bar with ConfirmDialog
- [ ] 19.6 Search/filter by label or file name
- [ ] 19.7 useBookmarksScreen: selectAllBookmarks, grouped data, delete handlers
- [ ] 19.8 Empty state: bookmark illustration, "Save your favorite moments" message
- [ ] 19.9 Rows: staggered slide-in from right animation on enter

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
