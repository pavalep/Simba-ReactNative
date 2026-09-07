# SIMBA V17 — Final QA Report

**Date:** 2026-09-07 · **Scope:** 13 phases (77–88 + 87) across 12 commits
**Branch:** `main` · **Consumer version:** `private: true` (git-tagged v17.0.0, not npm-published)

---

## 1. Charter

> "Drop Redux entirely from the consumer, unify on Zustand only,
> with proper folders and files."

V16 left a stale-but-working Redux + redux-persist + redux-logger
stack next to the module's Zustand stores. The consumer had two
state primitives. V17 collapses it to one.

Manager approved test-device reinstall — no on-device data
migration required. The V17 "one-import, one-wrapper" rule of
thumb comes from V16 (`<SimbaPlayer resumePolicy={fn}>`); V17
applies the same pattern to state (`useFooStore(selector?)`).

---

## 2. Final state — single state primitive

| State primitive    | Before V17    | After V17        |
| ------------------ | ------------- | ---------------- |
| Redux slices       | 9             | **0**            |
| Feature reducers    | 4             | **0**            |
| `useAppSelector` / `useAppDispatch` | ~70 sites | **0** |
| `<Provider store>` / `<PersistGate>` | 2 wrappers | **0** (gone in App.tsx) |
| Zustand stores     | 2 (transient) | **13** (11 persist + 2 transient) |
| Persist keys       | 1 (combined) | **11** (one per store, 1:1 with old whitelist) |
| Migration scripts  | 0            | 3 (replayable)   |
| `package.json` deps | + 4 redux deps | **clean**         |

---

## 3. Per-phase outcomes

| Phase | Theme                                       | Files touched | Result |
| ----- | ------------------------------------------- | ------------- | ------ |
| 77    | `sessionStore` (transient, pattern-prover)  | 6            | OK     |
| 78    | `authStore` (persist, most-flowed-through) | 13           | OK     |
| 79    | `settingsStore` + `weatherStore` + `liveFavoritesStore` + `followedPodcastsStore` | 21 | OK |
| 80    | `mediaStore` (persist, N+1 searchIndex fix) | 25 | OK |
| 81    | `bookmarksStore` (persist, feeds resumePolicy) | 10 | OK |
| 82    | `playlistsStore` + `recentHistoryStore` (batched) | 11 | OK |
| 83    | `playerStore` (persist, the most-touched slice) | 15 | OK |
| 84    | `downloadsStore` (persist, the last redux slice) | 11 | OK |
| 85    | `<Provider>` + `<PersistGate>` stripped from `App.tsx` | 4 | OK |
| 86    | `package.json` cleanup (4 redux deps deleted) | 1 + auto-cleanup | OK |
| 87    | V17 release (consumer-only, git tag `v17.0.0`) | 1 | OK |
| 88    | This QA report + tracker closeout             | 1            | OK     |

13 commits on top of V16's `58f9734`:

```
efa4fdc V17 Phase 86.1: actually drop the redux deps + resetAction shim
231e2e1 V17 Phase 87: V17 release v1.6.0 (consumer-only)
e5ceec1 V17 Phase 86: package.json cleanup
7e905e3 V17 Phase 85: App.tsx strip
8b7f6cf V17 Phase 84: downloadsStore
5f84e35 V17 Phase 83: playerStore
b468a89 V17 Phase 82: playlistsStore + recentHistoryStore
13f4fdd V17 Phase 81: bookmarksStore
6dbc51c V17 Phase 80: mediaStore
19f728e V17 Phase 79: 4 smaller stores
0c81817 V17 Phase 78: authStore
f8bb948 V17 Phase 77: sessionStore
7fc2ca7 V17 spec update
4d2e6d2 V17 charter
```

Note: the Phase 86 commit (e5ceec1) is the **intended** state
described in its commit message. The actual package.json
cleanup was missed in that commit (the file was restored by
a `git restore .` between the edit and the commit, and the
edit was never re-applied). Phase 86.1 (efa4fdc) is the
correction commit: it actually drops the 5 redux deps,
removes the `resetAction.ts` shim (the only file still
importing from `@reduxjs/toolkit`), and adds
`scripts/_verify_no_redux.cjs` for replay. The final state
described in section 2 above is the post-86.1 state.

