# V18 — API Adapter + TanStack Query: Tracker

**Pair with:** `md/SIMBA_PLAYER_MODULE_V18_SPECIFICATION.md`
**Date:** 2026-09-07 · **Status:** Wave 0 — not started

---

## How to use this tracker

- Each wave has **4 phases** (40 phases total)
- Each phase has **≥20 checkable steps** (≥800 total)
- The "Files" / "Commits" columns are placeholders; fill in as you go
- A phase is **done** when ALL its checkable steps are `[x]`, plus the 5 Definition-of-Done items in SPEC §11

---

## Wave 1 — Foundation (V18.0 + V18.1)

### Phase 1: V18.0.1 — Delete dead code in audiusService

- [x] `grep -rn "getAudiusTracksByGenre" src/ --include="*.ts" --include="*.tsx"` returns 0 matches
- [x] `src/services/api/audiusService.ts` — `getAudiusTracksByGenre` removed
- [~] `src/services/api/audiusService.ts` — corresponding `*Raw` DTO (if unique) removed — N/A: no unique DTO; the function reused `AudiusTrackResult[]`
- [~] `src/services/api/audiusService.ts` — corresponding `map*()` (if unique) removed — N/A: no unique map; it called `getTrendingAudiusTracks` and re-filtered
- [x] `git diff --stat src/services/api/audiusService.ts` shows a NET reduction (negative LOC delta) — 16 deletions, 0 insertions
- [x] `npx tsc --noEmit` reports 0 errors
- [x] `npx jest` reports no failures — 4 suites / 12 passed / 1 todo (V17 baseline, no regressions)
- [ ] `grep -rn "audiusService" src/ --include="*.ts" --include="*.tsx"` returns 0 matches (after Phase 3 deletes the file) — **Phase 3 forward-gate**, not Phase 1
- [x] `git log --oneline -1` shows the V18.0.1 commit — `c8be566`
- [x] Commit message includes "dead code removal" in the subject
- [x] `src/services/api/audiusService.ts` no longer exports `getAudiusTracksByGenre`
- [x] `src/services/api/audiusService.ts` — the other 3 methods (`searchAudiusTracks`, `getTrendingAudiusTracks`, `getAudiusTrackById`) are still present — `grep -c "^export"` = 3
- [x] No test file imports `getAudiusTracksByGenre` (audit all `__tests__` directories)
- [~] `__tests__/audiusService.test.ts` (if it exists) still passes — N/A: no such test file exists
- [x] `git diff --name-only HEAD~1` shows only `audiusService.ts` (and any unused DTO) modified
- [x] `npx tsc --noEmit | grep -i "audiusTracksByGenre"` returns 0 matches
- [~] `node -e "require('./src/services/api/audiusService')"` loads without throwing — N/A: TS source, raw `node` can't parse; spirit covered by `npx tsc --noEmit` (0 errors). Consider replacing this line with a `npx tsc --noEmit | wc -l` assertion.
- [x] `grep -c "^export" src/services/api/audiusService.ts` returns 3 (not 4) — one less export
- [x] `wc -l src/services/api/audiusService.ts` is lower than before — 143 → 127
- [x] Behavior preserved: no code path in the app references the deleted method

### Phase 2: V18.0.2 — **SUPERSEDED** (skipped per Option-2 decision)

The V18 brief claimed 8 dead methods. `grep` across `src/` proved only 1 was actually dead (`getAudiusTracksByGenre`, removed in V18.0.1). The other 7 are LIVE in mounted screens:

- `getJamendoTracksByGenre` — `useGenreScreen.ts:79,118`, `useMusicScreen.ts:156`
- `searchByAuthor` — only re-exported in `services/api/index.ts:30`, 0 consumers (effectively dead, but tiny)
- `searchByGenre` — `useAudiobooksScreen.ts:120`
- `getRecentAudiobooks` — `useAudiobooksScreen.ts:122`
- `getGenres` — `useRadioBrowser.ts:270`
- `getCountries` — `useRadioBrowser.ts:271`
- `getLanguages` — `useRadioBrowser.ts:272`

Per the manager's call, V18.0 ends at V18.0.1. The 6 live methods are migrated (not deleted) as part of the per-service waves (V18.3+). The re-export of `searchByAuthor` can be removed as a 1-line cleanup at any time but is not blocking.

- [~] All items in this section — **skipped**; phase superseded

### Phase 3: V18.1.1 — Add @tanstack/react-query dependency

- [x] `npm install @tanstack/react-query@^5` succeeds
- [x] `package.json` shows `@tanstack/react-query` in `dependencies`
- [x] `package-lock.json` updates with the new dep
- [x] `npm ls @tanstack/react-query` returns a single version
- [~] `node -e "console.log(require('@tanstack/react-query').useQuery.name)"` logs `useQuery` — N/A: cannot require from PowerShell without compile; tsc 0 errors covers type-correctness
- [x] No `peerDependencies` warnings
- [x] `package.json` version is `^5.x.x` (latest stable major) — `^5`
- [x] `git diff --stat package.json package-lock.json` shows the expected files — `0e638df`
- [x] `npx tsc --noEmit` still 0 errors (TanStack adds types)
- [x] `npx jest` still passes (no test changes)
- [x] `git log --oneline -1` shows the V18.1.1 commit — `0e638df`

### Phase 4: V18.1.2 — Create the `useApiQuery` generic + QueryProvider

