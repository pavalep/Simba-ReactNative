# SIMBA v11 Screen Architecture Audit and Refactor Queue

## Scope

This audit covers every directory under `src/screens`. The target contract is one public `index.tsx` entrypoint per active screen folder. Screen internals should live under `components/`, `hooks/`, `related/`, `styles/`, and `types/` as appropriate. Navigation imports should consume only the public entrypoint; implementation files must not become route-level public APIs.

The exact raw inventory is saved in `v11_screen_architecture_inventory.csv`.

## Reference implementations

The accepted structure is already demonstrated by `MoviesScreen`, `PodcastsScreen`, `MusicScreen`, `Home`, `Library`, `ArchiveScreen`, `AudiobooksScreen`, `LiveTVScreenNew`, and `RadioScreenNew`. These boundaries will be used as the migration template rather than introducing a second architecture.

## Ordered refactor queue

| Priority | Screen group | Current condition | Target boundary | Reason |
|---|---|---|---|---|
| 1 | `Album`, `Artist`, `Genre`, `Song` | Active screens expose root implementation files and separate hooks | Add `index.tsx`; move implementation into `components/` or `hooks/`; add `styles/` and `types/` where needed | Core Library/content navigation and shared media taxonomy |
| 2 | `MovieDetailScreen`, `MusicDetailScreen`, `ShowDetailScreen`, `AudiobookDetailScreen`, `ArchiveItemDetailScreen` | Active detail screens expose root implementation files; several already have hooks but no public boundary | Add `index.tsx`; isolate screen component, hooks, styles, related data, and types | Detail screens are high-use content destinations and player callers |
| 3 | `PlaylistDetail`, `AllPlaylists`, `QueueScreen`, `History`, `Bookmarks`, `Stats` | Active library/player support screens expose root implementation files | Add public boundaries and isolate feature-facing UI from navigation contracts | Playlist, recent history, bookmarks, and queue behavior must remain easy to evolve |
| 4 | `Search`, `FolderBrowser`, `LinkedFolders`, `DownloadsScreen`, `NowPlaying` | Active utility/media screens expose root implementation files or mixed root files | Add `index.tsx`; move UI, hooks, styles, related helpers, and screen-local types | These screens cross local media, playback, and navigation contracts |
| 5 | `AllAudio`, `AllVideos`, `About`, `AudioSettings`, `Help`, `Privacy`, `Terms`, `Licenses`, `Credits`, `Changelog`, `Splash`, `Login`, `Profile`, `Settings` | Active/simple screens are not consistently index-only; some already have an index boundary | Normalize only where the folder is active and the migration is non-breaking | Complete the public-boundary rule without touching approved behavior unnecessarily |
| 6 | `LiveTVScreen` legacy folder and remaining radio favorites/detail companions | Mixed legacy and active files | Verify active imports first; isolate or retire only files outside active routes | Avoid breaking the already-refactored `LiveTVScreenNew` and `RadioScreenNew` boundaries |
| 7 | Empty or shadow directories: `AllAudioScreen`, `AllVideosScreen`, `AllPlaylistsScreen`, `GenreScreen`, `Player`, `Preferences`, `Registration`, `sections` | No active TypeScript entrypoint in the directory | Confirm no imports/references, then remove or document as legacy | Prevent dead folders from being mistaken for screen boundaries |

## Migration rules

Each migration must preserve the current route name, navigation parameter type, behavior, and existing feature façade imports. The public `index.tsx` should re-export the screen component only. Existing callers should be migrated from direct implementation paths to the new public boundary in the same batch. No bottom tab navigator, dummy content, mixed playlist behavior, or raw route playback should be introduced.

FlatLists must retain stable semantic keys. Media records must retain `source`, `type`, `mediaType`, provider, folder identity, artwork, duration, and resume position where those contracts already exist. Playback must continue through `usePlaybackCommands().openPlayer()`.

## First implementation batch

Begin with Priority 1 in this order: `Album`, `Artist`, `Genre`, and `Song`. These are compact enough to migrate safely, are active in `RootNavigator`, and share Library/media-detail contracts. After the batch, run TypeScript and a direct-import scan before proceeding to Priority 2.

## Evidence policy

A screen is not marked complete merely because an `index.tsx` exists. Evidence must include the changed files, updated navigation imports, a clean TypeScript check, no direct implementation imports from outside the screen folder, and no route regressions. Runtime/device verification remains open until the project-wide release gate, as previously requested.


## Priority 2 completion record — detail screens and Equalizer

The Priority 2 batch is implemented and statically verified. `MovieDetailScreen`, `MusicDetailScreen`, `ShowDetailScreen`, `AudiobookDetailScreen`, and `ArchiveItemDetailScreen` now expose one public `index.tsx` boundary each. Their implementations live under `components/`, existing hooks remain under `hooks/`, and screen-local navigation prop contracts live under `types/index.ts`. `Equalizer/EqualizerScreen.tsx` was normalized to `Equalizer/index.tsx` as a simple single-file public boundary.

