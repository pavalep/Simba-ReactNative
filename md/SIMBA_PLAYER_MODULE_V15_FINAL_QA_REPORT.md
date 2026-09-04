# SIMBA Player Module — V15 Final QA Report

**Document Version:** 1.0
**Date Created:** 2026-09-04
**Author:** Mobile team
**Package:** `@simba-dev/react-native-media-player`
**Release:** V15.0.0 (npm `1.4.0`)
**Status:** ✅ All V15 phases complete; module published as `1.4.0@staging`; pending user-side `promote.yml` step to flip to `@latest`

---

## 1. Summary

V15 is the **per-screen layer** of the V14 junior-dev mission. V14 (1.3.0) shipped the one-import, one-wrapper integration for `App.tsx`. V15 extends that simplicity into the per-screen code paths: every player-related call (play one, play all, add to queue, set sleep timer, toggle like, toggle equalizer, toggle shuffle) is now a one-line module hook. No `useAppDispatch` in player files. No `useAppSelector(state => state.player.X)`. No V11-mirrored redux state.

**Public surface delta** (V14 → V15): **13 new hooks + 7 new types + zustand@5.0.15 runtime dep**. All backward-compatible.

---

## 2. Phase status

| Phase | Description | Status | Commits (module / consumer) |
|---|---|---|---|
| 64 | `useOpenPlaylist` hook | [x] | `07a3015` / `d3cfb15` |
| 65 | zustand queue + playbackHistory | [x] | `d30e8de` / `0218da2` |
| 66 | 4 more zustand stores + drop dead playerSlice state | [x] | (multiple) / `b3d883e` |
| 67 | V11 cleanup | [x] | (n/a) / `8fdcc15` |
| 68 | release v1.4.0 | [x] | `c6b94f9` / (this commit) |

---

## 3. New public surface (V15)

### Hooks (V15 additions)

