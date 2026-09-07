# V18 — API Adapter Refactor: Deep Analysis

**Author:** Senior dev review · **Date:** 2026-09-07
**Status:** Proposal — pending manager sign-off
**Supersedes:** the earlier "useApiQuery" draft (which was
under-scoped — this is the proper adapter-pattern read)

---

## 1. The corrected architecture

The "adapter pattern" means: **a per-service object that wraps
every method the service exposes, returning the converted
type instead of the wire DTO.** The adapter is the bridge from
the API's wire format to the app's workflow format. The
conversion happens **once at the axios layer**, *before* the
data crosses into TanStack-land.

```
┌─────────────────────────────────────────────────────────────┐
│ WIRE LAYER  (axios + adapter)                                │
│ ──────────────────────────────                               │
│   *Raw DTO types  →  file-local interfaces                    │
│   apiFetch<T>()   →  cache + rate-limit + timeout             │
│   map*() function  →  DTO → domain shape                     │
│   adapter object  →  collection of { search, getById, ... } │
│                                                             │
│   Returns the app's domain type, NOT the wire shape.       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ QUERY LAYER  (TanStack Query)                                │
│ ──────────────────────────────                               │
│   useApiQuery({ key, fetcher, args })    →  single fetch     │
│   useInfiniteApiQuery({ key, fetcher })  →  load-more feed  │
│   useQueries([{...}, {...}])            →  parallel fans   │
│   useMutation({ fetcher })                →  user actions    │
│                                                             │
│   The fetcher IS the adapter call. No shape massage.        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ SCREEN LAYER                                                │
│ ──────────────                                               │
│   const {data, isLoading} = useApiQuery({                   │
│     key: ['audius.search', q, page],                        │
│     fetcher: () => audiusAdapter.search({q, page}),         │
│   });                                                       │
│                                                             │
│   data: AudiusTrackResult[]   ←  the domain type,            │
│                                    already converted at     │
│                                    the adapter.              │
└─────────────────────────────────────────────────────────────┘
```

**The contract:** once data exits the adapter, it's already
in the shape the screen wants. No more `useState(data)` +
`useEffect(() => apiFetch().then(map).then(setData)` triples
in every screen. No more "did I remember to call `mapTrack`
here?" footguns.

---

## 2. The actual scale (data from the codebase, not estimates)

| Service | Methods exported | Methods **used** | Dead code | Call sites |
|---|---:|---:|---:|---:|
| `audiusService` | 4 | 3 (`searchAudiusTracks`, `getTrendingAudiusTracks`, `getAudiusTrackById`) | 1 (`getAudiusTracksByGenre`) | 8 |
| `jamendoService` | 4 | 3 (`searchJamendoTracks`, `getPopularJamendoTracks`, `getJamendoTrackById`) | 1 (`getJamendoTracksByGenre`) | 17 |
| `librivoxService` | 5 | 3 (`searchAudiobooks`, `getAudiobookById`) | 2 (`searchByAuthor`, `searchByGenre`, `getRecentAudiobooks`) | 12 |
| `iptvService` | 6 | 5 (`getAllIPTVChannels`, `searchIPTVChannels`, `getChannelsByCategory`, `getIPTVCategories`, `getIPTVChannelById`) | 1 (`getChannelsByCountry`) | 27 (!!) |
| `radioBrowserService` | 10 | 8 (`searchStations`, `getTopStations`, `getStationById`, `getStationsByCountry`, `getStationsByGenre`, `getStationsByLanguage`, `getStationsByFilters`) | 2 (`getGenres`, `getCountries`, `getLanguages`) | 24 |
| `podcastIndexService` | 5 | 5 (all) | 0 | 24 |
| `internetArchiveService` | 9 | 8 (all except `getInternetArchiveVideoDetails` only) | 1 (`archiveImageUrl`, `archiveIdentifierFromUrl` are pure helpers, not network calls) | 32 (!!) |
| `musicbrainzService` | 4 | 4 (all) | 0 | 16 |
| `tvmazeService` | 5 | 5 (all) | 0 | 15 |
| `weatherService` | 3 | 3 (all) | 0 | 14 |
| **Total** | **55** | **47 used** | **8 dead** | **188 call sites** |

