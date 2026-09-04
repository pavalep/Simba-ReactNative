# SIMBA Player Module — V15 Specification

**Document Version:** 1.1
**Date Created:** 2026-09-04
**Last Updated:** 2026-09-04
**Target Release:** V15.0.0 (shipped in 1.4.0)
**Package Name:** `@simba-dev/react-native-media-player`
**Folder Name:** `react-native-media-player/`
**NPM Org:** `@simba-dev`
**Status:** Wave 11 kickoff · **Phases 64-68 (5 phases, ~1.85 working days)**
**Owners:** Mobile team
**Replaces:** nothing — V15 is a forward-looking DX polish on top of the V14 extraction
**Linked spec:** [`SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md) (V14 = the public surface polish; V15 = complete the per-screen simplification)
**Linked tracker:** [`SIMBA_PLAYER_MODULE_V15_TRACKER.md`](./SIMBA_PLAYER_MODULE_V15_TRACKER.md)

---

## 0. Purpose

V14 (Phases 59-63) shipped the **junior-dev-level integration at the App.tsx level**: one wrapper component, two hooks, one function reference for the lookup. Any consumer's `App.tsx` now reads identically.

V14 left a residue of glue in the per-screen code paths:

- A 12-30 line `handlePlayAll` / `handleShuffleAll` / `handlePlayTrack` two-step pattern in 5 list-style screens (`useArtistScreen`, `useAlbumScreen`, `useLibraryScreen`, `PlaylistDetailScreen`, `useHomeScreen`).
- A 16KB `playerSlice` that owns `queue`, `playbackHistory`, `sleepTimer`, `equalizer`, `liked`, `shuffle`, `selectedQueueIndices` — none of which the module needs to know about, but the consumer had to write Redux reducers for.
- A `useAppDispatch` + `useAppSelector(state => state.player.X)` pattern in 20+ consumer files.
- The `<Provider store={store}>` requirement for the player integration (only because the consumer's playerSlice was on Redux).

V15's charter is: **move all player-specific consumer state into the module via zustand**, expose it via thin module hooks, and delete the consumer's `playerSlice` entirely. Every screen-level player call (`play one`, `play all`, `add to queue`, `set sleep timer`, `toggle like`, `toggle equalizer`) becomes a one-line module hook call.

### Why we changed scope from V15_PLANNING.md

V15_PLANNING.md originally scoped DRM + Casting + iOS + V11 cleanup. After V14 shipped, the post-V14 audit surfaced a higher-priority gap: **the per-screen integration is still complex for a junior dev**. The 5 "play all" screens have a two-step pattern that's a copy-paste footgun, and the 20+ files that read/write the consumer's `playerSlice` are noise the junior dev has to mentally filter out. V15 absorbs this.

DRM, Casting, iOS, and V11 cleanup defer to V16+.

---

## 1. Status Legend

- [ ] = Pending
- [~] = In Progress
- [x] = Complete
- [!] = Blocked
- [-] = Deferred (out of V15 scope)

Each phase has a **status** field. Each step is a checkbox.

---

## 2. Wave & Phase Index

| Wave | Phases | Theme | Status |
|---|---|---|---|
| **W11** | 64-68 | Per-screen simplification + state consolidation | [ ] Pending |

**Total: 1 wave, 5 phases, ~1.85 working days.**

V15 stays in one wave because the phases build on each other (Phase 64 establishes the pattern, Phase 65 widens it, Phase 66 deletes the slice, Phase 67 is independent cleanup, Phase 68 is the release cut).

---

### Phase 64 — `useOpenPlaylist` hook

**Status:** [ ] Pending
**Estimated effort:** 0.5 day
**Deliverable:** A single hook that absorbs the 12-30 line `handlePlayAll` / `handleShuffleAll` / `handlePlayTrack` two-step pattern in 5 list-style screens.

#### Sub-phase 64.1 — Define `useOpenPlaylist`

The hook returns a single function:

```ts
const {openPlaylist} = useOpenPlaylist();

openPlaylist(entries, {type: 'audio'});                    // play from start
openPlaylist(entries, {type: 'audio', startIndex: 3});      // play from index 3
openPlaylist(entries, {type: 'audio', shuffle: true});      // shuffled start
```

The hook internally:
- Early-returns if `entries.length === 0`
- If `shuffle: true`, Fisher-Yates shuffles a copy
- Resolves `startIndex` (default 0; if shuffle, a random non-zero index)
- Calls `openPlayer({uri: entries[startIndex].uri, title: entries[startIndex].title, type: opts.type ?? 'audio'})`

The hook does **not** dispatch `loadPlaylistToPlayer` — that remains a consumer-side concern in Phase 64. Phase 65 will absorb that step too.

#### Sub-phase 64.2 — Re-export from index

Add `useOpenPlaylist` + `useOpenPlaylistResult` to the module's `src/index.ts`.

#### Sub-phase 64.3 — Consumer migration

- 5 files collapse the two-step pattern:
  - `useArtistScreen.ts` (handlePlayAll, handleShuffleAll)
  - `useAlbumScreen.ts` (handlePlayTrack, handlePlayAll, handleShuffleAll)
  - `useLibraryScreen.ts` (playlist play + shuffle)
  - `PlaylistDetailScreen.tsx` (handlePlay)
  - `useHomeScreen.ts` (if it has a play-all handler)
- Net deletion: ~60 lines from screens.
- Verify typecheck + jest.

---

### Phase 65 — Module owns the consumer's queue + playbackHistory (zustand)

**Status:** [ ] Pending
**Estimated effort:** 0.5 day
**Deliverable:** The consumer's `queue` and `playbackHistory` move into a module-owned zustand store, exposed via `useQueue()`. The `loadPlaylistToPlayer` step in `useOpenPlaylist` is absorbed. The 11 queue-related reducers are deleted from `playerSlice`.

#### Sub-phase 65.1 — Add zustand to module dependencies

`npm install zustand` in the module repo. Pin to a recent 4.x release (small footprint, no breaking changes vs 3.x).

#### Sub-phase 65.2 — Define `playerQueueStore`

A new module file `src/stores/playerQueueStore.ts` exports a zustand store:

```ts
type PlayerQueueStore = {
  queue: QueueItem[];
  playbackHistory: QueueItem[];
  addToQueue: (item: QueueItem) => void;
  prependToQueue: (item: QueueItem) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  playFromQueue: (index: number) => void;  // promotes to module's playlist
  addToPlaybackHistory: (item: QueueItem) => void;
  clearPlaybackHistory: () => void;
};
```

The store is persisted via `zustand/middleware/persist` (AsyncStorage backend, key `@simba-dev/player/queue`).

#### Sub-phase 65.3 — Define `useQueue` hook

```ts
export function useQueue() {
  return useStore(playerQueueStore);
}
```

For atomic selectors, also export:
```ts
export function useQueueItem(index: number): QueueItem | undefined;
export function useQueueLength(): number;
```

#### Sub-phase 65.4 — Update `useOpenPlaylist` to use the store

`useOpenPlaylist` now does:
1. `loadPlaylist(entries)` to set up the module's playlist
2. `openPlayer({uri, title, type})` to launch the activity
3. (No more `dispatch(loadPlaylistToPlayer(entries))` needed in the consumer)

#### Sub-phase 65.5 — Consumer migration

- Migrate the Queue screen + sheets to read from `useQueue()`:
  - `useQueueScreen.ts` (the queue selectors)
  - `useQueueActions.ts` (the add/remove/reorder handlers)
  - `QueueSheet.tsx`
  - `QueueManagementSheet.tsx`
  - `QueueItem.tsx`
  - `PlaylistPreviewSheet.tsx` (if it reads queue)
- Drop the 11 queue-related reducers from `playerSlice`:
  - `addToQueue`, `prependToQueue`, `removeFromQueue`, `reorderQueue`, `clearQueue`, `shuffleQueue`, `playFromQueue`, `addToPlaybackHistory`, `clearPlaybackHistory`, `setQueueSelection`, `clearQueueSelection`, `removeSelectedFromQueue`, `moveSelectedToTop`
- Drop `queue`, `playbackHistory`, `selectedQueueIndices` from `playerSlice` state
- Verify typecheck + jest

---

### Phase 66 — Module owns the rest of player-specific state (zustand), delete `playerSlice`

**Status:** [ ] Pending
**Estimated effort:** 0.5 day
**Deliverable:** All remaining player-specific consumer state moves into module-owned zustand stores. The consumer's `playerSlice` is deleted entirely.

#### Sub-phase 66.1 — Define 5 more zustand stores

- `playerSleepTimerStore` — `{endTime, mode, setTimer, setMode, clear}`
- `playerEqualizerStore` — `{gains, enabled, setGains, toggle}`
- `playerLikedStore` — `{isLiked(uri), toggle(uri), allLiked}` (Record<uri, boolean> like today)
- `playerShuffleStore` — `{enabled, toggle}`
- `playerQueueSelectionStore` — `{selectedIndices, setSelection, clearSelection, removeSelected, moveSelectedToTop}`

All persisted via `zustand/middleware/persist` (namespaced keys).

#### Sub-phase 66.2 — Define 5 more hooks

```ts
export function useSleepTimer(): PlayerSleepTimerStore;
export function useEqualizer(): PlayerEqualizerStore;
export function useLiked(): PlayerLikedStore;
export function useShuffle(): PlayerShuffleStore;
export function useQueueSelection(): PlayerQueueSelectionStore;
```

#### Sub-phase 66.3 — Consumer migration

- Migrate every consumer file that reads/writes the migrated state:
  - Sleep timer: `usePlayer` (consumer-side hook? — verify), `PlayerScreen`, sleep timer UI
  - Equalizer: equalizer sheet, settings screen
  - Liked: `AudioPlayer` (or wherever the like state lives)
  - Shuffle: `usePlayer` (if it reads shuffle)
  - Queue selection: `QueueScreen` (the multi-select UI)
- Drop the remaining reducers from `playerSlice`:
  - `setSleepTimer`, `setSleepTimerMode`
  - `setEqualizerGains`, `toggleEqualizer`
  - `toggleLike`
  - `toggleShuffle`
  - `clearAll`
  - `clearPlayer`
- Drop `shuffle`, `sleepTimerEndTime`, `sleepTimerMode`, `equalizerGains`, `equalizerEnabled`, `liked` from `playerSlice` state

#### Sub-phase 66.4 — Delete `playerSlice.ts`

The slice is now empty (only consumer-specific actions remain, and there are none). Delete the file and remove from `rootReducer.ts`.

**`<Provider store={store}>` is no longer required for the player integration.** The module's zustand stores are self-contained.

#### Sub-phase 66.5 — Verify

- `tsc --noEmit` clean
- `npm test` 19/19 + 1 todo
- Manual smoke test: queue / sleep timer / equalizer / like / shuffle all still work

---

### Phase 67 — V11 cleanup

**Status:** [ ] Pending
**Estimated effort:** 0.1 day
**Deliverable:** The V11-only methods in `notificationService.ts` and the V13 trash directories are deleted.

#### Sub-phase 67.1 — Delete V11-only methods in `notificationService.ts`

5 methods that are kept for V11 rollback (per V13 Phase 57 note) are no longer needed:
- `notificationService.isNotificationActive` (V11 RPC)
- `notificationService.requestMediaNotificationPermission` (V11 RPC)
- `notificationService.updateMediaNotification` (V11 RPC)
- `notificationService.cancelMediaNotification` (V11 RPC)
- `notificationService.setupMediaSession` (V11 RPC)

These were never published in the V13 module's `MpvPlayerModuleBridge`. The V13 module's typed bridge has the equivalents (`requestNotificationPermission`, `setKeepScreenOn`, etc.) that the consumer now uses.

#### Sub-phase 67.2 — Delete trash directories

- `v13-trash-2026-09-04/` (2 files: `TransportContext.tsx` 19.6KB, `usePlayer.ts.2026-09-04` 1.2KB)
- `v13-orphan-2026-09-04/` (likely empty or contains the 18 V11 test files deleted in V13 Phase 57)

Move via `git rm` to commit history; the dirs are gitignored so this is safe.

#### Sub-phase 67.3 — Verify

- `tsc --noEmit` clean
- `npm test` 19/19 + 1 todo
- `git status` clean

---

### Phase 68 — Release v1.4.0

**Status:** [ ] Pending
**Estimated effort:** 0.25 day
**Deliverable:** Module published as `1.4.0` with the V15 public surface. Final QA report.

#### Sub-phase 68.1 — Bump version

- Bump `package.json` to `1.4.0`
- Update `CHANGELOG.md` with V15.0.0 entry
- Update `README.md` to document the new APIs (`useOpenPlaylist`, `useQueue`, `useSleepTimer`, `useEqualizer`, `useLiked`, `useShuffle`, `useQueueSelection`)
- Update V15 spec + tracker

#### Sub-phase 68.2 — Tag + push

- `git tag v1.4.0 && git push origin v1.4.0` — `release.yml` publishes to npm `staging`
- Run `promote.yml` workflow → flips `1.4.0` to `latest`

#### Sub-phase 68.3 — Final QA

- `npm test` + `npm run typecheck` from both repos
- `md/SIMBA_PLAYER_MODULE_V15_FINAL_QA_REPORT.md` (sign-off)
- Update `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

## 3. Public surface (V15 target)

After V15, the consumer's `App.tsx` is unchanged (already V14-junior-dev). The per-screen integration is now also junior-dev:

```tsx
// Single-track play (V14, unchanged)
const {openPlayer} = usePlayerActivity();
const handlePlay = (item) => openPlayer({uri: item.uri, title: item.title, type: 'audio'});

// Play all from a list (V15 new)
const {openPlaylist} = useOpenPlaylist();
const handlePlayAll = () => openPlaylist(sortedTracks, {type: 'audio'});

// Add to queue (V15 new)
const {addToQueue} = useQueue();
const handleAddToQueue = (item) => addToQueue({uri: item.uri, title: item.title, ...});

// Set sleep timer (V15 new)
const {endTime, setTimer, clear} = useSleepTimer();
const handleSet30Min = () => setTimer(30 * 60);  // seconds

// Toggle like (V15 new)
const {isLiked, toggle} = useLiked();
const handleLike = () => toggle(uri);

// Toggle equalizer (V15 new)
const {enabled, toggle, gains, setGains} = useEqualizer();
const handleToggleEQ = () => toggle();
```

Every player-related call is now a one-line module hook. No `useAppDispatch` in any player file. No `useAppSelector(state => state.player.X)`. The `<Provider store={store}>` is no longer required for the player integration (still required for bookmarks, settings, etc.).

**For consumers that don't need any player state management** (e.g., a one-off player in a different app):

```tsx
<SimbaPlayer>
  <App />
</SimbaPlayer>
```

That's the entire integration. No Redux, no Provider, no dispatch.

---

## 4. Out of scope (V16+)

- DRM (Widevine + ClearKey) — V16
- Casting (DLNA + Chromecast + AirPlay-equivalent) — V16
- iOS / Linux / tvOS support — V16
- Migrate the consumer's `bookmarks`, `settings`, `media`, `playlists`, `downloads` slices from Redux to zustand (would unify the state library, but is a consumer-wide refactor)
- De-duplicate the consumer's `PlaylistEntry` shape vs the module's `state.playlist` `PlaylistEntry` shape

---

## 5. Cross-references

- V15 spec: this document
- V15 tracker: [`SIMBA_PLAYER_MODULE_V15_TRACKER.md`](./SIMBA_PLAYER_MODULE_V15_TRACKER.md)
- V14 spec: [`SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md)
- V14 tracker: [`SIMBA_PLAYER_MODULE_V14_TRACKER.md`](./SIMBA_PLAYER_MODULE_V14_TRACKER.md)
- V14 final QA report: [`SIMBA_PLAYER_MODULE_V14_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V14_FINAL_QA_REPORT.md)
- Module repo: `X:\Development\SIMBA\react-native-media-player\`
- Consumer repo: `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`

---

# End of V15 specification doc.
