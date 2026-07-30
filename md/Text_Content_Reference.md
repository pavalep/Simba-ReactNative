# SIMBA Player — Text Content Reference & i18n Foundation

> **⚠️ DEPRECATED**
> This standalone reference is superseded by [`UI_UX_Elevation_Specification_v4.md`](UI_UX_Elevation_Specification_v4.md) — Phase 3A (i18n/Text Content Foundation).  
> The string inventory is now tracked inline within the main specification document and progress tracker.  
> **Kept for historical reference only.**

> **Purpose:** Central reference for all user-facing strings across the app.  
> **Source File:** [`src/constants/strings.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/constants/strings.ts) (134 keys, ~230 lines)  
> **Screen-Level Files:** `src/screens/<Screen>/textContent.ts` (screen-specific overrides) — **26 files created** covering **~195 strings**  
> **Last Updated:** 2026-07-29 (Phase 2 — Added 16 screens, JSDoc comments, shared type, UX audit)

---

## Table of Contents

1. [Global / Generic Strings](#1-global--generic-strings)
2. [Home Screen](#2-home-screen)
3. [Library Screen](#3-library-screen)
4. [Playlist Detail Screen](#4-playlist-detail-screen)
5. [Search Screen](#5-search-screen)
6. [Settings Screen](#6-settings-screen)
7. [Linked Folders Screen](#7-linked-folders-screen)
8. [Video Player Screen](#8-video-player-screen)
9. [Audio Player Screen](#9-audio-player-screen)
10. [Bookmarks Screen](#10-bookmarks-screen)
11. [Other Screens](#11-other-screens)
12. [Extraction Tracker](#12-extraction-tracker)

---

## 1. Global / Generic Strings

All defined in [`src/constants/strings.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/constants/strings.ts) — these are available app-wide.

| Key | Value | Status |
|---|---|---|
| `appName` | `Simba Player` | ✅ In `strings.ts` |
| `unknown` | `Unknown` | ✅ |
| `untitled` | `Untitled` | ✅ |
| `retry` | `Retry` | ✅ |
| `cancel` | `Cancel` | ✅ |
| `done` | `Done` | ✅ |
| `close` | `Close` | ✅ |
| `create` | `Create` | ✅ |
| `save` | `Save` | ✅ |
| `delete` | `Delete` | ✅ |
| `loading` | `Loading` | ✅ |
| `error` | `Error` | ✅ |
| `noResults` | `No results found` | ✅ |
| `noResultsHint` | `Try a different search term or browse your library.` | ✅ |
| `tryAgain` | `Try Again` | ✅ |
| `goBack` | `Go Back` | ✅ |
| `openSettings` | `Open Settings` | ✅ |
| `dismiss` | `Dismiss` | ✅ |
| `errorGeneral` | `Something went wrong.` | ✅ |
| `errorNetwork` | `Network error. Check your connection.` | ✅ |
| `errorFileNotFound` | `File not found.` | ✅ |
| `errorPlayerInit` | `Failed to initialize player.` | ✅ |
| `errorDecode` | `Failed to decode media.` | ✅ |
| `errorUnknown` | `An unknown error occurred.` | ✅ |

---

## 2. Home Screen