**Headline:** this is not a 13-file surface — it's a
**55-method surface with 188 call sites** and **8 dead
methods** that nobody calls. The dead code is a free win
even before V18 starts.

The `getAllIPTVChannels` (11 calls) and the Internet Archive
suite (32 calls) are the hottest surfaces — they get the most
win from TanStack's automatic request deduplication.

---

## 3. The "huge task" — what's actually in the 55 methods

The methods cluster into 5 operation shapes:

| Shape | Examples | What it needs |
|---|---|---|
| **Search** (paginated or single-page) | `searchAudiusTracks`, `searchIPTVChannels`, `searchStations`, `searchPodcasts` | query + page + limit + filter args; returns array or `PaginatedResult<T>` |
| **Get-by-id** (single item) | `getAudiusTrackById`, `getAudiobookById`, `getIPTVChannelById`, `getStationById`, `getPodcastById`, `getShowById` | id; returns the item or null |
| **List with filter** (country / genre / language / category / mood) | `getChannelsByCountry`, `getStationsByGenre`, `getStationsByLanguage`, `getStationsByFilters`, `getChannelsByCategory` | filter key (string); returns array |
| **Trending / popular / recent / top** (pre-filtered list) | `getTrendingAudiusTracks`, `getPopularJamendoTracks`, `getRecentAudiobooks`, `getTopStations`, `getTrendingPodcasts`, `getPopularShows` | optional limit; returns array |
| **Sub-list / detail expansion** (load more from a parent) | `getArchiveTracks`, `getEpisodes`, `getArtistDiscography`, `getReleaseGroupDetail`, `getInternetArchiveItemDetails`, `getInternetArchiveVideoDetails`, `getEpisodeList`, `getSchedule` | parent id; returns the sub-list or a detail record |

**Each shape needs its own useApiQuery variant:**

- **Search** → `useApiQuery` (single fetch) or
  `useInfiniteApiQuery` (load-more)
- **Get-by-id** → `useApiQuery` with `key: [svc, 'byId', id]`
- **List with filter** → `useApiQuery` with `key: [svc, filter]`
- **Trending** → `useApiQuery` with `key: [svc, 'trending', limit]`
- **Sub-list** → `useApiQuery` with `key: [svc, parentId, 'sub']`

The TanStack cache key shape is the same shape for every
service — only the service name changes. That's the
uniformity that makes the design pay off.

---

## 4. The adapter shape — what a service module looks like after V18

```ts
// src/services/api/audiusAdapter.ts

// ─── Wire DTOs (file-local, never exported) ─────────────────────
interface AudiusTrackRaw {
  id: string;
  title: string;
  duration: number;
  genre: string;
  description: string;
  user: { id: string; name: string; handle: string };
  artwork?: { _480x480: string; _1000x1000: string };
}
interface AudiusListResponse { data: AudiusTrackRaw[] }
interface AudiusSingleResponse { data: AudiusTrackRaw }

// ─── Convertors: EXPORTED named functions, one per API call ────
// Each convertor is a pure function: takes the raw response
// shape, returns the domain shape. No HTTP, no state, no side
// effects. Trivially unit-testable: pass a fixture in, assert
// the shape out.
//
// Naming convention: `<methodName>From<RawShape>Raw(response)`
// or `<methodName>Result(response)` for short.
export function searchResultFromAudiusListResponse(
  raw: AudiusListResponse | undefined,
): AudiusTrackResult[] {
  return (raw?.data ?? []).map(trackResultFromAudiusRaw);
}

export function trackByIdResultFromAudiusSingleResponse(
  raw: AudiusSingleResponse | undefined,
): AudiusTrackResult | null {
  return raw?.data ? trackResultFromAudiusRaw(raw.data) : null;
}

export function trackResultFromAudiusRaw(raw: AudiusTrackRaw): AudiusTrackResult {
  return {
    id: raw.id,
    title: raw.title,
    artistName: raw.user?.name ?? 'Unknown Artist',
    artistId: raw.user?.id ?? '',
    duration: raw.duration,
    genre: raw.genre ?? '',
    streamUrl: `${API_CONFIG.audius.baseUrl}/v1/tracks/${raw.id}/stream`,
    artworkUrl: raw.artwork?._480x480
      ? `https://creatornode.audius.co/ipfs/${raw.artwork._480x480}`
      : '',
    description: raw.description ?? '',
  };
}

