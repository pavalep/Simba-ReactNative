# Simba Player Module - V17 Specification

**Document Version:** 1.0
**Date Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Target Release:** V17.0.0 (shipped in 1.6.0)
**Package Name:** `@simba-dev/react-native-media-player` (unchanged)
**Folder Name:** `react-native-media-player/` (unchanged)
**NPM Org:** `@simba-dev` (unchanged)
**Status:** Wave 13 kickoff — **Phases 76-87 (12 phases)**
**Owners:** Mobile team
**Replaces:** V16's hybrid Redux + Zustand consumer state — V17 unifies on Zustand only
**Linked spec:** [`SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md) (V16 = API hardening + type-safety)
**Linked tracker:** [`SIMBA_PLAYER_MODULE_V17_TRACKER.md`](./SIMBA_PLAYER_MODULE_V17_TRACKER.md)

> **Note:** V17 is a **consumer-only** release. The module (`react-native-media-player/`) is not touched in V17 — the V16 module API stays as-is. The 1.6.0 tag is a no-op for the module (the package version is bumped to keep the consumer in sync with the module's version line, but no module code changes ship in 1.6.0).

---

## 0. Purpose

The SIMBA app carries **two state-management paradigms** today:

- **Zustand** (5 stores) inside `@simba-dev/react-native-media-player` for everything player-pipeline.
- **Redux Toolkit** (8 slices, 1 persisted store, 1 Provider) at the app root for everything else: auth, media, settings, weather, bookmarks, playlists, recent history, session.

The module proved V14/V15/V16 that Zustand works for player state. Redux was kept for everything else because the migration scope was unclear. V17 closes that loop.

V17 unifies the consumer on **Zustand only**. The 8 Redux slices move to 8 zustand stores under `src/state/`. The `<Provider store={store}>` + `<PersistGate loading={null}>` in `App.tsx` go away. `useAppSelector` / `useAppDispatch` go away. `@reduxjs/toolkit` + `react-redux` + `redux-persist` come out of `package.json`.

The motivation is the same "no half-baked" charter that drove V16:
- **One paradigm, not two.** A junior dev reading the codebase today has to learn Redux patterns + Zustand patterns. V17 collapses to Zustand.
- **Less code.** Redux boilerplate (action types, action creators, reducer switch, Provider wiring, PersistGate) goes away. Each slice shrinks to a single zustand `create<T>()((set, get) => ({ ...state, ...actions }))` call.
- **Smaller dependency footprint.** Three packages removed: `@reduxjs/toolkit`, `react-redux`, `redux-persist`. ~150 KB uninstalled.
- **V16's junior-dev principle extends to state.** `<SimbaPlayer resumePolicy={fn}>` is one prop. The state is one `useFooStore(selector)` call. Same shape.

V17 also bundles two V16 out-of-scope fixes that fall out naturally:
- `mediaSlice.buildSearchIndex` N+1 → becomes a memoized selector in the new `mediaStore`.
- `weatherSlice`'s 17+ `console.log` calls → the new `weatherStore` gets a real `logger.debug(...)` surface.

---

## 1. Scope

### In scope (this V17)

- **8 zustand stores** under `src/state/`:
  - `authStore` (persisted) — replaces `authSlice`
  - `playerStore` (persisted) — replaces `playerSlice`
  - `mediaStore` (persisted) — replaces `mediaSlice` (with the N+1 fix)
  - `bookmarksStore` (persisted) — replaces `bookmarkReducer` (feeds the V16 `resumePolicy`)
  - `playlistsStore` (persisted) — replaces `playlistReducer`
  - `recentHistoryStore` (persisted) — replaces `recentHistoryReducer`
  - `settingsStore` (persisted) — replaces `settingsSlice`
  - `sessionStore` (NOT persisted, transient) — replaces `sessionSlice`
  - `weatherStore` (persisted) — replaces `weatherSlice` (with the console.log cleanup)
- **`src/state/persistence.ts`** — shared `createJSONStorage(() => AsyncStorage)` factory + rehydration helper. One place to configure persistence so each store's `name` / `partialize` / `version` are co-located.
- **`src/state/index.ts`** — re-exports for one-import convenience (mirrors the module's `src/index.ts`).
- **App.tsx strip** — `<Provider store={store}>` + `<PersistGate loading={null}>` removed. The `<SimbaPlayer>` integration is unchanged (it doesn't depend on Redux).
- **`package.json`** — drop `@reduxjs/toolkit`, `react-redux`, `redux-persist`. Add nothing (zustand is already in the module's deps; the consumer's own deps don't include it yet — see Phase 85).
- **V17 release** — bump consumer's `package.json` (no code dep changes for the module) and tag `1.6.0` for the consumer's sake. The module stays at `1.5.0` (no changes).

### Out of scope (deferred)

- The V16 out-of-scope list (non-player `as any`, non-player silent catches, non-player `console.log` outside `weatherSlice`, N+1 outside `mediaSlice`).
- New features. V17 is a refactor.
- On-device smoke test (V15 + V16 + V17 all bundled).
- V18 candidate: re-introduce the V16-dropped dead-feature stores (sleep/equalizer/liked/shuffle) WITH UI. The V17 work is unrelated.

---

## 2. Target folder structure

```
src/
  state/
    index.ts              # re-exports: useAuthStore, usePlayerStore, ...
    authStore.ts
    playerStore.ts
    mediaStore.ts
    bookmarksStore.ts
    playlistsStore.ts
    recentHistoryStore.ts
    settingsStore.ts
    sessionStore.ts        # no persist
    weatherStore.ts
    persistence.ts         # createJSONStorage(() => AsyncStorage) factory + helpers
```

Mirrors the module's `src/stores/` convention. One folder per store. Each file is self-contained: types + store creation + per-feature action hooks at the top, with the persisted state shape + the per-store `partialize` at the bottom.

Old structure (deleted at end of V17):
```
src/
  store/
    index.ts
    slices/
      playerSlice.ts
      mediaSlice.ts
      authSlice.ts
      settingsSlice.ts
      sessionSlice.ts
      weatherSlice.ts
  features/
    bookmarks/bookmarkReducer.ts
    playlists/playlistReducer.ts
    recentHistory/recentHistoryReducer.ts
  hooks/
    useAppSelector.ts
    useAppDispatch.ts
```

---

## 3. Phases

### Phase 76 — V17 charter + audit (already shipped with this doc)

This document + the tracker. The "audit" is a `grep` of every `useAppSelector` / `useAppDispatch` / `dispatch(...)` site to lock the per-slice migration mapping. (See section 6 for the count.)

### Phase 77 — `sessionStore` (no persist)

Smallest slice; no persistence; pattern-prover for the folder + naming + the typed-hook pattern that the rest of V17 will follow. Replaces `src/store/slices/sessionSlice.ts` and the `useAppSelector(state => state.session.*)` consumers (a small handful: App.tsx splash gate, deep-link auth gate).

### Phase 78 — `authStore` (persisted)

The most-flowed-through persisted slice. Splash gate, deep-link auth gate, login/logout flow. Replaces `authSlice`. The V16 on-device smoke test will exercise this store.

### Phase 79 — `settingsStore` + `weatherStore` (persisted)

Two smaller persisted stores. `settingsStore` is consumed by the audio service (the V16 logger.warn work in `audioSettingsService.ts` already reads from this state) and the home / equalizer screens. `weatherStore` drops the 17+ `console.log` calls and replaces them with `logger.debug(...)` — the first `weatherSlice` audit item from the V16 charter.

### Phase 80 — `mediaStore` (persisted, fixes the N+1)

`mediaSlice` has the `buildSearchIndex` N+1 — every `addTrack` rebuilds the entire inverted index. The new `mediaStore` makes the index a memoized zustand selector (`useMediaSearchIndex(query)` returns the same reference when the underlying `tracks` array hasn't changed). The state shape is preserved; the runtime cost is O(query_matches) per query instead of O(tracks).

### Phase 81 — `bookmarksStore` (persisted)

The bookmarks feed the V16 `resumePolicy` in App.tsx. The store is small (~5 actions, ~1 selector). Migration is straightforward; the only subtlety is the `bookmark.items` array shape.

### Phase 82 — `playlistsStore` + `recentHistoryStore` (persisted)

Two small stores. `playlistsStore` is consumed by `useQueueScreen.handleSaveAsPlaylist` (calls `importPlaylistAction`) and the playlist detail screen. `recentHistoryStore` is consumed by the home screen's recents rail.

### Phase 83 — `playerStore` (persisted, the last & most-touched)

The largest remaining slice. `currentFile` / `playlist` / `currentIndex` + 5 actions (`loadPlaylistToPlayer`, `addToPlaylist`, `removeFromPlaylist`, `reorderPlaylist`, `playFromPlaylist`). Consumers: `useQueueScreen` + 4 "play all" screens + `MediaActionsSheet`. The player pipeline (queue + history) already lives in the module's zustand, so this slice is just the consumer UI's mirror.

### Phase 84 — App.tsx strip

`<Provider store={store}>` + `<PersistGate loading={null} persistor={persistor} onBeforeLift={onRehydrated}>` + the `useAppSelector` / `useAppDispatch` imports removed. The `<SimbaPlayer resumePolicy={...}>` integration is unchanged. The `onRehydrated` callback (used to mark the cold-start `mark('rehydrated')` for perf) moves to a per-store rehydration `onRehydrateStorage` callback.

### Phase 85 — `package.json` cleanup

Remove `@reduxjs/toolkit`, `react-redux`, `redux-persist`. Add `zustand` (the consumer's own dep, separate from the module's bundled copy). `npm install` (with the project `.npmrc` `legacy-peer-deps=true`). tsc + jest green.

### Phase 86 — V17 release

This is a **consumer-only release**. The module is unchanged. But to keep the consumer's release number in sync with the module's:

- The module gets a `1.5.0` → `1.5.1` bump (no code change; just version-bump to mark "consumer V17 ready")
- The consumer gets a `0.0.1` → `0.1.0` bump (or whatever the project convention is; the consumer is `private: true` so it doesn't publish to npm)
- No npm publish; the consumer's release is a git tag + changelog

The V17 spec deliberately does NOT ship an npm publish for the module. V16's `1.5.0` is the latest module release; the module's V17-equivalent work is V16 itself (the type-bridge + SimbaPlayer v2 + the dead-feature drop already unblocked the player integration). Future module work (V17.1+) will resume normal module releases.

### Phase 87 — V17 final QA report + tracker closeout

The `md/SIMBA_PLAYER_MODULE_V17_FINAL_QA_REPORT.md` + tracker closeout. Records: per-phase outcomes, public-surface delta (consumer-side), the file-by-file migration map, the V16 out-of-scope items that V17 picked up, the remaining V18+ candidates.

---

## 4. Migration contract

### Per-slice migration order

Within a phase, the migration is:

1. Create the new zustand store in `src/state/<name>Store.ts` with the same state shape, same action semantics, same persistence key (where applicable).
2. Update the consumers in the same commit: replace `useAppSelector(state => state.foo.bar)` with `useFooStore(state => state.bar)`, replace `dispatch(fooAction(payload))` with `useFooStore.getState().fooAction(payload)` (or wrap the action in a thin hook for the React idiom).
3. Delete the old Redux slice + the old reducer file.
4. `tsc --noEmit` + `jest` green.

### Persistence contract

The 7 persisted stores each use a `persist` middleware with a `name` that matches the existing `redux-persist` key:

- `auth` → `authStore`
- `player` → `playerStore`
- `media` → `mediaStore` (with the search index in a `partialize` exclude)
- `bookmarks` → `bookmarksStore`
- `playlists` → `playlistsStore`
- `recentHistory` → `recentHistoryStore`
- `settings` → `settingsStore`
- `weather` → `weatherStore`
- (none) → `sessionStore` (transient)

Because the project is in **beta** and test devices will reinstall, the on-device persistence data is wiped at upgrade. The same-key naming is a forward-compat niceness, not a data-preservation requirement. Each store's persist config still has a `version: 1` so a future shape-change can ship a `migrate` callback without conflicting with an old install.

### Junior-dev rule of thumb

> One folder per store. One `create<T>()(...)` per file. One typed `useFooStore` export. No Provider. No `connect()`. No `mapStateToProps`.

---

## 5. Public-surface delta (consumer-side)

### Removed

- `src/store/index.ts` + `src/store/slices/*` (6 files) + `src/hooks/useAppSelector.ts` + `src/hooks/useAppDispatch.ts` + `src/store/slices/sessionSlice.ts` (folded into sessionStore).
- `src/features/bookmarks/bookmarkReducer.ts` + `src/features/playlists/playlistReducer.ts` + `src/features/recentHistory/recentHistoryReducer.ts` (each folded into its own store).
- The `<Provider store={store}>` + `<PersistGate>` in `App.tsx`.
- `package.json` deps: `@reduxjs/toolkit`, `react-redux`, `redux-persist`.

### Added

- `src/state/index.ts` (re-exports) + `src/state/<name>Store.ts` (8 files) + `src/state/persistence.ts`.
- `package.json` dep: `zustand` (consumer-side, separate from the module's bundled copy).

### Changed

- `App.tsx` — `<SimbaPlayer resumePolicy={...}>` stays; the `<Provider>` + `<PersistGate>` wrappers are removed.
- `weatherSlice`'s 17+ `console.log` calls → `logger.debug` / removed.
- `mediaSlice.buildSearchIndex` N+1 → memoized selector in `mediaStore`.

### Unchanged

- `@simba-dev/react-native-media-player` V16 (1.5.0). No module-side changes ship in V17.
- The 5 zustand stores inside the module (playerQueueStore, playerQueueSelectionStore, plus the 3 module-internal ones). V17 unifies the *consumer* on Zustand; the module was already there.

---

## 6. Migration map (the per-slice audit)

| Old (Redux) | New (Zustand) | Persist key | Consumers (~count) |
|---|---|---|---|
| `src/store/slices/sessionSlice.ts` | `src/state/sessionStore.ts` | — | 2 (App.tsx splash + deep-link gate) |
| `src/store/slices/authSlice.ts` | `src/state/authStore.ts` | `auth` | 5 (useAuth, App.tsx, splash, deep-link, etc.) |
| `src/store/slices/settingsSlice.ts` | `src/state/settingsStore.ts` | `settings` | 8 (audioSettingsService, useHomeScreen, equalizer, etc.) |
| `src/store/slices/weatherSlice.ts` | `src/state/weatherStore.ts` | `weather` | 4 (useHomeScreen greeting, weather widget) |
| `src/store/slices/mediaSlice.ts` | `src/state/mediaStore.ts` | `media` (search index partialized out) | 12 (useHomeScreen, useQueueScreen, 3 "play all" hooks, etc.) |
| `src/features/bookmarks/bookmarkReducer.ts` | `src/state/bookmarksStore.ts` | `bookmarks` | 4 (useBookmarksScreen, useBookmarks, App.tsx resumePolicy, etc.) |
| `src/features/playlists/playlistReducer.ts` | `src/state/playlistsStore.ts` | `playlists` | 6 (usePlaylists, useQueueScreen.handleSaveAsPlaylist, PlaylistDetailScreen, etc.) |
| `src/features/recentHistory/recentHistoryReducer.ts` | `src/state/recentHistoryStore.ts` | `recentHistory` | 2 (useHomeScreen, etc.) |
| `src/store/slices/playerSlice.ts` | `src/state/playerStore.ts` | `player` | 8 (useQueueScreen, 4 "play all" screens, MediaActionsSheet, etc.) |

**Total: 8 slices + 3 features + ~50 consumer files + 1 App.tsx strip + 3 package deps removed.**

---

## 7. Risks

1. **Persistence shape drift during the 11-phase migration** — each store's state shape can subtly change as consumers are migrated. Mitigation: each store ships with `version: 1` + a pass-through `migrate: (state) => state` callback so a future shape change can be opt-in. The on-device reinstall makes this a non-issue for the current cycle.
2. **Async thunks** — none of the 8 slices use `createAsyncThunk`. They're all sync reducers. The migration is a straight shape-for-shape port.
3. **Selector memoization** — the new zustand stores need per-store `useShallow` for object selectors to avoid re-render storms. Pattern: `useFooStore(useShallow(state => ({a: state.a, b: state.b})))`. Documented in `src/state/persistence.ts` (or a sibling `patterns.ts` if the file gets too long).
4. **The `onRehydrated` cold-start gate in App.tsx** — the current `mark('rehydrated')` callback is called by the `<PersistGate loading={null} persistor={persistor} onBeforeLift={onRehydrated}>` flow. In V17, each persisted store's `onRehydrateStorage` callback can call the same `mark('rehydrated')` after its own rehydration. The mark fires once per store, which is fine for the perf use case.
5. **Volume** — 12 phases. Realistically a multi-day effort. The charter phases are ordered so the easy ones (sessionStore, weatherStore) land first and the harder ones (playerStore, App.tsx strip) land last with the most context.

---

## 8. Out of scope (deferred to V18+)

- The V16 out-of-scope list (non-player `as any`, non-player silent catches in metadataService / downloadService, non-player `console.log` in useAuth / geolocation / weatherService / weatherSlice).
- V15 on-device smoke test (Phase 58.6) + V16 on-device smoke test (SimbaPlayer v2 + wrap-semantics change) + V17 on-device smoke test (the consumer's state-management swap).
- Re-introducing the V16-dropped dead-feature stores (sleep / equalizer / liked / shuffle) WITH UI.
- Splitting the consumer's `App.tsx` further (it's already small post-V16; not worth a phase).
- Migrating the consumer's TypeScript project to the new V16+ module API (the consumer is already on `^1.5.0`; the migration is complete).

---

## 9. Closing notes

V17 closes the "one state-management paradigm" arc that the V14/V15/V16 module-side work started. The consumer's state API will be:

- **8 zustand stores** under `src/state/` (7 persisted + 1 transient).
- **Zero Redux** in the codebase. No `<Provider>`. No `useAppSelector`. No `useAppDispatch`. No `redux-persist`.
- **One import per consumer file** for the state the file needs (e.g. `import {useBookmarksStore} from '../state/bookmarksStore'`).
- **Same `useShallow` pattern** across all 8 stores (the same pattern the module already uses).
- **The V16 module is unchanged** — V17 is consumer-only.

The next release (V18) is the wider type-safety + smoke-test sweep that's been deferred since V16. The V17 work is its own animal: the consolidation that makes the codebase a single paradigm.
