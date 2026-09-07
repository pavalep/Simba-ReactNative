# V18 — API Adapter + TanStack Query: Specification

**Author:** Senior dev review · **Date:** 2026-09-07
**Status:** Proposal — pending manager sign-off
**Builds on:** V17 (zustand state layer; the redux → zustand migration is done)

---

## 1. The charter (one paragraph)

V18 is the "simplify the API data flow" refactor. Every
service module in `src/services/api/` follows the same
5-step pattern today: declare a `*Raw` interface, declare a
`*Response` envelope, write a `map*()` function, call
`apiFetch<T>()`, hand-write cache + retry + pagination glue
in the consumer. **55 methods × 188 call sites** × 3 lines of
`useState` boilerplate per site = ~2,800 lines of state-machine
glue. V18 collapses the pattern to: **(1) per-service
adapter with EXPORTED named convertor functions** (the
axios-layer bridge), **(2) TanStack Query for cache/retry/
pagination/dedup** (the query layer), **(3) the screen only
ever sees the domain type, never the wire shape**.

## 2. The architecture (3 layers, 2 files per service, 1 mental model per layer)

```
┌─────────────────────────────────────────────────────────────┐
│ WIRE LAYER  (axios + adapter + convertors)                    │
│ ──────────────────────────────                               │
│   *Raw DTOs  →  file-local interfaces (never exported)       │
│   convertors  →  EXPORTED named pure functions                │
│   adapter object  →  thin: `await apiFetch` + `convertor`    │
│                                                             │
│   Returns the app's domain type, NOT the wire shape.       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ QUERY LAYER  (TanStack Query)                                │
│ ──────────────────────────────                               │
│   useApiQuery({key, fetcher, args, ttlMs})   →  single      │
│   useInfiniteApiQuery({...})                 →  load-more    │
│   useQueries([{...}])                       →  parallel fan │
│   useApiMutation({fetcher, onSuccess})      →  user action  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ SCREEN LAYER                                                │
│ ──────────────                                               │
│   const {data, isLoading, error} = useApiQuery({...});      │
│   data: <DomainType>   ←  already converted at the wire     │
└─────────────────────────────────────────────────────────────┘
```

## 3. The convertor pattern (the key design decision)

Each adapter method is **two lines**:

```ts
async search(args) {
  const response = await apiFetch<RawResponse>({...});
  return searchResultFromAudiusListResponse(response);
}
```

The convertor is an **exported, named, pure function** that
takes the raw wire shape (or `undefined`) and returns the
domain shape. Trivially testable. Trivially mockable. Trivially
replaceable when the API ships a v2.

**Naming convention:**
- `xxxResultFromYyyRaw(raw)` — per-item conversion
- `xxxResultFromYyyResponse(raw)` — whole-response conversion
- Inputs accept `undefined` to handle the "transport failed
  before we got a shape" case without coupling to HTTP status
  codes

## 4. The scale (data from the codebase)

| Surface | Count |
|---|---:|
| Service methods exported | **55** |
| Service methods **actually used** | **47** (85%) |
| Dead methods (zero call sites) | **8** (free win in V18.0) |
| Call sites across `src/` | **188** |
| Hottest method | `getAllIPTVChannels` — **11 call sites** |
| Hottest service | `internetArchiveService` — **32 call sites** |
| Net `src/` LOC | 67,715 |
| Net V18 LOC delta (estimated) | **-3,500 net** (+250 TanStack add) |

## 5. The 10-wave / 40-phase plan (see TRACKER for the 800+ step checklist)

| Wave | Theme | Phases | LOC delta |
|---|---|---:|---:|
| 1 | **Foundation** (delete dead code + add TanStack + useApiQuery) | 4 | +170 |
| 2 | **Pilot** (weatherAdapter end-to-end) | 4 | -100 |
| 3 | **Simple search services** (audius, jamendo, librivox, musicbrainz, tvmaze) | 4 | -550 |
| 4 | **Paginated services** (iptv, radioBrowser, podcastIndex) | 4 | -700 |
| 5 | **Internet Archive** (the biggest single surface — 32 calls, 8 methods) | 4 | -600 |
| 6 | **Aggregated search** (the multi-source query) | 4 | -200 |
| 7 | **Per-screen data hooks** (useMoreFromArtist, useArtistEnrichment, useDownloadsSync) | 4 | -400 |
| 8 | **Glue cleanup** (cache + rate-limit + DTO types) | 4 | -700 |
| 9 | **Local-state cleanup** (useState triples + useRef guards + page machines) | 4 | -650 |
| 10 | **Final QA + closeout** (tsc + jest + tag v18.0.0) | 4 | -50 |
| **Total** | | **40** | **~3,500 net removed** |