// ─── The adapter (the ONLY HTTP-bound thing in the file) ───────
// Thin wrappers: one axios call + one convertor call. The
// shape is always: `let response = await axios(...); let result =
// convertorName(response?.data);`
const adapter = {
  async search(args: {q: string; page?: number; limit?: number}): Promise<AudiusTrackResult[]> {
    const response = await apiFetch<AudiusListResponse>({
      config: API_CONFIG.audius,
      path: '/v1/tracks/search',
      params: {
        query: args.q,
        limit: args.limit ?? 10,
        offset: ((args.page ?? 1) - 1) * (args.limit ?? 10),
      },
      cacheTtlMs: 60_000,
    });
    return searchResultFromAudiusListResponse(response);
  },

  async getById(id: string): Promise<AudiusTrackResult | null> {
    try {
      const response = await apiFetch<AudiusSingleResponse>({
        config: API_CONFIG.audius,
        path: `/v1/tracks/${id}`,
        cacheTtlMs: 300_000,
      });
      return trackByIdResultFromAudiusSingleResponse(response);
    } catch {
      return null;
    }
  },

  async getTrending(limit = 20): Promise<AudiusTrackResult[]> {
    const response = await apiFetch<AudiusListResponse>({
      config: API_CONFIG.audius,
      path: '/v1/tracks/trending',
      params: { limit },
      cacheTtlMs: 120_000,
    });
    return searchResultFromAudiusListResponse(response);
  },
};

export default adapter;

