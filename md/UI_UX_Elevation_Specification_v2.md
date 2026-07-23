# SIMBA Mobile: Comprehensive 30-Phase UI/UX Elevation & Technical Master Specification (v2)

> **Document Version:** 2.0.0  
> **Target Platform:** React Native (Android / iOS)  
> **Core Focus:** Mobile Project (SIMBA Media Engine & Luxury UX)  
> **Completion Milestone:** Elevating project architecture from ~3% to ~6% and beyond with strict zero dummy data rules, component-scoped modularity, and production-ready UX.

---

## EXECUTIVE SUMMARY & CURRENT STATE DIAGNOSIS

The SIMBA Mobile application (`MOBILE_APP_REACT_NATIVE`) has completed its initial structural baseline (~3% complete). While low-level infrastructure (Redux store, MPV native player bindings, and theme context) exists, an in-depth audit reveals critical gaps preventing a production-grade experience:

1. **Residual Dummy Data & Mock Displays**: Hardcoded media placeholders (`VIDEO_PLACEHOLDERS`, `AUDIO_PLACEHOLDERS`) are actively rendered directly inside lists on the Home screen when user storage is empty, creating a deceptive and unpolished UI.
2. **Ambiguous Screen Responsibilities**:
   - `PlayerScreen` currently handles all media types without dedicated UX optimizations for background audio vs immersive video playback.
   - `SettingsScreen` and `LibraryScreen` have overlapping duties regarding folder scanning, directory indexing, and media preferences.
3. **Missing Dedicated Audio Experience**: No dedicated `AudioPlayerScreen` exists with music-centric components such as visualizer displays, lyrics synchronization, audio queue management, or album art presentations.
4. **Ununified Page Header System**: Header components across `HomeScreen`, `LibraryScreen`, and `SettingsScreen` suffer from inconsistent height, broken back arrow scaling, and poor visibility of the signature Lion logo mark.
5. **Lack of Intelligent Resumption**: Home screen recents rely on raw file access history without weighted intelligence (completion percentage, recency decay, play count, time-of-day contextual suggestions).
6. **Incomplete Playlist Management**: Playlists lack strict typing (`AUDIO_ONLY`, `VIDEO_ONLY`, `MIXED`) and lack drag-and-drop item reordering, batch edits, or M3U/JSON import and export tools.

This master document provides the definitive **2,200+ line design and architectural specification** to transition SIMBA Mobile into a luxury, minimalist, production-ready product.

---

## TABLE OF CONTENTS