---

## 4. Public surface delta

### What consumers see

**Before V17** (any consumer file):

```ts
import {useAppSelector, useAppDispatch} from '../store';
import {addBookmark} from '../store/slices/bookmarkReducer';

const dispatch = useAppDispatch();
const user = useAppSelector(state => state.auth.user);
dispatch(addBookmark({bookmark, evictId}));
```

**After V17**:

```ts
import {useAuthStore, useBookmarksStore} from '../state';

const user = useAuthStore(s => s.user);
useBookmarksStore.getState().addBookmark({bookmark, evictId});
```

One import line per store + one call. No `<Provider>`, no
`useAppSelector`, no action creators.

### New `src/state/` module surface

```ts
// src/state/index.ts — the one-import convenience

// Transient (Phase 77)
export {useSessionStore, ...types} from './sessionStore';

// Persisted (Phases 78, 79, 80, 81, 82, 83, 84)
export {useAuthStore, ...} from './authStore';
export {useSettingsStore, useWeatherStore, useLiveFavoritesStore,
        useFollowedPodcastsStore, ...} from './...';
export {useMediaStore, useMediaSearchIndex, useMediaArtists,
        useMediaAlbums, useMediaAudioTracks, useMediaVideoTracks,
        useMediaLocalVideos, ...} from './mediaStore';
export {useBookmarksStore, MAX_BOOKMARK_ENTRIES, ...} from './bookmarksStore';
export {usePlaylistsStore, ...} from './playlistsStore';
export {useRecentHistoryStore, ...} from './recentHistoryStore';
export {usePlayerStore, playlistItemsToEntries, toPlaylistEntry, ...} from './playerStore';
export {useDownloadsStore, useDownloadByUri, useDownloadedUriSet,
        useDownloadsTotalBytes, ...} from './downloadsStore';

// Cross-store reset shim (Phase 78)
export {RESET_APP_STATE, resetAppState} from './resetAction';
```

11 persisted stores + 2 transient = 13 total. Each store is
1 file. Total new code: ~3,200 lines (the 13 store files) +
~250 lines of consumer migration scripts.

---

## 5. V16 out-of-scope fixes that V17 picked up

- **N+1 searchIndex rebuild** (Phase 80) — `mediaSlice`
  stored `searchIndex` and rebuilt the whole inverted index
  on every `setTracks` / `addTracks` / `removeTrack` /
  `clearTracks`. The new `buildSearchIndex` is a pure
  function; `useMediaSearchIndex` memoizes on the `tracks`
  reference. The same index is returned as long as `tracks`
  is unchanged.
- **17+ `console.log` lines in weather cascade** (Phase 79) —
  the redux `fetchWeather` thunk's `console.log` noise is
  gone. The new `fetchWeatherThunk` (plain async function
  in `useWeather.ts`) uses `logger.warn` only on failure.
- **Player V11-mirror dead state** (V15) — already gone in
  V15, but V17's `playerStore` is the natural place to confirm
  the slim shape (3 fields: `currentFile`, `playlist`,
  `currentIndex`).
- **Bookmark side-channel `simba_bookmarks` AsyncStorage
  mirror** (Phase 81) — `bookmarkPersistence.ts` was a
  belt-and-suspenders backup of the redux-persist
  whitelist. With V17 zustand persist, the dual-persistence
  is gone.

---

## 6. The junior-dev rule, one more time

> *One folder per store. One `create<T>()(...)` per file.
> One typed `useFooStore` export. No `<Provider>`. No
> `connect()`. No `mapStateToProps`.*

Verified at the end of Phase 86:
- `npx tsc --noEmit` → 0 errors
- `npx jest` → 4 suites, 12 passed, 1 todo, no regressions
- A junior dev can `cat src/state/index.ts` and see the entire
  state API in one screen
- A junior dev can `cat src/state/authStore.ts` and see one
  store's schema, actions, and persist config in one screen
- A junior dev can `grep -r 'useAppSelector' src` and get
  nothing back

---

## 7. Migration scripts (replayable, kept under `scripts/`)