// Re-export the domain type so screens can type `data: AudiusTrackResult[]`
export type {AudiusTrackResult};
```

**The contract:**
- Each adapter method is the **same two-line shape**:
  ```ts
  let response = await apiFetch<RawResponse>({...});
  return convertorName(response);
  ```
- Each convertor is a **pure, named, exported function** that
  takes the raw shape (or `undefined` if the request failed at
  the transport level) and returns the domain shape.
- The convertor knows the wire format and the domain format;
  nothing else does. When the wire format changes (new API
  version, a field renamed), the convertor is the only place
  to fix.
- Wire DTOs (`*Raw`, `*Response`) stay file-local — the screen
  never imports them. The screen only ever imports the
  adapter (default) and the domain types.

---

### Why the convertor is **exported**, not inlined

This is the key design choice the team proposed: the
`searchResultFromAudiusListResponse` function is a **named
export**, not an internal helper. Three concrete wins:

1. **Testability** — pass a JSON fixture, assert the output.
   No axios mock, no TanStack setup, no `nock`, no MSW. The
   convertor is a pure function from `AudiusListResponse ->
   AudiusTrackResult[]`; the test file is ~30 lines per case.
2. **Debuggability** — when a customer reports "the trending
   list shows the wrong artist name", the bug is in the
   convertor. Open the convertor, add a `console.log` on the
   raw input, re-run. You don't need to start the app, you
   don't need to mock a network, you don't need to clear a
   cache. The convertor is a function; the function is the
   bug surface.
3. **Versioning** — when Audius ships a v2 API and the
   response shape changes, the fix is a new convertor
   (`searchResultFromAudiusListResponseV2`) and a 1-line
   branch in the adapter. The rest of the codebase is
   unchanged. Without the named export, the conversion is
   buried inside an async method that also does HTTP, error
   handling, and pagination — and you have to instrument all
   three to see the bug.

The pattern is the same as a `parse` function in a parser
combinator library: **separate "talk to the network" from
"interpret the bytes"**. The adapter does the talking; the
convertor does the interpreting. Both are exported, neither
is hidden.

### Naming convention

| Convertor name | Input | Output |
|----------------|-------|---------|
| `searchResultFromAudiusListResponse(raw)` | the API response shape | `AudiusTrackResult[]` |
| `trackByIdResultFromAudiusSingleResponse(raw)` | the single-item response shape | `AudiusTrackResult \| null` |
| `trackResultFromAudiusRaw(raw)` | the per-item wire shape | `AudiusTrackResult` |
| `searchResultFromIptvChannelsResponse(raw)` | iptv's list response | `IPTVChannelResult[]` |
| `...ResultFrom...Raw(raw)` | the per-item wire shape | the per-item domain type |

The suffix is always `ResultFromXxxRaw` (per-item) or
`...ResultFrom...Response` (whole response). Inputs accept
`undefined` to handle the "transport failed before we got a
shape" case without forcing the convertor to know about HTTP
status codes.

---

## 5. The consumer side — what every screen call looks like

```ts
// Search screen, before V18:
const [results, setResults] = useState<AudiusTrackResult[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
useEffect(() => {
  let cancelled = false;
  setIsLoading(true);
  searchAudiusTracks(query, {page, limit: 10})
    .then(r => { if (!cancelled) setResults(r); })
    .catch(e => { if (!cancelled) setError(e.message); })
    .finally(() => { if (!cancelled) setIsLoading(false); });
  return () => { cancelled = true; };
}, [query, page]);
// 17 lines, 3 useState, 1 useEffect, manual debounce, manual cleanup

// After V18:
const {data: results, isLoading, error} = useApiQuery({
  key: ['audius.search', query, page],
  fetcher: () => audiussAdapter.search({q: query, page, limit: 10}),
  ttlMs: 60_000,
});
// 4 lines, 0 useState, 0 useEffect, no manual cleanup
```

**Same pattern for every shape:**
- `getById(id)` → `useApiQuery({key: [svc, 'byId', id], fetcher: () => adapter.getById(id)})`
- `byCountry(c)` → `useApiQuery({key: [svc, 'byCountry', c], fetcher: () => adapter.byCountry(c)})`
- `trending()` → `useApiQuery({key: [svc, 'trending'], fetcher: () => adapter.trending()})`
- `getArchiveTracks(id)` (sub-list) → same shape, different key

The screen learns ONE mental model. The 55 methods all
collapse to the same 4-line call.

### Test the convertor in isolation

```ts
// __tests__/audiusAdapter.test.ts — pure-function test, no axios

import {searchResultFromAudiusListResponse} from '../../src/services/api/audiusAdapter';
import audiusFixture from './fixtures/audius.search.json';

it('maps the search response to the domain shape', () => {
  const result = searchResultFromAudiusListResponse(audiusFixture);
  expect(result[0]).toEqual({
    id: '12345',
    title: 'My Track',
    artistName: 'Some Artist',
    artistId: '67890',
    duration: 240,
    genre: 'Electronic',
    streamUrl: 'https://audius.co/v1/tracks/12345/stream',
    artworkUrl: 'https://creatornode.audius.co/ipfs/Qm...',
    description: '',
  });
});

it('handles an empty response without throwing', () => {
  expect(searchResultFromAudiusListResponse(undefined)).toEqual([]);
  expect(searchResultFromAudiusListResponse({data: []})).toEqual([]);
});

it('handles a partial response (no `user` field) without throwing', () => {
  const result = searchResultFromAudiusListResponse({data: [{id: '1', title: 'X', duration: 0, genre: '', description: '', user: undefined, artwork: undefined}]});
  expect(result[0].artistName).toBe('Unknown Artist');
});
```

No axios mock, no MSW, no network. Three tests, ~30 lines
of test code, ~10ms test runtime. **The convertor is the
single testable unit** — every adapter method is then
trivially correct because it's just `await + convertor`.

---

## 6. What goes away in the consumer layer (188 call sites)

The 188 call sites today look like one of these patterns:

| Pattern | Sites | LOC per site | Total LOC today |
|---|---:|---:|---:|
| `useState` + `useEffect` + `then(setX)` + `catch(setError)` (3-state machine) | ~80 | ~15 | ~1,200 |
| `useState([data, isLoading, error])` triple + mutation handler | ~30 | ~12 | ~360 |
| `useEffect(loadOnce)` + `useRef(fetchingRef)` + `useState` + `useState(isLoading)` + `useState(error)` + manual `retry()` | ~18 | ~30 | ~540 |
| `useState(page)` + `useState(hasMore)` + `useState(loadingMore)` + `useState(items)` + `useEffect(loadMore)` + `loadMore()` callback + `setPage` callback | ~15 | ~40 | ~600 |
| `useSearch` debounce + `searchAggregator` parallel + manual `Promise.allSettled` + 7 manual `extractValue` slots | 1 | ~50 | ~50 |
| `useMoreFromArtist` with `useCallback` + `useEffect` + `useState` + `useRef` | 1 | ~46 | ~46 |
| **Total** | **~145** | | **~2,800 LOC** |

After V18, all 188 call sites become `useApiQuery({key, fetcher})` or `useInfiniteApiQuery({key, fetcher})` — **3 lines each**. Net consumer-side reduction: **~2,360 lines**.

---

## 7. The 8 dead methods (free win before V18 even starts)

`grep` confirms these have zero call sites:

1. `audiusService.getAudiusTracksByGenre` — superseded by `searchAudiusTracks(query: 'genre:...')` or just a different search
2. `jamendoService.getJamendoTracksByGenre` — same story
3. `librivoxService.searchByAuthor` — never wired
4. `librivoxService.searchByGenre` — never wired
5. `librivoxService.getRecentAudiobooks` — never wired
6. `radioBrowserService.getGenres` — never called
7. `radioBrowserService.getCountries` — never called
8. `radioBrowserService.getLanguages` — never called

Each is a `~10-line` exported function with a `*Raw` DTO + a
`map*()` — about **80 lines total** that nobody uses. Delete
them in the V18.0 prep commit (zero behavior change, just
dead-code removal). This is the V18 "free win" — 80 LOC
removed before the refactor even starts.

---

## 8. The migration order (8 phases, all the wins)

| Phase | Theme | Wins | LOC delta |
|-------|-------|------|----------:|
| V18.0 | **Delete dead code** (the 8 unused methods) | Zero behavior change | -80 |
| V18.1 | **Add `@tanstack/react-query` + `QueryClientProvider` in App.tsx + the `useApiQuery` generic** | One infra | +250 |
| V18.2 | **Pilot: `weatherAdapter` + `useWeather` migration** | Smallest adapter (3 methods), no pagination, well-isolated | -120 |
| V18.3 | **Migrate the 5 "simple search" adapters**: audius, jamendo, librivox, musicbrainz, tvmaze | 17 methods total, 4 per-service files | -550 |
| V18.4 | **Migrate the 3 "paginated/list" adapters**: iptv, radioBrowser, podcastIndex | 21 methods, hot loops (iptv 11 calls, radio 24) | -700 |
| V18.5 | **Migrate the "sub-list" adapter**: internetArchive (the most-used service — 32 calls, 8 methods) | The biggest single-screen surface | -600 |
| V18.6 | **Migrate the per-screen data hooks**: `useMoreFromArtist`, `useArtistEnrichment`, `useAggregatedSearch` (the multi-source one) | The "non-API" data hooks that mirror the pattern | -400 |
| V18.7 | **Delete obsolete glue**: `*Raw` DTOs in `src/types/api.ts`, `map*()` functions, the cache/rate-limit boilerplate in `apiClient.ts` | The state cleanup | -700 |
| V18.8 | **Delete obsolete local state**: the 80 `useState` triples, the 15 page-handling state machines, the 18 `useRef(fetchingRef)` guards | The state-machine cleanup | -650 |

8 phases, **~3,500 lines removed net** (after adding ~250 for
TanStack + the generic). Behavior preserved 1:1. The
`useApiQuery` consumer pattern replaces 145 of the 188 call
sites; the remaining 43 are TanStack's `useQueries` /
`useMutation` / `useInfiniteQuery` for the more complex shapes
(aggregated search, user-action mutations, infinite scroll).

---

## 9. The risk surface — what can go wrong

1. **Pagination regression**: 3 services (iptv, radioBrowser,
   internetArchive) have implicit `numFound` for "has more"
   infinite scroll. TanStack's `useInfiniteQuery` handles this
   cleanly, but the data shape (`PaginatedResult<T>`) needs to
   keep the `numFound` field through the adapter.
2. **Aggregation regression**: `useAggregatedSearch` runs 5
   parallel `Promise.allSettled` calls and merges by group.
   TanStack's `useQueries` replaces this — but the
   per-source error isolation (one fails, others still render)
   needs the adapter-level try/catch (return `[]` on failure)
   baked in. Each adapter method must be self-isolating.
3. **Cache-key collisions**: with 188 call sites moving to
   TanStack, the `key: [...]` arrays are the new bug surface.
   `useApiQuery` should expose a `buildKey(...)` helper that
   ensures all args are normalized (sort object keys, drop
   undefined).
4. **Stale closures**: a `fetcher` that closes over a
   non-stable reference (e.g. a fresh `() =>` callback from a
   parent render) will re-run on every render. The
   `useApiQuery` hook needs a `useCallback`/`useMemo` discipline
   baked in (or warn the dev at the call site).
5. **The 8 dead methods might not be dead** — they could be
   called via dynamic dispatch. V18.0 must include a runtime
   check (or a manual audit) before deletion.

---

## 10. The "even junior dev can integrate" rule (your manager's framing)

The framing is right, but it applies to **the adapter
author**, not the screen author. The screen author is
spending their effort on UI, not data plumbing.

| Layer | Junior dev's job | Lines |
|------|-------------------|------|
| **Add a new service** (adapter author) | 1 file: `*Adapter.ts` with `*Raw` + `map*()` + the adapter object | ~120 |
| **Add a new screen call** (screen author) | 1 line: `useApiQuery({key, fetcher})` | ~4 |
| **Add a new mutation** (screen author) | 1 line: `useApiMutation({fetcher, onSuccess})` | ~5 |
| **Add a new infinite scroll** (screen author) | 1 line: `useInfiniteApiQuery({key, fetcher, pageSize})` | ~5 |

**Compare to today:**
- Add a new service: 1 service file (~200 lines) + 1
  `*Result` type in `src/types/api.ts` + 1 `use<Name>` hook
  (~80 lines for the state machine) = ~290 lines, 3 files.
- Add a new screen call: 1 `useState` + 1 `useEffect` + 1
  `useState(error)` + 1 `useState(loading)` + 1 try/catch = ~25
  lines, 0 new files but 3 new mental models.

The adapter author has more work (one new file with 3 private
types/functions), but every screen author has 1/5th the lines
and 1/3rd the mental models. The screen-side savings scale
with screen count, which is the bulk of the codebase.

---

## 11. The "huge task" reality check

The user-facing "huge" comes from these numbers:

- **55 methods** to migrate (well, 47 — 8 are dead)
- **188 call sites** to convert from `useState`/`useEffect`
  state machines to `useApiQuery` calls
- **~3,500 lines** of net removal (after the +250 TanStack
  add)
- **8 phases** of mechanical work (V18.2 is the risk isolator
  — if the weather migration doesn't feel right, stop there)
- **~3-4 days of focused work** if done at a steady pace

The "huge" is mostly the call-site count (188), not the
adapter design. The adapter design is the SMALL part of the
work; the call-site migration is the LARGE part. That's why
the V18.0 free win (delete dead code) is worth doing first
— it reduces 8 of the 55 methods and 0 of the 188 call sites,
but it gives the team confidence that the migration is going
into a clean codebase.

---

## 12. Decision asked of manager

Three options, in order of my recommendation:

1. **Approve V18 as written (8 phases, ~3-4 days, ~3,500 LOC removed).** Pilot at V18.2 (weather), per-service rollout V18.3-V18.5, cleanup V18.6-V18.8. Net `src/` reduction ~5.2%. Zero behavior change. The 8 dead methods go in V18.0 as a 30-minute free win.

2. **Approve a compressed V18 (4 phases: V18.1 + V18.4 + V18.7 + V18.8).** Skip the per-service migration; jump from V18.1 (infra) to V18.4 (paginated adapters, the hottest surfaces) to V18.7-V18.8 (cleanup). Faster wall-clock but harder to bisect if a regression slips in. Estimated ~2-3 days.

3. **Park it.** Tackle the V15 npm `latest` tag promotion first (still outstanding from the V16 handoff), then V18 in the next sprint. The codebase is in a good state from V17; V18 is a "we should do this" not a "we must do this now".

**My recommendation: option 1.** V18.0 is a 30-minute free win
that pays for itself. V18.1 + V18.2 are the risk isolator
(4 hours of work; if you don't like the design after, stop
here and the codebase is in a fine state). V18.3-V18.5 are
mechanical. V18.6-V18.8 reap the savings. The pilot phase is
the safety net.
