# SIMBA Player Module — V17 Tracker

**Document Version:** 1.0
**Date Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Linked spec:** [`SIMBA_PLAYER_MODULE_V17_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V17_SPECIFICATION.md)

> This tracker is the working companion to the V17 spec. Each phase has a status, an owner, a target date, and a one-paragraph narrative describing actual work vs planned.

---

## Phase 76 — V17 charter + audit

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. The V17 spec + tracker are the deliverable. The audit (the per-slice → per-store mapping in the spec's section 6) was done by reading the 8 slice files + the 3 feature reducer files + their consumer files. The on-device persistence is intentionally not preserved because the project is in beta and test devices will reinstall (per manager approval).

### Sub-phase 76.1 — Charter + tracker
**Status:** [x] Complete

---

## Phase 77 — `sessionStore` (no persist)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/sessionStore.ts` — transient state (auth-gate status, splash state).
- Migrate `useAppSelector(state => state.session.*)` consumers (App.tsx splash + deep-link gate).
- Delete `src/store/slices/sessionSlice.ts`.
- tsc + jest green.

### Sub-phase 77.1 — `sessionStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 77.2 — Consumer migration
**Status:** [ ] Pending

### Sub-phase 77.3 — Delete old slice + verification
**Status:** [ ] Pending

---

## Phase 78 — `authStore` (persisted)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/authStore.ts` — `auth` persist key, session restore.
- Migrate `useAppSelector(state => state.auth.*)` consumers (useAuth, App.tsx, splash, deep-link).
- Delete `src/store/slices/authSlice.ts`.
- tsc + jest green.

### Sub-phase 78.1 — `authStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 78.2 — Consumer migration
**Status:** [ ] Pending

### Sub-phase 78.3 — Delete old slice + verification
**Status:** [ ] Pending

---

## Phase 79 — `settingsStore` + `weatherStore` (persisted)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/settingsStore.ts` — `settings` persist key.
- `src/state/weatherStore.ts` — `weather` persist key. **Drops the 17+ `console.log` calls** in `weatherSlice.ts` (V16 out-of-scope item).
- Migrate consumers of both slices.
- Delete `src/store/slices/settingsSlice.ts` + `weatherSlice.ts`.
- tsc + jest green.

### Sub-phase 79.1 — `settingsStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 79.2 — `weatherStore.ts` creation (with console.log cleanup)
**Status:** [ ] Pending

### Sub-phase 79.3 — Consumer migration + delete + verification
**Status:** [ ] Pending

---

## Phase 80 — `mediaStore` (persisted, fixes the N+1)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/mediaStore.ts` — `media` persist key (search index partialized out).
- **Memoized `useMediaSearchIndex(query)` selector** — the runtime cost drops from O(tracks) per query to O(query_matches).
- Migrate consumers (useHomeScreen, useQueueScreen, 3 "play all" hooks, etc.).
- Delete `src/store/slices/mediaSlice.ts`.
- tsc + jest green.

### Sub-phase 80.1 — `mediaStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 80.2 — N+1 fix (memoized search index selector)
**Status:** [ ] Pending

### Sub-phase 80.3 — Consumer migration + delete + verification
**Status:** [ ] Pending

---

## Phase 81 — `bookmarksStore` (persisted, feeds `resumePolicy`)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/bookmarksStore.ts` — `bookmarks` persist key.
- Migrate consumers (useBookmarksScreen, useBookmarks, App.tsx resumePolicy, etc.).
- Delete `src/features/bookmarks/bookmarkReducer.ts`.
- tsc + jest green.

### Sub-phase 81.1 — `bookmarksStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 81.2 — Consumer migration + delete + verification
**Status:** [ ] Pending

---

## Phase 82 — `playlistsStore` + `recentHistoryStore` (persisted)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/playlistsStore.ts` — `playlists` persist key. (Migrated with `importPlaylistAction` semantics preserved — `useQueueScreen.handleSaveAsPlaylist` calls this.)
- `src/state/recentHistoryStore.ts` — `recentHistory` persist key.
- Migrate consumers of both.
- Delete `src/features/playlists/playlistReducer.ts` + `src/features/recentHistory/recentHistoryReducer.ts`.
- tsc + jest green.

### Sub-phase 82.1 — `playlistsStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 82.2 — `recentHistoryStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 82.3 — Consumer migration + delete + verification
**Status:** [ ] Pending

---

## Phase 83 — `playerStore` (persisted, the last & most-touched)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/state/playerStore.ts` — `player` persist key.
- State: `currentFile` / `playlist` / `currentIndex` + 5 actions (`loadPlaylistToPlayer`, `addToPlaylist`, `removeFromPlaylist`, `reorderPlaylist`, `playFromPlaylist`).
- Migrate consumers (useQueueScreen, 4 "play all" screens, MediaActionsSheet).
- Delete `src/store/slices/playerSlice.ts`.
- tsc + jest green.

### Sub-phase 83.1 — `playerStore.ts` creation
**Status:** [ ] Pending

### Sub-phase 83.2 — Consumer migration + delete + verification
**Status:** [ ] Pending

---

## Phase 84 — App.tsx strip

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `<Provider store={store}>` + `<PersistGate loading={null} persistor={persistor} onBeforeLift={onRehydrated}>` removed.
- `useAppSelector` / `useAppDispatch` imports removed (across the codebase by Phase 83).
- The `onRehydrated` callback (`mark('rehydrated')`) moves to per-store `onRehydrateStorage` callbacks.
- The `<SimbaPlayer resumePolicy={...}>` integration is unchanged.

### Sub-phase 84.1 — Strip Provider + PersistGate
**Status:** [ ] Pending

### Sub-phase 84.2 — Move cold-start mark to per-store rehydration
**Status:** [ ] Pending

### Sub-phase 84.3 — Verification
**Status:** [ ] Pending

---

## Phase 85 — `package.json` cleanup

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- Drop `@reduxjs/toolkit` + `react-redux` + `redux-persist`.
- Add `zustand` (consumer-side dep, separate from the module's bundled copy).
- `npm install` (with the project `.npmrc` `legacy-peer-deps=true`).
- tsc + jest green.

### Sub-phase 85.1 — package.json + install
**Status:** [ ] Pending

### Sub-phase 85.2 — Verification
**Status:** [ ] Pending

---

## Phase 86 — V17 release

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- **Consumer-only release.** The module is unchanged.
- Bump consumer's `package.json` to a new version (the consumer is `private: true` so it doesn't publish to npm; this is a git tag + changelog).
- The module gets a `1.5.0` → `1.5.1` no-op bump to mark "consumer V17 ready".

### Sub-phase 86.1 — Bump versions
**Status:** [ ] Pending

### Sub-phase 86.2 — Tags + (no npm publish)
**Status:** [ ] Pending

---

## Phase 87 — V17 final QA report + tracker closeout

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `md/SIMBA_PLAYER_MODULE_V17_FINAL_QA_REPORT.md`.
- Per-phase outcomes, public-surface delta, the file-by-file migration map, the V16 out-of-scope items that V17 picked up, the remaining V18+ candidates.

### Sub-phase 87.1 — Final QA report
**Status:** [ ] Pending

### Sub-phase 87.2 — Tracker closeout
**Status:** [ ] Pending

---

## Decisions log

- **2026-09-07**: V17 charter approved by manager. The on-device persistence is intentionally not preserved (test devices will reinstall).
- **2026-09-07**: V17 is consumer-only. The module's `1.5.0` is the latest. V17 only ships consumer code changes.
- **2026-09-07**: Phase order = easy/standalone first (sessionStore, weatherStore), then most-flowed (authStore, settingsStore, mediaStore), then features (bookmarksStore, playlistsStore, recentHistoryStore), then the last & most-touched (playerStore), then App.tsx strip + package cleanup. This ordering means the easy ones land first to build the pattern, and the App.tsx strip lands last when every consumer is already using the new hooks.
- **2026-09-07**: Persist keys match the existing `redux-persist` keys 1:1 (forward-compat niceness; not a data-preservation requirement). Each store's `version: 1` is set so a future shape change can ship a `migrate` callback.
- **2026-09-07**: Two V16 out-of-scope fixes land naturally in V17: `mediaSlice.buildSearchIndex` N+1 → memoized selector in `mediaStore` (Phase 80), and `weatherSlice`'s 17+ `console.log` calls → `logger.debug` in `weatherStore` (Phase 79).