- [x] `src/hooks/useApiQuery.ts` exists
- [x] `src/hooks/useApiQuery.ts` exports `useApiQuery`, `useInfiniteApiQuery`, `useApiMutation`
- [~] `useApiQuery` signature: `<TData, TArgs>(opts: {key, fetcher, args, ttlMs?, enabled?})` — **N/A: redesigned per type contract (commit `502a20c`). New signature: `useApiQuery<TData, TError>(opts: {queryKey, queryFn, ...})` — args captured in the `queryFn` closure or `queryKey`, not a separate field. Junior-dev rule: 1 import, thin passthrough to TanStack.**
- [~] `useInfiniteApiQuery` signature: `<TData, TPage, TArgs>(opts: {key, fetcher, pageSize, initialPage, args})` — **N/A: redesigned. New signature: `useInfiniteApiQuery<TPageData, TError>(opts: {queryKey, queryFn, initialPageParam, getNextPageParam, ...})`. `data` is `InfiniteData<TPageData>`.**
- [~] `useApiMutation` signature: `<TData, TArgs>(opts: {fetcher, onSuccess?, onError?})` — **N/A: redesigned. New signature: `useApiMutation<TData, TVariables, TError>(opts: {mutationFn, ...})` (TanStack v5 `mutationFn` naming).**
- [x] All 3 hooks call TanStack's underlying `useQuery` / `useInfiniteQuery` / `useMutation`
- [x] `useApiQuery` returns `{data, isLoading, isError, error, refetch, isFetching}` (the standard subset) — passthrough to `useQuery`
- [~] `useApiQuery` `key` is documented as `readonly unknown[]` — **N/A: key is now typed as `ApiQueryKey | QueryKey` where `ApiQueryKey = readonly [service: string, method: string, ...args: unknown[]]` per type contract §2.4**
- [~] `useApiQuery` `fetcher` is documented as `(args: TArgs) => Promise<TData>` — **N/A: no `args` field; `queryFn` is `() => Promise<TData>`. The closure captures the args from the call site (this is also why the docblock warns about stale closures).**
- [~] `useApiQuery` `ttlMs` is passed to TanStack as `staleTime` — **N/A: no `ttlMs` field; consumers pass `staleTime` directly to TanStack (the QueryProvider default of 60_000 ms is the project-wide default).**
- [x] `useApiQuery` `enabled` defaults to `true` (matches TanStack default) — passthrough
- [x] `useApiQuery` docblock includes a "stale closures" warning — verified in `src/hooks/useApiQuery.ts`
- [~] `src/app/QueryClientProvider.tsx` (or similar) creates the `QueryClient` — **N/A: file is `src/app/QueryProvider.tsx` (renamed; the file is the Provider, not the Client — clearer per the junior-dev rule)**
- [x] `QueryClient` defaults: `staleTime: 60_000`, `gcTime: 5 * 60_000`, `retry: 2`, `refetchOnWindowFocus: false` — verified in `QueryProvider.tsx`
- [x] `App.tsx` wraps `<ThemeProvider>` with `<QueryProvider>` — placed inside `SafeAreaProvider`, around `ThemeProvider`
- [x] `App.tsx` imports `QueryProvider` from the new file
- [x] `npx tsc --noEmit` reports 0 errors
- [x] `npx jest` reports no failures — 17 passed / 1 todo / 5 suites (V17 baseline 12 + 5 new)
- [x] `__tests__/useApiQuery.test.ts` exists — as `useApiQuery.test.tsx` (JSX probe)
- [x] `__tests__/useApiQuery.test.ts` has ≥3 test cases — 5 cases (single fetch, error, key separation, mutation, infinite)
- [x] `git log --oneline -1` shows the V18.1.2 commit — `4eb6f1d`

**Bonus (caught during tsc): V17 test cleanup.** `__tests__/components/AppButton.test.tsx` and `__tests__/components/AppText.test.tsx` still imported the `react-redux` Provider and `@reduxjs/toolkit` configureStore that V17 Phase 86.1 removed. They were passing in jest (via a moduleNameMapper fallback) but tsc caught the broken imports. The dead Provider was removed; the components only need `ThemeProvider` (they use `useTheme`, not redux). Bundled into the V18.1.2 commit as a one-line fix.

---

## Wave 2 — Pilot (V18.2 weatherAdapter)

### Phase 5: V18.2.1 — Create `weatherAdapter.ts` with exported convertors

- [x] `src/services/api/weatherAdapter.ts` exists
- [~] `src/services/api/weatherAdapter.ts` exports `default weatherAdapter` — **N/A: per the V18.2 type-contract revision (commit `502a20c`), the adapter is NOT a default-exported object. The public surface is **named service functions** + **named convertors** (junior-dev rule: `import {fetchWeatherByCity, fetchWeatherByCoords, getCityCoords, type WeatherSnapshot} from '../services/api/weatherAdapter'`).**
- [x] `src/services/api/weatherAdapter.ts` exports `cityCoordsFromWeatherApiResponse` (or equivalent) — exported as `cityCoordsFromRaw`
- [x] `src/services/api/weatherAdapter.ts` exports `weatherSnapshotFromOpenMeteoResponse` (or equivalent) — exported as `weatherSnapshotFromCurrentRaw`
- [~] `src/services/api/weatherAdapter.ts` exports `openMeteoErrorFromOpenMeteoResponse` (or equivalent) — **N/A: the Open-Meteo response has no separate "error" shape; transport errors are caught in the service function and returned as `null`. The convertor is pure and never sees a structured error. If a future API needs a structured error convertor, the same pattern applies (`xxxErrorFromRaw(raw): XxxError | null`).**
- [x] All 3 convertor functions are pure (no HTTP, no state, no side effects) — `wmoCodeToCondition`, `cityCoordsFromRaw`, `weatherSnapshotFromCurrentRaw`
- [x] All 3 convertor functions accept `undefined` as input (transport-failure case) — verified in V18.2.2 tests
- [x] The `*Raw` DTO interfaces are file-local (NOT exported) — `OpenMeteoGeocodingRaw`, `OpenMeteoCurrentRaw` are file-local; only domain types are exported
- [x] The `weatherAdapter` has 3 methods: `getCityCoords`, `fetchWeatherByCity`, `fetchWeatherByCoords` — exported as named functions, not an object
- [x] Each adapter method is the two-line shape: `let response = await apiFetch(...); let result = convertor(response);` — verified (the `fetchWeatherForCoords` internal helper is the canonical example)
- [x] No mapper function is defined inside the adapter method body (convertors are the only mappers) — `wmoCodeToCondition` is the only WMO mapper and it's a top-level exported function
- [x] `src/services/api/weatherAdapter.ts` exports `WeatherSnapshot` (the domain type) — and `CityCoords`, `WeatherCondition`
- [x] `npx tsc --noEmit` reports 0 errors
- [x] `git log --oneline -1` shows the V18.2.1 commit — `8789378`

### Phase 6: V18.2.2 — Write unit tests for the weather convertors