Source files: [`src/screens/Home/`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `homeTitle` | `Home` |
| `homeGreeting` | `Good {timeOfDay}` |
| `homeFeatured` | `Featured` |
| `homeRecentlyPlayed` | `Recently Played` |
| `homeContinueWatching` | `Continue Watching` |
| `homeSearchPlaceholder` | `Search media…` |
| `homeNoRecent` | `No recently played items` |
| `homeNoRecentHint` | `Start playing something to see it here.` |

### Remaining hardcoded strings

| String | Source File | Notes |
|---|---|---|
| `Pinned Playlists` | [HomeScreen.tsx:69](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/HomeScreen.tsx#L69) | Section title |
| `{greeting}, Paval` | [HomeScreen.tsx:53](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/HomeScreen.tsx#L53) | Contains hardcoded name "Paval" |
| `Welcome to Simba` | [HomeEmptyState.tsx:113](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeEmptyState.tsx#L113) | Empty state title |
| `Your media, beautifully organized` | [HomeEmptyState.tsx:117](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeEmptyState.tsx#L117) | Empty state subtitle |
| `Open Media File` | [HomeEmptyState.tsx:125](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeEmptyState.tsx#L125) | CTA button |
| `Browse Library` | [HomeEmptyState.tsx:137](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeEmptyState.tsx#L137) | CTA button |
| `Something went wrong` | [HomeErrorState.tsx:25](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeErrorState.tsx#L25) | Error title (default message) |
| `Tap below to retry` | [HomeErrorState.tsx:29](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeErrorState.tsx#L29) | Error hint |
| `Try Again` | [HomeErrorState.tsx:40](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeErrorState.tsx#L40) | Retry button |
| `AUDIO` / `VIDEO` | [FeaturedHeroBanner.tsx:91](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/FeaturedHeroBanner.tsx#L91) | Media type badge |
| `FEATURED` | [FeaturedHeroBanner.tsx:97](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/FeaturedHeroBanner.tsx#L97) | Featured badge |
| `Resume Playback` | [FeaturedHeroBanner.tsx:114](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/FeaturedHeroBanner.tsx#L114) | Play button label |
| `Continue watching — Resume at ` | [ContinueWatchingHero.tsx:51](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/ContinueWatchingHero.tsx#L51) | Resume text |
| `Quick Access` | [QuickAccessShelf.tsx:17](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/QuickAccessShelf.tsx#L17) | Default title |
| `{n} ITEMS` | [QuickAccessShelf.tsx:57](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/QuickAccessShelf.tsx#L57) | Item count badge |
| `Jump back in` | [QuickAccessShelf.tsx:67](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/QuickAccessShelf.tsx#L67) | Footer hint |
| `VIEW ALL` | [HomeMediaShelf.tsx:63](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeMediaShelf.tsx#L63) | See-all link |
| `Bookmarks` | [HomeBookmarksList.tsx:31](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeBookmarksList.tsx#L31) | Section header |
| `Saved moments, ready when you are` | [HomeBookmarksList.tsx:32](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeBookmarksList.tsx#L32) | Section subtitle |
| `Play {title} at {time}` | [HomeBookmarksList.tsx:43](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeBookmarksList.tsx#L43) | Accessibility label |
| `Remove bookmark for {title}` | [HomeBookmarksList.tsx:59](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeBookmarksList.tsx#L59) | Accessibility label |
| `Scanning media...` | [ScanProgressBanner.tsx:43](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/ScanProgressBanner.tsx#L43) | Scan status |

---

## 3. Library Screen

Source files: [`src/screens/Library/`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `libraryTitle` | `Library` |
| `libraryAudio` | `Audio` |
| `libraryVideo` | `Video` |
| `libraryPlaylists` | `Playlists` |
| `libraryFolders` | `Folders` |
| `libraryArtists` | `Artists` |
| `libraryAlbums` | `Albums` |
| `libraryNoAudio` | `No audio files found` |
| `libraryNoAudioHint` | `Add a linked folder in Settings to get started.` |
| `libraryNoVideo` | `No video files found` |
| `libraryNoVideoHint` | `Add a linked folder in Settings to get started.` |
| `libraryNoPlaylists` | `No playlists yet` |
| `libraryNoPlaylistsHint` | `Create one to start organizing your media.` |
| `libraryScanning` | `Scanning…` |
| `libraryCreatePlaylist` | `Create Playlist` |
| `libraryAddToPlaylist` | `Add to Playlist` |
| `libraryGridLayout` | `Grid view` |
| `libraryListLayout` | `List view` |

### Remaining hardcoded strings

| String | Source File | Notes |
|---|---|---|
| `No videos yet` | [LibraryVideosSegment.tsx:92](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryVideosSegment.tsx#L92) | Video empty state title |
| `Link video folders in Settings to populate your library.` | [LibraryVideosSegment.tsx:93](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryVideosSegment.tsx#L93) | Video empty state description |
| `Go to Settings` | [LibraryVideosSegment.tsx:94](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryVideosSegment.tsx#L94) | Video empty state action |
| `+ Add Video Folder` | [LibraryVideosSegment.tsx:131](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryVideosSegment.tsx#L131) | CTA button |
| `No audio files yet` | [LibraryAudioSegment.tsx:91](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAudioSegment.tsx#L91) | Audio empty state title |
| `Link audio folders in Settings to populate your library.` | [LibraryAudioSegment.tsx:93](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAudioSegment.tsx#L93) | Audio empty state description |
| `+ Add Audio Folder` | [LibraryAudioSegment.tsx:131](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAudioSegment.tsx#L131) | CTA button |
| `No audio folders linked` | [LibraryArtistsSegment.tsx:28](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryArtistsSegment.tsx#L28), [LibraryAlbumsSegment.tsx:28](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAlbumsSegment.tsx#L28) | Empty state title |
| `Link audio folders in Settings first, then switch to Artists/Albums to browse by artist/album.` | [LibraryArtistsSegment.tsx:29](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryArtistsSegment.tsx#L29), [LibraryAlbumsSegment.tsx:29](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAlbumsSegment.tsx#L29) | Empty state description |
| `Scanning needed` | [LibraryArtistsSegment.tsx:40](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryArtistsSegment.tsx#L40), [LibraryAlbumsSegment.tsx:40](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAlbumsSegment.tsx#L40) | Scan empty state title |
| `No audio metadata found. Tap to scan your linked folders now.` | [LibraryArtistsSegment.tsx:41](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryArtistsSegment.tsx#L41), [LibraryAlbumsSegment.tsx:42](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAlbumsSegment.tsx#L42) | Scan empty state description |
| `Scan Audio Folders` | [LibraryArtistsSegment.tsx:42](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryArtistsSegment.tsx#L42), [LibraryAlbumsSegment.tsx:43](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/LibraryAlbumsSegment.tsx#L43) | Scan action label |
| `Sort by` | [LibraryScreen.tsx:353](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/LibraryScreen.tsx#L353) | Sort picker header |
| `Select View` | [LibraryScreen.tsx:382](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/LibraryScreen.tsx#L382) | Dropdown header |

#### Labels defined in `useLibraryScreen.ts` constants

These are exported constants used as segment/filter/sort labels:

| Label | Constant | Source |
|---|---|---|
| `Videos` | `SEGMENTS` | [useLibraryScreen.ts:25](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L25) |
| `Audio` | `SEGMENTS` | [useLibraryScreen.ts:26](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L26) |
| `Artists` | `SEGMENTS` | [useLibraryScreen.ts:27](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L27) |
| `Albums` | `SEGMENTS` | [useLibraryScreen.ts:28](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L28) |
| `All` | `FILTER_CHIPS` | [useLibraryScreen.ts:32](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L32) |
| `Video` | `FILTER_CHIPS` | [useLibraryScreen.ts:33](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L33) |
| `Audio` | `FILTER_CHIPS` | [useLibraryScreen.ts:34](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L34) |
| `Name` | `SORT_OPTIONS` | [useLibraryScreen.ts:38](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L38) |
| `Date Added` | `SORT_OPTIONS` | [useLibraryScreen.ts:39](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L39) |
| `Duration` | `SORT_OPTIONS` | [useLibraryScreen.ts:40](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L40) |
| `Artist` | `SORT_OPTIONS` | [useLibraryScreen.ts:41](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L41) |
| `Album` | `SORT_OPTIONS` | [useLibraryScreen.ts:42](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L42) |
| `Library` | `CONTENT_MODE_OPTIONS` | [useLibraryScreen.ts:46](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L46) |
| `Playlists` | `CONTENT_MODE_OPTIONS` | [useLibraryScreen.ts:47](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L47) |
| `Mixed` | `PLAYLIST_FILTER_TYPES` | [useLibraryScreen.ts:54](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L54) |
| `{n} file(s) could not be scanned` | [useLibraryScreen.ts:131](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L131) | Toast message |

#### Dummy data strings in `useLibraryScreen.ts`

| String | Source | Notes |
|---|---|---|
| Dummy file paths | [useLibraryScreen.ts:68-87](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/hooks/useLibraryScreen.ts#L68-L87) | Test/dev data |

#### ViewToggle accessibility labels

| String | Source File | Notes |
|---|---|---|
| `Grid view` | [ViewToggle.tsx:45](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/ViewToggle.tsx#L45) | Accessibility label |
| `List view` | [ViewToggle.tsx:52](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/components/ViewToggle.tsx#L52) | Accessibility label |

---

## 4. Playlist Detail Screen

Source file: [`src/screens/PlaylistDetail/PlaylistDetailScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/PlaylistDetail/PlaylistDetailScreen.tsx)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `playlistAddToPlaylist` | `Add to Playlist` |
| `playlistDeleteConfirm` | `Delete this playlist?` |
| `queueClearAll` | `Clear All` |
| `queueRemove` | `Remove` |
| `queuePlayNext` | `Play Next` |
| `queueAddToQueue` | `Add to Queue` |
| `queueSelect` | `Select` |
| `queueMoveUp` | `Move up` |
| `queueMoveDown` | `Move down` |
| `cancel` | `Cancel` |
| `delete` | `Delete` |

### Remaining hardcoded strings

| String | Line | Notes |
|---|---|---|
| `Add to Playlist` | L63 | Alert title |
| `Media picking flow would open here.` | L64 | Alert message |
| `Playlist Options` | L82 | Alert title |
| `Rename Playlist` | L84 | Alert option |
| `Export as M3U` | L88 | Alert option |
| `Export as JSON` | L102 | Alert option |
| `Clear All Items` | L118 | Alert option |
| `Clear Playlist` | L122 | Alert title |
| `Remove all {n} items from "{name}"?` | L123 | Alert message (template) |
| `Delete Playlist` | L139 | Alert option |
| `Remove Items` | L164 | Batch delete alert title |
| `Remove {n} selected item(s)?` | L165 | Batch delete alert message (template) |
| `Empty Playlist` | L651 | Empty state title |
| `This playlist is empty. Add media to get started.` | L652 | Empty state description |
| `Add Media` | L653 | Empty state action label |
| `Play all` / `Play All` | L611, L615 | Accessibility label + button text |
| `Add media to playlist` | L621 | Accessibility label |
| `Add` | L624 | Button text |
| `Playlist options` | L630 | Accessibility label |
| `--:--` | L283 | Duration fallback |
| `Go back` | L569 | Accessibility label |
| `{n} item(s)` | L581 | Item count caption |
| `Select` / `Deselect` | L452 | Accessibility label (toggled) |
| `Play` | L518 | Accessibility label |

---

## 5. Search Screen

Source file: [`src/screens/Search/SearchScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Search/SearchScreen.tsx)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `searchTitle` | `Search` |
| `searchPlaceholder` | `Search tracks, artists, albums…` |
| `searchNoResults` | `No results found` |
| `searchNoResultsHint` | `Try a different search term.` |
| `searchTracks` | `Tracks` |
| `searchArtists` | `Artists` |
| `searchAlbums` | `Albums` |
| `searchPlaylists` | `Playlists` |
| `searchFolders` | `Folders` |

### Remaining hardcoded strings

| String | Line | Notes |
|---|---|---|
| `Search` | L654 | InternalHeader title |
| `Search tracks, artists, albums, folders…` | L673 | Placeholder |
| `Clear search` | L686 | Accessibility label |
| `Recent Searches` | L697 | SectionHeader label |
| `Clear` | L698 | SectionHeader action |
| `Search tracks, artists, albums, playlists, and linked folders` | L726 | Hint text |
| `Sort:` | L775 | Label |
| `Retry` | L822 | Button text |
| `No media matches "{query}"` | L834 | Empty state description (template) |
| `All` | L68 | Filter option |
| `Videos` | L69 | Filter option |
| `Audio` | L70 | Filter option |
| `Relevance` | L74 | Sort option |
| `Date` | L75 | Sort option |
| `Name` | L76 | Sort option |
| `Recent` | L232 | Group label |
| `Artists` | L235 | Group label |
| `Albums` | L238 | Group label |
| `Playlists` | L241 | Group label |
| `Videos` | L244 | Group label |
| `Audio` | L247 | Group label |
| `Folders` | L250 | Group label |

---

## 6. Settings Screen

Source file: [`src/screens/Settings/SettingsScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Settings/SettingsScreen.tsx)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `settingsTitle` | `Settings` |
| `settingsAudio` | `Audio` |
| `settingsVideo` | `Video` |
| `settingsGeneral` | `General` |
| `settingsPlayback` | `Playback` |
| `settingsAppearance` | `Appearance` |
| `settingsAbout` | `About` |
| `settingsLinkedFolders` | `Linked Folders` |
| `settingsAddFolder` | `Add Folder` |
| `settingsRemoveFolder` | `Remove Folder` |
| `settingsTheme` | `Theme` |
| `settingsThemeDark` | `Dark` |
| `settingsThemeLight` | `Light` |
| `settingsThemeSystem` | `System` |
| `settingsMpvConfig` | `MPV Configuration` |
| `settingsAboutVersion` | `Version` |
| `settingsAboutBuild` | `Build` |
| `settingsAboutLicenses` | `Licenses` |
| `videoEqualizer` | `Equalizer` |

### Remaining hardcoded strings

| String | Line | Notes |
|---|---|---|
| `Settings` | L73 | Header title (already in strings.ts but still hardcoded in JSX) |
| `Retry` | L92 | Button text |
| `Appearance` | L115 | SectionHeader label |
| `Theme` | L117 | SettingsRow label |
| `System` | L118 | Fallback theme label |
| `Accent Color` | L121 | SettingsRow label |
| `Gold` | L121 | Description |
| `Playback` | L124 | SectionHeader label |
| `Hardware Acceleration` | L126, L133 | Label + accessibility |
| `Audio Normalization` | L138, L145 | Label + accessibility |
| `Dialogue Boost` | L150, L157 | Label + accessibility |
| `Advanced` | L163 | SectionHeader label |
| `MPV Options` | L165 | SettingsRow label (different from `settingsMpvConfig` value) |
| `{n} option(s) set` | L166 | Dynamic description |
| `Default` | L166 | Description when no MPV options |
| `Linked Folders` | L170 | SettingsRow label |
| `Manage video & audio folders` | L171 | Description |
| `Audio` | L176 | SectionHeader label |
| `Equalizer` | L178 | SettingsRow label |
| `About` | L183 | SectionHeader label |

---

## 7. Linked Folders Screen

Source file: [`src/screens/LinkedFolders/LinkedFoldersScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/LinkedFolders/LinkedFoldersScreen.tsx)

| String | Line | Notes |
|---|---|---|
| `Video Folders` / `Audio Folders` | L273 | Header title (dynamic) |
| `Remove Folder` | L218 | Alert title |
| `Remove "{folder}" from linked folders?` | L220 | Alert message (template) |
| `Cancel` | L222 | Alert button |
| `Remove` | L224 | Alert destructive button |
| `Failed to load folders.` | L256 | Error message |
| `Retry` | L291 | Button text |
| `Scan Folders` | L335 | Button text |
| `No {video/audio} folders linked yet.` | L351 | Empty state title (dynamic) |
| `Tap "Add Folder" below to get started.` | L354 | Empty state hint |

---

## 8. Video Player Screen

Source file: [`src/screens/VideoPlayer/VideoPlayerScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `videoPlayerTitle` | `Video Player` |
| `videoGoBack` | `Go back` |
| `videoMoreOptions` | `More options` |
| `videoToggleRotation` | `Toggle rotation` |
| `videoToggleVolume` | `Toggle volume` |
| `videoEqualizer` | `Equalizer` |
| `videoPlaylist` | `Playlist` |
| `videoShuffle` | `Shuffle` |
| `videoLoop` | `Loop` |
| `videoSubtitles` | `Subtitles` |
| `videoAudioTrack` | `Audio track` |
| `videoExpandPlayer` | `Expand player` |
| `videoErrorTitle` | `Playback Error` |
| `videoErrorMessage` | `Failed to play this video.` |
| `videoErrorPermission` | `Permission Denied` |
| `videoLiveStream` | `Live` |

### Remaining hardcoded strings

| String | Source File | Notes |
|---|---|---|
| `Error loading video` | [VideoPlayerScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/VideoPlayerScreen.tsx) | Error state |
| `Loading…` | [VideoPlayerLoadingOverlay.tsx:19](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerLoadingOverlay.tsx#L19) | Default loading message |
| `Go back` | [VideoPlayerTopBar.tsx:118](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L118) | Accessibility label |
| `More options` | [VideoPlayerTopBar.tsx:137](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L137) | Accessibility label |
| `Bookmark saved` / `Save bookmark` | [VideoPlayerTopBar.tsx:145](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L145) | Accessibility label (toggled) |
| `Toggle rotation` | [VideoPlayerTopBar.tsx:154](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L154) | Accessibility label |

---

## 9. Audio Player Screen

Source file: [`src/screens/AudioPlayer/`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/)

### Existing strings in `strings.ts`

| Key | Value |
|---|---|
| `audioPlayerTitle` | `Now Playing` |
| `audioNoTrack` | `No Track Playing` |
| `audioPlay` | `Play` |
| `audioPause` | `Pause` |
| `audioNextTrack` | `Next track` |
| `audioPreviousTrack` | `Previous track` |
| `audioToggleShuffle` | `Toggle shuffle` |
| `audioToggleLoopMode` | `Toggle loop mode` |
| `audioVolumeDown` | `Volume down` |
| `audioVolumeUp` | `Volume up` |
| `audioNowPlaying` | `Now Playing` |
| `audioPaused` | `Paused` |
| `audioAddToFavorites` | `Add to Favorites` |
| `audioRemoveFromFavorites` | `Remove from Favorites` |

### Remaining hardcoded strings

| String | Source File | Notes |
|---|---|---|
| `Something went wrong` | [AudioPlayerError.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/components/AudioPlayerError.tsx) | Error state title |
| `Retry` | [AudioPlayerError.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/components/AudioPlayerError.tsx) | Error action |
| `Play` / `Pause` / `Previous` / `Next` / `Shuffle` / `Repeat` | [AudioTransportControls.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/components/AudioTransportControls.tsx) | Accessibility labels |
| `Add to playlist` / `Bookmark` / `Info` / `Queue` | [AudioActionButtons.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/components/AudioActionButtons.tsx) | Accessibility labels |
| `Go back` | [AudioPlayerHeader.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/components/AudioPlayerHeader.tsx) | Accessibility label |

---

## 10. Bookmarks Screen

Source files: [`src/screens/Bookmarks/`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/)

| String | Source File | Notes |
|---|---|---|
| `Bookmarks` | [BookmarksScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/BookmarksScreen.tsx) | Screen title |
| `No bookmarks yet` | [BookmarksScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/BookmarksScreen.tsx) | Empty state title |
| `Bookmark your favorite moments to find them quickly.` | [BookmarksScreen.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/BookmarksScreen.tsx) | Empty state description |
| `Bookmark deleted` | [useBookmarksScreen.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/useBookmarksScreen.ts) | Toast message |
| `Failed to delete bookmark` | [useBookmarksScreen.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/useBookmarksScreen.ts) | Error toast |

---

## 11. Other Screens

> **Note:** All of the following now have a dedicated `textContent.ts` file (Phase 2 completion).

### Splash Screen

Source file: [`src/screens/Splash/SplashScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Splash/SplashScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Splash/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Simba Player` | `subtitle` | Brand subtitle |
| `Welcome to Simba Player` | `welcomeTitle` | First-launch welcome |
| `Scan your media library to discover videos and music. Or skip and browse later.` | `welcomeBody` | Welcome description |
| `Scan Media Library` | `scanButton` | Action button |
| `Skip for now` | `skip` | Dismiss action |

### Now Playing Screen

Source file: [`src/screens/NowPlaying/NowPlayingScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/NowPlaying/NowPlayingScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/NowPlaying/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Now Playing` | `headerTitle` | Screen title |
| `No Track Playing` | `emptyTitle` | Empty state |
| `Open a file from the player or search to start listening.` | `emptyDesc` | Empty description |
| `Failed to load now playing.` | `errorTitle` | Error state |
| `Retry` / `Retry loading` | `retry` / `retryA11y` | Error action |
| `Unknown Track` / `Unknown Artist` | `unknownTrack` / `unknownArtist` | Fallback labels |
| `Previous track` / `Next track` | `prevA11y` / `nextA11y` | Transport a11y |
| `Pause` / `Play` | `pauseA11y` / `playA11y` | Transport a11y |
| `Seek position, {percent} percent` | `seekA11y` | Seek slider a11y |
| `Open Full Player` / `Open full player` | `openFullPlayer` / `openFullPlayerA11y` | Full player button |
| `Now playing: {title}` | `nowPlayingA11y` | Live region |

### About Screen

Source file: [`src/screens/About/AboutScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/About/AboutScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/About/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `About` | `headerTitle` | Screen title |
| `Simba Player` | `appName` | App name |
| `Version 1.0.0` | `version` | Version string |
| `Reset all settings` | `resetAllSettings` | Destructive action |
| `Privacy Policy` | `privacyPolicy` | Legal link |
| `Terms of Service` | `termsOfService` | Legal link |
| `Open Source Licenses` | `openSourceLicenses` | Legal link |
| `Rate on Play Store` | `rateOnPlayStore` | Store link |
| `Reset All Settings` | `resetAlertTitle` | Alert title |
| `Are you sure you want to reset all settings…` | `resetAlertMessage` | Alert body |
| `Cancel` / `Reset` | `cancel` / `reset` | Alert actions |

### Login Screen

Source file: [`src/screens/Login/LoginScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Login/LoginScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Login/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `SIMBA` | `brandName` | Brand logo |
| `Your media, your way` | `tagline` | Tagline |
| `Don't have an account? ` | `signUpPrompt` | Sign-up prompt (partial — concatenated with action) |
| `Create One` | `signUp` | Sign-up action |
| `Sign in with Google` | `googleSignIn` | Social auth |

### Registration Screen + Hook

Source file: [`src/screens/Registration/RegistrationScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Registration/RegistrationScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Registration/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `SIMBA` | `brandName` | Brand logo |
| `Create your account` | `tagline` | Subtitle |
| `Full Name` | `namePlaceholder` | Input placeholder |
| `Email` | `emailPlaceholder` | Input placeholder |
| `Password` | `passwordPlaceholder` | Input placeholder |
| `Confirm Password` | `confirmPasswordPlaceholder` | Input placeholder |
| `Create Account` | `createAccount` | Button label |
| `Already have an account? ` | `signInPrompt` | Login prompt (partial) |
| `Sign In` | `signIn` | Login action |
| `Please enter your name.` | `validationName` | Hook validation |
| `Please enter your email address.` | `validationEmail` | Hook validation |
| `Please enter a password.` | `validationPassword` | Hook validation |
| `Password must be at least 6 characters.` | `validationPasswordLength` | Hook validation |
| `Passwords do not match.` | `validationPasswordMatch` | Hook validation |
| `Registration failed` | `registrationFailed` | Hook error |

### Preferences Screen

Source file: [`src/screens/Preferences/PreferencesScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Preferences/PreferencesScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Preferences/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Preferences` | `headerTitle` | Screen title |
| `Full Settings` | `fullSettings` | Settings link row |
| `Playback, library, audio, and appearance` | `fullSettingsDesc` | Row description |
| `Appearance` | `sectionAppearance` | Section header |
| `Theme Mode` / `Choose between Dark, Light, or System default` | `themeMode` / `themeModeDesc` | Theme row |
| `Playback` | `sectionPlayback` | Section header |
| `Hardware Acceleration` / `Use GPU for video…` | `hardwareAccel` / `hardwareAccelDesc` | GPU row |
| `Remember Position` / `Resume playback…` | `rememberPosition` / `rememberPositionDesc` | Resume row |
| `Audio Settings` / `Equalizer, normalization, and audio output` | `audioSettings` / `audioSettingsDesc` | Audio row |
| `Accessibility` | `sectionAccessibility` | Section header |
| `Larger Controls` / `Increase the size…` | `largerControls` / `largerControlsDesc` | Controls row |
| `High-Contrast Subtitles` / `Improve subtitle…` | `highContrastSubtitles` / `highContrastSubtitlesDesc` | Subtitles row |
| `Advanced` | `sectionAdvanced` | Section header |
| `About` / `Version, licenses, and app information` | `about` / `aboutDesc` | About row |
| `Reset to Defaults` / `Restore all settings…` | `resetToDefaults` / `resetToDefaultsDesc` | Reset row |
| `Reset` | `reset` | Reset button |
| `Appearance` / `Choose your preferred theme mode` | `alertAppearanceTitle` / `alertAppearanceMessage` | Theme alert |
| `Dark` / `Light` / `System` | `dark` / `light` / `system` | Theme options |
| `Cancel` | `cancel` | Alert cancel |
| `Reset to Defaults` / `This will reset all preferences…` | `alertResetTitle` / `alertResetMessage` | Reset alert |
| `Reset` | `resetDestructive` | Destructive confirm |

### Audio Settings Screen

Source file: [`src/screens/AudioSettings/AudioSettingsScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioSettings/AudioSettingsScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioSettings/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Audio Settings` | `headerTitle` | Screen title |
| `Output` | `sectionOutput` | Section header |
| `Enhancements` | `sectionEnhancements` | Section header |
| `Equalizer` | `sectionEqualizer` | Section header |
| `Advanced` | `sectionAdvanced` | Section header |
| `Audio Device` / `Select audio output device` | `audioDevice` / `audioDeviceDesc` | Device row |
| `Sample Rate` / `Select audio sample rate` | `sampleRate` / `sampleRateDesc` | Rate row |
| `Normalize Volume` / `Automatically normalize audio volume` | `normalizeVolume` / `normalizeVolumeDesc` | Toggle |
| `Dialogue Boost` | `dialogueBoost` | Toggle (no desc) |
| `ReplayGain` / `Select ReplayGain mode` | `replayGain` / `replayGainDesc` | Mode selector |
| `Enable EQ` | `enableEQ` | Toggle |
| `Preset` / `Select equalizer preset` | `eqPreset` / `eqPresetDesc` | EQ preset |
| `Gapless Playback` | `gaplessPlayback` | Toggle |
| `Audio Delay` / `Select audio delay` | `audioDelay` / `audioDelayDesc` | Delay selector |
| `['Auto','Speaker','Headphones','Bluetooth']` | `audioDevices` | Device option list |
| `['44.1kHz','48kHz','96kHz','192kHz']` | `sampleRates` | Sample rate list |
| `['Off','Track','Album']` | `replayGainOptions` | Replay gain list |
| `['Flat','Rock','Pop','Jazz','Classical','Dance']` | `eqPresets` | EQ preset list |
| `['0ms','-100ms','+100ms','-250ms','+250ms']` | `audioDelays` | Delay list |
| `Cancel` | `cancel` | Alert dismiss |

### Folder Browser Screen

Source file: [`src/screens/FolderBrowser/FolderBrowserScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/FolderBrowser/FolderBrowserScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/FolderBrowser/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Folder Browser` | `headerTitle` | Screen title |
| `{n} Selected` | `selectedSubtitle` | Selection count |
| `Cancel` / `Select` | `cancel` / `select` | Header actions |
| `Home` | `homeLabel` | Breadcrumb root |
| `/` | `breadcrumbSeparator` | Breadcrumb separator |
| `Pull down to retry` | `errorSubtitle` | Refresh hint |
| `This folder is empty` | `emptyTitle` | Empty state |
| `No media files or subfolders found.` | `emptyDesc` | Empty desc |
| `folder` | `folderLabel` | Folder type label |
| `Unable to read directory` | `errorFallback` | Error fallback |
| `Add to Playlist ({n})` | `addToPlaylist` | Batch action bar |
| `Added {n} items to {name}` | `toastAdded` | Toast (named playlist) |
| `Added {n} items to "{name}"` | `toastAddedQuoted` | Toast (new playlist) |

### Album Screen

Source file: [`src/screens/AlbumScreen/AlbumScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AlbumScreen/AlbumScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AlbumScreen/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Album` | `headerTitle` | Screen title |
| `Play All` | `playAll` | Action button |
| `track` / `tracks` | `trackSingular` / `trackPlural` | Count labels |
| `--:--` | `durationFallback` | Duration fallback |
| `No tracks found for this album.` | `emptyTitle` | Empty state |
| `{hrs}h {mins}m` | `formatHoursMinutes` | Duration template |

### Artist Screen

Source file: [`src/screens/ArtistScreen/ArtistScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/ArtistScreen/ArtistScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/ArtistScreen/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Artist` | `headerTitle` | Screen title |
| `track` / `tracks` | `trackSingular` / `trackPlural` | Track count |
| `album` / `albums` | `albumSingular` / `albumPlural` | Album count |
| `Albums` | `sectionAlbums` | Section header |
| `All Tracks` | `sectionAllTracks` | Section header |
| `No tracks found for this artist.` | `emptyTitle` | Empty state |
| `--:--` | `durationFallback` | Duration fallback |

### All Videos Screen

Source file: [`src/screens/AllVideosScreen/AllVideosScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllVideosScreen/AllVideosScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllVideosScreen/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `All Videos` | `headerTitle` | Screen title |
| `title` / `date` | `sortByTitle` / `sortByDate` | Sort options |
| `No videos found.` | `emptyTitle` | Empty state |

### All Audio Screen

Source file: [`src/screens/AllAudioScreen/AllAudioScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllAudioScreen/AllAudioScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllAudioScreen/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `All Audio` | `headerTitle` | Screen title |
| `title` / `artist` | `sortByTitle` / `sortByArtist` | Sort options |
| `No audio files found.` | `emptyTitle` | Empty state |

### Genre Screen

Source file: [`src/screens/GenreScreen/GenreScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/GenreScreen/GenreScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/GenreScreen/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Genre` | `headerTitle` | Screen title |
| `track` / `tracks` | `trackSingular` / `trackPlural` | Count labels |
| `--:--` | `durationFallback` | Duration fallback |
| `No tracks found in this genre.` | `emptyTitle` | Empty state |

### Song Screen

Source file: [`src/screens/SongScreen/SongScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/SongScreen/SongScreen.tsx) · [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/SongScreen/textContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Track` | `headerTitle` | Screen title |
| `Play` | `play` | Action button |
| `Unknown Artist` | `unknownArtist` | Fallback label |

### Library — Album Detail Screen

Source file: [`src/screens/Library/AlbumDetailScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/AlbumDetailScreen.tsx) · [`albumDetailTextContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/albumDetailTextContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Album` | `headerTitle` | Screen title |
| `Play All` | `playAll` | Action button |
| `track` / `tracks` | `trackSingular` / `trackPlural` | Count labels |
| `--:--` | `durationFallback` | Duration fallback |
| `No tracks found for this album.` | `emptyTitle` | Empty state |

### Library — Artist Detail Screen

Source file: [`src/screens/Library/ArtistDetailScreen.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/ArtistDetailScreen.tsx) · [`artistDetailTextContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/artistDetailTextContent.ts)

| String | Source Key | Notes |
|---|---|---|
| `Artist` | `headerTitle` | Screen title |
| `album` / `albums` | `albumSingular` / `albumPlural` | Album count |
| `track` / `tracks` | `trackSingular` / `trackPlural` | Track count |
| `Artist information is not yet available…` | `bioPlaceholder` | Bio fallback |
| `Discography` | `sectionDiscography` | Section header |
| `All Tracks` | `sectionAllTracks` | Section header |
| ` · ` | `yearSeparator` | Year separator |
| `--:--` | `durationFallback` | Duration fallback |

---

## 12. Extraction Tracker

### Status Legend

| Icon | Meaning |
|---|---|
| ✅ | Already defined in `src/constants/strings.ts` |
| 📦 | Extracted into per-screen `textContent.ts` file |
| ❌ | Not yet extracted |

### Extraction Status by Category

| Category | Total Strings | In `strings.ts` | `textContent.ts` | Notes |
|---|---|---|---|---|
| **Global / Generic** | ~30 | ✅ All | — | Centralized in `strings.ts` |
| **Home Screen** | ~22 | 8 | 📦 14 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/textContent.ts) |
| **Library Screen** | ~28 | 13 | 📦 15 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/textContent.ts) |
| **Playlist Detail** | ~24 | 8 | 📦 16 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/PlaylistDetail/textContent.ts) |
| **Search Screen** | ~20 | 9 | 📦 11 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Search/textContent.ts) |
| **Settings Screen** | ~22 | 17 | 📦 5 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Settings/textContent.ts) |
| **Linked Folders** | ~12 | 0 | 📦 12 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/LinkedFolders/textContent.ts) |
| **Video Player** | ~10 | 15 | 📦 4 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/textContent.ts) |
| **Audio Player** | ~14 | 14 | 📦 6 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioPlayer/textContent.ts) |
| **Bookmarks** | ~5 | 0 | 📦 5 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Bookmarks/textContent.ts) |
| **All Playlists** | ~3 | 0 | 📦 3 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllPlaylistsScreen/textContent.ts) |
| **Splash** | ~5 | 0 | 📦 5 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Splash/textContent.ts) |
| **Now Playing** | ~15 | 0 | 📦 15 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/NowPlaying/textContent.ts) |
| **About** | ~12 | 0 | 📦 12 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/About/textContent.ts) |
| **Login** | ~5 | 0 | 📦 5 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Login/textContent.ts) |
| **Registration** | ~15 | 0 | 📦 15 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Registration/textContent.ts) |
| **Preferences** | ~22 | 0 | 📦 22 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Preferences/textContent.ts) |
| **Audio Settings** | ~21 | 0 | 📦 21 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AudioSettings/textContent.ts) |
| **Folder Browser** | ~13 | 0 | 📦 13 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/FolderBrowser/textContent.ts) |
| **Album Screen** | ~6 | 0 | 📦 6 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AlbumScreen/textContent.ts) |
| **Artist Screen** | ~7 | 0 | 📦 7 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/ArtistScreen/textContent.ts) |
| **All Videos** | ~3 | 0 | 📦 3 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllVideosScreen/textContent.ts) |
| **All Audio** | ~3 | 0 | 📦 3 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/AllAudioScreen/textContent.ts) |
| **Genre Screen** | ~4 | 0 | 📦 4 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/GenreScreen/textContent.ts) |
| **Song Screen** | ~3 | 0 | 📦 3 | [`textContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/SongScreen/textContent.ts) |
| **Album Detail (Library)** | ~5 | 0 | 📦 5 | [`albumDetailTextContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/albumDetailTextContent.ts) |
| **Artist Detail (Library)** | ~9 | 0 | 📦 9 | [`artistDetailTextContent.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Library/artistDetailTextContent.ts) |
| **TOTAL** | **~355** | **~84** | **📦 ~270** | **✅ All screens covered** |

### Recommended Migration Order

1. **Home Screen** — most visible, immediate user impact
2. **Library Screen** — heavily used, repeated across 4 segments
3. **Playlist Detail Screen** — numerous Alert dialogs
4. **Search Screen** — filter/sort labels + accessibility
5. **Settings Screen** — relatively small, straightforward
6. **Bookmarks & Linked Folders** — smaller screens
7. **Video Player & Audio Player** — accessibility labels
8. **Other Screens** — splash, now playing, about, auth screens

### Convention

```
src/screens/<ScreenName>/
  textContent.ts    ← screen-specific text strings
  <Screen>.tsx      ← imports textContent from local or strings.ts
```

Example `textContent.ts` structure:

```typescript
export const TEXT = {
  pinnedPlaylists: 'Pinned Playlists',
  welcomeTitle: 'Welcome to Simba',
  welcomeSubtitle: 'Your media, beautifully organized',
  openMediaFile: 'Open Media File',
  browseLibrary: 'Browse Library',
  // ...
} as const;
```