## 6. The 5 TanStack shape mappings

| API shape | TanStack hook | Key shape |
|---|---|---|
| Search (single page) | `useApiQuery` | `[svc, 'search', q, page]` |
| Search (load-more) | `useInfiniteApiQuery` | `[svc, 'search', q]` + pageState |
| Get-by-id | `useApiQuery` | `[svc, 'byId', id]` |
| List with filter | `useApiQuery` | `[svc, filter, value]` |
| Trending/popular | `useApiQuery` | `[svc, 'trending', limit]` |
| Sub-list (albums in artist) | `useApiQuery` | `[svc, parentId, 'sub']` |
| Multi-source aggregate | `useQueries` | one query per source |
| User mutation | `useApiMutation` | n/a (invalidation-driven) |

## 7. The naming convention (the team's contribution)

| Layer | Naming |
|---|---|
| Adapter file | `src/services/api/<name>Adapter.ts` (default export: the adapter object) |
| Wire DTO | `<Name>Raw`, `<Name>Response` — file-local, never exported |
| Per-item convertor | `<name>ResultFrom<Source>Raw(raw): <DomainType>` — exported |
| Response convertor | `<method>ResultFrom<Source>Response(raw): <DomainType>` — exported |
| Domain type | re-exported from `src/types/api.ts` (or co-located in the adapter file) |
| Cache key prefix | `<serviceName>.<methodName>` (e.g. `audius.search`, `jamendo.byId`) |

## 8. The 8 dead methods (V18.0 free win)

These have **zero call sites** in `src/` and can be deleted
in the V18.0 prep commit with zero behavior change:

1. `audiusService.getAudiusTracksByGenre`
2. `jamendoService.getJamendoTracksByGenre`
3. `librivoxService.searchByAuthor`
4. `librivoxService.searchByGenre`
5. `librivoxService.getRecentAudiobooks`
6. `radioBrowserService.getGenres`
7. `radioBrowserService.getCountries`
8. `radioBrowserService.getLanguages`

Each is a `~10-line` exported function with a `*Raw` DTO and
a `map*()` body. ~80 lines of pure dead code.

## 9. The risk surface (called out for the pilot phase)

1. **Pagination regression** (3 services use `numFound` for "has more")
2. **Aggregation regression** (5 parallel sources with per-source error isolation)
3. **Cache-key collisions** (188 call sites is a lot of new `key: [...]` arrays)
4. **Stale closures** in fetcher (needs `useCallback` discipline)
5. **Dead methods might not actually be dead** (V18.0 must include a runtime check)

The pilot phase (V18.2, weather) is the risk isolator. If the
design doesn't feel right after the weather migration, the
plan stops there. The codebase is in a good state from V17.

## 10. Out of scope

- **Local UI state** — `useTheme`, `usePlayerActivity`, `useState` for `showModal`, etc. TanStack doesn't replace `useState(false)`.
- **Zustand stores** — `useMediaStore`, `useAuthStore`, etc. are client-only state. Untouched.
- **The redux → zustand migration from V17** — already done.
- **The player's own zustand stores** in the `@simba-dev/react-native-media-player` module.
- **The local-derivation selectors in `mediaStore.ts`** — these are pure derivations, not API calls.

## 11. Definition of done (per phase)

A phase is "done" when:
1. All 20+ checkable steps in the phase's TRACKER section are marked `[x]`
2. `npx tsc --noEmit` reports 0 errors
3. `npx jest` reports no new failures
4. The phase's commit message is written (template in TRACKER)
5. The behavior delta (what changed) is summarized in TRACKER's "Wave N outcome" entry
6. Any new files are listed in the commit's "Files changed" section

## 12. The "even junior dev can integrate" rule (per layer)

| Layer | Junior dev's job | Lines | New file? |
|---|---|---:|---|
| **Add a new service** (adapter author) | 1 file: `*Adapter.ts` with `*Raw` + `map*()` + the adapter object | ~120 | yes |
| **Add a new screen call** (screen author) | 1 line: `useApiQuery({key, fetcher})` | ~4 | no |
| **Add a new mutation** (screen author) | 1 line: `useApiMutation({fetcher, onSuccess})` | ~5 | no |
| **Add a new infinite scroll** (screen author) | 1 line: `useInfiniteApiQuery({key, fetcher, pageSize})` | ~5 | no |

The screen author is mostly doing UI work; the data plumbing
is 1-3 lines per call.