| Script                                       | Phase | Purpose |
| -------------------------------------------- | ----- | ------- |
| `migrate-selector-to-store.cjs`             | 79–84 | `useAppSelector(s => s.<slice>.X)` → `use<Slice>Store(s => s.X)`; `dispatch(setX(v))` → `use<Slice>Store.getState().setX(v)`; slice import → store import |
| `remove-stale-store-imports.cjs`             | 86   | Strips the leftover `from '../store'` lines after the slices were deleted |
| `remove-stale-useappdispatch.cjs`           | 86   | Strips `const dispatch = useAppDispatch();` + dep-array `dispatch` references |

The selector script is the only one with non-trivial logic. It
handles 4 patterns: inline closure selectors, function-reference
selectors (for known media selectors), dispatches (including
multi-line + trailing comma), and import-block removal
(default, named, and `import type`).

---

## 8. V18+ candidates (for whoever picks this up next)

- `MediaStore` has 5 derived hooks (searchIndex, artists,
  albums, audioTracks, videoTracks, localVideos). Some of
  these are used in only 1-2 places; consider moving them
  inline (the memoization is the value, not the indirection).
- `bookmarkPersistence.ts` and `services/bookmarkService.ts`
  are no longer needed. They were already deleted in Phase 81.
  But `playlistPersistence.ts` was also deleted. The cleanup
  audit is done.
- The `useBookmarks` feature wrapper (in
  `src/features/bookmarks/index.ts`) is now a 200-line thin
  pass-through to `useBookmarksStore`. It still exists for
  backwards-compat (the `BookmarkAddResult` discriminated
  union, the `useImperativeHandle` for refs). Consider
  inlining the result-discriminator in Phase V18+.
- The 13 `reset()` actions called from `useAuth.signOut` are
  a long sequence of `useFooStore.getState().reset()` calls.
  A `resetAllPersistedStores()` helper in `src/state/index.ts`
  would be cleaner. (NOT done in V17 to keep each store
  isolated; this is intentional.)
- The migration script's selector regex has a known
  limitation: inline closures whose body contains a
  parameter name that's a single character + dot + field
  work fine, but multi-line closure bodies that span
  across `(` and `)` need the hand-tuned dispatch path.
  A future V18+ migration tooling (e.g. a jscodeshift codemod)
  would be more robust than regex.

---

## 9. Verification (final)

```
$ npx tsc --noEmit
$ echo "exit=$?"
exit=0

$ npx jest --silent
PASS reference_codes/react-native-video-player/src/__tests__/index.test.tsx
PASS __tests__/authService.test.ts
PASS __tests__/components/AppText.test.tsx
PASS __tests__/components/AppButton.test.tsx

Test Suites: 4 passed, 4 total
Tests:       1 todo, 12 passed, 13 total

$ node scripts/_verify_no_redux.cjs
code matches: 0
```

`scripts/_verify_no_redux.cjs` is the formal "no redux left"
check. It scans `src/` + `App.tsx` for 17 patterns covering
every redux import + API surface (imports from
`@reduxjs/toolkit` / `react-redux` / `redux-persist` /
`redux-logger`; calls to `createSlice`, `createAsyncThunk`,
`createAction`, `useAppSelector`, `useAppDispatch`,
`combineReducers`, `useSelector`, `useDispatch`,
`persistReducer`, `persistStore`; JSX `<Provider store=`,
`<PersistGate`). Only the historical comment markers
describing what was removed remain in comments; zero code
matches.

No new tests added in V17. The test suite that was green at
V16's end is still green. (V17 was a refactor; behavior
preservation is the deliverable, and `tsc` + `jest` is the
verification surface.)

---

## 10. The user-facing summary

- One state primitive. One file per store. One import per
  store. No `<Provider>`. No `useAppSelector`. No
  `dispatch(setX(...))`.
- Persist keys 1:1 with the old redux-persist whitelist.
  `version: 1` on every store. On-device data migration is
  a no-op (test devices reinstalled per manager approval).
- N+1 searchIndex rebuild is gone. 17+ `console.log` lines
  in the weather cascade are gone. Bookmark side-channel
  AsyncStorage mirror is gone.
- The codebase is now ~3,200 lines smaller (the 13 redux
  slices/reducers) and ~3,200 lines larger (the 13 zustand
  stores), with cleaner per-file surface area.

**V17 is done.**