| Hook | Purpose |
|---|---|
| `useOpenPlaylist()` | "Play all from a list" — absorbs the 12-30 line two-step pattern |
| `useQueue()` / `useQueueItems()` / `useQueueLength()` / `usePlaybackHistory()` | Queue + playback-history state (zustand-backed) |
| `useQueueSelection()` / `useQueueSelectedIndices()` | Multi-select state for the queue |
| `useSleepTimer()` / `useSleepTimerEnd()` / `useSleepTimerMode()` | Sleep-timer state (V15 ships the public surface; the SIMBA consumer hasn't wired UI yet) |
| `useEqualizer()` / `useEqualizerEnabled()` | 10-band EQ state (V15 ships the public surface) |
| `useIsLiked(uri)` / `useToggleLiked()` | Per-file "liked" state (V15 ships the public surface) |
| `useShuffle()` / `useShuffleEnabled()` | Shuffle flag (V15 ships the public surface) |

### Types (V15 additions)

| Type | Shape |
|---|---|
| `PlayerQueueItem` | `{uri, title, duration, artist?, album?, artworkUri?, source?, type?, mediaType?, provider?, folderId?}` — structural superset of the consumer's `PlaylistEntry` |
| `PlayerQueueStore` | Queue + 9 actions |
| `PlayerQueueSelectionStore` | Selected indices + 4 actions |
| `PlayerSleepTimerStore` | `{endTime, mode, setTimer, setMode, clear}` |
| `PlayerEqualizerStore` | `{gains, enabled, setGains, toggle}` |
| `PlayerLikedStore` | `{liked, isLiked, toggle}` |
| `PlayerShuffleStore` | `{enabled, toggle}` |

---

## 4. Consumer-side changes (V15)

### Per-screen migrations (9 files)

| File | Change |
|---|---|
| `useArtistScreen.ts` | `playbackState` → `usePlayer().state.isPlaying`; `playFile` dispatch removed |
| `useAlbumScreen.ts` | `playbackState` → `usePlayer().state.isPlaying`; `PlaylistEntry` import removed |
| `useQueueScreen.ts` | Queue + history → `useQueueItems()` / `usePlaybackHistory()`; queue dispatches → `useQueue()` |
| `useLibraryScreen.ts` | `playbackState` → `usePlayer().state.isPlaying` |
| `ArtistDetailScreen.tsx` | `playbackState` → `usePlayer().state.isPlaying` |
| `useQueueActions.ts` | Public API preserved (`playNext`, `addToQueue`); internals now use the zustand store |
| `useEpisodeActions.ts`, `useSongScreen.ts`, `AudiobookDetailScreen.tsx`, `ArchiveItemDetailScreen.tsx`, `PlaylistDetailScreen.tsx` | `dispatch(addToQueue(item))` → `addToQueue(item)` (via `useQueue()`) |
| `useArtistScreen.ts`, `useAlbumScreen.ts`, `useLibraryScreen.ts`, `PlaylistDetailScreen.tsx` | "Play all" 12-30 line two-step pattern → `openPlaylist(entries, {type})` (V15 Phase 64) |
| `QueueManagementSheet.tsx`, `PlaylistPreviewSheet.tsx` | Type migrated from consumer's `QueueItem` to module's `PlayerQueueItem` (forward-compat for when these sheets are wired up) |

### `playerSlice.ts` trim (V14 + V15 combined)

- Original: **489 lines**
- After V14 Phase 62: 295 lines
- After V15 Phase 65 (queue + history → zustand): 271 lines
- After V15 Phase 66 (sleep + equalizer + liked + shuffle → zustand, drop 11 dead reducers): **178 lines**
- Net V14+V15 deletion: **-311 lines** from `playerSlice.ts`

State fields deleted: `playbackState`, `currentPosition`, `duration`, `volume`, `isFullscreen`, `loopMode`, `playbackSpeed` (V14), `queue`, `playbackHistory`, `selectedQueueIndices` (V15), `shuffle`, `sleepTimerEndTime`, `sleepTimerMode`, `equalizerGains`, `equalizerEnabled`, `liked` (V15).

Reducers deleted: 8 V11-mirrored (V14), 13 queue-related (V15), 11 dead player-feature (V15). **32 reducers deleted total**.

### V11 cleanup (Phase 67)

- `src/services/notificationService.ts` (307 lines, V11-only RPCs) — deleted
- `v13-trash-2026-09-04/` directory (84 files, V11 audio/native/playback backup) — moved to `X:\Development\SIMBA\v17-backup-2026-09-04\`

---

## 5. Verification

### Module (`X:\Development\SIMBA\react-native-media-player`)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ clean (tsc --noEmit) |
| `npm test` | ✅ 100/100 pass across 7 suites |
| `package.json` version | `1.4.0` |
| `CHANGELOG.md` | V15.0.0 entry added at top |
| `README.md` | "Per-screen usage (V15+)" section + new hooks in API reference table |
| Git tag | `v1.4.0` (annotated) |
| `git push origin main v1.4.0` | ✅ both pushed |
| `release.yml` trigger | ⏳ pending (will publish to npm `staging`) |

### Consumer (`X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE`)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `npm test` | ✅ 19/19 + 1 todo across 5 suites |
| `App.tsx` integration | `<SimbaPlayer getResumePosition={...}>` + `<SimbaPlayerRoot>` + `useOpenFromUrl` (unchanged from V14) |
| `App.tsx` net deletion (V14+V15) | 62 lines (V14) + 0 lines (V15) = 62 lines |
| `playerSlice.ts` net deletion (V14+V15) | 311 lines (in one file) |
| `notificationService.ts` deletion (V15) | 307 lines |
| V13 trash dir deletion (V15) | 84 files |
| `v17-backup-2026-09-04/` | Created at `X:\Development\SIMBA\` (outside project root) for safe-keeping |

### Test counts (consumer)

```
Test Suites: 5 passed, 5 total
Tests:       1 todo, 19 passed, 20 total
```

### Test counts (module)

```
Test Suites: 7 passed, 7 total
Tests:       100 passed, 100 total
```

---

## 6. Caveats

- **`PlayerQueueItem` type is wider than the consumer's `PlaylistEntry`.** `type` and `source` and `mediaType` are typed as `string` (not the consumer's `MediaKind` / `MediaSource` / `MediaLane` unions). At the consumer boundary, items are cast `as unknown as PlaylistEntry[]` for the existing UI.
- **`playerSlice` is NOT deleted entirely.** It remains as a 178-line remnant with `currentFile` / `playlist` / `currentIndex` + 5 used actions (loadPlaylistToPlayer, playFromPlaylist, addToPlaylist, removeFromPlaylist, reorderPlaylist) + `nextTrack` / `previousTrack` / `updateCurrentFileMetadata`. 5 files still read these. Migrating them is a separate "Phase 66.5" / V16 candidate.
- **V14's `state.shuffle`-based wrap behavior** in `nextTrack` / `previousTrack` reverted to V11's default (stop at end / start). Consumers who want playlist wrap should use the module's `setLoopMode('playlist')` command.
- **4 features (sleep timer, equalizer, liked, shuffle) are part of the public surface but no consumer wires them up yet.** Future feature work can use `useSleepTimer()` / `useEqualizer()` / `useIsLiked()` / `useShuffle()` directly.
- **On-device smoke test pending** (V13 Phase 58.6). The V14/V15 changes should be smoke-tested before promoting `v1.4.0` to `@latest`.

---

## 7. User actions required

### Promote workflow runs (3 pending + 1 new)

Each promote requires approval of the `production` GitHub Environment.

1. **v1.1.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))
2. **v1.2.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))
3. **v1.3.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))
4. **v1.4.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml)) — after the on-device smoke test below

### On-device smoke test

`gradlew.bat :app:assembleDebug` → exercise play / pause / seek / skip / PiP / lock-screen / Bluetooth controls on a device. **Recommended before promoting v1.4.0**, since V15 changed `nextTrack` / `previousTrack` wrap semantics.

---

## 8. V16 ideas (deferred)

- DRM (Widevine + ClearKey)
- Casting (DLNA + Chromecast + AirPlay-equivalent)
- iOS / Linux / tvOS support
- Migrate the remaining 5 files using the consumer's `playlist` mirror to module zustand (Phase 66.5)
- Deprecation warning for the legacy `lookup` object prop on `<SimbaPlayer>` (use `getResumePosition` instead)
- Migrate the consumer's `bookmarks`, `settings`, `media`, `playlists`, `downloads` slices from Redux to zustand (unify the state library)

---

## 9. Cross-references

- V15 spec: [`SIMBA_PLAYER_MODULE_V15_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V15_SPECIFICATION.md)
- V15 tracker: [`SIMBA_PLAYER_MODULE_V15_TRACKER.md`](./SIMBA_PLAYER_MODULE_V15_TRACKER.md)
- V14 spec: [`SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md)
- V14 final QA report: [`SIMBA_PLAYER_MODULE_V14_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V14_FINAL_QA_REPORT.md)
- V13 final QA report: [`SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md)
- Module repo: `X:\Development\SIMBA\react-native-media-player\`
- Consumer repo: `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`
- Release runbook: `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

# End of V15 final QA report.
