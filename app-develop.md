# Cine / SIMBA Mobile — App Development Guide

> **Status tracker** for porting mockup designs into the React Native app.
> ✅ = done | ⬜ = not started | 🔄 = in progress

---

## Table of Contents

1. [Project Reality Check](#1-project-reality-check)
2. [Directory Layout](#2-directory-layout)
3. [Theme System (Current)](#3-theme-system-current)
4. [Core UI Primitives (Current)](#4-core-ui-primitives-current)
5. [Navigation (Current)](#5-navigation-current)
6. [Screens (Current State)](#6-screens-current-state)
7. [Mockups (UI Target Reference)](#7-mockups-ui-target-reference)
8. [Native Player Bridge & Media Pipeline (Current)](#8-native-player-bridge--media-pipeline-current)
9. [Implementation Plan (Phased Milestones)](#9-implementation-plan-phased-milestones)

---

## 1. Project Reality Check

### Stack (from `package.json`)

| Layer | Technology |
|---|---|
| Framework | React Native `0.86.0` |
| Language | TypeScript |
| Navigation | `@react-navigation/native` + `@react-navigation/native-stack` |
| State | Redux Toolkit + `redux-persist` |
| Storage | `@react-native-async-storage/async-storage` + `react-native-mmkv` |
| Icons | `react-native-vector-icons` |
| Safe Areas | `react-native-safe-area-context` |

### Current Gap Summary

| Area | Status |
|---|---|
| Theme tokens (runtime) | 28 flat keys — no bronze/glass tokens |
| Mockup theme tokens | 77 keys — **not** wired into runtime |
| StartScreen | Placeholder (blue button, no design) |
| PlayerScreen | Placeholder (black screen, "Player Screen" text) |
| PreferencesScreen | Placeholder (dark screen, "Preferences" text) |
| Native player bridge | Interface + wrapper defined, not wired to UI |
| Media service | `mediaService.ts` exists, not integrated |
| Settings slice | Exists in store, not wired to Preferences UI |

---

## 2. Directory Layout

```
src/
├── components/
│   ├── core/
│   │   ├── AppButton/
│   │   ├── AppText/
│   │   └── AppView/
│   └── index.ts
├── constants/
│   ├── colors.ts
│   ├── radius.ts
│   ├── spacing.ts
│   └── typography.ts
├── context/
│   ├── ThemeContext.tsx
│   ├── theme.types.ts
│   └── themes.ts
├── hooks/
│   └── usePlayer.ts
├── lib/
│   ├── eventBus.ts
│   └── logger.ts
├── native/
│   ├── NativeMpvPlayer.ts
│   ├── index.ts
│   └── player.api.ts
├── navigation/
│   ├── RootNavigator.tsx
│   ├── navigationHelper.ts
│   └── types.ts
├── screens/
│   ├── Player/        ← placeholder
│   ├── Preferences/   ← placeholder
│   └── Start/         ← placeholder
├── services/
│   ├── mediaService.ts
│   ├── playlistService.ts
│   └── sessionService.ts
└── store/
    ├── index.ts
    ├── persistConfig.ts
    ├── rootReducer.ts
    └── slices/
```

---

## 3. Theme System (Current)

### 3.1 Theme Token Type ([theme.types.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/context/theme.types.ts))

Current `ThemeTokens` is a flat interface of 28 color strings:
`background`, `surface`, `surfaceVariant`, `primary`, `primaryVariant`, `secondary`, `text`, `textSecondary`, `textInverse`, `border`, `borderLight`, `error`, `success`, `warning`, `disabled`, `overlay`, `shadow`, `tabBar`, `tabBarInactive`, `playerControls`, `progressBar`, `progressBarTrack`, `icon`, `iconActive`, `transparent`

### 3.2 Dark / Light Themes ([themes.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/context/themes.ts))

Both palettes use Material-blue accent colors (no bronze/glass tokens).

### 3.3 Theme Provider ([ThemeContext.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/context/ThemeContext.tsx))

Exports: `useTheme()`, `useColors()`, `useThemeContext()`.

### 3.4 makeStyles Helper ([makeStyles.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/utils/makeStyles.ts))

```ts
makeStyles((colors: ThemeTokens) => StyleSheet.create({ ... }))
```

---

## 4. Core UI Primitives (Current)

### 4.1 AppText ([AppText.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/core/AppText/AppText.tsx))

- Uses `useColors()` and `typography[variant]`.
- `color` prop accepts a raw string (defaults to `colors.text`).

### 4.2 AppButton ([AppButton.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/core/AppButton/AppButton.tsx))

- `TouchableOpacity`-based.
- Variants: `primary | secondary | outline`.
- Supports `loading` and `disabled`.

---

## 5. Navigation (Current)

- [types.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/navigation/types.ts) — route param types
- [RootNavigator.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/navigation/RootNavigator.tsx) — stack navigator with MainTabs → Player, Preferences

---

## 6. Screens (Current State)

### 6.1 StartScreen ([StartScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Start/StartScreen.tsx))

**State:** Phase 1 complete. Glass/bronze brand section, action buttons, recent card track with horizontal snap, keyboard hint pill, background glow layers.

### 6.2 PlayerScreen ([PlayerScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Player/PlayerScreen.tsx))

**State:** Phase 2 complete. Full mpv-native video surface, overlay controls (header, seek bar, transport), trial watermark, OSD notification, Now Playing info, error handling, dynamic chapter markers.

### 6.3 PreferencesScreen ([PreferencesScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Preferences/PreferencesScreen.tsx))

**State:** Phase 3 complete. Scrollable layout with 6 sections (License & Features, General, Rendering, Subtitles, Keyboard Shortcuts, About), custom Toggle/InputGroup components, footer with Reset to Defaults + Close, wired to settingsSlice (Redux).

---

## 7. Mockups (UI Target Reference)

The `mockup/` folder contains design-spec screens. These are the visual target.

| File | What it defines |
|---|---|
| [StartScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/StartScreenMockup.tsx) | Logo + wordmark, recent cards, keyboard hint, glow layers |
| [PlayerScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/PlayerScreenMockup.tsx) | Video surface, header bar, seek bar, transport controls, OSD |
| [PreferencesScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/PreferencesScreenMockup.tsx) | Sections, toggles, input boxes, shortcuts list, about card |
| [mockup/theme.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/theme.ts) | Full bronze/glass token set (colors, typography, spacing, radius, shadows, sizes) |

> **Important:** Mockup tokens are richer than runtime `ThemeTokens`. Porting requires either extending `ThemeTokens` or mapping into the existing set.

---

## 8. Native Player Bridge & Media Pipeline (Current)

### 8.1 Player API ([player.api.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/native/player.api.ts))

TypeScript interface: `load`, `play`, `pause`, `seek`, `setVolume`, `setMuted`, `setSpeed`, `setAudioTrack`, `setSubtitleTrack`, `getState`, `destroy`.

### 8.2 Native Module Wrapper ([NativeMpvPlayer.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/native/NativeMpvPlayer.ts))

Wraps `NativeModules.MpvPlayer` — assumes native module exists at runtime.

### 8.3 Media Service ([mediaService.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/services/mediaService.ts))

- `openFile()` → loads file + starts 500ms polling
- `play()` / `pause()` / `togglePlay()` → dispatches Redux actions
- `destroy()` → cleanup

### 8.4 usePlayer Hook ([usePlayer.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/hooks/usePlayer.ts))

Binds Redux player state + delegates to `mediaService`.

---

### 8.5 Media Data Flow & State

#### 8.5.1 Open Media — Local File Picking

| Step | What happens | Status |
|---|---|---|
| **StartScreen "Open Media" tap** | Opens `react-native-document-picker`, then navigates to `PlayerScreen` with `{fileUri, fileTitle}` params | ✅ Wired |
| **StartScreen "Open Folder" tap** | Same file picker (single-file for now; folder iteration is future) | ✅ Wired |
| **File picker library** | `react-native-document-picker` installed in `package.json` | ✅ Installed |
| **mediaService.openFile()** | Stub — no longer needed; `fileService.ts` handles picking + existence check | ✅ Replaced |
| **PlayerScreen on mount** | Calls `checkFileExists()` before `MpvPlayer.loadFile()` — shows error if missing | ✅ Guarded |
| **Native bridge `openFile()`** | `player.api.ts` defines interface, `NativeMpvPlayer.ts` wraps `NativeModules.MpvPlayer` | ✅ Defined |

**Current reality:** "Open Media" now opens the system file picker. When a file is selected, it navigates to PlayerScreen with the real URI. If the file is missing or inaccessible, the player shows an error screen instead of crashing.

#### 8.5.2 Rental List / Recent Files / Session

| Concept | Implementation | Status |
|---|---|---|
| **Recent files display** | `StartScreen.tsx` reads `sessionSlice.recentFiles` via Redux — shows real file entries | ✅ Wired from Redux |
| **Recent persistence** | `sessionSlice.ts` stores `SessionEntry[]` (`{fileUri, title, position, duration, lastPlayedAt}`) in Redux, persisted via AsyncStorage, capped at 20 | ✅ Implemented |
| **Rental / borrow list** | **Not implemented.** No rental model (due date, borrower, lending period, availability status) exists in the codebase | ❌ Missing |
| **Session resume** | `sessionSlice.savePlaybackPosition()` saves position on unmount + every 30s while playing; `PlayerScreen` reads saved entry and calls `MpvPlayer.seekTo()` on file load | ✅ Implemented |
| **Redux store for recent** | `sessionSlice` added to `rootReducer.ts` + whitelisted in `persistConfig.ts` | ✅ Done |
| **Recent card behavior** | Tapping a recent card navigates to `PlayerScreen` with `{fileUri, fileTitle}` — auto-resumes position via `sessionSlice` + `seekTo()` | ✅ Wired |

**Note:** A "rental list" (tracking borrowed media with due dates, lender info, return status) does **not** exist in either the desktop Cine app or the React Native mobile app. The **recent files** list is now live from Redux.

#### 8.5.3 Timestamp — How Much Played

| Mechanism | Details | Status |
|---|---|---|
| **playerSlice.position** | Redux state `currentPosition: number` (seconds) | ✅ Stored |
| **playerSlice.duration** | Redux state `duration: number` (seconds) | ✅ Stored |
| **PlayerScreen polling** | `setInterval` every 250ms calls `MpvPlayer.getPosition()` and `MpvPlayer.getDuration()` | ✅ Live |
| **MpvPlayer events** | `onPositionChanged` and `onFileLoaded` events push position/duration updates | ✅ Event-driven |
| **Seek bar display** | `positionPct = position / duration` drives fill %, thumb position, and time labels | ✅ Visual |
| **Resume position persisted** | Saved to `sessionSlice` on PlayerScreen unmount + every 30s while playing; restored via `MpvPlayer.seekTo()` on `onFileLoaded` | ✅ Done |
| **Duration format** | `formatTime()` helper converts seconds → `M:SS` or `H:MM:SS` | ✅ Utility |

**Current behavior:** Position is saved every 30 seconds during playback and on navigation away. When the same file is re-opened, the player automatically seeks to the saved position (if `settings.rememberPlaybackPosition` is enabled).

#### 8.5.4 Media Missing / Error Conditions

| Condition | Handler | Status |
|---|---|---|
| **File not found at URI** | `validateMediaFile()` via `react-native-fs` — handles missing, permission denied, empty, corrupt, unsupported extension | ✅ Done |
| **Permission denied** | Caught via `RNFS.stat()` `EACCES`/`EPERM` → "Permission Denied" screen with suggestion | ✅ Done |
| **Empty / corrupt file** | Size checks: 0 bytes → "Empty File" screen; < 100 bytes → "File May Be Corrupt" screen | ✅ Done |
| **Unsupported format** | Extension whitelist check → "Unsupported Format" warning screen | ✅ Done |
| **Player init failure** | `PlayerScreen` catches `MpvPlayer.initPlayer()` → sets structured error with Retry | ✅ Enhanced |
| **Load failure** | `MpvPlayer.on('onError')` listener sets structured `{title, message}` error | ✅ Enhanced |
| **Invalid/corrupt file** | No metadata validation before passing to mpv | ❌ Missing |
| **Network stream timeout** | Not implemented (offline-first) | ❌ Missing |
| **Empty playlist** | `nextTrack` / `previousTrack` check array bounds (no error UI) | ⬜ Partial |
| **Unsupported codec** | mpv error event fires → caught in `onError` → user sees "Playback Error" screen with Retry + Choose Different File | ✅ Enhanced |

**Current reality:** File-existence check now includes `validateMediaFile()` which covers 6 failure modes (no file, no permission, empty file, corrupt/suspicious, unsupported extension, init failure). The error UI now shows a descriptive title + message + optional detail + Retry button + "Choose Different File" button. Remaining gaps: proper codec-level metadata validation and network stream timeout.

#### 8.5.5 Subtitle Support

| Feature | Implementation | Status |
|---|---|---|
| **Native API** | `NativeMpvPlayer.Spec` defines `getTracks()`, `selectTrack()`, `cycleTrack()`, `setTrackVisibility()`, `setProperty('sub-file', ...)` | ✅ Native spec ready |
| **JS API wrapper** | `player.api.ts` exposes all native subtitle methods on the `MpvPlayer` object | ✅ Wrapped |
| **External subtitle picker** | `fileService.pickSubtitleFile()` opens system file picker filtered to `.srt`, `.ass`, `.vtt`; validated via `isValidSubtitleFile()` | ✅ Implemented |
| **Subtitle state** | `subtitleTracks: MpvTrack[]`, `activeSubtitle: number | null`, `subtitleVisible: boolean`, `subtitlePanelOpen: boolean` | ✅ Tracked in PlayerScreen |
| **Track list sync** | `onTracksChanged` event updates `subtitleTracks` state reactively | ✅ Event-driven |
| **Select track** | `handleSelectSubtitleTrack(trackId)` calls `MpvPlayer.selectTrack()` and sets `activeSubtitle` state | ✅ Wired |
| **Toggle visibility** | `handleToggleSubtitles` calls `MpvPlayer.setTrackVisibility('sub', visible)` — shows/hides all subtitle tracks | ✅ Wired |
| **Load external** | `handleLoadExternalSubtitle` picks file via `pickSubtitleFile()`, validates, then calls `MpvPlayer.setProperty('sub-file', uri)` | ✅ Wired |
| **Disable subtitles** | Button in panel passes `null` to `handleSelectSubtitleTrack` → deselects all tracks | ✅ Wired |
| **CC button** | MenuBtn with CC icon shows active state when subtitles on; opens subtitle panel on press | ✅ Wired |
| **Subtitle panel UI** | Overlay panel with: header + close, "Show Subtitles" ToggleSwitch, track list (filtered sub tracks), "Load External Subtitle" button, "Disable Subtitles" button (conditional) | ✅ Built |
| **External sub validation** | Rejects non-subtitle files with `Alert.alert()` before loading | ✅ Guarded |

**Current reality:** Full subtitle workflow is implemented. Users can select internal subtitle tracks, load external `.srt`/`.ass`/`.vtt` files, toggle subtitle visibility on/off, and disable subtitles — all from the CC button's subtitle panel overlay. The native bridge handles track enumeration and selection via mpv.

#### 8.5.6 Playlist (Implemented)

| Feature | Implementation | Status |
|---|---|---|
| **Native API** | `loadPlaylist()`, `getPlaylist()`, `playlistNext/Prev()`, `playlistRemove()`, `playlistShuffle()`, `playlistClear()`, `setPlaylistLoop()`, `setLoopMode()` | ✅ Native spec ready |
| **JS API wrapper** | `MpvPlayer.next()`, `previous()`, `getPlaylist()`, `removeFromPlaylist()`, `shufflePlaylist()`, `clearPlaylist()` | ✅ Wrapped |
| **Redux playlist slice** | `playerSlice` with `PlaylistEntry[]`, `currentIndex`, `loopMode`, `shuffle` — persisted via `redux-persist` | ✅ Built |
| **Add to playlist** | `handleAddToPlaylist` opens system file picker, appends to Redux playlist, auto-plays if first entry | ✅ Built |
| **Remove from playlist** | `handleRemoveFromPlaylist(index)` removes from Redux, adjusts `currentIndex` | ✅ Built |
| **Play from playlist** | `handlePlayFromPlaylist(index)` dispatches `playFromPlaylist`, calls `MpvPlayer.loadFile()` | ✅ Built |
| **Clear playlist** | `handleClearPlaylist` dispatches `clearPlaylist`, closes panel | ✅ Built |
| **Playlist panel UI** | Overlay panel with: header (count + Add + Close), scrollable track list (▶ current, tap to play), ✕ remove per row, Clear All button at bottom, empty state with "Add Media Files" CTA | ✅ Built |
| **☰ button** | MenuBtn in transport row Group 3, active state when playlist has items, toggles playlist panel | ✅ Wired |
| **Prev/Next buttons** | Use Redux-aware `handlePrevTrack`/`handleNextTrack` when playlist has items; fall back to `MpvPlayer.previous()`/`next()` for standalone playback | ✅ Wired |
| **Shuffle button** | `handleToggleShuffle` dispatches `toggleShuffle` Redux action + calls `MpvPlayer.shufflePlaylist()`; active state reflects Redux `shuffle` value | ✅ Wired |
| **Loop button** | `handleToggleLoop` cycles `'none'` ↔ `'playlist'`; dispatches Redux + calls `MpvPlayer.setLoopMode()`; active state reflects Redux `loopMode` | ✅ Wired |
| **Persistence** | `player` added to persist whitelist; playlist survives app restarts | ✅ Saved |

**Current reality:** Full playlist workflow implemented. Users can tap the ☰ button to open the playlist panel, add media files via the system picker, tap any entry to play it, remove individual items, and clear the entire playlist. Prev/Next wire through Redux for index tracking and wrap-around. Shuffle and Loop sync between Redux state and MpvPlayer. The playlist persists across app restarts via `redux-persist`.

#### 8.5.7 Audio Track Switching (Implemented)

| Feature | Implementation | Status |
|---|---|---|
| **Native API** | `getTracks()` returns tracks with `type: 'audio'`, `selectTrack(id)` switches, `cycleTrack('audio')` cycles | ✅ Native spec ready |
| **JS API wrapper** | `MpvPlayer.getTracks()`, `selectTrack()`, `cycleTrack()` | ✅ Wrapped |
| **🎵 button** | Transport row button toggles `audioPanelOpen`; `active` state when audio track is active | ✅ Wired |
| **Audio track state** | `audioTracks: MpvTrack[]`, `activeAudioTrack: number \| null`, `audioPanelOpen: boolean` | ✅ Tracked in PlayerScreen |
| **Track list sync** | Fetched on `onFileLoaded` + refreshed via `onTracksChanged` event; filtered to `type === 'audio'` | ✅ Event-driven |
| **Select track** | `handleSelectAudioTrack(trackId)` calls `MpvPlayer.selectTrack()`, updates `activeAudioTrack` | ✅ Wired |
| **Disable audio** | "Disable Audio" option in panel calls `MpvPlayer.selectTrack(-1)` | ✅ Wired |
| **Audio panel UI** | Overlay panel with: header + close, scrollable track list (title + lang + ✓ checkmark), active row highlight, "Disable Audio" button | ✅ Built |

**Current reality:** Users can tap the 🎵 button to see available audio tracks and switch between them. The track list auto-refreshes when a new file loads or the track list changes (e.g., after selecting an external subtitle that triggers a stream switch). Audio device output switching (`getAudioDevices()` / `setAudioDevice()`) is not yet exposed in the UI.

#### 8.5.8 Equalizer / Audio Filters (Implemented)

| Feature | Implementation | Status |
|---|---|---|
| **Native API** | `setAudioFilter(filter, enabled)`, `setProperty('af', ...)` for mpv audio filter graph | ✅ Native spec ready |
| **JS API wrapper** | `MpvPlayer.setAudioFilter()`, `setProperty()` | ✅ Wrapped |
| **⚙ button** | Transport row button toggles `eqPanelOpen`; `active` state reflects `eqEnabled` | ✅ Wired |
| **EQ state** | `eqGains: number[10]`, `eqEnabled: boolean`, `eqPanelOpen: boolean` | ✅ Tracked in PlayerScreen |
| **10-band graphic EQ** | Band frequencies: 31, 62, 125, 250, 500, 1K, 2K, 4K, 8K, 16K Hz; each -12dB to +12dB via `Slider` | ✅ Built |
| **Presets** | Flat, Rock, Pop, Jazz, Classical, Dance — apply with one tap | ✅ Built |
| **Toggle on/off** | Enable EQ toggle switch — applies/removes the `af` filter chain from mpv | ✅ Built |
| **Reset** | Reset button sets all gains to 0dB and disables EQ | ✅ Built |
| **mpv integration** | `buildEqFilter()` generates `equalizer=f=...:t=h:w=1.0:g=...` chain, applied via `MpvPlayer.setProperty('af', ...)` | ✅ Wired |
| **Gain change reactivity** | Dragging any slider immediately updates mpv filter chain | ✅ Realtime |

**Current reality:** Full 10-band graphic equalizer built. Users open the ⚙ panel, toggle EQ on, drag individual band sliders or apply a preset (Rock, Pop, Jazz, Classical, Dance). Each change is applied to mpv in realtime via the `af` audio filter property. Toggle off removes the filter chain. Audio filter chain management (add/remove/reorder arbitrary filters) is not yet exposed in the UI.

---

## 9. Implementation Plan (Phased Milestones)

### Phase 0 — Extend Theme with Bronze/Glass Tokens ✅

> **Files:** [theme.types.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/context/theme.types.ts), [themes.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/context/themes.ts), [colors.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/constants/colors.ts)

- [x] Add mockup color keys to `ThemeTokens` interface (glass, accent, seek, chip, badge, etc.)
- [x] Add bronze/accent constants to `palette` in [colors.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/constants/colors.ts)
- [x] Implement new token values in `darkTheme` / `lightTheme` in [themes.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/context/themes.ts)
- [x] Verify `useColors()` returns the extended token set without breaking existing consumers

---

### Phase 1 — Port StartScreen ✅

> **Source:** [StartScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/StartScreenMockup.tsx)  
> **Target:** [StartScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Start/StartScreen.tsx)

- [x] Replace raw `Text` with `AppText` using `useColors()` token references
- [x] Replace buttons with `AppButton` variants (used `TouchableOpacity` with mockup styling instead)
- [x] Replace raw `StyleSheet` colors with `makeStyles((colors) => ...)`
- [x] Implement background layers: warm/cool glow, vignette, top sheen, orb
- [x] Build brand section: logo circle + "SIMBA" wordmark
- [x] Build "Recent" section: horizontal ScrollView with snap-to-interval
- [x] Build RecentCard: thumbnail, badge, meta chips (type, ext, duration)
- [x] Add "Continue" button on first recent card
- [x] Add keyboard hint pill at bottom center
- [x] Wire navigation: Open button → navigate to Player
- [x] **Validation:** Screen matches mockup visually; scrolling works; navigation fires

> **Note:** Added `display`, `small`, `overline`, `time` typography variants (used by mockup) to [typography.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/constants/typography.ts)

---

### Phase 2 — Port PlayerScreen ✅

> **Source:** [PlayerScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/PlayerScreenMockup.tsx)  
> **Target:** [PlayerScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Player/PlayerScreen.tsx)

- [x] Build video surface layer (`#060608` background, fills screen)
- [x] Implement `controlsVisible` toggle — tap video to show/hide overlays
- [x] Build header bar (glass): back btn, "Open" dropdown, centered title, PiP, menu, window controls
- [x] Build seek bar: track, fill (35%), thumb, 5 chapter markers, time labels
- [x] Build transport row: prev / play-pause / next + 4 groups with separators
- [x] Add trial watermark ("TRIAL", 60px, 6% opacity, centered)
- [x] Add OSD notification pill (bottom center, "Volume: 65%")
- [x] Add "Now Playing" info (bottom right: title + codec)
- [x] Wire play/pause, seek, volume, chapter, loop, shuffle to `MpvPlayer` API
- [x] **Validation:** Overlays toggle on tap; seek bar renders with markers; transport buttons are tappable

---

### Phase 3 — Port PreferencesScreen ✅

> **Source:** [PreferencesScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/PreferencesScreenMockup.tsx)  
> **Target:** [PreferencesScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Preferences/PreferencesScreen.tsx)

- [x] Build scrollable layout with header ("Preferences" title + close btn)
- [x] Build reusable components: `SectionHeader`, `PrefCard`, `SettingRow`, `PrefDivider`, `Toggle`, `InputGroup`, `ShortcutRow`
- [x] Build custom `Toggle` component (track + thumb with accent colors)
- [x] Build custom `InputGroup` component (label + display box + hint)
- [x] Implement "License & Features" section (license tier + feature status list)
- [x] Implement "General" section (Audio Normalization toggle, Dialogue Boost toggle)
- [x] Implement "Rendering" section (Hardware Acceleration toggle)
- [x] Implement "Subtitles" section (auto-load toggle, language input, dirs input)
- [x] Implement "Keyboard Shortcuts" section (12 shortcut rows + "View All" link)
- [x] Implement "About" section (logo, app name, version, built-with text)
- [x] Add footer buttons: "Reset to Defaults" + "Close"
- [x] Wire toggle values to `settingsSlice` (Redux)
- [x] Wire input values to `settingsSlice`
- [x] Extend `settingsSlice` with 6 new fields + `resetToDefaults` action
- [x] **Validation:** 0 TypeScript errors in Phase 3 code; all sections render; toggles dispatch Redux actions

---

### Phase 4 — Wire Services & State

- [ ] Wire `mediaService.openFile()` to "Open Media" button on StartScreen
- [ ] Wire `mediaService.togglePlay()` to play/pause button on PlayerScreen *(currently wired directly to MpvPlayer)*
- [ ] Wire `mediaService.seekTo()` to seek bar gesture on PlayerScreen *(currently wired directly to MpvPlayer)*
- [ ] Wire volume changes from mock controls to `player.setVolume()` *(currently wired directly to MpvPlayer)*
- [x] Connect `settingsSlice` to PreferencesScreen toggles and inputs
- [ ] Connect `sessionSlice` (or equivalent) to Recent list on StartScreen
- [ ] Connect `playlistService` to playlist menu button on PlayerScreen
- [ ] **Validation:** End-to-end: open file → play → seek → volume change → persist settings

---

### Phase 5 — Polish & Animations

- [ ] Add `Animated` fade-in/out for PlayerScreen overlay controls (300ms)
- [ ] Add `Animated.spring()` thumb scale on seek bar drag
- [ ] Add haptic feedback (`react-native-haptic-feedback` or `Vibration`) on transport controls
- [ ] Add loading spinner overlay on PlayerScreen during file load
- [ ] Add error boundary + toast for native player failures
- [ ] Add orientation lock config for PlayerScreen (force landscape)
- [ ] **Validation:** Animations are smooth (60fps); no jank on overlay toggle

---

### Phase 6 — Build & Test

- [ ] Run `npx react-native start` — Metro bundler starts without errors
- [ ] Run `npx react-native run-android` — app builds + launches
- [ ] Verify all 3 screens render correctly on a device
- [ ] Verify theme toggle (dark/light) updates all screens
- [ ] Verify navigation stack (Start → Player, Start → Preferences, back)
- [ ] Run `npx tsc --noEmit` — zero type errors
- [ ] Test on tablet (landscape) — layout scales correctly
- [ ] **Validation:** Build green, no warnings, screens match mockups

---

## Reference

- [About_Project.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/About_Project.md) — broader feature inventory & architecture mapping
- [mockup/theme.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/theme.ts) — complete bronze/glass design tokens
- [mockup/StartScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/StartScreenMockup.tsx) — start screen design spec
- [mockup/PlayerScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/PlayerScreenMockup.tsx) — player screen design spec
- [mockup/PreferencesScreenMockup.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/mockup/PreferencesScreenMockup.tsx) — preferences screen design spec