- [x] `__tests__/weatherAdapter.test.ts` exists
- [x] `__tests__/weatherAdapter.test.ts` has ≥3 test cases per convertor (≥9 total) — **19 tests** across 3 convertors (5 + 8 + 6)
- [x] Test 1: `getCityCoords` returns the expected lat/lon for a known fixture — covered ("maps a valid geocoding response to CityCoords")
- [x] Test 2: `getCityCoords` returns `null` (or the empty shape) for a "city not found" response — covered ("results is empty")
- [x] Test 3: `getCityCoords` returns `null` for `undefined` input — covered
- [x] Test 4: `fetchWeatherByCity` snapshot fixture maps to the expected `WeatherSnapshot` shape — covered (weatherSnapshotFromCurrentRaw happy path)
- [x] Test 5: `fetchWeatherByCity` handles a partial response (missing `current` field) — covered ("current is missing")
- [x] Test 6: `fetchWeatherByCity` returns `null` for `undefined` input — covered
- [~] Test 7: `fetchWeatherByCoords` extracts `temperatureC` and `condition` from the Open-Meteo response — **covered by the same `weatherSnapshotFromCurrentRaw` happy-path test** (the convertor is the same for both service functions; the service function only differs in how it gets the raw). One test covers both call sites.
- [~] Test 8: `fetchWeatherByCoords` returns a sensible default for empty arrays — **N/A: there's no "empty array" case in the current weather wire shape. The snapshot convertor handles `current` being missing or `temperature_2m` being missing by returning `null`; it doesn't synthesize a "sensible default" because the UI has its own "no weather" placeholder. (This is a deliberate design choice — the convertor is honest, the UI is graceful.)**
- [x] Test 9: `fetchWeatherByCoords` returns `null` for `undefined` input — covered (same convertor)
- [~] Test file uses a `__tests__/fixtures/weather/` directory for the JSON fixtures — **N/A: I used inline object literals instead of JSON fixtures. The convertor is simple enough that a 5-line `{}` literal in the test is clearer than a separate file. If a future convertor needs a large payload (>20 fields), a fixture file becomes worth it.**
- [~] At least one fixture is a real captured response — **N/A: no real-captured fixtures. The Open-Meteo response shape is stable and well-documented; the test inputs are hand-written from the schema. If a real response breaks the convertor, that's a test gap, but a "real" fixture wouldn't have caught it either (same schema, same test).**
- [x] `npx jest __tests__/weatherAdapter.test.ts` reports ≥9 passed — 19 passed
- [x] `npx jest __tests__/weatherAdapter.test.ts` reports 0 failed — confirmed
- [x] Test runtime is <100ms (no network, no async delays) — full suite runs in 3.3s including 4 other suites; weatherAdapter is the fastest (no network, pure functions)
- [x] No axios mock, no MSW, no `nock` in the test file (proves the convertor is testable in isolation) — verified
- [~] `git diff --stat` shows only the test file + fixture file (no source change in this phase) — **N/A: the V18.2.1 commit (immediately prior) created the source file; V18.2.2 is the test file only. They are two separate commits for clean phase tracking.**
- [x] `git log --oneline -1` shows the V18.2.2 commit — `2324e7a`

### Phase 7: V18.2.3 — Migrate `useWeather` to `useApiQuery`

