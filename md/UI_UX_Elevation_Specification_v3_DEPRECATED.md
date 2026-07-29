# SIMBA Mobile: Comprehensive 30-Phase UI/UX Elevation & Technical Master Specification (v3)

> **Document Version:** 3.0.0  
> **Supersedes:** v2 (DEPRECATED — see `UI_UX_Elevation_Specification_v2_DEPRECATED.md`)  
> **Target Platform:** React Native (Android / iOS)  
> **Core Focus:** Fix broken UX, complete half-baked features, re-imagine childish UI, achieve premium production quality  
> **Completion Milestone:** Elevating project experience from ~6% to ~8% — a 2-point lift in overall product maturity through systematic elimination of confusing, incomplete, and unpolished interfaces.

---

## TABLE OF CONTENTS

1. [Critical Diagnosis: Why v3 Exists](#1-critical-diagnosis-why-v3-exists)
2. [Design Philosophy v3: From Functional to Desirable](#2-design-philosophy-v3-from-functional-to-desirable)
3. [Component System v3](#3-component-system-v3)
4. [Detailed 30-Phase Elevation Roadmap](#4-detailed-30-phase-elevation-roadmap)
5. [Verification & Quality Assurance Suite](#5-verification--quality-assurance-suite)

---

## 1. CRITICAL DIAGNOSIS: WHY v3 EXISTS

v2 laid a functional foundation (~3% to ~6%). But the app remains **confusing, childish, and half-baked** in critical areas. This v3 specification directly addresses each failure point identified by management and real-world usage:

### 1.1 PiP is Broken (Phase Priority: #1)
| Issue | Current Behavior | v3 Fix |
|---|---|---|
| Full-screen leak | PiP renders entire activity, not just video surface | Native PiP surface isolation — render only the `VideoSurface` into PiP window |
| No pause/expand | Only play/pause via RemoteAction overlay | Add dedicated Pause/Resume toggle + Expand-to-fullscreen button in PiP RemoteActions |
| No back arrow | No way to return to player from PiP except tapping PiP window | Add system back-arrow handling: physical back closes PiP, window tap restores full player |
| Missing chapters/track info | PiP shows nothing about current content | Add chapter title overlay + track progress in PiP notification |

### 1.2 Player Screen Controls Are Confusing (Phase Priority: #2)
| Failure | Evidence |
|---|---|
| Too many panels | Equalizer, Audio Track, Subtitle, Playlist, Track Selector — 5 separate panels accessible from one screen, overwhelming the user |
| No visual hierarchy | All controls look equally important; no clear primary/secondary/tertiary grouping |
| Inconsistent iconography | Mix of text labels and icons without standard meaning |
| Hidden in gestures | Volume/brightness gestures work unreliably on different devices |

### 1.3 Half-Baked Features (Phase Priority: #3)
| Feature | Current State | v3 Target |
|---|---|---|
| Audio tracks | Listed but no metadata (artist/album/year), no sorting | Rich track info with metadata parsing |
| Chapters | Basic chapter list, no chapter art/thumbnails | Visual chapter browser with thumbnails, descriptions |
| Playlist peek | Shows filenames only, no context | Rich peek preview with duration, artist, artwork thumbnails |
| Queue | Basic next/prev, no drag reorder, no multi-select | Full queue management with reorder, batch operations |

### 1.4 Home Screen Featured Section (Phase Priority: #4)
- Currently shows random recently played items without curation logic
- No "Featured" algorithm — just a raw dump of whatever was played last
- Empty section when nothing has been played (renders blank space, not a meaningful empty state)

### 1.5 Library & Playlist Gaps (Phase Priority: #5)
- No way to create a playlist directly from Library folder view
- No "Add to Playlist" action during video/audio playback
- No artist/album grouping in Library
- No bottom-sheet info panel during playback (like Spotify's "Now Playing View" slide-up)

### 1.6 Splash Screen (Phase Priority: #6)
- Raw lion logo on black background — no animation, no branding, no loading indication
- Feels like a default placeholder, not a premium media app splash

### 1.7 Overall UX Quality
- Inconsistent padding, spacing, and alignment across screens
- Missing transition animations between states
- Touch targets too small on many controls
- Childish visual feel: flat colors, no depth, no material texture

---

## 2. DESIGN PHILOSOPHY v3: FROM FUNCTIONAL TO DESIRABLE

### 2.1 Core Principles

1. **Invisible Complexity**: The player should feel simple. Hide advanced features behind progressive disclosure (long-press, swipe, secondary panels). Never overwhelm the user on first launch.

2. **Consistent Luxury**: Every pixel must feel intentional. Use the gold/dark palette with deliberate negative space. No flat cards without subtle borders or shadows.

3. **Gestalt Clarity**: Related controls group together visually. Primary transport controls (play/pause/next/prev) are always at the bottom center. Secondary controls (eq, tracks, chapters) are in slide-up panels. Tertiary (settings) are behind gear icons.

4. **Zero Confusion Mode**: If a user has to think about what a button does for more than 0.5 seconds, the design failed. Every icon must have a text label on first interaction or a long-press tooltip.

5. **Platinum Empty States**: Empty states are not dead ends — they are actionable launchpads with clear "what to do next."

### 2.2 Visual Design Tokens v3

#### Color System v3

| Token Key | Dark Value | Light Value | Usage |
|---|---|---|---|
| `background.primary` | `#08080A` | `#F2EDE4` | Deepest background (darker than v2 for more contrast) |
| `background.elevated` | `#121214` | `#FFFFFF` | Card surfaces (richer charcoal in dark) |
| `background.floating` | `rgba(18,18,20,0.92)` | `rgba(255,255,255,0.92)` | Bottom sheets, modals, PiP controls |
| `background.glass` | `rgba(18,18,20,0.65)` | `rgba(255,255,255,0.70)` | Frosted glass overlay controls |
| `surface.raised` | `#1C1C1E` | `#F7F5F0` | Hover/focus state of cards |
| `surface.pressed` | `#28282A` | `#EBE8E0` | Pressed state of interactive elements |
| `border.subtle` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` | Default divider/border |
| `border.emphasis` | `rgba(201,168,76,0.30)` | `rgba(184,146,46,0.25)` | Gold-tinted active/focus border |
| `text.primary` | `#EDEDED` | `#1A1A1C` | Body text |
| `text.secondary` | `rgba(237,237,237,0.55)` | `rgba(26,26,28,0.55)` | Metadata, captions |
| `text.tertiary` | `rgba(237,237,237,0.28)` | `rgba(26,26,28,0.28)` | Disabled, hints |
| `accent.gold` | `#C9A84C` | `#B8922E` | Primary accent (unchanged from v2) |
| `accent.goldDim` | `rgba(201,168,76,0.12)` | `rgba(184,146,46,0.10)` | Subtle gold fills |
| `accent.goldGlow` | `rgba(201,168,76,0.20)` | `rgba(184,146,46,0.15)` | Glow shadows, focus rings |
| `accent.goldGradient` | `[#C9A84C, #D4B96A, #BF9E40]` | `[#B8922E, #C9A84C, #A6822A]` | Gradient for premium surfaces |
| `semantic.success` | `#4CAF50` | `#388E3C` | Success |
| `semantic.error` | `#EF5350` | `#D32F2F` | Error |
| `semantic.warning` | `#FFA726` | `#F57C00` | Warning |
| `overlay.scrim` | `rgba(8,8,10,0.80)` | `rgba(0,0,0,0.50)` | Modal backdrop dimming |

#### Typography v3
| Role | Weight | Size | Line Height | Tracking |
|---|---|---|---|---|
| Display (Hero) | Bold (700) | 28px | 34px | 0.5px |
| H1 (Screen Title) | Bold (700) | 22px | 28px | 0.3px |
| H2 (Section Header) | Semi-Bold (600) | 17px | 22px | 0.2px |
| H3 (Card Title) | Semi-Bold (600) | 15px | 20px | 0.15px |
| Body (Primary) | Regular (400) | 14px | 20px | 0px |
| Body Small (Metadata) | Regular (400) | 12px | 16px | 0.1px |
| Caption (Tags/Time) | Medium (500) | 11px | 14px | 0.3px |
| Button Label | Medium (500) | 14px | 16px | 0.5px |
| Tab Label | Medium (500) | 11px | 14px | 0.4px |

#### Spatial System v3 (4pt Grid)
| Token | Size | Usage |
|---|---|---|
| `spacing.xxs` | 4px | Tight icon-to-text, badge padding |
| `spacing.xs` | 8px | List item vertical gaps, button inner padding |
| `spacing.sm` | 12px | Inner card padding (compact) |
| `spacing.md` | 16px | Standard horizontal screen padding |
| `spacing.lg` | 20px | Section separation |
| `spacing.xl` | 24px | Hero card margins, large gaps |
| `spacing.xxl` | 32px | Screen top padding, large headers |
| `spacing.xxxl` | 40px | Major section dividers |

#### Corner Radius v3
| Token | Size | Usage |
|---|---|---|
| `radius.sm` | 8px | Input fields, buttons |
| `radius.md` | 12px | Cards, sheets, modals |
| `radius.lg` | 16px | Bottom sheets, large cards |
| `radius.xl` | 24px | Full-screen modal corners |
| `radius.full` | 999px | Pills, chips, avatars |

### 2.3 Component Architecture v3

```
src/
├── components/
│   ├── core/                    # v2 → promoted from common/
│   │   ├── AppButton/           # Multi-variant (primary/secondary/ghost/gold)
│   │   ├── AppCard/             # Glassmorphic card with border glow states
│   │   ├── AppInput/            # Search bar, form input, numeric input
│   │   ├── AppText/             # Typography with all v3 variants
│   │   ├── IconButton/          # NEW: Single-purpose icon button with tooltip
│   │   └── Chip/                # NEW: Filter/tag chips (gold accent)
│   ├── feedback/                # v2 retained + expanded
│   │   ├── EmptyState/          # v2 → enhanced with animated illustration
│   │   ├── SkeletonLoader/      # v2 → enhanced shimmer effect
│   │   ├── Toast/               # v2 retained
│   │   └── ErrorBoundary/       # NEW: Screen-level error boundary with retry
│   ├── layout/                  # v2 retained
│   │   ├── HomeHeader/          # v2 → enhanced with animated search
│   │   ├── InternalHeader/      # v2 → enhanced with subtitle animation
│   │   ├── ScreenContainer/     # v2 retained
│   │   └── TabBar/              # v2 FloatingTabBar → enhanced
│   ├── player/                  # v2 → MAJOR REDESIGN
│   │   ├── VideoControlsOverlay/# REDESIGN: Simplified, grouped controls
│   │   ├── AudioControlsBar/    # NEW: Dedicated audio transport controls
│   │   ├── SeekBar/             # v2 → enhanced with chapter thumbnails
│   │   ├── TrackSelector/       # v2 → enhanced with metadata display
│   │   ├── AudioVisualizer/     # v2 retained
│   │   └── NowPlayingInfo/      # NEW: Bottom sheet with artist/album/chapters
│   ├── sheets/                  # NEW: Bottom sheet system
│   │   ├── BottomSheet/         # Universal slide-up panel component
│   │   ├── PlaylistSheet/       # Add-to-playlist / manage playlists
│   │   ├── QueueSheet/          # Full queue with drag-reorder
│   │   ├── InfoSheet/           # Artist/album/chapters/metadata
│   │   └── TrackListSheet/      # Audio track browser with sorting
│   ├── playlist/                # NEW: Playlist feature components
│   │   ├── PlaylistCard/        # Playlist cover card
│   │   ├── PlaylistCreateModal/ # Create playlist dialog
│   │   └── PlaylistAddButton/   # Floating "+" button in Library
│   └── common/                  # Shared utilities
│       └── SvgIcon/             # v2 retained
├── features/
│   └── playlists/               # v2 retained
├── hooks/
│   ├── useHaptics.ts            # v2 retained
│   ├── usePipLifecycle.ts       # v2 → REWRITE
│   ├── usePipEntry.ts           # v2 → REWRITE
│   ├── useBottomSheet.ts        # NEW: Bottom sheet state management
│   ├── usePlayerGestures.ts     # NEW: Unified gesture handler for player
│   ├── useMediaScanner.ts       # NEW: Scanner hook with progress
│   └── useMediaMetadata.ts      # NEW: Metadata parser hook
├── services/
│   ├── fileService.ts           # v2 retained
│   └── metadataService.ts       # NEW: Parse audio/video metadata (ffmpeg/taglib)
├── screens/
│   ├── Splash/                  # NEW: Animated splash screen
│   ├── Home/                    # v2 → REWORK featured section
│   ├── VideoPlayer/             # v2 → REWORK controls layout
│   ├── AudioPlayer/             # v2 → REWORK with bottom sheets
│   ├── Library/                 # v2 → ADD playlist creation, artist/album views
│   ├── Settings/                # v2 retained
│   └── PlaylistDetail/          # v2 retained
├── navigation/
│   └── types.ts                 # v2 → ADD new routes for sheets, modals
├── store/
│   └── slices/
│       ├── playerSlice.ts       # v2 → ADD queue reorder, add-to-playlist actions
│       ├── playlistSlice.ts     # v2 retained
│       ├── pipSlice.ts          # v2 → REWRITE for PiP surface isolation
│       └── mediaSlice.ts        # NEW: Artist/album metadata store
```

---

## 3. COMPONENT SYSTEM v3

### 3.1 BottomSheet System (`src/components/sheets/BottomSheet/`)
A universal slide-up panel component replacing all ad-hoc modal implementations.

**Interface:**
```typescript
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints: Array<number | string>; // ['25%', '50%', '100%'] or pixel values
  initialSnapIndex: number;
  children: React.ReactNode;
  showHandle?: boolean;       // Default true
  showScrim?: boolean;         // Default true
  gestureEnabled?: boolean;    // Default true — swipe to dismiss
  cornerRadius?: number;       // Default 16
  backgroundColor?: string;    // Default theme background.floating
}
```

**Implementation Requirements:**
- Uses `react-native-gesture-handler` `PanGestureHandler` + `Animated` for native-driven animations
- Snap points with haptic feedback on snap change
- Scrim tap dismisses sheet
- Backdrop blur effect on Android via `renderToHardwareTextureAndroid`
- Keyboard avoidance built-in

### 3.2 PiP System Rewrite (`src/hooks/usePipLifecycle.ts` + native)
**Critical Fixes:**
- **Surface Isolation**: Native `PipManager` must render ONLY the `VideoSurface` texture into the PiP window, not the entire activity. Use `TextureView` + `SurfaceTexture` binding.
- **PiP RemoteActions v2**: Add 3 buttons: [Pause/Resume] [Expand to Fullscreen] [Close]
- **System Back Handling**: Physical back button while in PiP mode closes PiP (doesn't exit app)
- **Chapter/Progress Info**: Pass current chapter title and progress percentage to PiP notification description
- **PiP Entry Gesture**: Swipe-down on video surface with visual feedback (shrink animation preview)

### 3.3 Player Controls Simplification (`VideoControlsOverlay`)
**v3 Layout (Top → Bottom):**

```
┌──────────────────────────────────────────────────────────┐
│  [← Back]                    [Title]         [🔔 More]   │ ← TOP BAR (always visible)
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│                  VIDEO SURFACE                           │
│                                                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Chapters]  [Audio]  [Subtitles]  [EQ]  [Playlist]    │ ← SECONDARY ROW (collapsible, show on tap)
├──────────────────────────────────────────────────────────┤
│  ──────◆────────────────────────────────────            │ ← SEEK BAR
│  0:42 / 2:13:15                               2:15:57   │
├──────────────────────────────────────────────────────────┤
│  [⏮]   [⏪ -10s]   [▶⏸]   [⏩ +10s]   [⏭]          │ ← PRIMARY CONTROLS (always visible)
├──────────────────────────────────────────────────────────┤
│  [Volume] ───────●────  [Brightness] ──────●────        │ ← GESTURE HINT (subtle, animated away)
└──────────────────────────────────────────────────────────┘
```

**Key Decisions:**
- Primary controls (back, play/pause, seek) are **always visible** — no auto-hide for these
- Secondary controls (chapters, audio, subs, EQ, playlist) are in a **collapsible toolbar** that auto-hides after 5s
- All secondary actions open a **BottomSheet** instead of ad-hoc modals
- Gesture layer (volume left, brightness right, double-tap seek) is active but **not required** for basic operation

### 3.4 Home Screen Featured Redesign

**Shelf Architecture (priority order):**
1. **Continue Watching** (HERO) — Large card with progress bar, tap resumes
2. **Frequently Played** — Grid of recently played items with play count badge
3. **Quick Access** — User's top 3 playlists / recently created playlists  
4. **Recently Added** — Last 10 scanned media items (newest first)
5. **Featured Playlist** — App-generated "Mix" or user-curated playlist

**Featured Section Rules:**
- Each shelf hides entirely if empty (no blank gaps)
- "Continue Watching" shows items with 5% < progress < 95% only
- "Frequently Played" requires min 3 plays
- Empty state shows: "Welcome to SIMBA — Scan your library to get started" with animated illustration and CTA

### 3.5 Library Artist/Album View

**Tab Architecture:**
| Tab | Content | Sort |
|---|---|---|
| Videos | All video files | By date added (default), by name, by duration |
| Audio | All audio files with metadata | By artist → album, by album, by date, by name |
| Artists | Grouped by artist tag | Alphabetical, by play count |
| Albums | Grouped by album tag | Alphabetical, by release year |
| Playlists | User-created playlists | By last played, by name |

**Artist/Album Navigation:**
- Tap Artist → Show all albums by that artist → Tap Album → Show all tracks in album → Tap Track → Play all tracks in album context
- Bottom sheet info panel shows artist bio, discography count, related artists (future)

### 3.6 Splash Screen Redesign

**Android Native Splash (12+) / Custom JS Splash (legacy):**
- **Animation**: Lion logo fades in with gold glow pulse, then transitions to app content
- **Duration**: Max 1.5s — feel fast, not slow
- **Background**: Dark charcoal (`#08080A`) with subtle animated gradient radial glow
- **Logo**: Centered SVG Lion logo in gold (`#C9A84C`) with ambient shadow
- **Loading indication**: Subtle animated ring around logo (not a separate progress bar)
- **Edge Case**: If first launch, show splash → scan prompt. If returning user, splash → home with cached data

---

## 4. DETAILED 30-PHASE ELEVATION ROADMAP

```
WAVE 1: Critical Fixes ───────── Phases 1-5    (Fix broken UX & half-baked features)
WAVE 2: Player UX Overhaul ───── Phases 6-10   (Bottom sheets, playlist integration, info panels)  
WAVE 3: New Component System ──── Phases 11-15  (Universal sheets, gestures, navigation)
WAVE 4: Visual Redesign ──────── Phases 16-20  (Design tokens v3, animations, depth system)
WAVE 5: Content Discovery ────── Phases 21-25  (Library overhaul, metadata, search, queue)
WAVE 6: Polish & Perfection ──── Phases 26-30  (Performance, error handling, testing, audit)
```

---

### WAVE 1: Critical Fixes (Phases 1-5)
**Target:** Fix the most broken, confusing, and half-baked parts first.

#### PHASE 1 — PiP Architecture Rewrite
**Goal:** Fix PiP showing full activity instead of video surface only. Add pause/expand/back-arrow controls. Add chapter/progress info.

**Files:**
- `android/app/src/main/java/com/simba/player/PipManager.kt` — REWRITE
- `android/app/src/main/java/com/simba/player/MainActivity.kt` — UPDATE PiP lifecycle
- `src/hooks/usePipLifecycle.ts` — REWRITE
- `src/hooks/usePipEntry.ts` — REWRITE
- `src/store/slices/pipSlice.ts` — REWRITE
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — UPDATE

**Checklist:**
- [x] 1.1 Native `PipManager` renders only `VideoSurface` TextureView into PiP window (not full activity)
- [x] 1.2 PiP RemoteActions updated: [Pause/Resume] + [Expand to Fullscreen] + [Close] — 3 buttons max
- [x] 1.3 PiP notification text includes current chapter title and progress percentage
- [x] 1.4 Physical back button closes PiP (returns to app, doesn't exit)
- [x] 1.5 PiP window tap restores full PlayerScreen with position preserved
- [x] 1.6 `pipSlice` Redux state redesigned: isolated video surface URI, chapter tracking
- [x] 1.7 PlayerScreen handles PiP lifecycle transitions (enter → pause, exit → resume, close → destroy)
- [x] 1.8 Swipe-down gesture enters PiP with shrink animation preview

---

#### PHASE 2 — Splash Screen Redesign
**Goal:** Replace childish static splash with premium animated splash.

**Files:**
- `src/screens/Splash/SplashScreen.tsx` — NEW
- `android/app/src/main/res/drawable/splash_screen.xml` — UPDATE or CREATE
- `android/app/src/main/res/values/styles.xml` — UPDATE theme
- `src/navigation/RootNavigator.tsx` — ADD Splash route

**Checklist:**
- [x] 2.1 Android 12+ native splash screen configured with themed icon + animated logo
- [x] 2.2 Fallback JS splash screen for devices without native splash support
- [x] 2.3 Lion logo SVG animated: fade-in + gold glow pulse (1.5s max duration)
- [x] 2.4 Dark charcoal background with subtle animated gradient radial glow
- [x] 2.5 Loading ring animated around logo (indeterminate, not progress bar)
- [x] 2.6 First-launch flow: splash → scan prompt. Returning user: splash → cached home
- [x] 2.7 No flicker or white flash between splash and main app

---

#### PHASE 3 — Video Player Controls Redesign
**Goal:** Simplify the confusing, overwhelming player controls into clear visual hierarchy.

**Files:**
- `src/components/player/VideoControlsOverlay/VideoControlsOverlay.tsx` — REWRITE
- `src/components/player/VideoControlsOverlay/` — Restructure sub-components
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — UPDATE
- `src/screens/VideoPlayer/components/VideoPlayerControls.tsx` — REFACTOR
- `src/hooks/usePlayerGestures.ts` — NEW unified gesture hook

**Checklist:**
- [x] 3.1 Primary transport controls (back, play/pause, seek bar, prev/next) always visible — never auto-hide
- [x] 3.2 Secondary controls (chapters, audio tracks, subtitles, EQ, playlist) grouped into collapsible toolbar
- [x] 3.3 Collapsible toolbar auto-hides after 5s inactivity, re-shows on screen tap
- [x] 3.4 Each secondary control opens a BottomSheet (not ad-hoc modal) — consistent UX
- [x] 3.5 Double-tap seek gesture (±10s) works reliably with visual feedback (animated label)
- [x] 3.6 Volume (left edge vertical) and Brightness (right edge vertical) gestures integrated in `usePlayerGestures`
- [x] 3.7 All icon buttons have text labels on first interaction or long-press tooltip
- [x] 3.8 Consistent touch target sizing (min 44x44px) for all player controls
- [x] 3.9 Top bar always visible (title, back, more menu) — never auto-hides
- [x] 3.10 Video surface maintains correct aspect ratio on orientation change (landscape ↔ portrait) — no skew or stretch

---

#### PHASE 4 — Audio Player & Half-Baked Features Completion
**Goal:** Complete audio tracks, chapters, playlist peek, and queue — all currently incomplete and confusing.

**Files:**
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — REWRITE
- `src/screens/AudioPlayer/components/LyricsQueuePanel.tsx` — ENHANCE
- `src/components/player/SeekBar/SeekBar.tsx` — ADD chapter thumbnails
- `src/components/player/TrackSelector/TrackSelectorModal.tsx` — ENHANCE with metadata
- `src/components/player/NowPlayingInfo/` — NEW: Bottom sheet info components
- `src/services/metadataService.ts` — NEW: Metadata parser

**Checklist:**
- [x] 4.1 Audio track list shows rich metadata: artist, album, year, genre, track number, duration, artwork
- [x] 4.2 Chapter browser with visual thumbnails, chapter titles, descriptions, tap-to-seek
- [x] 4.3 Playlist peek preview shows: item count, total duration, first 3 items with artwork thumbnails
- [x] 4.4 Queue management: drag-reorder items, multi-select + batch delete, "Play Next" / "Add to Queue" context actions
- [x] 4.5 NowPlayingInfo bottom sheet: swipe up from player to see current track artist/album/chapters/related
- [x] 4.6 Album art displays as blurred background (AudioPlayer) and crisp foreground artwork
- [x] 4.7 LRC lyrics fully synchronized with auto-scroll, no drift
- [x] 4.8 Chapter marks display on SeekBar with tap-to-seek at chapter boundaries

---

#### PHASE 5 — Home Screen Featured Section Revision
**Goal:** Make the Home screen featured section meaningful and intelligent.

**Files:**
- `src/screens/Home/HomeScreen.tsx` — REWORK featured section
- `src/screens/Home/components/FeaturedHero.tsx` — NEW hero card component
- `src/utils/intelligenceEngine.ts` — ENHANCE featured algorithm
- `src/components/feedback/EmptyState/EmptyState.tsx` — ENHANCE animated illustration

**Checklist:**
- [x] 5.1 "Continue Watching" hero card: large format, progress bar overlay, tap to resume at saved position
- [x] 5.2 "Frequently Played" shelf: grid layout, play count badge, requires min 3 plays to appear
- [x] 5.3 "Quick Access" shelf: top 3 playlists (by last played) or recently created
- [x] 5.4 "Recently Added" shelf: last 10 scanned items, newest first, with file type indicator
- [x] 5.5 Each shelf hides entirely when empty — no blank gaps in scroll view
- [x] 5.6 Empty featured section shows animated "Welcome" empty state with "Scan Library" CTA
- [x] 5.7 Featured algorithm uses weighted score (recency × completion × frequency × time-of-day)
- [x] 5.8 Pull-to-refresh on Home screen triggers re-calculation of featured content

---

### WAVE 2: Player UX Overhaul (Phases 6-10)
**Target:** Add Spotify-quality bottom sheets, playlist integration, artist/album views.

#### PHASE 6 — Universal BottomSheet System
**Goal:** Build a high-quality, reusable bottom sheet component for all slide-up panels.

**Files:**
- `src/components/sheets/BottomSheet/BottomSheet.tsx` — NEW
- `src/components/sheets/BottomSheet/BottomSheetBackdrop.tsx` — NEW
- `src/components/sheets/BottomSheet/index.ts` — NEW
- `src/hooks/useBottomSheet.ts` — NEW
- `package.json` — ADD `react-native-gesture-handler` if not added, `react-native-reanimated`

**Checklist:**
- [x] 6.1 BottomSheet supports configurable snap points (25%, 50%, 75%, 100% or pixel values)
- [x] 6.2 Native-driven pan gesture for smooth drag-to-dismiss with haptic snap feedback
- [x] 6.3 Animated backdrop scrim with opacity fade proportional to sheet position
- [x] 6.4 Backdrop blur effect renders correctly on Android (hardware texture)
- [x] 6.5 Handle bar rendered at top of sheet (draggable visual indicator)
- [x] 6.6 Keyboard avoidance: sheet adjusts when input is focused
- [x] 6.7 Accessibility: focus trapped inside sheet when open, dismiss with back button
- [x] 6.8 TypeScript: fully typed props with generics for content data

---

#### PHASE 7 — Artist/Album Metadata View in Library
**Goal:** Allow browsing media by artist and album, not just raw file listing.

**Files:**
- `src/screens/Library/LibraryScreen.tsx` — ADD Artists + Albums tabs
- `src/screens/Library/components/ArtistGrid.tsx` — NEW
- `src/screens/Library/components/AlbumGrid.tsx` — NEW
- `src/screens/Library/components/ArtistDetailScreen.tsx` — NEW
- `src/screens/Library/components/AlbumDetailScreen.tsx` — NEW
- `src/store/slices/mediaSlice.ts` — NEW: Metadata Redux store
- `src/services/metadataService.ts` — ENHANCE with tag reading

**Checklist:**
- [x] 7.1 Library tab bar updated: Videos | Audio | Artists | Albums | Playlists
- [x] 7.2 Artists tab: grouped by artist tag, alphabetically sorted, show album count + play count
- [x] 7.3 Albums tab: grouped by album tag, sorted by release year (desc), show track count + total duration
- [x] 7.4 Tap artist → ArtistDetail screen: bio placeholder, discography list, total plays
- [x] 7.5 Tap album → AlbumDetail screen: track listing with durations, album art, artist link
- [x] 7.6 Play button on AlbumDetail plays all tracks in album order (creates temporary playlist context)
- [x] 7.7 Metadata parsed from audio files during scan (taglib/ffmpeg equivalent for React Native)
- [x] 7.8 Empty states for Artists/Albums tabs when no metadata available (prompt to scan)

---

#### PHASE 8 — In-Player Info Bottom Sheet
**Goal:** During video/audio playback, swipe up to see artist/album/chapters metadata (Spotify-style).

**Files:**
- `src/components/player/NowPlayingInfo/InfoSheet.tsx` — NEW
- `src/components/player/NowPlayingInfo/ChapterList.tsx` — NEW
- `src/components/player/NowPlayingInfo/TrackMetadata.tsx` — NEW
- `src/components/player/NowPlayingInfo/index.ts` — NEW
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — INTEGRATE InfoSheet trigger
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — INTEGRATE InfoSheet trigger

**Checklist:**
- [x] 8.1 InfoSheet accessible via swipe-up from bottom of player screen (drag handle indicator)
- [x] 8.2 Sheet shows: current track title, artist, album, release year, genre, duration
- [x] 8.3 Chapter list with timestamps, thumbnails, descriptions — tap to seek
- [x] 8.4 Related tracks section (same artist/album) — tap to play
- [x] 8.5 "Add to Playlist" button in sheet header (quick action)
- [x] 8.6 Sheet restores to main player on dismiss (no navigation away)
- [x] 8.7 Works for both VideoPlayer and AudioPlayer screens (shared component)
- [x] 8.8 Swipe-down gesture on sheet dismisses it (consistent with system navigation)

---

#### PHASE 9 — Playlist Integration During Playback
**Goal:** Allow adding current media to any playlist directly from the player screen (video & audio).

**Files:**
- `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx` — NEW
- `src/components/sheets/PlaylistSheet/PlaylistPicker.tsx` — NEW
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — ADD "Add to Playlist" action
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — ADD "Add to Playlist" action
- `src/store/slices/playerSlice.ts` — ENHANCE with add-to-playlist thunk
- `src/store/slices/playlistSlice.ts` — ADD `addCurrentItemToPlaylist` action

**Checklist:**
- [x] 9.1 "Add to Playlist" button visible in player overflow menu (top-right "More" icon)
- [x] 9.2 Tap opens PlaylistSheet showing all user playlists as a picker list
- [x] 9.3 Each playlist row shows: name, kind badge, item count, cover art (first item)
- [x] 9.4 Tap playlist adds current media item to that playlist with success toast
- [x] 9.5 "Create New Playlist" option at bottom of picker list (inline creation)
- [x] 9.6 Already-added items show a checkmark and "Remove from Playlist" action
- [x] 9.7 PlaylistSheet uses the BottomSheet component from Phase 6 (consistent UX)
- [x] 9.8 Sheet auto-dismisses after successful add/remove with haptic feedback

---

#### PHASE 10 — Library Playlist Creation Hub + Playback Integration
**Goal:** Enable playlist creation directly from Library folder browsing and media lists, then seamlessly load them into the player with full playback integration — play all, shuffle, per-item queue actions, and coherent prev/next/loop behavior.

**Files:**
- `src/screens/Library/LibraryScreen.tsx` — ADD playlist creation CTA
- `src/components/playlist/PlaylistCreateModal/PlaylistCreateModal.tsx` — NEW
- `src/components/playlist/PlaylistAddButton/PlaylistAddButton.tsx` — NEW
- `src/components/playlist/PlaylistCard/PlaylistCard.tsx` — NEW
- `src/components/playlist/PlaylistContextMenu/PlaylistContextMenu.tsx` — NEW
- `src/screens/PlaylistDetail/PlaylistDetailScreen.tsx` — ENHANCE with playback actions
- `src/store/slices/playlistSlice.ts` — ENHANCE selectors + bridge actions
- `src/store/slices/playerSlice.ts` — ENHANCE with playlist bridge action

**Checklist:**
- [x] 10.1 Floating "+" button in Library's Playlists tab to create new playlist
- [x] 10.2 Playlist creation modal: name input, kind selector (Audio/Video/Mixed), optional description
- [x] 10.3 Long-press on any media item (video/audio) shows context menu with "Add to Playlist"
- [x] 10.4 Multi-select mode in FolderBrowser: select multiple media files → "Add to Playlist" batch action
  - [x] 10.4.1 Header "Select" button toggles multi-select mode (long-press on file item also enters selection)
  - [x] 10.4.2 Each file row shows a circular checkbox (unchecked/checked) when in selection mode
  - [x] 10.4.3 Header shows selection count badge: "N Selected" with "Cancel" button to exit
  - [x] 10.4.4 Floating bottom action bar appears when ≥1 item selected: "Add to Playlist (N)"
  - [x] 10.4.5 Tapping batch action opens PlaylistContextMenu picker listing all user playlists + "Create New Playlist"
  - [x] 10.4.6 Selected items are batch-added to the chosen playlist (dispatch `addItemToPlaylist` for each)
  - [x] 10.4.7 Success feedback: brief toast/banner "Added N items to [playlist name]", then exit selection mode
  - [x] 10.4.8 Selection state is component-local (useState), cleared on exit/navigation
- [x] 10.5 Playlist cards in Library show: name, kind badge, item count, cover collage (up to 4 items), last updated
- [x] 10.6 Tap playlist card navigates to PlaylistDetail screen (v2 retained and enhanced)
- [x] 10.7 Empty state for Playlists tab: "No playlists yet — Create one to organize your media"
- [x] 10.8 Playlist creation validates: non-empty name, max 100 chars, unique name check
- [x] 10.9 Playlist cards show "▶ Play All" / "🔀 Shuffle All" actions — loads all items into `playerSlice.playlist` and starts playback from first (Play All) or random (Shuffle All)
- [x] 10.10 PlaylistDetail screen adds per-item actions: "Play Next" (insert at queue front) and "Add to Queue" (append to queue end); swipe-to-reveal or long-press context menu
- [x] 10.11 Bridge action `loadPlaylistToPlayer(playlistId)` copies user playlist items into `playerSlice.setPlaylist()`, calls `playFromPlaylist(0)`, and marks `playbackState = 'playing'`. Player screens detect this and load the first file.
- [x] 10.12 Prev/Next/Shuffle/Loop operate within the loaded playlist context — `nextTrack()` and `previousTrack()` cycle through the current `playerSlice.playlist` items, with wrap-around when `loopMode === 'playlist'`. Shuffle reorders the playlist in memory without modifying the user's stored playlist.

---

### WAVE 3: New Component System (Phases 11-15)
**Target:** Build reusable bottom sheet, popup, gesture, and navigation infrastructure.

#### PHASE 11 — Design System v3 (Design Tokens Refresh)
**Goal:** Update all design tokens to v3 specification (richer colors, new typography, enhanced spacing).

**Files:**
- `src/theme/tokens.ts` — REWRITE with v3 tokens
- `src/theme/ThemeProvider.tsx` — UPDATE with new token structure
- `src/theme/spacing.ts` — NEW: spacing tokens
- `src/theme/radius.ts` — NEW: corner radius tokens
- `src/theme/typography.ts` — NEW: typography tokens
- `src/components/core/AppText/AppText.tsx` — UPDATE with v3 variants
- All screens — UPDATE theme imports

**Checklist:**
- [x] 11.1 Color tokens updated to v3: darker `background.primary` (`#08080A`), new `surface.raised`/`pressed`, gold gradient, richer glass
- [x] 11.2 Typography tokens implemented: display, H1-H3, body, bodySmall, caption, button, tab with precise weights/sizes/line-heights/tracking
- [x] 11.3 Spacing tokens implemented: `spacing.xxs` through `spacing.xxxl` (4pt grid, 4-40px)
- [x] 11.4 Corner radius tokens implemented: `radius.sm` through `radius.full` (8px-999px)
- [x] 11.5 All existing screens updated to use new token paths (no hardcoded values remain)
- [x] 11.6 `useTheme()` returns new token structure without breaking existing consumers
- [x] 11.7 Backwards compatibility: old token paths work with deprecation warning during transition

---

#### PHASE 12 — Navigation Architecture Redesign
**Goal:** Clean up tab navigation, fix deep linking, add modal/sheet routes, remove brittle index-based switching.

**Files:**
- `src/navigation/RootNavigator.tsx` — REWRITE
- `src/navigation/TabNavigator.tsx` — REWRITE
- `src/navigation/types.ts` — UPDATE with all new routes
- `src/navigation/linking.ts` — NEW: deep linking config
- `src/components/layout/TabBar/FloatingTabBar.tsx` — ENHANCE

**Checklist:**
- [x] 12.1 Root stack navigator updated: Splash, Home, VideoPlayer, AudioPlayer, Library, Settings, PlaylistDetail, ArtistDetail, AlbumDetail, Search
- [x] 12.2 Tab navigator uses route keys (not index) for stable tab state
- [ ] 12.3 Deep linking configured: `simba://artist/:id`, `simba://album/:id`, `simba://playlist/:id`, `simba://video/:uri`, `simba://audio/:uri`
- [x] 12.4 Modal presentation for: PlaylistSheet, InfoSheet, TrackSelector, EQ settings
- [x] 12.5 Tab bar indicator animation smooth with no drift (fix v2 bug)
- [x] 12.6 Screen accounts for floating tab bar height in safe area (prevents content clipping)
- [x] 12.7 Back navigation from PlayerScreen returns to correct previous screen

---

#### PHASE 13 — Unified Gesture Handler & Interaction System
**Goal:** Build a reliable gesture system for the player (double-tap seek, volume/brightness slide, swipe-down PiP) with consistent feedback.

**Files:**
- `src/hooks/usePlayerGestures.ts` — NEW
- `src/components/player/VideoControlsOverlay/VideoPlayerGestureLayer.tsx` — REWRITE
- `src/components/player/AudioControlsBar/` — NEW: audio gesture component
- `src/hooks/useHaptics.ts` — ENHANCE

**Checklist:**
- [x] 13.1 Double-tap left side seeks backward 10s with animated label ("-10s")
- [x] 13.2 Double-tap right side seeks forward 10s with animated label ("+10s")
- [x] 13.3 Vertical swipe on left edge adjusts volume with visual indicator
- [x] 13.4 Vertical swipe on right edge adjusts brightness with visual indicator
- [x] 13.5 Swipe-down gesture on video surface triggers PiP with shrink animation
- [x] 13.6 All gestures have haptic feedback on activation and threshold
- [ ] 13.7 Gestures are disabled when controls are in a bottom sheet (no conflict)
- [x] 13.8 Gestures work reliably across Android 10-14+ (no dead zones)

---

#### PHASE 14 — Popup/Dialog/Modal System Redesign
**Goal:** Unify all popups, dialogs, and modals into a consistent, premium design system.

**Files:**
- `src/components/feedback/Dialog/Dialog.tsx` — NEW: generic dialog component
- `src/components/feedback/Dialog/ConfirmDialog.tsx` — NEW: confirmation dialog
- `src/components/feedback/Dialog/PromptDialog.tsx` — NEW: text input dialog
- `src/screens/Settings/SettingsScreen.tsx` — UPDATE dialogs
- `src/features/playlists/components/PlaylistModal.tsx` — UPDATE to use Dialog system
- `src/screens/Library/LibraryScreen.tsx` — UPDATE dialogs

**Checklist:**
- [x] 14.1 Dialog component: title, description, up to 3 action buttons, optional icon
- [x] 14.2 ConfirmDialog: destructive action confirmation with gold/cancel buttons
- [x] 14.3 PromptDialog: text input with validation, max length, placeholder
- [x] 14.4 All dialogs use glassmorphic background (`background.floating`) with scrim
- [x] 14.5 Dialog entrance animation: subtle scale + fade (not abrupt)
- [x] 14.6 Keyboard avoidance in PromptDialog
- [x] 14.7 Haptic feedback on destructive confirmations

---

#### PHASE 15 — Loading, Skeleton & Transition States
**Goal:** Replace raw ActivityIndicator views with polished skeleton loaders and transition animations.

**Files:**
- `src/components/feedback/SkeletonLoader/SkeletonLoader.tsx` — ENHANCE
- `src/components/feedback/SkeletonLoader/SkeletonCard.tsx` — NEW: card skeleton
- `src/components/feedback/SkeletonLoader/SkeletonList.tsx` — NEW: list skeleton
- `src/components/feedback/LoadingOverlay/LoadingOverlay.tsx` — NEW
- `src/screens/Home/HomeScreen.tsx` — ADD skeleton loading state
- `src/screens/Library/LibraryScreen.tsx` — ADD skeleton loading state
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — ENHANCE loading overlay

**Checklist:**
- [x] 15.1 Skeleton shimmer animation: animated gold-tinted gradient across gray placeholder shapes
- [x] 15.2 SkeletonCard: mimics card layout (image placeholder + 2 text lines + action area)
- [x] 15.3 SkeletonList: mimics list layout (avatar + 2 text lines per row, 5 rows)
- [x] 15.4 LoadingOverlay: semi-transparent with spinner + descriptive text (not just "Loading...")
- [x] 15.5 All loading states show within 200ms (no blank white/black flash)
- [x] 15.6 Screen transitions: cross-fade animation between screens (not instant pop)
- [x] 15.7 Loading states accessible (screen reader announces "Loading content")

---

### WAVE 4: Screen Architecture & Edge Case Overhaul (Phases 16-20)
**Target:** Eliminate all childish UI patterns, fix broken screen architecture, handle every edge case properly, and deliver a premium mature UI.

**Design Rules (Wave 4):**
- **No inline list components** — Every `FlatList`, `ScrollView`, `SectionList` must be extracted into its own component file under a `components/` subfolder of its screen (e.g. `HomeScreen/components/HomeMediaList.tsx`)
- **All edge cases must render** — Empty state, loading state, error state, no-network state, scan-in-progress state. No dead ends or blank white/black screens
- **Theme tokens everywhere** — Zero tolerance for hardcoded colors, spacing, or raw `<Text>`; all must use `colors.*`, `s.*`, `AppText`
- **Professional visual hierarchy** — Proper whitespace, card layering, gold accents, consistent typography

#### PHASE 16 — Screen Component Architecture Extraction
**Goal:** Extract all inline `FlatList`/`ScrollView`/`SectionList` patterns into their own component files under each screen's `components/` subfolder. Eliminate the "everything in one file" pattern from all screens.

**Problem:** Current screens like HomeScreen, LibraryScreen, SettingsScreen have large inline blocks of list code that mix data mapping with JSX directly. This makes edge case handling inconsistent and UI changes risky.

**Files:**
- `src/screens/Home/HomeScreen.tsx` — EXTRACT inline shelves into components/
- `src/screens/Home/components/ContinueWatchingHero.tsx` — ENSURE pure component pattern
- `src/screens/Home/components/HomeMediaShelf.tsx` — ENSURE pure component pattern
- `src/screens/Home/components/QuickAccessShelf.tsx` — ENSURE pure component pattern
- `src/screens/Home/components/HomeEmptyState.tsx` — ENSURE pure component pattern
- `src/screens/Home/components/HomeLoadingSkeleton.tsx` — NEW: dedicated skeleton component for Home
- `src/screens/Library/LibraryScreen.tsx` — EXTRACT inline list logic
- `src/screens/Library/components/VideoList.tsx` — NEW: video library list component
- `src/screens/Library/components/AudioList.tsx` — NEW: audio library list component
- `src/screens/Library/components/PlaylistList.tsx` — NEW: playlist list component
- `src/screens/Library/components/FolderList.tsx` — NEW: folder list component
- `src/screens/Library/components/LibraryEmptyState.tsx` — NEW: per-segment empty states
- `src/screens/Settings/SettingsScreen.tsx` — EXTRACT section groups
- `src/screens/Settings/components/SettingsSection.tsx` — NEW: reusable settings section component
- `src/components/layout/ScreenContainer/ScreenContainer.tsx` — CREATE: universal screen wrapper with safe area, padding, scroll handling

**Checklist:**
- [x] 16.1 ScreenContainer created: wraps every screen with consistent safe area, horizontal padding (`spacing.md`), top/bottom insets, scroll capability
- [x] 16.2 HomeScreen: all shelf/list content extracted to components/ subfolder — no inline FlatList or map() in main screen file
- [x] 16.3 LibraryScreen: each tab segment (Videos, Audio, Artists, Albums, Folders, Playlists) has its own component file extracted
- [x] 16.4 SettingsScreen: menu sections extracted to components/SettingsSection.tsx with typed items
- [x] 16.5 AudioPlayerScreen: transport controls extracted to components/AudioTransportControls.tsx
- [x] 16.6 Every screen component file is a proper functional component with typed props (not an anonymous render function)
- [ ] 16.7 No screen file exceeds 200 lines of code (enforced by extraction) — NOTE: screens exceed 200 lines; extraction is partial
- [x] 16.8 Each extracted component handles its own loading/empty/error states internally

---

#### PHASE 17 — HomeScreen Complete Redesign
**Goal:** Completely redesign the HomeScreen with a professional, mature visual hierarchy. Handle every possible edge case so the screen never looks broken or half-baked.

**Problem:** Current HomeScreen is flat — shelves just stack vertically with no visual hierarchy. When empty, it falls to a basic empty state. No featured banner, no visual rhythm, no whitespace management.

**Files:**
- `src/screens/Home/HomeScreen.tsx` — REWRITE
- `src/screens/Home/components/HomeHeader.tsx` — ENHANCE (moved from layout)
- `src/screens/Home/components/FeaturedHeroBanner.tsx` — NEW: large hero card with gradient overlay, progress, play button
- `src/screens/Home/components/ContinueWatchingHero.tsx` — REWRITE with glass effect
- `src/screens/Home/components/HomeMediaShelf.tsx` — REWRITE with proper card layout
- `src/screens/Home/components/QuickAccessShelf.tsx` — REWRITE with glass cards
- `src/screens/Home/components/HomeEmptyState.tsx` — REWRITE with animated illustration + all CTAs
- `src/screens/Home/components/HomeLoadingSkeleton.tsx` — NEW
- `src/screens/Home/components/HomeErrorState.tsx` — NEW: error with retry button
- `src/screens/Home/components/NoNetworkBanner.tsx` — NEW: top banner when offline

**Edge Cases (must all render properly):**
| State | Visual | CTA |
|---|---|---|
| First launch, empty library | Animated "Welcome to Simba" screen with lion logo, gold glow, subtitle | "Open Media File" button + "Browse Library" link |
| Library has items, no featured content | Shelves visible but hero area shows "Continue Watching" placeholder | "Pick up where you left off" prompt |
| Scan in progress | Non-blocking banner at top of scroll | Tap to view scan progress |
| No network connection | Subtle gold warning banner at top | "Retry" button |
| Loading (initial render) | 4 skeleton shelf placeholders with shimmer | — |
| Error loading data | Error card with icon, message, retry | "Retry" button |
| All shelves empty (has content but nothing matches) | "Nothing to show yet" card | "Browse Library" link |

**Visual Hierarchy (top to bottom):**
```
┌──────────────────────────────┐
│  NoNetworkBanner (if offline) │
│  ScanProgressBanner (if scan) │
│  HomeHeader (greeting + search│
│    + settings gear)           │
├──────────────────────────────┤
│  FeaturedHeroBanner           │
│  (large, gradient overlay,    │
│   progress bar, gold play btn)│
├──────────────────────────────┤
│  "Continue Watching" shelf    │
│  (horizontal scroll, glass    │
│   cards with progress ring)   │
├──────────────────────────────┤
│  "Frequently Played" shelf    │
│  (2-column grid, play count   │
│   badge, gold accent)         │
├──────────────────────────────┤
│  "Quick Access" shelf         │
│  (horizontal scroll, playlist │
│   glass cards)                │
├──────────────────────────────┤
│  "Recently Added" shelf       │
│  (horizontal scroll, new      │
│   badge, type indicator)      │
├──────────────────────────────┤
│  +200px TabBar safe area      │
└──────────────────────────────┘
```

**Checklist:**
- [x] 17.1 FeaturedHeroBanner: large full-width card with gradient overlay (dark → transparent), title, subtitle, progress bar, gold play button
- [x] 17.2 HomeHeader: gold accent greeting ("Good evening"), search icon, settings gear, scan indicator dot
- [x] 17.3 NoNetworkBanner: gold warning banner at top, auto-hides on reconnect
- [x] 17.4 ScanProgressBanner: integrated from existing component, shows progress percentage
- [x] 17.5 ContinueWatchingHero: glass card with thumbnail, progress ring (circular), title, resume text
- [x] 17.6 HomeMediaShelf: section header with chevron "See All", horizontal scroll or 2-column grid
- [x] 17.7 QuickAccessShelf: glass-morphic playlist cards with item count badge
- [x] 17.8 HomeLoadingSkeleton: 4 distinct skeleton shapes matching the real layout (hero + 3 shelves)
- [x] 17.9 HomeErrorState: error icon, descriptive message, "Tap to retry" button that re-fetches
- [x] 17.10 HomeEmptyState: animated lion logo, gold glow pulse, 2 CTAs — "Open Media" primary, "Browse Library" secondary
- [x] 17.11 Empty shelf sections completely hidden — no blank gaps between populated shelves
- [x] 17.12 Tab bar safe area: `paddingBottom` uses derived safe area inset, not hardcoded `100`

---

#### PHASE 18 — Universal Edge Case System (All Screens)
**Goal:** Every single screen in the app handles its edge cases professionally. No screen shows a blank white/black state, no infinite loading spinner, no dead tap targets.

**Problem:** Currently each screen handles edge cases inconsistently. LibraryScreen has some empty states but they use random hardcoded colors. SettingsScreen has no loading state. AudioPlayerScreen has basic error handling.

**Files:**
- `src/screens/Library/LibraryScreen.tsx` — ADD all edge states
- `src/screens/Library/components/VideoList.tsx` — ADD loading/empty/error states
- `src/screens/Library/components/AudioList.tsx` — ADD loading/empty/error states
- `src/screens/Library/components/PlaylistList.tsx` — ADD loading/empty/error states
- `src/screens/Library/components/FolderList.tsx` — ADD loading/empty/error states
- `src/screens/Settings/SettingsScreen.tsx` — ADD loading/error states
- `src/screens/Settings/components/MpvConfigEditor.tsx` — ADD empty config state
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — FIX hardcoded error screen colors (use theme tokens)
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — ENHANCE error state with full screen overlay
- `src/components/feedback/EmptyState/EmptyState.tsx` — REWRITE: universal empty state with icon, title, message, optional action
- `src/hooks/useNetworkStatus.ts` — NEW: detect online/offline

**Edge Case Matrix (every screen must implement ALL applicable states):**

| Screen | Empty | Loading | Error | Offline | Scanning |
|---|---|---|---|---|---|
| Home | Welcome animation with CTAs | 4 skeleton shelves | Error card with retry | Gold warning banner | Scan progress banner |
| Library (Videos) | "No videos found" → scan CTA | Skeleton list | Error with retry | — | Overlay + message |
| Library (Audio) | "No audio found" → scan CTA | Skeleton list | Error with retry | — | Overlay + message |
| Library (Playlists) | "No playlists. Create one" → btn | Skeleton cards | Error with retry | — | — |
| Library (Folders) | "Link a folder to get started" → btn | Skeleton list | Error with retry | — | — |
| Settings | N/A | Skeleton rows on config load | Error toast on config | — | — |
| VideoPlayer | N/A | Loading overlay (spinner) | Full-screen error with retry | — | — |
| AudioPlayer | N/A | Loading overlay (spinner + artwork) | Full-screen error with retry | — | — |

**Checklist:**
- [x] 18.1 EmptyState component rewritten: takes `icon`, `title`, `message`, `actionLabel`, `onAction` props — used by all screens
- [x] 18.2 LibraryScreen: all 6 segments (Video, Audio, Artists, Albums, Folders, Playlists) each have distinct EmptyState
- [x] 18.3 LibraryScreen: each segment handles Loading (SkeletonList) + Error (retry + message) states
- [x] 18.4 SettingsScreen: loading skeleton for MPV config, error toast on config write failure
- [x] 18.5 VideoPlayer error screen: uses `colors.semantic.error`, `colors.accent.gold`, `colors.background.primary` — no hardcoded colors
- [x] 18.6 AudioPlayer error screen: full-screen overlay matching VideoPlayer pattern, uses theme tokens
- [x] 18.7 useNetworkStatus hook: detects offline via NetInfo or fetch heartbeat, exposes `isOnline` boolean
- [x] 18.8 HomeScreen NoNetworkBanner: shown only when offline, auto-hides on reconnect, gold warning styling
- [x] 18.9 No screen shows a blank/unstyled state for any of the above categories
- [x] 18.10 All edge states use `accessible={true}` and `accessibilityRole` for screen reader support

---

#### PHASE 19 — Theme Token Compliance & Hardcoded Value Cleanup
**Goal:** Eliminate all hardcoded colors, raw `<Text>` usage, and hardcoded spacing values across the entire codebase. Every visual element must use theme tokens.

**Audit Target — 10 Known Violations:**
1. `AppButton.tsx` uses raw `<Text>` (line 117) instead of `AppText`
2. `VideoPlayerScreen.tsx` error screen uses `#FF3B30`, `#C9A84C`, `#0A0A0C`, `rgba(255,255,255,0.08)` — should be `colors.semantic.error`, `colors.accent.gold`, `colors.background.primary`, `colors.border.subtle`
3. `VideoPlayerScreen.tsx` root `backgroundColor: '#000'` — should be `colors.background.primary`
4. `LibraryScreen.tsx` hardcoded `'#64C8FF'` (blue tint) and `rgba(100,200,255,0.12)` — replace with gold accent or theme-safe blue
5. `LibraryScreen.tsx` hardcoded `'#0A0A0C'` for dark folder type background — should be `colors.background.elevated`
6. `AudioPlayerScreen.tsx` hardcoded `'rgba(255,255,255,0.15)'` for volume track — should be `colors.border.emphasis`
7. `AudioPlayerScreen.tsx` hardcoded `'rgba(255,255,255,0.08)'` for action button border — should be `colors.border.subtle`
8. `FloatingTabBar.tsx` hardcoded `shadowColor: '#000'` — redundant with `shadows.md`, remove
9. `HomeScreen.tsx` hardcoded `paddingBottom: 100` — use `bottomChromeInset` from safe area
10. `LibraryScreen.tsx` and `SettingsScreen.tsx` dialog buttons use `'rgba(255,255,255,0.08)'` — should be `colors.border.subtle`

**Files:**
- `src/components/core/AppButton/AppButton.tsx` — FIX: replace `<Text>` with `AppText variant="button"`
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — FIX: error screen + root colors
- `src/screens/Library/LibraryScreen.tsx` — FIX: hardcoded blue/dark values
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — FIX: hardcoded rgba values
- `src/components/tabbar/FloatingTabBar.tsx` — FIX: redundant shadowColor
- `src/screens/Home/HomeScreen.tsx` — FIX: hardcoded paddingBottom
- `src/screens/Library/LibraryScreen.tsx` — FIX: dialog border colors
- `src/screens/Settings/SettingsScreen.tsx` — FIX: dialog border colors

**Checklist:**
- [x] 19.1 AppButton: `Text` replaced with `AppText variant="button"`, colors use theme tokens
- [x] 19.2 VideoPlayer error screen: all hardcoded colors replaced with theme token equivalents
- [x] 19.3 VideoPlayer root: `backgroundColor: '#000'` → `colors.background.primary`
- [x] 19.4 LibraryScreen: all `#64C8FF` and `#0A0A0C` hardcoded values replaced with theme-safe tokens
- [x] 19.5 AudioPlayerScreen: hardcoded `rgba(255,255,255,0.15)` → `colors.border.emphasis`, `rgba(255,255,255,0.08)` → `colors.border.subtle`
- [x] 19.6 FloatingTabBar: redundant `shadowColor: '#000'` removed (already in `shadows.md`)
- [x] 19.7 HomeScreen: hardcoded `paddingBottom: 100` replaced with derived `bottomChromeInset`
- [x] 19.8 LibraryScreen + SettingsScreen: `rgba(255,255,255,0.08)` in dialog borders → `colors.border.subtle`
- [x] 19.9 No raw `<Text>` components exist anywhere in `src/screens/` or `src/components/` (audit pass)
- [x] 19.10 No hardcoded `rgba(#)` or `#XXXXXX` color values exist in any screen or component style (except SVG fills)

---

#### PHASE 20 — Visual Depth & Glassmorphism System
**Goal:** Replace flat, childish surfaces with layered depth using glass effect cards, standardized shadow system, and consistent border radius hierarchy.

**Files:**
- `src/components/core/AppCard/AppCard.tsx` — REWRITE with glass effect (semi-transparent, subtle top highlight, gold accent border variant)
- `src/theme/tokens.ts` — VERIFY radius tokens are used everywhere
- `src/theme/shadows.ts` — ENSURE shadow presets are applied universally
- `src/screens/Home/components/FeaturedHeroBanner.tsx` — ADD glass effect overlay
- `src/screens/Home/components/HomeMediaShelf.tsx` — USE AppCard with elevated variant
- `src/screens/Library/components/MediaListItem.tsx` — USE AppCard
- `src/screens/Library/components/AlbumGrid.tsx` — USE AppCard for album art cards
- `src/screens/Library/components/ArtistGrid.tsx` — USE AppCard for artist cards

**Surface Depth Hierarchy:**
```
Level 0: background.primary (#08080A)        — Screen backgrounds
Level 1: background.elevated (#121214)        — Card surfaces
Level 2: background.floating (rgba 0.92)      — Sheets, modals
Level 3: AppCard + shadow.sm                  — Interactive cards
Level 4: AppCard + shadow.md + gold border    — Active/selected cards
```

**Checklist:**
- [x] 20.1 AppCard glass effect: semi-transparent `background.elevated` + subtle top highlight border (`rgba(255,255,255,0.04)`)
- [x] 20.2 Shadow system enforced: `shadows.sm` for cards, `shadows.md` for sheets, `shadows.lg` for modals
- [x] 20.3 Card border states: default `colors.border.subtle`, gold accent `colors.border.emphasis` when active
- [x] 20.4 Surface stacking clear: every surface maps to one of the 5 depth levels — no ambiguous flat surfaces
- [x] 20.5 No flat `#000` or pure `#FFF` cards — all cards have at minimum `background.elevated` + `border.subtle`
- [x] 20.6 Border radius consistent: cards `radius.md` (12px), sheets `radius.lg` (16px), modals `radius.xl` (24px top)
- [x] 20.7 HomeScreen shelves: each card uses AppCard with elevated variant + shadow.sm
- [x] 20.8 LibraryScreen list items: each item uses AppCard with border.subtle — no flat list rows
- [x] 20.9 Android elevation mapping: shadow tokens map correctly to Android `elevation` (no double-shadow)
- [x] 20.10 All card and surface components verified for token compliance (no hardcoded radius/color/shadow)

---

### WAVE 5: Content Discovery (Phases 21-25)
**Target:** Overhaul Library browsing, search, queue management, notifications, and media scanning.

#### PHASE 21 — Library Grid/List View Redesign
**Goal:** Give Library a mature, flexible browsing experience with toggleable grid/list views and rich media cards.

**Files:**
- `src/screens/Library/LibraryScreen.tsx` — REWRITE layout
- `src/screens/Library/components/MediaGridItem.tsx` — NEW: grid card component
- `src/screens/Library/components/MediaListItem.tsx` — ENHANCE with context menu
- `src/screens/Library/components/ViewToggle.tsx` — NEW: grid/list toggle
- `src/screens/Library/components/MediaContextMenu.tsx` — NEW: long-press context menu

**Checklist:**
- [x] 21.1 Grid view: 2-column layout with media card (thumbnail, title, duration badge, type icon)
- [x] 21.2 List view: single-column with thumbnail, metadata, duration (v2 enhanced)
- [x] 21.3 View toggle button in Library header: grid-icon / list-icon with active state
- [x] 21.4 Long-press on any media item opens MediaContextMenu: Play, Add to Playlist, Add to Queue, Share, Info
- [x] 21.5 Grid cards have consistent aspect ratio (16:9 for video, 1:1 for audio album art)
- [x] 21.6 Sort options per tab: Name, Date Added, Duration, Artist (audio only), Album (audio only)
- [x] 21.7 Filter by file type: All, Video Only, Audio Only (as chip filters in header)
- [x] 21.8 Tab state preserved when switching between grid/list views

---

#### PHASE 22 — Search & Filter System
**Goal:** Full-text search across all media with filters, recent searches, and instant results.

**Files:**
- `src/screens/Search/SearchScreen.tsx` — NEW
- `src/screens/Home/HomeScreen.tsx` — ADD search trigger
- `src/components/layout/HomeHeader/HomeHeader.tsx` — ADD search icon
- `src/hooks/useSearch.ts` — NEW: debounced search hook
- `src/store/slices/mediaSlice.ts` — ADD search index
- `src/services/metadataService.ts` — ENHANCE with text indexing

**Checklist:**
- [x] 22.1 Search accessible from Home header (magnifying glass icon) and Library header
- [x] 22.2 Search results grouped by type: Videos, Audio, Artists, Albums, Playlists, Chapters
- [x] 22.3 Debounced search (300ms) — results update as user types
- [x] 22.4 Results highlight matching text (gold color for matched keywords)
- [x] 22.5 Recent searches stored locally (max 10, shown when search input is empty/focused)
- [x] 22.6 "Clear" button in search input, "Clear All" in recent searches
- [x] 22.7 Empty search result: "No results for [query]" with suggestions
- [x] 22.8 Search index rebuilt when media library is rescanned

---

#### PHASE 23 — Queue Management Redesign
**Goal:** Transform the basic Next/Prev queue into a full-featured queue manager with reorder, multi-select, and batch operations.

**Files:**
- `src/components/sheets/QueueSheet/QueueSheet.tsx` — NEW
- `src/components/sheets/QueueSheet/QueueItem.tsx` — NEW
- `src/components/sheets/QueueSheet/QueueDragHandle.tsx` — NEW
- `src/store/slices/playerSlice.ts` — ENHANCE with reorder, batch actions
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — ADD queue trigger
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — ADD queue trigger

**Checklist:**
- [x] 23.1 QueueSheet accessible via bottom sheet trigger in player (tap queue icon)
- [x] 23.2 Current track highlighted with gold accent and "Now Playing" badge
- [x] 23.3 Drag-reorder handle on each queue item (long-press to initiate drag)
- [x] 23.4 Multi-select mode: checkboxes appear on long-press of any item
- [x] 23.5 Batch operations in multi-select: Remove Selected, Move to Top, Clear All
- [x] 23.6 "Play Next" button adds selected item to position after current track
- [x] 23.7 "Add to Queue" button adds items to end of queue
- [x] 23.8 Queue persisted in Redux (survives brief app backgrounding)
- [x] 23.9 Queue history: "Previously Played" section accessible from sheet

---

#### PHASE 24 — Notification & Now Playing Integration
**Goal:** Provide persistent now-playing notification with full controls, seeking, and queue access from notification shade.

**Files:**
- `src/services/notificationService.ts` — NEW: notification manager
- `android/app/src/main/java/com/simba/player/MediaNotificationService.kt` — NEW: Android foreground service
- `src/native/MpvPlayerModule.ts` — ENHANCE with notification bridge
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — INTEGRATE notification state
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — INTEGRATE notification state
- `package.json` — ADD `@react-native-community/notification` or similar

**Checklist:**
- [x] 24.1 Media notification shows: title, artist, album art thumbnail, play/pause, prev/next
- [x] 24.2 Seekable notification progress bar (Android 12+ custom progress)
- [x] 24.3 Notification updates in real-time with position, playing state
- [x] 24.4 Tap notification opens active player screen
- [x] 24.5 Notification persists in background until playback is explicitly ended
- [x] 24.6 Foreground service for audio playback (prevents Android from killing process)
- [x] 24.7 Notification respects Android 13+ notification permission flow
- [x] 24.8 Multiple sessions: last active player owns the notification

---

#### PHASE 25 — Media Scanner & Indexing Improvements
**Goal:** Make scanning faster, more reliable, and metadata-aware. Add progress reporting and incremental scanning.

**Files:**
- `src/services/fileService.ts` — REWRITE scanner
- `src/services/metadataService.ts` — ENHANCE with batch metadata extraction
- `src/hooks/useMediaScanner.ts` — NEW: scanner with progress hook
- `src/components/feedback/ScanProgressBanner/ScanProgressBanner.tsx` — ENHANCE
- `src/store/slices/mediaSlice.ts` — ADD scanner state
- `src/screens/Library/LibraryScreen.tsx` — UPDATE scanner integration

**Checklist:**
- [x] 25.1 Incremental scanning: only scan new/modified files since last scan (use file modification timestamps)
- [x] 25.2 Batch metadata extraction: scan all files first, then batch-process metadata (non-blocking)
- [x] 25.3 Live progress: "Scanning folder X — Y files found — Z% complete" with animated indicator
- [x] 25.4 Cancel scan button: stops current scan and preserves already-found files
- [x] 25.5 Auto-scan on app launch if linked folders changed since last scan
- [x] 25.6 Scan history: last scan time, files added, files removed, errors count
- [x] 25.7 Unsupportable files reported but not indexed (show count, not list)
- [x] 25.8 Media count stored in Redux for Home screen shelf display (no race condition)

---

### WAVE 6: Polish & Perfection (Phases 26-30)
**Target:** Performance optimization, error handling, accessibility, testing, and final production audit.

#### PHASE 26 — Performance Optimization
**Goal:** Eliminate jank, slow list scrolling, and memory leaks. Ensure smooth 60fps experience.

**Files:**
- `src/screens/Library/components/MediaListItem.tsx` — AUDIT memoization
- `src/screens/Library/components/MediaGridItem.tsx` — AUDIT memoization
- `src/screens/Home/HomeScreen.tsx` — AUDIT FlatList config
- All large list renders — AUDIT `getItemLayout`, `windowSize`, `maxToRenderPerBatch`
- `src/components/player/SeekBar/SeekBar.tsx` — OPTIMIZE render frequency
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — AUDIT re-renders

**Checklist:**
- [x] 26.1 All list components use `React.memo` with proper comparison function
- [x] 26.2 `getItemLayout` provided for fixed-height lists (avoids measurement)
- [x] 26.3 `windowSize` set to 5 (virtualization window), `maxToRenderPerBatch` set to 10
- [x] 26.4 SeekBar position updates debounced to 250ms (not per-frame)
- [x] 26.5 Player screen re-renders minimized: separate state for transport vs. overlay controls
- [x] 26.6 Image loading: `react-native-fast-image` with priority levels (high for hero, low for grid)
- [x] 26.7 Memory: no stale closures in useEffect, all subscriptions cleaned up on unmount
- [x] 26.8 No console.log in production (removed or behind DEBUG flag)
- [x] 26.9 Bundle size optimized: tree-shaking, lazy-loaded screens, code-split where possible

---

#### PHASE 27 — Error Handling & Edge Cases
**Goal:** Gracefully handle all error states — file missing, permissions denied, engine failure, network timeout.

**Files:**
- `src/components/feedback/ErrorBoundary/ErrorBoundary.tsx` — NEW
- `src/components/feedback/ErrorBoundary/PlayerErrorFallback.tsx` — NEW
- `src/components/feedback/ErrorBoundary/ScreenErrorFallback.tsx` — NEW
- `src/screens/VideoPlayer/VideoPlayerScreen.tsx` — ADD error states
- `src/screens/AudioPlayer/AudioPlayerScreen.tsx` — ADD error states
- `src/services/fileService.ts` — ENHANCE error reporting

**Checklist:**
- [x] 27.1 Screen-level ErrorBoundary wraps each screen: show error illustration + "Retry" CTA
- [x] 27.2 PlayerErrorFallback: "Playback Error" with error code, file name, retry, and "Go Back" buttons
- [x] 27.3 File missing handler: detect moved/deleted files, show "File not found" with "Remove from Library" action
- [x] 27.4 Permission denied: show rationale dialog with "Open Settings" CTA (Android settings deep link)
- [x] 27.5 Engine init failure: graceful fallback to safe state with error toast
- [x] 27.6 All network/scanning errors: toast with error message, no crashes
- [x] 27.7 Error logging: structured error log to local storage (for future crash reporting)
- [x] 27.8 Edge case: file with zero duration → show "Live" or "Unknown" instead of 0:00

---

#### PHASE 28 — Accessibility & Internationalization
**Goal:** Make the app accessible (screen readers, contrast, touch targets) and prepare for i18n.

**Files:**
- `src/hooks/useAccessibility.ts` — NEW: accessibility helpers
- All interactive components — AUDIT accessibilityLabel, role, state
- `src/utils/i18n.ts` — NEW: i18n setup (single file for initial support)
- `src/constants/strings.ts` — NEW: all user-facing strings centralized

**Checklist:**
- [x] 28.1 All interactive elements have `accessibilityLabel` (descriptive, not just icon name)
- [x] 28.2 All touchable elements have min 44x44px touch target (accessibility guideline)
- [x] 28.3 Screen reader announces: title, artist, position, duration, playback state
- [x] 28.4 Color contrast: all text on colored backgrounds meets WCAG AA (4.5:1 ratio)
- [x] 28.5 Focus management: bottom sheets trap focus, dismiss on Escape/Back
- [x] 28.6 Reduce motion: all animations respect `AccessibilityInfo.isReduceMotionEnabled()` / `prefers-reduced-motion`
- [x] 28.7 i18n foundation: all user-facing strings in `src/constants/strings.ts` (no hardcoded strings in components)
- [x] 28.8 RTL layout support: verify layouts don't break with RTL text direction

---

#### PHASE 29 — Testing & TypeScript Verification
**Goal:** Ensure all TypeScript is strict, all components have type safety, and critical flows are verified.

**Files:**
- `src/types/` — AUDIT for strictness
- `src/store/slices/` — AUDIT action typing
- `src/screens/` — AUDIT component props
- `src/App.tsx` — ADD root-level error boundary
- `tsconfig.json` — UPDATE strict settings

**Checklist:**
- [ ] 29.1 `tsconfig.json` strict mode enabled (`strict: true`) — all files compile without errors
- [ ] 29.2 All Redux actions fully typed with `PayloadAction<T>` (no `any`)
- [ ] 29.3 All component props typed with interface (no implicit `any`)
- [ ] 29.4 All navigation params typed via `RootStackParamList` and `TabParamList`
- [ ] 29.5 No `@ts-ignore` or `@ts-nocheck` in production code
- [ ] 29.6 No unused imports (verified by lint)
- [ ] 29.7 Player state machine verified: init → loading → playing → paused → seeking → completed → destroyed
- [ ] 29.8 No PropTypes (TypeScript provides type checking — PropTypes are redundant)

---

#### PHASE 30 — Final Production Audit & Polish
**Goal:** Comprehensive end-to-end review of the entire app. Ensure every phase is verified and production-ready.

**Files:**
- All app files — FINAL REVIEW
- `src/App.tsx` — FINAL VERIFICATION
- `android/app/build.gradle` — VERIFY release config
- `package.json` — VERIFY dependency versions

**Checklist:**
- [ ] 30.1 Every checklist item across all 29 phases verified as complete
- [ ] 30.2 All screens navigable without crashes: Home → Library → Settings → Player → Back
- [ ] 30.3 Media scanning works end-to-end: add folder → scan → see results in Library
- [ ] 30.4 Playback works end-to-end: tap file → player loads → play/pause → seek → go back → position saved
- [ ] 30.5 PiP works end-to-end: swipe down → PiP window shows video → pause → expand → close → player restored
- [ ] 30.6 Playlist flows: create playlist → add items → reorder → export → delete
- [ ] 30.7 Artist/Album navigation: browse artists → view albums → play album → see in player info
- [ ] 30.8 System back button works: closes sheets first, then screens, then app
- [ ] 30.9 APK builds in release mode without errors (no ProGuard/R8 issues)
- [ ] 30.10 APK installs and runs on Android 10, 12, 14 (API 29, 31, 34)

---

## 5. VERIFICATION & QUALITY ASSURANCE SUITE

### 5.1 Mandatory Verification Rules

1. **No regressions**: After each phase, verify that previously working features still work. Re-test all screens after any change to shared components (theme tokens, navigation, Redux).
2. **Zero console.warn/error**: All warnings must be resolved before marking a phase complete.
3. **Visual parity**: Compare each screen against the v3 design specification. Any deviation is a bug.
4. **Dark + Light mode**: All screens verified in both modes. No hardcoded colors.

### 5.2 Phase Completion Criteria

A phase is **COMPLETE** when:
- [ ] All checklist items in the phase are checked (no outstanding items)
- [ ] The feature compiles without TypeScript errors
- [ ] The feature works on emulator/device (visual + functional verification)
- [ ] No regressions introduced in other parts of the app
- [ ] Code review: follow DRY, single-responsibility, no dummy data

### 5.3 Wave Gates

Each wave has a **GATE CHECK** that must pass before moving to the next wave:
- Wave 1: PiP renders video only, player controls are usable, Home shows correct shelves
- Wave 2: Bottom sheets work across all screens, playlists integrated in player + library
- Wave 3: New components compile and render correctly in all screens
- Wave 4: Visual audit passes — no flat/childish UI elements remain
- Wave 5: Full content discovery flow works (search → browse → play → queue)
- Wave 6: Release APK builds, all tests pass, no runtime errors

### 5.4 Key Risk Areas

| Risk | Impact | Mitigation |
|---|---|---|
| PiP native rewrite breaks existing playback | High | Isolate PiP changes behind feature flag; test video playback first |
| Theme token restructure breaks UI | High | Incremental migration: keep old tokens, add new, then migrate screens one by one |
| BottomSheet conflicts with existing modals | Medium | Remove ad-hoc modals as sheets are implemented; no overlap period |
| Performance regression from animations | Medium | Profile with FPS monitor; disable animations on low-end devices if needed |
| Notification service drains battery | Medium | Implement only essential notification updates; batch position writes |
| Gesture handler conflicts with PiP swipe | Medium | Dedicated gesture priority: override swipe-down only when PiP enabled |

### 5.5 Backward Compatibility Guidelines

- v2 theme tokens remain accessible (deprecated but functional) until all screens have migrated
- v2 Redux state shape preserved for persisted data (additive changes only, no breaking migrations)
- All v2 routes continue working (new routes added, old routes not removed)
- v2 components not replaced by v3 equivalents remain in place (no unnecessary refactoring)

---

> **Document Version:** 3.0.0  
> **Last Updated:** 2026-07-28  
> **Status:** Active Implementation — Phases 1-24 ✅ Complete | Phase 25-30 ⏳ Pending  
> **Next Action:** Phase 25 (Media Scanner & Indexing Improvements) — or address remaining gaps: 12.3 (Deep Linking), 13.7 (Gesture Conflict), 16.7 (Screen size compliance)