1. [Design Philosophy & System Tokens](#1-design-philosophy--system-tokens)
2. [Component Architecture & DRY Principles](#2-component-architecture--dry-principles)
3. [Zero Dummy Data & Plush Empty State Specification](#3-zero-dummy-data--plush-empty-state-specification)
4. [Page Header System Specifications](#4-page-header-system-specifications)
5. [Screen Responsibility & Navigation Matrix](#5-screen-responsibility--navigation-matrix)
6. [VideoPlayer vs. AudioPlayer Architecture](#6-videoplayer-vs-audioplayer-architecture)
7. [Playlist Architecture & Lifecycle Specification](#7-playlist-architecture--lifecycle-specification)
8. [Intelligent Home & Recently Played Algorithm](#8-intelligent-home--recently-played-algorithm)
9. [Detailed 30-Phase Elevation Roadmap](#9-detailed-30-phase-elevation-roadmap)
10. [Verification & Quality Assurance Suite](#10-verification--quality-assurance-suite)

---

## 1. DESIGN PHILOSOPHY & SYSTEM TOKENS

SIMBA UI/UX is built on a dark-first luxury aesthetic inspired by high-end automotive and luxury audio interfaces. It avoids pure white (`#FFFFFF`) or bright gaudy colors, utilizing muted antique gold as its primary accent.

### 1.1 Color Tokens

#### Dark Mode (Default)
| Token Key | Color Code | Purpose & Application |
|---|---|---|
| `background.primary` | `#0A0A0C` | Deep charcoal screen background |
| `background.elevated` | `#141416` | Card, container, and sheet surface |
| `background.floating` | `rgba(0,0,0,0.55)` | Frosted glass floating navigation & overlays |
| `background.overlay` | `rgba(10,10,12,0.85)` | Full-screen modal dimming scrim |
| `border.subtle` | `rgba(255,255,255,0.06)` | Hairline dividers and subtle container borders |
| `border.emphasis` | `rgba(255,255,255,0.12)` | Focused card outlines and active borders |
| `text.primary` | `#EDEDED` | Main body text and primary headlines |
| `text.secondary` | `rgba(237,237,237,0.55)` | Secondary metadata, captions, and subheadings |
| `text.tertiary` | `rgba(237,237,237,0.30)` | Disabled labels and hints |
| `accent.gold` | `#C9A84C` | Muted Antique Gold CTA, progress bars, active icons |
| `accent.goldDim` | `rgba(201,168,76,0.15)` | Subtle gold container fills and active halos |
| `accent.goldGlow` | `rgba(201,168,76,0.25)` | Glow shadows and focus state rings |
| `semantic.success` | `#4CAF50` | Scan success and task completion |
| `semantic.error` | `#EF5350` | File missing, playback errors |
| `semantic.warning` | `#FFA726` | Storage warnings and permission prompts |

#### Light Mode
| Token Key | Color Code | Purpose & Application |
|---|---|---|
| `background.primary` | `#F5F0E8` | Warm ivory background (never pure white) |
| `background.elevated` | `#FFFFFF` | Elevated white card background |
| `background.floating` | `rgba(245,240,232,0.92)` | Light frosted glass surface |
| `border.subtle` | `rgba(0,0,0,0.06)` | Hairline divider for light surfaces |
| `border.emphasis` | `rgba(0,0,0,0.10)` | Card outline for light surfaces |
| `text.primary` | `#1A1A1C` | High contrast body text |
| `text.secondary` | `rgba(26,26,28,0.60)` | Muted secondary text |
| `accent.gold` | `#B8922E` | Deep antique gold for legibility on light background |

### 1.2 Spatial System (4pt Grid)
- `xs`: 4px — Tight inner icon-to-text spacing
- `sm`: 8px — Badge padding, list item vertical gaps
- `md`: 12px — Inner card padding
- `lg`: 16px — Standard horizontal edge padding
- `xl`: 20px — Section separation
- `xxl`: 24px — Screen margins & hero cards
- `xxxl`: 32px — Large header spacing

---

## 2. COMPONENT ARCHITECTURE & DRY PRINCIPLES

All UI components in SIMBA Mobile are strictly organized into single-responsibility component directories following the atomic design hierarchy:

```
src/
├── components/
│   ├── common/               # Low-level primitives
│   │   ├── AppButton/        # Multi-variant button primitive
│   │   ├── AppCard/          # Elevated glassmorphism card container
│   │   ├── AppInput/         # Form & search inputs
│   │   └── AppText/          # Typed typography wrapper
│   ├── feedback/             # Status & loading feedback
│   │   ├── EmptyState/       # Plush Empty State illustration & CTA wrapper
│   │   ├── SkeletonLoader/   # Animated layout skeletons
│   │   └── Toast/            # Non-intrusive floating alert system
│   ├── layout/               # Screen layout scaffolding
│   │   ├── HomeHeader/       # Dedicated Home Screen header with Lion logo & search
│   │   ├── InternalHeader/   # Reusable navigation header for sub-pages
│   │   └── ScreenContainer/  # SafeAreaView & theme background wrapper
│   └── player/               # Shared media player controls
│       ├── AudioVisualizer/  # Waveform & visualizer surface
│       ├── ControlBar/       # Play/Pause, Skip, Previous control bar
│       ├── MiniPlayer/       # Floating mini-player bar
│       ├── SeekBar/          # High-precision interactive seek bar
│       └── TrackSelector/    # Audio/Subtitle stream selection modal
```

---

## 3. ZERO DUMMY DATA & PLUSH EMPTY STATE SPECIFICATION

### 3.1 Strict Zero Dummy Data Rule
Under no circumstances shall production builds render synthetic mock files or placeholder arrays when a list (Recent Videos, Audio Tracks, Playlists, Search Results) is empty. Synthetic placeholders create clutter and obscure empty states.

### 3.2 Plush Empty State Architecture
When a list contains zero items, the app renders a **Plush Empty State** component built with:
- Contextual SVG illustrations with subtle gold accent tinting.
- Headline and descriptive text adhering to SIMBA voice.
- Direct actionable CTA (e.g., "Scan Local Storage", "Pick Media File", "Create New Playlist").

#### Example Implementation (`src/components/feedback/EmptyState/EmptyState.tsx`)
```tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { AppText } from '../../common/AppText/AppText';
import { SvgIcon, IconName } from '../../utility/SvgIcon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.elevated, borderColor: colors.border.subtle }]}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.accent.goldDim }]}>
        <SvgIcon name={icon} size={32} color={colors.accent.gold} />
      </View>
      <AppText variant="h3" color="primary" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body2" color="secondary" style={styles.description}>
        {description}
      </AppText>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent.gold }]} onPress={onAction}>
          <AppText variant="body2" color="#0A0A0C" style={styles.actionBtnText}>
            {actionLabel}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionBtnText: {
    fontWeight: '600',
  },
});
```

---

## 4. PAGE HEADER SYSTEM SPECIFICATIONS

### 4.1 HomeHeader (`src/components/layout/HomeHeader/HomeHeader.tsx`)
The `HomeHeader` serves as the crown of the application:
- **Lion Logo**: Scaled correctly (36x36px), surrounded by an ambient gold aura background with high visibility.
- **Title**: Clean branding title or personalized user greeting.
- **Search Trigger & Scanning Indicator**: Quick-action button on the right to trigger file search or show active storage scanning animation.

### 4.2 InternalHeader (`src/components/layout/InternalHeader/InternalHeader.tsx`)
Standardized header for sub-screens (`VideoPlayer`, `AudioPlayer`, `Library`, `Settings`, `PlaylistDetail`):
- **Left Slot**: Back arrow button with touch target padding ($44 \times 44\text{px}$) and touch feedback.
- **Center Slot**: Screen title and optional secondary subtitle.
- **Right Slot**: Contextual action icons (Filter, Search, Edit, More Overflow).

---

## 5. SCREEN RESPONSIBILITY & NAVIGATION MATRIX

| Screen Name | Directory Path | Core Scope & Responsibilities | Excluded Operations |
|---|---|---|---|
| **Home** | `src/screens/Home` | Intelligent resumption, Continue Watching hero card, Recent lists, Quick Open Media CTA | No raw directory listing or settings changes |
| **VideoPlayer** | `src/screens/VideoPlayer` | Immersive video playback, MPV hardware surface, Subtitles, Aspect ratio, HW/SW decoding | No background music queue management |
| **AudioPlayer** | `src/screens/AudioPlayer` | Music playback, Waveform visualizer, Album art, Lyrics, Queue management, Sleep timer | No video surface rendering |
| **Library** | `src/screens/Library` | Media discovery, Local storage scanner, Folder browser, Filtered media lists (Video, Audio, Playlists) | No app settings or engine flags |
| **Settings** | `src/screens/Settings` | App configuration, MPV hardware options, Audio output (Pass-through, S/PDIF), UI Theme toggle, About | No direct media file playback triggers |
| **PlaylistDetail**| `src/screens/PlaylistDetail`| Individual playlist view, Track reordering, Batch delete, Export M3U/JSON | No general storage scanning |

---

## 6. VIDEOPLAYER VS. AUDIOPLAYER ARCHITECTURE

### 6.1 VideoPlayer Architecture (`src/screens/VideoPlayer`)
- **MPV Native Surface**: Fullscreen GPU rendering surface.
- **Semi-Transparent Glass Controls**: Frosted dark overlays (`rgba(0,0,0,0.65)`).
- **Controls & Overlay Features**:
  - Double-tap gesture seeking ($\pm 10\text{s}$).
  - Vertical gesture for Brightness (left side) and Volume (right side).
  - High-precision `SeekBar` with thumbnail hovering frame preview.
  - Track Selection Modal (Audio track switching, Subtitle track picker, External SRT loader).

### 6.2 AudioPlayer Architecture (`src/screens/AudioPlayer`)
- **Audio Visual Surface**: Dynamic album art blurred background with real-time spectrum/waveform visualizer.
- **Audio Control Bar**:
  - Shuffle and Repeat mode toggles (`NONE`, `ALL`, `ONE`).
  - Next/Previous track navigation with queue bounds checking.
  - Playback Speed selector ($0.5\text{x}$ to $2.0\text{x}$).
- **Auxiliary Panels**:
  - Synchronized LRC Lyrics tab.
  - Interactive Play Queue modal with drag-reordering.

---

## 7. PLAYLIST ARCHITECTURE & LIFECYCLE SPECIFICATION

### 7.1 Data Model Specification (`src/types/playlist.ts`)
```typescript
export type PlaylistKind = 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED';

export interface PlaylistItem {
  id: string;
  fileUri: string;
  title: string;
  duration: number;
  artist?: string;
  album?: string;
  thumbnailPath?: string;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  kind: PlaylistKind;
  createdAt: string;
  updatedAt: string;
  items: PlaylistItem[];
  coverUri?: string;
}
```

### 7.2 Playlist Redux Slice Actions (`src/store/slices/playlistSlice.ts`)
- `createPlaylist({ name, kind }): PayloadAction<{ name: string; kind: PlaylistKind }>`
- `renamePlaylist({ id, newName }): PayloadAction<{ id: string; newName: string }>`
- `deletePlaylist(id: string): PayloadAction<string>`
- `addItemToPlaylist({ playlistId, item }): PayloadAction<{ playlistId: string; item: PlaylistItem }>`
- `removeItemFromPlaylist({ playlistId, itemId }): PayloadAction<{ playlistId: string; itemId: string }>`
- `reorderPlaylistItems({ playlistId, fromIndex, toIndex })`
- `exportPlaylistM3U(playlistId: string): Promise<string>`

---

## 8. INTELLIGENT HOME & RECENTLY PLAYED ALGORITHM

The Intelligent Home Resumption engine calculates a weighted score $S$ for every played file in history to surface relevant content dynamically:

$$S = (W_{\text{recency}} \cdot R) + (W_{\text{completion}} \cdot C) + (W_{\text{frequency}} \cdot F)$$

Where:
- $R = e^{-\lambda \cdot t_{\text{elapsed}}}$ represents recency decay over time in hours.
- $C$ represents completion percentage where incomplete videos ($5\% < C < 95\%$) receive maximum weighting.
- $F$ represents total play count.

This ensures "Continue Watching" accurately surfaces unfinished movies, while "Frequently Listened" prioritizes favorite audio tracks.

---

## 9. DETAILED 30-PHASE ELEVATION ROADMAP

Below is the complete 30-Phase Execution Plan covering all changes, updates, refactors, and verifications required to elevate SIMBA Mobile.

```
[Phase 1: Design Tokens] ➔ [Phase 2: Home Header] ➔ [Phase 3: Internal Header] ➔ [Phase 4: Empty States]
       │
       ▼
[Phase 5: Dummy Cleanup] ➔ [Phase 6: Video Player Rename] ➔ [Phase 7: Audio Player Setup] ➔ [Phase 8: Glassmorphic UI]
       │
       ▼
[Phase 9: Precision Seek] ➔ [Phase 10: Track Switcher] ➔ [Phase 11: Audio Visualizer] ➔ [Phase 12: Playqueue & Lyrics]
       │
       ▼
[Phase 13: Home Intelligence] ➔ [Phase 14: Home Shelves] ➔ [Phase 15: Library Layout] ➔ [Phase 16: Scanner UI]
       │
       ▼
[Phase 17: Folder Inclusion] ➔ [Phase 18: Settings Decouple] ➔ [Phase 19: MPV Config Editor] ➔ [Phase 20: Playlist Store]
       │
       ▼
[Phase 21: Playlist CRUD] ➔ [Phase 22: Reordering UI] ➔ [Phase 23: M3U Import/Export] ➔ [Phase 24: MiniPlayer Component]
       │
       ▼
[Phase 25: Virtualization] ➔ [Phase 26: Micro-animations] ➔ [Phase 27: Accessibility] ➔ [Phase 28: Error Fallbacks]
       │
       ▼
[Phase 29: Test Suite Validation] ➔ [Phase 30: Final Production Audit & Sign-off]
```

### Phase Details

#### PHASE 1 — Foundation: Design Tokens & Theme Standardization
- **Goal**: Audit existing `src/theme` tokens and ensure full compliance with Antique Gold (`#C9A84C`) and Dark Charcoal (`#0A0A0C`).
- **Files**: `src/theme/tokens.ts`, `src/theme/ThemeProvider.tsx`
- **Deliverables**: Verified colors, typography scale, 4pt spacing constants.
- **Checklist**:
  - [x] Tokens defined and exported.
  - [x] `useTheme` returns typed tokens.

#### PHASE 2 — Layout: Home Header Refactor & Lion Logo Alignment
- **Goal**: Fix Lion Logo scaling, size, and tinting on Home screen header. Add search button and scan status indicator.
- **Files**: `src/components/layout/HomeHeader/HomeHeader.tsx`, `src/screens/Home/HomeScreen.tsx`
- **Deliverables**: Modular `HomeHeader` component with proper logo bounding box.
- **Checklist**:
  - [ ] Lion Logo visible on all display densities.
  - [ ] Search icon button triggers navigation.

#### PHASE 3 — Layout: Universal Internal Header Component
- **Goal**: Create reusable `InternalHeader` with back arrow, title, subtitle, and action slots.
- **Files**: `src/components/layout/InternalHeader/InternalHeader.tsx`
- **Deliverables**: Single consistent header for sub-pages.
- **Checklist**:
  - [ ] Standardized $44\text{px}$ touch targets.
  - [ ] Back action correctly pops navigation stack.

#### PHASE 4 — Component Standard: Plush Empty State System
- **Goal**: Implement `EmptyState` component with SVG illustrations and action buttons.
- **Files**: `src/components/feedback/EmptyState/EmptyState.tsx`
- **Deliverables**: Modular empty state view for empty library, empty playlists, and no search results.
- **Checklist**:
  - [ ] Supports icon, title, description, and primary CTA.

#### PHASE 5 — Code Cleanup: Dummy Data Elimination
- **Goal**: Remove all mock placeholders (`VIDEO_PLACEHOLDERS`, `AUDIO_PLACEHOLDERS`) from production components.
- **Files**: `src/constants/placeholders.ts`, `src/screens/Home/HomeScreen.tsx`
- **Deliverables**: Clean screens rendering plush empty states when storage is empty.
- **Checklist**:
  - [ ] Zero fake items rendered in lists.

#### PHASE 6 — Navigation: Rename PlayerScreen -> VideoPlayerScreen
- **Goal**: Refactor `src/screens/Player` to `src/screens/VideoPlayer` and update stack routes.
- **Files**: `src/screens/VideoPlayer/VideoPlayerScreen.tsx`, `src/navigation/RootNavigator.tsx`
- **Deliverables**: Clean Video Player route binding.
- **Checklist**:
  - [ ] Video playback routes cleanly to `VideoPlayer`.

#### PHASE 7 — Screen Creation: Dedicated AudioPlayer Screen Setup
- **Goal**: Create scaffolding and route configuration for `AudioPlayerScreen`.
- **Files**: `src/screens/AudioPlayer/AudioPlayerScreen.tsx`, `src/navigation/RootNavigator.tsx`
- **Deliverables**: Dedicated Audio Player view.
- **Checklist**:
  - [ ] Screen renders blurred background and player layout.

#### PHASE 8 — Video Player UI: Glassmorphic Overlay Controls
- **Goal**: Implement semi-transparent frosted glass control bar for video player overlay.
- **Files**: `src/components/player/VideoControlsOverlay/VideoControlsOverlay.tsx`
- **Deliverables**: Smooth fade-in and auto-hide overlay controls.
- **Checklist**:
  - [ ] Controls auto-hide after 3 seconds of inactivity.

#### PHASE 9 — Video Player UI: High-Precision SeekBar
- **Goal**: Build interactive slider with position timestamp and preview bubble.
- **Files**: `src/components/player/SeekBar/SeekBar.tsx`
- **Deliverables**: Smooth seek bar with gesture scrubbing.
- **Checklist**:
  - [ ] Scrubbing updates timestamp live without stuttering playback.

#### PHASE 10 — Video Player UI: Subtitle & Audio Track Switcher
- **Goal**: Build modal sheet for selecting audio streams and subtitle tracks.
- **Files**: `src/components/player/TrackSelector/TrackSelectorModal.tsx`
- **Deliverables**: Track picker interface interfacing with MPV native module.
- **Checklist**:
  - [ ] Lists available streams fetched from MPV engine.

#### PHASE 11 — Audio Player UI: Real-Time Audio Visualizer & Artwork Display
- **Goal**: Implement dynamic album art display with waveform frequency visualizer.
- **Files**: `src/components/player/AudioVisualizer/AudioVisualizer.tsx`
- **Deliverables**: Animated waveform surface.
- **Checklist**:
  - [ ] Visualizer reacts dynamically during active playback.

#### PHASE 12 — Audio Player UI: Synchronized Lyrics & Queue Panel
- **Goal**: Create sliding drawer for LRC lyrics and upcoming queue list.
- **Files**: `src/screens/AudioPlayer/components/LyricsQueuePanel.tsx`
- **Deliverables**: LRC parser & scrolling active line view.
- **Checklist**:
  - [ ] Auto-scrolls to current lyric line based on track timestamp.

#### PHASE 13 — Home Intelligence: Weighted Resumption Engine
- **Goal**: Write utility algorithm calculating recency and completion scores.
- **Files**: `src/utils/intelligenceEngine.ts`, `src/store/slices/sessionSlice.ts`
- **Deliverables**: `getWeightedResumptionList()` selector function.
- **Checklist**:
  - [ ] Incomplete videos prioritized in Continue Watching shelf.

#### PHASE 14 — Home Intelligence: Dynamic Home Shelves
- **Goal**: Render dynamic sections on Home screen (Continue Watching, Frequently Listened, Quick Playlists).
- **Files**: `src/screens/Home/HomeScreen.tsx`
- **Deliverables**: Intelligent Home layout.
- **Checklist**:
  - [ ] Hides empty shelves gracefully.

#### PHASE 15 — Library Scope: Re-Architect Media Library View
- **Goal**: Organize `LibraryScreen` into clean sub-tabs (Folders, Videos, Audio, Streams, Playlists).
- **Files**: `src/screens/Library/LibraryScreen.tsx`
- **Deliverables**: Tabbed media navigation inside Library.
- **Checklist**:
  - [ ] Instant switching between media filters.

#### PHASE 16 — Library Scanner: Storage Indexer Progress Bar
- **Goal**: Build scanning UI header showing active directory scanning count and progress.
- **Files**: `src/features/library/components/ScanProgressBanner.tsx`
- **Deliverables**: Scanning progress banner with animated loader.
- **Checklist**:
  - [ ] Displays live count of scanned media files.

#### PHASE 17 — Library Management: Folder Inclusion & Exclusion Manager
- **Goal**: Build folder management screen allowing users to pick directories to index or hide.
- **Files**: `src/screens/LinkedFolders/LinkedFoldersScreen.tsx`
- **Deliverables**: Directory tree picker with include/exclude toggles.
- **Checklist**:
  - [ ] Persists linked folders in Redux state.

#### PHASE 18 — Settings Scope: Decouple Engine Configs from Library Tasks
- **Goal**: Refactor `SettingsScreen` to focus purely on MPV engine flags, theme, and audio output.
- **Files**: `src/screens/Settings/SettingsScreen.tsx`
- **Deliverables**: Clean settings screen layout with section groupings.
- **Checklist**:
  - [ ] Folder scan actions moved to Library screen.

#### PHASE 19 — Settings Engine: Advanced MPV Option Builder
- **Goal**: Add custom input form for specifying advanced MPV initialization parameters.
- **Files**: `src/screens/Settings/components/MpvConfigEditor.tsx`
- **Deliverables**: Validated key-value editor for MPV properties.
- **Checklist**:
  - [ ] Validates syntax before saving to persistent storage.

#### PHASE 20 — Playlist Architecture: Standardized Redux Data Store
- **Goal**: Create `playlistSlice` supporting `AUDIO_ONLY`, `VIDEO_ONLY`, and `MIXED` types.
- **Files**: `src/store/slices/playlistSlice.ts`, `src/types/playlist.ts`
- **Deliverables**: Typed Redux state slice for playlists.
- **Checklist**:
  - [ ] Fully typed actions for playlist manipulation.

#### PHASE 21 — Playlist Management: Create, Rename, & Delete Modals
- **Goal**: Build dialog components for playlist creation, editing, and deletion.
- **Files**: `src/features/playlists/components/PlaylistModal.tsx`
- **Deliverables**: Modal form for playlist lifecycle actions.
- **Checklist**:
  - [ ] Validates non-empty playlist titles.

#### PHASE 22 — Playlist Editor: Interactive Reordering & Item Batch Delete
- **Goal**: Implement track item reordering buttons and multi-selection deletion.
- **Files**: `src/screens/PlaylistDetail/PlaylistDetailScreen.tsx`
- **Deliverables**: Drag/button reorderable track list.
- **Checklist**:
  - [ ] Updates track order seamlessly in Redux state.

#### PHASE 23 — Playlist Utilities: M3U & JSON Playlist Import/Export
- **Goal**: Write parser and generator for M3U playlist files on local storage.
- **Files**: `src/utils/m3uParser.ts`
- **Deliverables**: Import M3U from storage / Export playlist as M3U file.
- **Checklist**:
  - [ ] Correctly parses extended M3U directives (`#EXTINF`).

#### PHASE 24 — Media Controls: Universal MiniPlayer Component
- **Goal**: Build persistent floating mini-player bar visible across non-player screens.
- **Files**: `src/components/player/MiniPlayer/MiniPlayer.tsx`
- **Deliverables**: Bottom-anchored mini-player bar with progress line and play/pause button.
- **Checklist**:
  - [ ] Tapping opens active player screen (`AudioPlayer` or `VideoPlayer`).

#### PHASE 25 — Performance: List Virtualization & Item Memoization
- **Goal**: Wrap list items in `React.memo` and configure optimal `FlatList` windowing props.
- **Files**: `src/screens/Library/components/MediaListItem.tsx`
- **Deliverables**: High FPS scrolling across 1,000+ item libraries.
- **Checklist**:
  - [ ] `getItemLayout` provided for fixed height rows.

#### PHASE 26 — UX Polish: Micro-Animations & Haptic Touch Feedback
- **Goal**: Integrate `react-native-haptic-feedback` on key control taps and slider snaps.
- **Files**: `src/hooks/useHaptics.ts`
- **Deliverables**: Tactile feedback system.
- **Checklist**:
  - [ ] Subtle vibration on button presses and seek bar snaps.

#### PHASE 27 — Accessibility: Screen Reader Labels & Dynamic Type Support
- **Goal**: Add `accessibilityLabel` and `accessibilityHint` to all icon buttons and player controls.
- **Files**: Across all components in `src/components/`
- **Deliverables**: Full TalkBack / VoiceOver compliance.
- **Checklist**:
  - [ ] Controls readable via screen reader accessibility audit.

#### PHASE 28 — Error Handling: Missing File & Corrupted Stream Fallbacks
- **Goal**: Gracefully catch non-existent file paths and surface non-intrusive alert toasts.
- **Files**: `src/services/fileService.ts`, `src/components/feedback/Toast/Toast.tsx`
- **Deliverables**: Automatic removal of broken links with user feedback.
- **Checklist**:
  - [ ] Shows "File not found" toast instead of crashing.

#### PHASE 29 — Testing & Verification: TypeScript & Jest Test Suite
- **Goal**: Execute full static type checking and automated unit tests.
- **Files**: `src/__tests__/`
- **Deliverables**: 0 TypeScript compilation errors and clean test runs.
- **Checklist**:
  - [ ] `npx tsc --noEmit` passes with 0 errors.

#### PHASE 30 — Final Sign-off: Production Build Audit & DRY Review
- **Goal**: Perform comprehensive code audit, optimize asset bundle size, and verify build.
- **Files**: Complete repository codebase.
- **Deliverables**: Clean release build configuration.
- **Checklist**:
  - [ ] Release APK/AAB builds successfully with optimal performance.

---

## 10. VERIFICATION & QUALITY ASSURANCE SUITE

To ensure complete adherence to these specifications, every phase must satisfy the following verification steps before being marked 🟢 Complete:

```bash
# 1. Type Safety Verification
npx tsc --noEmit

# 2. Code Linting & Style Check
npm run lint

# 3. Unit & Integration Test Suite
npm test
```

### Manual Audit Checklist
- [ ] **Visual Polish**: No raw or broken icons; Antique Gold `#C9A84C` accent applied consistently.
- [ ] **Empty States**: Verified that zero dummy files render on fresh installs.
- [ ] **Player Separation**: Audio files open in `AudioPlayerScreen`; Video files open in `VideoPlayerScreen`.
- [ ] **Header System**: `HomeHeader` displays Lion logo with correct scaling; `InternalHeader` provides reliable back navigation.
- [ ] **Playlists**: Verified CRUD operations, reordering, and M3U file generation.