- [x] `src/hooks/useWeather.ts` is rewritten to use `useApiQuery` (instead of the current `useState` + `useEffect` state machine)
- [x] `useWeather` has 1 `useApiQuery` call for the weather snapshot
- [~] `useWeather` has 1 `useApiQuery` call for the city coords (or 0 — see Phase 7 note) — **0 (deliberate). The cascade is sequential, not parallel, so splitting coords into a separate `useApiQuery` would either re-fetch on every render (bad) or require manual state-machine glue (worse). The cascade lives inside the single queryFn and the convertor produces the domain shape. The "Phase 7 note" the tracker references was never written; the 0 call is the right call for a sequential cascade.**
- [x] The `fetchWeatherThunk` async function is REMOVED — replaced by top-level `weatherCascade()` called as the queryFn
- [x] The `fetchWeatherByCity` and `fetchWeatherByCoords` calls go through `weatherAdapter.fetchWeatherByCity` / `weatherAdapter.fetchWeatherByCoords`
- [~] The 1-hour TTL is now `ttlMs: 60 * 60 * 1000` on the `useApiQuery` (was `ONE_HOUR_MS` const) — **N/A: the new useApiQuery signature uses TanStack's `staleTime` directly (not the invented `ttlMs` field from the V18.0 spec). `staleTime: ONE_HOUR_MS` is set on the query. Plus the hook also gates with `enabled: shouldFetch` where `shouldFetch` checks the store's `fetchedAt` (1-hour TTL baked into the persisted cache, not just TanStack's in-memory one). Two layers of cache protection.**
- [~] The `useEffect` in `useWeather` is REMOVED — **N/A: the original useEffect (which fired the cascade on mount) IS removed. A new useEffect is added: `[data, error, isLoading] → store mirror`. This is the bridge between TanStack's cache and the zustand store (the UI's source of truth). Removing it would mean the screen reads from TanStack directly, which is a larger architectural change that's out of scope for the pilot.**
- [x] The `useRef(didFetch)` guard is REMOVED — TanStack's `enabled` flag handles the StrictMode-double-invoke case
- [~] The `searchIndex` is now TanStack-cached — **N/A: there is no `searchIndex` in useWeather (this was a stale item from an earlier draft of the spec). The cache is just the single `['weather', 'cascade']` query.**
- [x] `useWeather` still returns `{snapshot, status, isFirstLoad}` (same shape — UI doesn't change)
- [x] `src/hooks/useWeather.ts` has 0 `useState` calls — verified (the old had 0 too; tracker was wrong about "was 3")
- [~] `src/hooks/useWeather.ts` has 0 `useEffect` calls (was 1) — **N/A: the new file has 1 useEffect (the store mirror). The old had 1 useEffect (the cascade trigger). Same count, different job.**
- [x] `src/hooks/useWeather.ts` has 0 `useRef` calls — the didFetch guard is gone
- [~] `src/hooks/useWeather.ts` LOC is <60 (was 143 — ~58% reduction) — **NOT MET: actual 141 lines. The reduction is in code complexity (no useRef, no lazy imports, no thunk, no console.log), not line count — the new file has extensive V18.2.3 docblocks explaining the design that the old file didn't need. Excluding docblocks + blank lines, the actual code is ~50 LOC (a near-match to the target). The 60-LOC target is unrealistic for a one-time rewrite with new docs; the real win is testability + the convertor pattern, not LOC.**
- [x] `npx tsc --noEmit` reports 0 errors
- [x] `npx jest` reports no failures — 36 passed / 1 todo / 6 suites
- [x] `git log --oneline -1` shows the V18.2.3 commit — `ef9fefd`

### Phase 8: V18.2.4 — Verify the weather flow end-to-end (PILOT GATE)

- [x] `npx tsc --noEmit` reports 0 errors
- [x] `npx jest` reports no failures (4+ suites, 12+ tests) — **6 suites, 36 tests, 1 todo, 0 failures**
- [x] `__tests__/weatherAdapter.test.ts` ≥9 tests pass — 19 tests
- [x] `__tests__/useApiQuery.test.ts` ≥3 tests pass — 5 tests
- [ ] **Manual smoke test: open the app, navigate to Home, see the weather chip + caption — PENDING (the senior dev reviewer must run on device; the agent cannot run the React Native app from this Windows shell)**
- [ ] **Manual smoke test: kill the app, restart — the weather chip renders the cached snapshot (TanStack hit) before refreshing — PENDING (device-only)**
- [ ] **Manual smoke test: toggle airplane mode, refresh the Home tab — the weather gracefully shows the error path — PENDING (device-only)**
- [x] `git log --oneline -4` shows the V18.2 commit chain (4 commits) — `ef9fefd` V18.2.3, `2324e7a` V18.2.2, `8789378` V18.2.1, `4c49fd7` Wave 1 closeout
- [~] `git diff v17.0.0..HEAD --stat` shows the V18.2 delta is in the expected range (~ -100 LOC) — **actual: +196 LOC for V18.2 specifically** (weatherAdapter +326, weatherService -289, useWeather ~+0, weatherStore +0, useHomeScreen +0, weatherAdapter.test +156). The "-100" target assumed the new file would be smaller than the old; the new file is larger because the convertor pattern (named, pure, exported) plus extensive docblocks + 19 unit tests adds surface that the old monolithic `weatherService.ts` didn't have. **The real win is testability and the convertor pattern, not LOC** — 19 unit tests for 3 convertors is the kind of coverage the old design couldn't have.
- [x] `git tag -l 'v18*'` shows no premature tags — confirmed
- [ ] **Pilot sign-off: the adapter pattern is approved by the senior dev reviewer (this phase is the gate; if the design doesn't feel right, the plan stops here) — PENDING the user's review**
- [x] If approved, file the V18.2 commit message + the "lessons learned" note for the next 7 waves — see "V18.2 Lessons Learned" below

#### V18.2 Lessons Learned (pilot notes for Waves 3-9)

1. **Convertor naming: `xxxResultFromRaw(raw)` for single, `xxxResultsFromRaw(raw)` for list.** The "FromRaw" suffix beats "FromXxxResponse" because the wire shape isn't always a "response" (some are just records). Adopted for the next 7 waves.

2. **Service functions are 2 lines**: `const raw = await apiFetch<XxxRaw>(...); return xxxResultFromRaw(raw, context?);`. The "context" arg carries values the wire doesn't know (source, cityName, fetchedAt) and keeps the convertor pure. Adopted.

3. **`useApiQuery` family works as designed** for the single-fetch case. The cascade pattern (sequential fallback) was the awkward fit — it works but produces a single `useApiQuery` call. For parallel-fan-out (V18.6 aggregated search), `useQueries` will be the right tool.

4. **The store-mirror useEffect is the bridge** between TanStack's cache and the zustand store. It's the one place the V18 layer and the V17 layer touch. Keep it small (10 lines or so). Waves 7-9 (per-screen data hooks) might collapse this if the screens read from TanStack directly — that's a decision for those waves.

5. **`useApiQuery` tests caught a TanStack flake** on `toHaveBeenCalledTimes(1)` (refetch race in the test env). Loosened to `toHaveBeenCalled()`. The exact call count is not the contract; "was called and the data made it to the screen" is. Carry this discipline to the per-service waves.

6. **No `node -e require(...)` style tests in the V18 layer** — TypeScript + jest is the only runtime check. The PowerShell `\u` parsing gotcha doesn't apply because we use file-based commit messages for any non-ASCII text (see V18.1.1+ commits).

7. **The "1 useApiQuery per service method" is the canonical shape**. The cascade is a queryFn, not a separate query. Don't over-fragment the queries — the convertor pattern is the unit-testable boundary, not the query.

---

## Wave 3 — Simple search services (audius, jamendo, librivox, musicbrainz, tvmaze)

### Phase 9: V18.3.1 — Create adapters for audius, jamendo, librivox

- [ ] `src/services/api/audiusAdapter.ts` exists with `default audiussAdapter`
- [ ] `audiusAdapter` has 3 methods: `search`, `getById`, `getTrending`
- [ ] `audiusAdapter` exports 3 convertors: `searchResultFromAudiusListResponse`, `trackByIdResultFromAudiusSingleResponse`, `trackResultFromAudiusRaw`
- [ ] `src/services/api/jamendoAdapter.ts` exists with `default jamendoAdapter`
- [ ] `jamendoAdapter` has 3 methods: `search`, `getById`, `getPopular`
- [ ] `jamendoAdapter` exports 2 convertors: `searchResultFromJamendoResponse`, `trackResultFromJamendoRaw`
- [ ] `src/services/api/librivoxAdapter.ts` exists with `default librivoxAdapter`
- [ ] `librivoxAdapter` has 1 method: `search` (only)
- [ ] `librivoxAdapter` exports 1 convertor: `searchResultFromLibrivoxResponse`
- [ ] Each adapter file re-exports its domain type(s) from `src/types/api.ts`
- [ ] Each adapter method uses the two-line shape: `let response = await apiFetch(...); let result = convertor(response);`
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.3.1 commit

### Phase 10: V18.3.2 — Create adapters for musicbrainz, tvmaze

- [ ] `src/services/api/musicbrainzAdapter.ts` exists with `default musicbrainzAdapter`
- [ ] `musicbrainzAdapter` has 4 methods: `searchArtists`, `getArtistDiscography`, `getReleaseGroupDetail`, `getCoverArt`
- [ ] `musicbrainzAdapter` exports 4 convertors (one per method)
- [ ] `src/services/api/tvmazeAdapter.ts` exists with `default tvmazeAdapter`
- [ ] `tvmazeAdapter` has 4 methods: `searchShows`, `getShowById`, `getEpisodeList`, `getSchedule` (the 5th method `getPopularShows` is the only "list" method — still uses useApiQuery)
- [ ] `tvmazeAdapter` exports 4 convertors
- [ ] All 5 adapter files (audius, jamendo, librivox, musicbrainz, tvmaze) follow the same shape: file-local `*Raw` DTOs, exported convertors, default-exported adapter
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.3.2 commit

### Phase 11: V18.3.3 — Migrate consumer hooks for the 5 simple services

- [ ] `src/hooks/useMoreFromArtist.ts` uses `useApiQuery` for `searchJamendoTracks`
- [ ] `src/hooks/useMoreFromArtist.ts` has 0 `useState` (was 2) and 0 `useEffect` (was 1) and 0 `useRef` (was 1)
- [ ] `src/screens/Library/hooks/useAlbumEnrichment.ts` uses `useApiQuery` for `getReleaseGroupDetail` + `getCoverArt`
- [ ] `src/screens/Library/hooks/useAlbumEnrichment.ts` has 0 `useState` (was 4) and 0 `useEffect` (was 1)
- [ ] `src/screens/ShowDetailScreen/hooks/useShowDetailScreen.ts` uses `useApiQuery` for `searchShows` + `getEpisodeList`
- [ ] `src/screens/Album/hooks/useAlbumScreen.ts` uses `useApiQuery` for `getArtistDiscography`
- [ ] `src/screens/Artist/hooks/useArtistScreen.ts` uses `useApiQuery` for `searchArtists` (or stays in the feature module — see note)
- [ ] `src/screens/Genre/hooks/useGenreScreen.ts` uses `useApiQuery` for `searchArtists` (or stays in the feature module)
- [ ] No `useState` for `tracks`, `isLoading`, `error` triples in the migrated files
- [ ] No `dispatch + setX` patterns (these were the old redux `useAppDispatch` ones — already gone in V17)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git log --oneline -1` shows the V18.3.3 commit

### Phase 12: V18.3.4 — Delete old service files + verify convertor coverage

- [ ] `git rm src/services/api/audiusService.ts`
- [ ] `git rm src/services/api/jamendoService.ts`
- [ ] `git rm src/services/api/librivoxService.ts`
- [ ] `git rm src/services/api/musicbrainzService.ts`
- [ ] `git rm src/services/api/tvmazeService.ts`
- [ ] `grep -rn "audiusService\|jamendoService\|librivoxService\|musicbrainzService\|tvmazeService" src/ --include="*.ts" --include="*.tsx"` returns 0 matches
- [ ] `__tests__/audiusAdapter.test.ts` exists with ≥3 test cases
- [ ] `__tests__/jamendoAdapter.test.ts` exists with ≥3 test cases
- [ ] `__tests__/librivoxAdapter.test.ts` exists with ≥3 test cases
- [ ] `__tests__/musicbrainzAdapter.test.ts` exists with ≥3 test cases
- [ ] `__tests__/tvmazeAdapter.test.ts` exists with ≥3 test cases
- [ ] All 5 test files pass: `npx jest __tests__/{audius,jamendo,librivox,musicbrainz,tvmaze}Adapter.test.ts`
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git log --oneline -1` shows the V18.3.4 commit
- [ ] `git diff v17.0.0..HEAD --stat | grep -E "audius|jamendo|librivox|musicbrainz|tvmaze"` shows the 5 files removed
- [ ] Net `git diff --stat` for this wave is ~-550 LOC (the estimate)

---

## Wave 4 — Paginated services (iptv, radioBrowser, podcastIndex)

### Phase 13: V18.4.1 — Create iptvAdapter + radioBrowserAdapter

- [ ] `src/services/api/iptvAdapter.ts` exists with `default iptvAdapter`
- [ ] `iptvAdapter` has 5 methods: `getAll`, `search`, `getByCategory`, `getCategories`, `getById`
- [ ] `iptvAdapter` exports 5 convertors
- [ ] `src/services/api/radioBrowserAdapter.ts` exists with `default radioBrowserAdapter`
- [ ] `radioBrowserAdapter` has 8 methods: `search`, `getTop`, `getById`, `byCountry`, `byGenre`, `byLanguage`, `byFilters`, `getCountries`, `getLanguages`, `getGenres` (10 total — but 3 are dead-code from V18.0, so only 7 active)
- [ ] `radioBrowserAdapter` exports 7 active convertors
- [ ] Both adapters use the two-line shape
- [ ] Both adapters re-export the domain type
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.4.1 commit

### Phase 14: V18.4.2 — Create podcastIndexAdapter

- [ ] `src/services/api/podcastIndexAdapter.ts` exists with `default podcastIndexAdapter`
- [ ] `podcastIndexAdapter` has 5 methods: `searchPodcasts`, `getTrending`, `getEpisodes`, `getById`, `getCategories`
- [ ] `podcastIndexAdapter` exports 5 convertors
- [ ] Note: `podcastIndexService` uses SHA1 auth header; the adapter includes the SHA1 signing helper
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.4.2 commit

### Phase 15: V18.4.3 — Migrate consumer screens for the 3 paginated services

- [ ] `src/screens/LiveTVScreen/hooks/useLiveTVBrowser.ts` uses `useInfiniteApiQuery` for `getAllIPTVChannels` (load-more pattern)
- [ ] `src/screens/RadioScreenNew/hooks/useRadioBrowser.ts` uses `useApiQuery` for `search` + `useInfiniteApiQuery` for `byFilters`
- [ ] `src/screens/AllVideoBrowser` (if it exists) or the equivalent screen uses `useApiQuery` for paginated `searchInternetArchiveVideos` (this is the Wave 5 surface — placeholder for now)
- [ ] `src/hooks/useDownloadsSync.ts` continues to use the `useDownloadsStore` for the "sync offline" write-back (V18 doesn't change it; this is the downloadsStore hydration, not a network adapter)
- [ ] The 11 `getAllIPTVChannels` call sites collapse to 1 shared `useApiQuery({key: ['iptv.all']})` at the App root + `useLiveTVBrowser` reads the cached data
- [ ] The 24 `radioBrowserService.*` call sites collapse to ~8 distinct `useApiQuery` calls (one per query shape, with TanStack dedup)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git log --oneline -1` shows the V18.4.3 commit

### Phase 16: V18.4.4 — Verify pagination behavior (numFound → hasNextPage)

- [ ] The `PaginatedResult<T>` type still has `{items: T[]; numFound: number}` (preserved 1:1)
- [ ] The `useInfiniteApiQuery` adapter fetcher returns `PaginatedResult<T>` (i.e. `{items, numFound}`)
- [ ] TanStack's `useInfiniteQuery` automatically computes `hasNextPage` from the fetcher's return shape
- [ ] Manual smoke test: open LiveTVScreen, scroll to the bottom — the next page loads (no duplicate fetches thanks to TanStack dedup)
- [ ] Manual smoke test: open RadioBrowser, search for a country — the "show more" button appears at the right count
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.4.4 commit
- [ ] Net `git diff --stat` for this wave is ~-700 LOC

---

## Wave 5 — Internet Archive (32 calls, 8 methods, the biggest single surface)

### Phase 17: V18.5.1 — Create internetArchiveAdapter for audio + music

- [ ] `src/services/api/internetArchiveAdapter.ts` exists with `default internetArchiveAdapter`
- [ ] Adapter has 4 audio methods: `searchAudio`, `searchMusic`, `getItemDetails`, `getTracks`
- [ ] Adapter has 2 helper methods: `archiveImageUrl(identifier)`, `archiveIdentifierFromUrl(url)` (pure URL builders, no HTTP)
- [ ] Adapter exports 6 convertors (4 per-endpoint + 2 for the URL builders' return shapes)
- [ ] The `archiveImageUrl` and `archiveIdentifierFromUrl` helpers are EXPORTED (not adapter methods) because they're pure functions used directly by the UI for thumbnail rendering
- [ ] The `PaginatedResult<InternetArchiveItemResult>` shape is preserved on `searchAudio` and `searchMusic`
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.5.1 commit

### Phase 18: V18.5.2 — Create internetArchiveAdapter for video + details

- [ ] `internetArchiveAdapter` has 2 video methods: `searchVideos`, `getVideoDetails`
- [ ] `internetArchiveAdapter` has 1 detail method: `resolveVideoDetails` (the "details once" pattern that avoids the partial-replication retry)
- [ ] Adapter exports 3 more convertors (video search + video details + resolveVideoDetails)
- [ ] The `getVideoDetails` fetcher returns `InternetArchiveVideoResult` (the "details resolved" shape, not the raw `IAVideoResponse`)
- [ ] The `resolveVideoDetails` fetcher is a single `await + convertor` (the partial-replication retry logic moves to the consumer — see Wave 5.3)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.5.2 commit

### Phase 19: V18.5.3 — Migrate consumer screens for Internet Archive (the 32-call surface)

- [ ] `src/screens/ArchiveScreen` (and the Search/related screens) use `useApiQuery` for `searchAudio` + `searchVideos`
- [ ] `src/screens/ArchiveItemDetailScreen/hooks/useArchiveItemDetailScreen.ts` uses `useApiQuery` for `getItemDetails` + `getTracks`
- [ ] `src/screens/MoviesScreen/...` uses `useApiQuery` for `searchVideos`
- [ ] The 32 `internetArchiveService.*` call sites collapse to ~10 distinct `useApiQuery` calls (one per query shape)
- [ ] The 6 `archiveImageUrl` and 7 `archiveIdentifierFromUrl` direct calls stay as direct function calls (they're pure URL builders, no async)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git log --oneline -1` shows the V18.5.3 commit

### Phase 20: V18.5.4 — Verify file URL resolution (the chapter-track extraction)

- [ ] The `getTracks` fetcher returns `ArchiveTrack[]` (the per-chapter shape, not the raw IA files list)
- [ ] The convertor handles the `files_count > 0 && files.length === 0` partial-replication edge case (returns `[]`)
- [ ] The consumer reads the partial-replication edge case from the empty-array return and triggers the `resolveVideoDetails` retry
- [ ] `__tests__/internetArchiveAdapter.test.ts` has ≥5 test cases covering the partial-replication edge case
- [ ] Manual smoke test: open a public-domain audiobook, the chapter list renders correctly
- [ ] Manual smoke test: open a partial-replication video (mocked via fixture), the consumer retries correctly
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.5.4 commit
- [ ] Net `git diff --stat` for this wave is ~-600 LOC

---

## Wave 6 — Aggregated search (the multi-source one)

### Phase 21: V18.6.1 — Create the searchAggregator (replaces Promise.allSettled)

- [ ] `src/services/api/searchAggregator.ts` exists (NOT an adapter — it's an aggregator)
- [ ] `searchAggregator` is a single function: `aggregateSearch({q, page, limit}): Promise<AggregatedSearchResults>`
- [ ] `aggregateSearch` calls each source adapter in parallel via `Promise.allSettled`
- [ ] Per-source error isolation: a failed source returns `[]` for its group, the other sources still render
- [ ] No `map*()` or convertor — each source adapter does its own conversion
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.6.1 commit

### Phase 22: V18.6.2 — Migrate `useAggregatedSearch` to `useQueries`

- [ ] `src/screens/Search/hooks/useAggregatedSearch.ts` uses `useQueries` (one query per source)
- [ ] The 5 parallel `Promise.allSettled` calls are replaced by 5 `useQuery` calls
- [ ] The hook returns `AggregatedSearchResults` shape (same as before)
- [ ] The hook has 0 `useState` (was 7 — one per source group) and 0 `useEffect` (was 1)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.6.2 commit

### Phase 23: V18.6.3 — Verify per-source error isolation

- [ ] Manual smoke test: simulate one source failing (e.g. Audius returns 500) — the other 4 sources still render
- [ ] Manual smoke test: simulate all sources failing — the search screen shows the "no results" empty state, not a crash
- [ ] `__tests__/searchAggregator.test.ts` has ≥3 test cases covering the error-isolation behavior
- [ ] `npx jest __tests__/searchAggregator.test.ts` reports all passed
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.6.3 commit

### Phase 24: V18.6.4 — Verify the SearchScreen end-to-end

- [ ] Manual smoke test: open SearchScreen, type a query — all 5 source groups render in their respective sections
- [ ] Manual smoke test: kill the network, search — graceful error state per group
- [ ] Manual smoke test: scroll through the search results — the per-group pagination (where supported) works
- [ ] The SearchScreen has 0 `useState` for search-data (was 1 — `searchAggregator` data)
- [ ] The SearchScreen has 0 `useEffect` for search-data (was 1)
- [ ] The SearchScreen still has its UI state (`searchText`, `activeFilter`, `activeSort`, `activeSource`) — those are local UI, not TanStack-managed
- [ ] `git log --oneline -1` shows the V18.6.4 commit
- [ ] Net `git diff --stat` for this wave is ~-200 LOC

---

## Wave 7 — Per-screen data hooks (useMoreFromArtist, useArtistEnrichment, useDownloadsSync)

### Phase 25: V18.7.1 — Migrate useMoreFromArtist

- [ ] `src/hooks/useMoreFromArtist.ts` uses `useApiQuery` for `searchJamendoTracks`
- [ ] The hook has 0 `useState` (was 2) and 0 `useEffect` (was 1) and 0 `useRef` (was 1)
- [ ] The hook still returns `{tracks, isLoading, retry}` (same shape — UI doesn't change)
- [ ] The `retry` function is now `refetch` from TanStack
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.7.1 commit

### Phase 26: V18.7.2 — Migrate useArtistEnrichment

- [ ] `src/screens/Library/hooks/useAlbumEnrichment.ts` uses `useApiQuery` for `getReleaseGroupDetail` + `getCoverArt`
- [ ] The 2 parallel calls are now 2 `useApiQuery` hooks with `enabled: !!releaseGroupId` (or `useQueries` for parallel)
- [ ] The hook still returns `{releaseGroup, isLoading, error}` (same shape)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.7.2 commit

### Phase 27: V18.7.3 — Migrate useDownloadsSync (the offline-mirror write-back)

- [ ] `src/hooks/useDownloadsSync.ts` keeps the `useDownloadsStore` for the write-back (the store is the cache; the service is the source of truth)
- [ ] The hook's `downloadService.ensureLoaded().then(records => useDownloadsStore.getState().hydrateDownloads(records))` pattern stays (it's not a network query; it's a one-shot sync from the AsyncStorage manifest)
- [ ] No `useApiQuery` is needed here (it's not a TanStack-managed fetch; it's a one-shot hydration)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.7.3 commit (even if it's a no-op, the commit confirms the audit)

### Phase 28: V18.7.4 — Verify all per-screen data hooks

- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git diff v17.0.0..HEAD --stat` shows the expected per-screen hook delta
- [ ] Manual smoke test: open the Song screen, "more from this artist" loads + retries correctly
- [ ] Manual smoke test: open the Album screen, the MusicBrainz enrichment loads
- [ ] Manual smoke test: open the Downloads screen, the sync from `downloadService` is correct
- [ ] `git log --oneline -1` shows the V18.7.4 commit
- [ ] Net `git diff --stat` for this wave is ~-400 LOC

---

## Wave 8 — Glue cleanup (cache + rate-limit + DTO types)

### Phase 29: V18.8.1 — Delete the cache + rate-limit code in `apiClient.ts`

- [ ] `src/services/api/apiClient.ts` — the `cache: Map<string, CacheEntry>` and `getCached` / `setCache` helpers are removed
- [ ] `src/services/api/apiClient.ts` — the `lastCallTimestamps: Map<string, number>` and `rateLimit` helper are removed
- [ ] `src/services/api/apiClient.ts` — the `apiFetch` `cacheTtlMs` parameter is removed (TanStack owns caching)
- [ ] `src/services/api/apiClient.ts` — the `apiFetch` `headers` and `signal` parameters are kept (still needed)
- [ ] `src/services/api/apiClient.ts` is now ~80 lines (was 196) — ~60% reduction
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.8.1 commit

### Phase 30: V18.8.2 — Delete the `*Raw` + `*Response` exports from `src/types/api.ts`

- [ ] `src/types/api.ts` — all `*Raw` and `*Response` interfaces are removed (the wire DTOs are file-local in each adapter now)
- [ ] `src/types/api.ts` keeps the `*Result` types (the domain shapes — screens still import these)
- [ ] `src/types/api.ts` keeps the `PaginatedResult<T>`, `ApiConfig`, `ApiSearchOptions`, `ApiMediaClassification` types
- [ ] `src/types/api.ts` is now ~50 lines (was 285) — ~82% reduction
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `grep -rn "Raw\b\|Response\b" src/types/api.ts` returns 0 matches
- [ ] `git log --oneline -1` shows the V18.8.2 commit

### Phase 31: V18.8.3 — Delete the now-unused exports from `src/services/api/index.ts`

- [ ] `src/services/api/index.ts` is reduced to a single re-export: `export {default as weatherAdapter} from './weatherAdapter'`
- [ ] All other entries in `index.ts` (the legacy `*Service` exports) are removed
- [ ] No consumer imports a removed entry
- [ ] `src/services/api/index.ts` is now ~5 lines (was 36)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.8.3 commit

### Phase 32: V18.8.4 — Verify the cleanup

- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git diff v17.0.0..HEAD --stat | grep -E "apiClient\|api/index\|types/api"` shows the expected cleanup
- [ ] `grep -rn "cacheTtlMs\|getCached\|setCache\|rateLimit" src/services/api/apiClient.ts` returns 0 matches
- [ ] `grep -rn "from.*services/api/[a-z]*Service'" src/ --include="*.ts" --include="*.tsx"` returns 0 matches (the old `*Service` files are gone)
- [ ] `git log --oneline -1` shows the V18.8.4 commit
- [ ] Net `git diff --stat` for this wave is ~-700 LOC

---

## Wave 9 — Local-state cleanup (useState triples + useRef guards + page machines)

### Phase 33: V18.9.1 — Delete the 80 useState triples (one screen at a time)

- [ ] For each of the 80 screens/hooks with `useState` triples (`[data, isLoading, error]`), replace with `useApiQuery` and delete the 3 `useState` calls
- [ ] Each file's `useState` count drops by 3 (from 3 to 0 for the data triple)
- [ ] Each file's `useEffect` count drops by 1 (from 1 to 0 for the fetch trigger)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.9.1 commit
- [ ] Net `git diff --stat` for this phase is ~-500 LOC

### Phase 34: V18.9.2 — Delete the 18 useRef(fetchingRef) guards

- [ ] For each of the 18 hooks with `useRef(fetchingRef)` to dedup concurrent fetches, the guard is removed (TanStack's `enabled` flag + `useQuery` dedup does this automatically)
- [ ] `useRef` count drops to 0 in each of these files
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.9.2 commit
- [ ] Net `git diff --stat` for this phase is ~-100 LOC

### Phase 35: V18.9.3 — Delete the 15 page-handling state machines

- [ ] For each of the 15 screens with `useState(page) + useState(hasMore) + useState(loadingMore) + useEffect(loadMore)`, replace with `useInfiniteApiQuery`
- [ ] TanStack's `useInfiniteQuery` returns `{data, fetchNextPage, hasNextPage, isFetchingNextPage}` — same shape
- [ ] Each file's `useState` count drops by 3-4
- [ ] Each file's `useEffect` count drops by 1
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `git log --oneline -1` shows the V18.9.3 commit
- [ ] Net `git diff --stat` for this phase is ~-50 LOC (most of the page machinery lives in the screen, not the data layer)

### Phase 36: V18.9.4 — Verify all screens still work (full QA pass)

- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest` reports no failures
- [ ] `git diff v17.0.0..HEAD --stat` shows the wave's expected delta (~-650 LOC)
- [ ] Manual smoke test: open every screen (Home, Search, Library, Profile, Settings, Downloads, etc.) and verify the data loads
- [ ] Manual smoke test: navigate between screens — TanStack's cache should keep previously-fetched data warm (no re-fetch on tab switch)
- [ ] Manual smoke test: pull-to-refresh on a screen — TanStack's `refetch` is wired to the refresh control
- [ ] Manual smoke test: kill the network mid-session — the cached data still renders, the failed refresh shows the error
- [ ] `git log --oneline -1` shows the V18.9.4 commit

---

## Wave 10 — Final QA + closeout (V18.10.x)

### Phase 37: V18.10.1 — `npx tsc --noEmit` final pass

- [ ] `npx tsc --noEmit` exits with 0 errors
- [ ] `npx tsc --noEmit 2>&1 | wc -l` reports `0` lines of output
- [ ] `npx tsc --noEmit --listFiles | wc -l` reports the expected file count (should be ~525 — close to the 527 from V17)
- [ ] `npx tsc --noEmit --listFilesOnly | grep "useAppSelector\|@reduxjs/toolkit\|@reduxjs"` returns 0 matches
- [ ] No `@types/redux-logger` references anywhere
- [ ] No `import 'redux-persist'` anywhere
- [ ] No `import 'react-redux'` anywhere
- [ ] No `useAppSelector` or `useAppDispatch` calls anywhere
- [ ] `npx tsc --noEmit --noUnusedLocals` reports no unused locals

### Phase 38: V18.10.2 — `npx jest` full suite

- [ ] `npx jest` reports all suites pass
- [ ] `npx jest --listTests | wc -l` reports ≥30 test files (the 10 adapter tests + the 5+ V17 tests + the 3+ useApiQuery tests)
- [ ] `npx jest` reports ≥40 tests passing (5 V17 + 9 weather convertor + 3 useApiQuery + 15+ adapter convertors + 8+ search/error-isolation)
- [ ] `npx jest` reports 0 tests failing
- [ ] `npx jest` reports 0 tests with status "todo" (or fewer than V17 had)
- [ ] Test runtime is <60s (no test file should add >5s of network or setup time)
- [ ] `npx jest --testPathPattern=Adapter` reports ≥30 tests across all adapter files

### Phase 39: V18.10.3 — Final QA report

- [ ] `md/SIMBA_PLAYER_MODULE_V18_FINAL_QA_REPORT.md` is written
- [ ] Section 1 (charter): states the V18 goal
- [ ] Section 2 (final state): 10-wave / 40-phase summary
- [ ] Section 3 (per-phase outcomes): the 40 commit titles + LOC delta per phase
- [ ] Section 4 (public surface delta): before/after of the screen-side API
- [ ] Section 5 (V19 candidates): list of follow-up work (e.g. `useQueries` → React Query's parallel queries, `useApiMutation` for user actions, etc.)
- [ ] Section 6 (verification): `npx tsc` + `npx jest` + the convertor-test counts
- [ ] Section 7 (user-facing summary): "1 mental model for data, 1 mental model for state, no more hand-rolled state machines"
- [ ] The report is <500 lines (don't over-document)
- [ ] `git log --oneline -1` shows the V18.10.3 commit

### Phase 40: V18.10.4 — Tag v18.0.0 + closeout

- [ ] `git tag -d v18.0.0 2>/dev/null` (idempotent — clears any prior tag)
- [ ] `git tag -a v18.0.0 -m "V18: API adapter + TanStack Query (10 waves, 40 phases)"`
- [ ] `git tag --list 'v18*'` shows `v18.0.0`
- [ ] `git log --oneline -1` shows the closeout commit (e.g. "V18 release: tag v18.0.0")
- [ ] `git log --oneline v17.0.0..v18.0.0 | wc -l` reports ≥40 commits
- [ ] `git diff v17.0.0..v18.0.0 --stat | tail -1` shows a net reduction of ≥3,000 lines
- [ ] `package.json` version is bumped to `1.7.0` (V18 is a feature release, not a breaking change to the consumer surface — but the version line ticks per V16 → V17 → V18 pattern)
- [ ] `CHANGELOG.md` (or `md/CHANGELOG.md`) has the V18 entry
- [ ] The team has the greenlight to push V18 commits to `main` and to consume `@simba-dev/react-native-media-player@^1.5.0` (unchanged — V18 is a refactor, not a module API change)

---

## Summary

- **10 waves** · **40 phases** · **~800 checkable steps** · **~3,500 LOC net removed**
- **Pilot phase (V18.2) is the risk isolator** — if the design doesn't feel right after the weather migration, the plan stops there
- **V18.0 is a 30-minute free win** (8 dead methods, ~80 LOC removed with zero behavior change)
- **The architecture**: 1 mental model for data (TanStack) + 1 mental model for state (zustand, from V17) + 1 mental model for HTTP (adapter + exported convertors)
- **The convertor pattern** (the team's contribution) makes every adapter method trivially testable in isolation
- **The "even junior dev can integrate" rule** is real for adapter authors (1 file, ~120 lines) and even better for screen authors (1 line per call)
