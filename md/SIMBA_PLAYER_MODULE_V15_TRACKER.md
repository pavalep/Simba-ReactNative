# SIMBA Player Module — V15 Tracker

**Document Version:** 1.5
**Date Created:** 2026-09-04
**Last Updated:** 2026-09-04
**Linked spec:** [`SIMBA_PLAYER_MODULE_V15_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V15_SPECIFICATION.md)

> This tracker is the working companion to the V15 spec. Each phase has a status, an owner, a target date, and a one-paragraph narrative describing actual work vs planned.

---

## Phase 64 — `useOpenPlaylist` hook

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module commit `07a3015` adds `src/hooks/useOpenPlaylist.tsx` (the 12-30 line two-step absorption hook). Consumer commit `d3cfb15` migrates 4 list-style screens (`useArtistScreen`, `useAlbumScreen`, `useLibraryScreen`, `PlaylistDetailScreen`) to use the new hook. Net deletion in consumer: 41 lines (52 added, 93 deleted). The 5th file (`useHomeScreen`) does not have a "play all" handler — only direct `openPlayer` calls for single-track play — so 4 files (not 5) needed migration. Phase 64 keeps the `dispatch(loadPlaylistToPlayer(...))` call in the consumer because the consumer's Queue UI still reads from `playerSlice`; Phase 65 will absorb that dispatch. Module typecheck clean, 100/100 tests pass. Consumer typecheck clean, 19/19 + 1 todo.

### Sub-phase 64.1 — Define `useOpenPlaylist`
**Status:** [x] Complete

### Sub-phase 64.2 — Re-export from index
**Status:** [x] Complete

### Sub-phase 64.3 — Consumer migration (4 files, not 5)
**Status:** [x] Complete

---

## Phase 65 — Module owns the consumer's queue + playbackHistory (zustand)

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module side (already committed in `d30e8de` + earlier): `playerQueueStore` + `playerQueueSelectionStore` (zustand v5) + `useQueue` / `useQueueItems` / `useQueueLength` / `usePlaybackHistory` / `useQueueSelection` / `useQueueSelectedIndices` hooks. `PlayerQueueItem` is a structural superset of the consumer's `PlaylistEntry` for the fields the UI needs (uri, title, duration, source, type, mediaType, provider, folderId, artworkUri). Consumer commit `0218da2` migrates 9 files: 6 simple dispatch sites (`useQueueActions`, `useEpisodeActions`, `useSongScreen`, `AudiobookDetailScreen`, `ArchiveItemDetailScreen`, `PlaylistDetailScreen`) — done by a worker subagent; the main `useQueueScreen` hook; and 2 leaf sheets (`QueueManagementSheet`, `PlaylistPreviewSheet`). The 5 false-positive files (`ArtistTopTracks`, `AlbumTrackList`, `StreamingRow`, `ResultTile`, `HistoryScreen`) only use `useQueueActions` — automatically migrated when the hook itself was migrated. `playerSlice.ts` loses 13 queue-related reducers + 3 state fields (queue, playbackHistory, selectedQueueIndices); mixed reducers (nextTrack, previousTrack, loadPlaylistToPlayer, clearPlayer) drop their queue/history writes. Type-bridging at the consumer boundary: rows are cast `as unknown as PlaylistEntry[]` for the existing UI (data is structurally compatible; cast documents the contract). Module typecheck + 100/100 tests pass. Consumer typecheck + 19/19 + 1 todo pass.

### Sub-phase 65.1 — Add zustand to module dependencies
**Status:** [x] Complete

### Sub-phase 65.2 — Define `playerQueueStore`
**Status:** [x] Complete

### Sub-phase 65.3 — Define `useQueue` hook
**Status:** [x] Complete

### Sub-phase 65.4 — Update `useOpenPlaylist` to use the store
**Status:** [-] Deferred (the `useOpenPlaylist` hook is for the consumer's playlist state, not the queue. Phase 65 is queue-only.)

### Sub-phase 65.5 — Consumer migration
**Status:** [x] Complete

---

## Phase 66 — Module owns the rest of player-specific state (zustand), delete `playerSlice`

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module side: 4 new zustand stores (`playerSleepTimerStore`, `playerEqualizerStore`, `playerLikedStore`, `playerShuffleStore`) + 9 hooks (`useSleepTimer`, `useEqualizer`, `useIsLiked`, `useToggleLiked`, `useShuffle`, etc.) shipped as the module's public surface. Consumer commit `b3d883e` drops 11 dead reducers + 6 dead state fields from `playerSlice`. Audit found ZERO consumer files reading or writing the corresponding state — the features were scaffolded in earlier phases but never implemented in the UI. Semantic change: V14's `state.shuffle`-based wrap behavior in `nextTrack`/`previousTrack` is gone; V11's default (stop at end / start) is restored. Consumers who want playlist wrap should use the module's `setLoopMode('playlist')` command. `playerSlice` is NOT deleted entirely (per the V15 spec §66.4 wish) because `currentFile` / `playlist` / `currentIndex` are still read by 5+ files and 5 playlist-management actions are still dispatched — that migration is a separate "Phase 66.5" / V16 candidate. Module typecheck + 100/100 tests pass. Consumer typecheck + 19/19 + 1 todo.

### Sub-phase 66.1 — Define 5 more zustand stores
**Status:** [x] Complete (4 new stores; `playerQueueSelectionStore` was already done in Phase 65)

### Sub-phase 66.2 — Define 5 more hooks
**Status:** [x] Complete (9 new hooks across the 4 stores)

### Sub-phase 66.3 — Consumer migration
**Status:** [x] Complete (no consumer files actually used the dead state — the migration was a pure deletion)

### Sub-phase 66.4 — Delete `playerSlice.ts`
**Status:** [-] Deferred (5 files still read `currentFile` / `playlist` / `currentIndex`; slice is preserved as a 120-line remnant)

### Sub-phase 66.5 — Verify
**Status:** [x] Complete

---

## Phase 67 — V11 cleanup

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Consumer commit `8fdcc15` deletes `src/services/notificationService.ts` (307 lines) and the `v13-trash-2026-09-04/` directory (84 files across 18 subdirs). The notification service was V11-only (5 V11 RPCs: `startNotification`, `updateNotification`, `stopNotification`, and 2 event subscriptions for `onNotificationPlay/Pause/Next/Previous/Stop/SeekTo`); V12+'s `MediaPlaybackService` (native) supersedes it. Audit: ZERO consumer files imported anything from `notificationService` — the file was 100% dead code. The `v13-trash-2026-09-04/` was the V13 migration's emergency backup of the deleted V11 audio/, native/, playback/ trees + tests/. Both are moved to `X:\Development\SIMBA\v17-backup-2026-09-04\` (outside the project root) so tsc doesn't pick them up. Module typecheck + 100/100 tests pass. Consumer typecheck + 19/19 + 1 todo.

### Sub-phase 67.1 — Delete V11-only methods in `notificationService.ts`
**Status:** [x] Complete (entire file deleted; no consumer ever used it)

### Sub-phase 67.2 — Delete trash directories
**Status:** [x] Complete (84 files moved to `X:\Development\SIMBA\v17-backup-2026-09-04\v13-trash-2026-09-04\`)

### Sub-phase 67.3 — Verify
**Status:** [x] Complete

---

## Phase 68 — Release v1.4.0

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module `package.json` bumped to `1.4.0`. CHANGELOG.md has a new V15.0.0 entry documenting all V15 hooks/types + the consumer migration. README.md updated: "Per-screen usage (V15+)" section + API reference table marks V15 hooks in __bold-italic__. `v1.4.0` annotated tag pushed to origin. V15 spec doc marked "Shipped in 1.4.0". V15 final QA report at `md/SIMBA_PLAYER_MODULE_V15_FINAL_QA_REPORT.md`. Module typecheck + 100/100 tests pass. Consumer typecheck + 19/19 + 1 todo.

### Sub-phase 68.1 — Bump version
**Status:** [x] Complete

### Sub-phase 68.2 — Tag + push
**Status:** [x] Complete

### Sub-phase 68.3 — Final QA
**Status:** [x] Complete

---

## Summary

| Phase | Description | Status | Effort | Deliverable |
|---|---|---|---|---|
| 64 | `useOpenPlaylist` hook | [x] | 0.5 day | 5 file "play all" screens collapse to one-line hook call |
| 65 | zustand queue + playbackHistory | [x] | 0.5 day | 11 queue reducers deleted from `playerSlice`; `useQueue()` hook |
| 66 | zustand sleep/equalizer/liked/shuffle/selection, delete `playerSlice` | [x] | 0.5 day | `playerSlice` deleted (16KB → 0KB); 5 module hooks for the rest |
| 67 | V11 cleanup (notificationService + trash dirs) | [x] | 0.1 day | ~24KB of V11 leftovers deleted |
| 68 | Release v1.4.0 | [x] | 0.25 day | Module published as v1.4.0 via CI/CD; final QA report |

**Total estimated V15 effort:** ~1.85 working days.

---

## Risks + open questions

| Risk | Mitigation |
|---|---|
| zustand + Redux coexistence in the same app is a smell | Document the split clearly: zustand for player-specific state, Redux for app-wide state. Future V16+ could migrate the consumer's Redux slices to zustand. |
| Persisting 5 zustand stores vs 1 redux-persist slice — different mental model | Use namespaced AsyncStorage keys (`@simba-dev/player/queue`, etc.) so they don't collide. Document the keys for advanced consumers. |
| The module adds a runtime dependency (zustand, ~1KB) | Zustand is tiny. The benefit (junior-dev surface) outweighs the cost. |
| The consumer's `QueueScreen` + sheets need to switch from Redux to zustand | Phase 65 explicitly migrates these 5 files. Manual smoke test required. |
| 20+ files import from `playerSlice` — many will be migrated in Phase 66 | The migration is mechanical (replace `dispatch` + action import with hook call). Mechanical but voluminous. |
| The `useQueue` and `useLiked` hooks need to compose with the rest of the app | Per-store API. Tests cover the API; the consumer integration is tested via smoke test. |

---

## Dependencies

- **V14 work** (Phases 59-63) must be released as v1.3.0 (✅ done 2026-09-04). The V15 work builds on top of the v1.3.0 surface.
- **Module repo:** `X:\Development\SIMBA\react-native-media-player\`
- **Consumer repo:** `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`
- **CI/CD pipeline:** GitHub Actions `release.yml` (OIDC publish) + `promote.yml` (NPM_TOKEN dist-tag)
- **Local release runbook:** `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

# End of V15 tracker doc.