Navigation imports were rewired to the public folder boundaries. The migration preserved route names, `RootStackScreenProps` contracts, existing media provenance fields, and route-free playback commands. `tscheck_screen_architecture_priority2.log` reports `TSC_EXIT=0`. `v11_screen_architecture_priority2_direct_import_scan.txt` reports zero direct implementation imports, zero direct Equalizer implementation imports, and zero old implementation files remaining.

Runtime/device verification remains intentionally deferred to the final release gate. The next ordered batch is Priority 3: `PlaylistDetail`, `AllPlaylists`, `QueueScreen`, `History`, `Bookmarks`, and `Stats`.


## Priority 3 completion record — library and playback-adjacent screens

The Priority 3 batch is implemented and statically verified. `PlaylistDetail`, `AllPlaylists`, `QueueScreen`, `History`, `Bookmarks`, and `Stats` now expose one public `index.tsx` boundary each. Implementations are under `components/`; existing logic hooks are under `hooks/`; local copy/text resources are under `related/`; and route prop contracts are under `types/index.ts` where applicable.

The migration also corrected two architecture-adjacent contract issues discovered in the target files. QueueScreen no longer uses an array-index fallback in its `SectionList` key extractor; semantic media identity is used instead. Bookmarks now opens the root playback overlay through `usePlaybackCommands().openPlayer()` using canonical playback entry fields and saved resume position. PlaylistDetail sharing no longer targets removed player routes, and obsolete player route entries were removed from `shareService.ts`.

`tscheck_screen_architecture_priority3.log` reports `TSC_EXIT=0`. `v11_screen_architecture_priority3_direct_import_scan.txt` records that all six public boundaries exist, RootNavigator has zero direct implementation imports, and the migrated Priority 3 screens have zero stale player-route references after correction. Runtime/device verification remains deferred to the final release gate.

The next ordered queue is Priority 4: `Search`, `FolderBrowser`, `LinkedFolders`, `DownloadsScreen`, and `NowPlaying`.


## Priority 4 completion record — search, files, downloads, and now playing

The Priority 4 batch is implemented and statically verified. `Search`, `FolderBrowser`, `LinkedFolders`, `DownloadsScreen`, and `NowPlaying` each now expose exactly one public root `index.tsx`. Implementations are under `components/`; hooks are under `hooks/`; screen-local copy is under `related/`; and route prop contracts are under `types/index.ts`.

RootNavigator and SettingsStack now consume the public screen boundaries. LinkedFolders’ folder list uses the folder path as its stable semantic key instead of an array index. NowPlaying’s former `AudioPlayer` route CTA was converted to `usePlaybackCommands().openPlayer()` with canonical playback entry fields.

`tscheck_screen_architecture_priority4.log` reports `TSC_EXIT=0`. `v11_screen_architecture_priority4_direct_import_scan.txt` records five public boundaries, zero direct implementation imports in the navigators, zero index-based key extractors in the migrated screens, and zero stale player-route references in the migrated implementations. Runtime/device verification remains deferred to the final release gate.

The next ordered queue is Priority 5: `AllAudio`, `AllVideos`, `About`, `AudioSettings`, `Help`, `Privacy`, `Terms`, `Licenses`, `Credits`, `Changelog`, `Splash`, `Login`, `Profile`, and `Settings`.


## Priority 5 completion record — all-audio, all-video, settings, utility, legal, account, authentication, and splash screens

The Priority 5 batch is implemented and statically verified. The fourteen targets—`AllAudio`, `AllVideos`, `About`, `AudioSettings`, `Help`, `Privacy`, `Terms`, `Licenses`, `Credits`, `Changelog`, `Splash`, `Login`, `Profile`, and `Settings`—now each expose exactly one public root `index.tsx`. Implementations are inside `components/`; hooks are inside `hooks/`; screen-local copy is inside `related/`; and route prop contracts are inside `types/index.ts`.

RootNavigator and SettingsStack now consume public screen boundaries. Existing internal Settings dialogs remain under `src/screens/Settings/components/`. Login and Settings hook paths were corrected after relocation, and Login now consumes its local `LoginScreenProps` type boundary.

`tscheck_screen_architecture_priority5.log` reports `TSC_EXIT=0`. `v11_screen_architecture_priority5_direct_import_scan.txt` records all fourteen public boundaries, zero direct implementation imports in the navigators, zero index-based key extractors in migrated implementations, and zero stale player-route references. Runtime/device verification remains deferred to the final release gate.

The next ordered queue is the final architecture cleanup and release-verification pass: remaining nonconforming folders such as `FolderLinkingWizard`, legacy/duplicate inventory entries, and any screens discovered by the final complete `src/screens` scan, followed by the deferred TypeScript, build, emulator, navigation, playback, local-media, and visual acceptance gates.
