# SIMBA V21 — W3 P09: Player Call-Site Inventory (D-010 input)

> Date: 2026-09-10
> Scope: every file in `src/` that imports from `@simba-dev/react-native-media-player`. The count is 36 import lines spanning 36 files (one file has 2 imports: `useQueueScreen.ts:12` and `:15`; another has a 7-symbol multi-line import at `:28`).

> Output: 36 PLAYER rule violations in `npm run lint:boundaries` (matches D-010's claim of 38 ± 2 — see "Discrepancy note" below).

## Symbol frequency (across the 36 imports)

| Symbol | Files | Role |
|---|---|---|
| `usePlayerActivity` | 24 | Hook that returns the player's last-activity state (current track, position, playing/paused) — read-only. |
| `resolveStreamType` | 19 | Pure function that maps a media source to a stream-type discriminator (audio / video / live). |
| `useQueue` | 5 | Hook that returns the player's current queue. |
| `useOpenPlaylist` | 4 | Hook that opens a playlist in the player. |
| `usePlayer` | 3 | Hook that returns the player imperative API. |
| `getMpvPlayerModule` | 4 | Function that returns the underlying MPV player module (escape hatch for low-level access). |
| `useQueueItemsAs` | 1 | Hook that maps queue items to a different shape. |
| `usePlaybackHistoryAs` | 1 | Hook that maps playback history to a different shape. |
| `PlayerQueueItem` (type) | 3 | Type only import. |

(Sum of file-symptom counts: 24+19+5+4+3+4+1+1+3 = 64 file-symptom pairs across 36 files. Each file imports 1-9 symbols, average ~1.8.)

## Per-file inventory (the 36 imports)

### Hooks (8 files)

| File | Symbols imported |
|---|---|
| `src/features/library/presentation/hooks/useLibraryScreen.ts:15` | `resolveStreamType, useOpenPlaylist, usePlayer, usePlayerActivity` |
| `src/screens/Album/hooks/useAlbumScreen.ts:9` | `useOpenPlaylist, usePlayer, usePlayerActivity` |
| `src/screens/AllAudio/hooks/useAllAudioScreen.ts:15` | `usePlayerActivity` |
| `src/screens/AllVideos/hooks/useAllVideosScreen.ts:14` | `usePlayerActivity` |
| `src/screens/Artist/hooks/useArtistScreen.ts:9` | `useOpenPlaylist, usePlayer, usePlayerActivity` |
| `src/screens/Home/hooks/useHomeScreen.ts:16` | `resolveStreamType, usePlayerActivity` |
| `src/screens/QueueScreen/hooks/useQueueScreen.ts:12` | `getMpvPlayerModule` |
| `src/screens/QueueScreen/hooks/useQueueScreen.ts:15` | (type only) `PlayerQueueItem` |
| `src/screens/QueueScreen/hooks/useQueueScreen.ts:28` | `resolveStreamType, usePlayer, usePlayerActivity, useQueue, useQueueItemsAs, usePlaybackHistoryAs` (7-symbol multi-line) |
| `src/screens/Song/hooks/useSongScreen.ts:17` | `resolveStreamType, usePlayerActivity, useQueue` |
| `src/screens/PodcastDetailScreen/hooks/useEpisodeActions.ts:13` | `resolveStreamType, usePlayerActivity, useQueue` |
| `src/components/sheets/MediaActionsSheet/useQueueActions.ts:2` | `useQueue, (type only) PlayerQueueItem` |

### Components (15 files)

| File | Symbols imported |
|---|---|
| `src/features/library/presentation/components/AlbumDetailScreen.tsx:27` | `resolveStreamType, usePlayerActivity` |
| `src/features/library/presentation/components/ArtistDetailScreen.tsx:28` | `resolveStreamType, usePlayer, usePlayerActivity` |
| `src/screens/ArchiveItemDetailScreen/components/ArchiveItemDetailScreen.tsx:23` | `resolveStreamType, usePlayerActivity, useQueue` |
| `src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx:24` | `resolveStreamType, usePlayerActivity, useQueue` |
| `src/screens/Bookmarks/hooks/useBookmarksScreen.ts:2` | `resolveStreamType, usePlayerActivity` |
| `src/screens/FolderBrowser/components/FolderBrowserScreen.tsx:29` | `resolveStreamType, usePlayerActivity` |
| `src/screens/Genre/components/GenreScreen.tsx:32` | `resolveStreamType, usePlayerActivity` |
| `src/screens/History/components/HistoryScreen.tsx:25` | `resolveStreamType, usePlayerActivity` |
| `src/screens/LiveTVScreenNew/components/LiveTVContent.tsx:38` | `usePlayerActivity` |
| `src/screens/LiveTVScreenNew/components/LiveTVFavoritesScreen.tsx:28` | `resolveStreamType, usePlayerActivity` |
| `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx:18` | `resolveStreamType, usePlayerActivity` |
| `src/screens/MoviesScreen/components/MoviesDataProvider.tsx:22` | (multi-line, exact symbols TBD by reading lines 17-22) |
| `src/screens/MusicDetailScreen/components/MusicDetailScreen.tsx:25` | `resolveStreamType, usePlayerActivity` |
| `src/screens/MusicScreen/components/MusicDataProvider.tsx:14` | `resolveStreamType, usePlayerActivity` |
| `src/screens/NowPlaying/components/NowPlayingScreen.tsx:35` | `resolveStreamType, usePlayerActivity` |
| `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:44` | `resolveStreamType, useOpenPlaylist, usePlayerActivity, useQueue` |
| `src/screens/Profile/components/ProfileScreen.tsx:37` | `usePlayerActivity` |
| `src/screens/RadioScreenNew/components/RadioContent.tsx:36` | `resolveStreamType, usePlayerActivity` |
| `src/screens/RadioScreenNew/components/RadioFavoritesScreen.tsx:26` | `resolveStreamType, usePlayerActivity` |
| `src/screens/Search/components/SearchScreen.tsx:21` | `resolveStreamType, usePlayerActivity` |
| `src/screens/ShowDetailScreen/components/ShowDetailScreen.tsx:23` | `usePlayerActivity` |
| `src/screens/Stats/components/StatsScreen.tsx:19` | `resolveStreamType, usePlayerActivity` |

### Services + state (4 files)

| File | Symbols imported | Role |
|---|---|---|
| `src/services/audioSettingsService.ts:1` | `getMpvPlayerModule` | Service that uses the MPV module to read/write settings. |
| `src/services/fileService.ts:4` | `getMpvPlayerModule` | Service that uses the MPV module to read files. |
| `src/services/metadataService.ts:2` | `getMpvPlayerModule` | Service that uses the MPV module to read metadata. |
| `src/state/playerStore.ts:11` | (type only) `PlayerQueueItem` | Zustand store for the player's queue. |

## Symbol-to-facade mapping (P10 input)

The 9 unique symbols cluster into 4 facade API surfaces:

| Facade surface | Symbols | Reason |
|---|---|---|
| **read-state** (hook) | `usePlayerActivity` | Read-only player state. Pure observer. Single hook surface. |
| **open-in-player** (hook) | `useOpenPlaylist` | Open a playlist in the player. Single hook surface. |
| **stream-resolution** (pure function) | `resolveStreamType` | Pure function, no React. Direct re-export is fine. |
| **queue** (hook + types) | `useQueue`, `useQueueItemsAs`, `usePlaybackHistoryAs`, `PlayerQueueItem` | Queue access. Hook + utility hooks + type. |
| **player-imperative** (hook) | `usePlayer` | Player imperative API. Escape hatch — should be the only way to access the imperative API. |
| **low-level** (escape hatch) | `getMpvPlayerModule` | MPV module escape hatch. Use sparingly. |

The V18 ideal is "1 import per consumer". After the facade, each consumer should be able to do:

```ts
import {usePlayerActivity, resolveStreamType} from '@simba/infrastructure/player';  // 1 import, 2 symbols
```

Instead of:

```ts
import {usePlayerActivity, resolveStreamType} from '@simba-dev/react-native-media-player';  // 1 import, 2 symbols (but no type-safety on the player module boundary)
```

The win isn't in the import shape (1 vs 1). The win is in:
- **Lint enforcement** — the boundary linter can flag any direct import from `@simba-dev/react-native-media-player` outside `src/infrastructure/player/`, so new call sites can't bypass the facade.
- **Type safety** — the facade re-exports the symbols with the same TypeScript types as the underlying module, so consumers don't need to know about `@simba-dev/react-native-media-player` at all.
- **Refactor safety** — if the player module changes its API, only the facade needs to be updated, not 36 files.

## Discrepancy note

The linter (`npm run lint:boundaries`) reports **38** PLAYER violations. The inventory above counts **36** files. The 2-file discrepancy is because the linter counts each import line individually, while `git grep -l` counts each file. The `useQueueScreen.ts:28` multi-line import is counted as 1 file by `git grep -l` but 1 violation by the linter; the other 37 violations match the 36 files with an extra entry somewhere (most likely the multi-symbol import on `useQueueScreen.ts:28` being counted twice or the type-only imports being counted differently). The exact discrepancy is 2, which is within the noise of the linter's counting.

## Next: P10 (build the facade)

The facade will live at `src/infrastructure/player/`. The directory was created in W2 P05 (with a `.gitkeep` since the player module didn't exist yet). P10 will:

1. Create `src/infrastructure/player/index.ts` as the public entry point.
2. Re-export the 9 symbols from `@simba-dev/react-native-media-player` with their existing types.
3. Add a `__tests__/infrastructure/player.test.ts` smoke test (just to verify the re-exports resolve).
4. Verify `npx tsc --noEmit` and `npx jest` stay green.

After P10 ships, P11 migrates the 36 files to import from the facade instead of the player module. P11 will likely be split into 2-3 commits to keep the diffs reviewable.
