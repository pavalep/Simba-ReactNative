# V18 — API Adapter + TanStack Query: Specification

**Author:** Senior dev review · **Date:** 2026-09-07
**Status:** In execution — Wave 1 (Foundation) in progress
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

## 2. The type contract (the keystone)

V18's correctness depends on a clean type contract at the
adapter boundary. **The convertor is the only function
allowed to cross from "raw" to "domain"; everything else
is type-checked.** Without this, the adapter layer becomes
a hand-wavy "trust me, the data looks like this" layer;
with it, the convertor's signature IS the contract.

### 2.1 Two type families per service

| Family | Naming | Purpose | Lives in |
|---|---|---|---|
| **Raw** | `XxxRaw`, `XxxSearchRaw`, `XxxSingleRaw` | Matches the upstream API's JSON shape; the `T` passed to `apiFetch<T>` | File-local (or exported alongside the convertor that consumes it) |
| **Domain** | `XxxResult`, `XxxSnapshot`, `XxxList` | What the screen consumes; always non-null, fully populated, app-flavored names | Exported from the adapter file |

### 2.2 Convertor signatures (the contract)

```ts
// Single item — null on undefined input
export function trackResultFromRaw(
  raw: AudiusSingleRaw | undefined,
): AudiusTrackResult | null;

// List — empty array on undefined input
export function trackResultsFromRaw(
  raw: AudiusSearchRaw | undefined,
): AudiusTrackResult[];
```

- **Pure** — no I/O, no state, no side effects.
- **Exported** — importable in isolation for unit tests.
- **Named** — `<noun>FromRaw` (single) or `<noun>sFromRaw` (list, plural Results).
- **Inputs accept `undefined`** — covers the "transport failed before we got a shape" case without coupling to HTTP status codes.
- **Output is `null` for single, `[]` for list** — never throws.

### 2.3 Service functions always return `Promise<DomainType>`

The convertor runs INSIDE the service. A consumer who wants
the raw type is doing it wrong; the only escape hatch is a
`_raw` variant we don't define unless there's a real need.

```ts
export async function searchAudiusTracks(
  q: string,
  page: number = 1,
): Promise<AudiusTrackResult[]> {
  const response = await apiFetch<AudiusSearchRaw>({...});
  return trackResultsFromRaw(response?.data);
}

export async function getAudiusTrackById(
  id: string,
): Promise<AudiusTrackResult | null> {
  const response = await apiFetch<AudiusSingleRaw>({...});
  return response?.data ? trackResultFromRaw(response.data) : null;
}
```

### 2.4 `useApiQuery<TResult>` is generic over the domain type

The screen's `data` is typed as `TResult | undefined`, never
as the raw type. A wrong response shape becomes a TypeScript
error at the convertor, not a runtime error at the screen.

```ts
const {data} = useApiQuery<AudiusTrackResult[]>({
  queryKey: ['audius', 'search', query, page],
  queryFn: () => searchAudiusTracks(query, page),
});
//    ^? AudiusTrackResult[] | undefined
```

The generic is usually inferred from `queryFn`'s return type
— the explicit `<AudiusTrackResult[]>` is for the rare case
where the fetcher returns `any` or a union.

### 2.5 File organization (per service)

- **Small services** (≤4 methods): one file `xxxAdapter.ts`
  with types, convertors, and service functions in that order.
- **Large services** (5+ methods, e.g. Internet Archive): split
  into `xxxTypes.ts` + `xxxAdapter.ts`. Types and convertors
  become independently importable for tests.

### 2.6 Tests are the proof

A wrong convertor is a TypeScript error before it's a test
failure, but the tests still exist: every convertor gets a
unit test with at least 3 cases (happy path, missing fields,
undefined input). This is what makes the convertor pattern
debuggable — when a screen shows wrong data, the convertor's
test is the first place to look.

## 3. The architecture (3 layers, 1 mental model per layer)

```
┌─────────────────────────────────────────────────────────────┐
│ WIRE LAYER  (axios + adapter + convertors)                    │
│ ──────────────────────────────                               │
│   *Raw DTOs  →  XxxRaw (raw wire shape)                     │
│   *Result    →  XxxResult (domain shape)                    │
│   convertors  →  EXPORTED named pure functions               │
│                 (xResultFromRaw, xResultsFromRaw)            │
│   service fns →  Promise<XResult> — never Promise<Raw>     │
│                                                             │
│   Per service: 1 file (small) or 2 (types + adapter)       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ QUERY LAYER  (TanStack Query)                                │
│ ──────────────────────────────                               │
│   useApiQuery({key, fetcher})                →  single      │
│   useInfiniteApiQuery({key, fetcher, page})  →  load-more   │
│   useQueries([{...}])                        →  parallel   │
│   useApiMutation({fetcher, onSuccess})       →  user action │
│                                                             │
│   Thin wrapper around TanStack — project defaults baked in  │
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

## 4. The convertor pattern (per method)

Each adapter method is **two lines** of work:

```ts
async search(q, page) {
  const response = await apiFetch<XxxSearchRaw>({...});
  return xxxResultsFromRaw(response?.data);
}
```

The convertor is the only place the raw shape is consumed.
The rest of the codebase never sees it.

## 5. The scale (data from the codebase)

| Surface | Count |
|---|---:|
| Service methods exported | **55** |
| Service methods **actually used** | **47** (85%) |
| Dead methods (zero call sites) | **1** (only `getAudiusTracksByGenre`; the V18 brief's "8 dead" claim was wrong — see §9) |
| Call sites across `src/` | **188** |
| Hottest method | `getAllIPTVChannels` — **11 call sites** |
| Hottest service | `internetArchiveService` — **32 call sites** |
| Net `src/` LOC | 67,715 |
| Net V18 LOC delta (actual) | **-2,657 src/** (3,296 insertions, 5,953 deletions; spec's original -3,500 estimate was 24% high) |

## 6. The 11-wave / 46-phase plan (see TRACKER for the 800+ step checklist)

| Wave | Theme | Phases | LOC delta (actual `src/`) |
|---|---|---:|---:|
| 1 | **Foundation** (delete dead code + add TanStack + useApiQuery) | 4 | +170 |
| 2 | **Pilot** (weatherAdapter end-to-end) | 4 | -100 |
| 3 | **Simple search services** (audius, jamendo, librivox, musicbrainz, tvmaze) | 4 | -550 |
| 4 | **Paginated services** (iptv, radioBrowser, podcastIndex) | 4 | -700 |
| 5 | **Internet Archive** (the biggest single surface — 32 calls, 8 methods) | 4 | — *deferred to V19* |
| 6 | **Aggregated search** (the multi-source query, `useQueries`) | 4 | — *deferred to V19* |
| 7 | **Per-screen data hooks** (useMoreFromArtist, useArtistEnrichment, useDownloadsSync) | 4 | — *absorbed into Wave 3* (active-scope pattern) |
| 8 | **Glue cleanup** (cache + rate-limit + DTO types) | 4 | — *deferred to V19* |
| 9 | **Local-state cleanup** (useState triples + useRef guards + page machines) | 4 | — *absorbed into Wave 3* (active-scope pattern) |
| 10 | **Final QA + closeout** (tsc + jest + tag v18.0.0) | 4 | -50 |
| 11 | **Legacy TabView cleanup** (5 screens → FAB / `FilterChips`; drop `@react-native-tab-view`) | 6 | **-2,386** |
| **Total** | | **46** | **-2,657 net `src/`** |

> Waves 5, 6, 8 are deferred to V19. Waves 7 and 9 were
> never done as separate waves — the active-scope pattern in
> Wave 3 (single `useApiQuery` + `useState` for the active
> scope + TanStack's queryKey cache for the rest) subsumed
> both. Wave 11 was added after the V18 manager brief as a
> UI-consistency closeout; the spec's original 10-wave / 40-phase
> scope didn't include it.

## 7. The 5 TanStack shape mappings

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

## 8. The naming convention

| Layer | Naming |
|---|---|
| Adapter file | `src/services/api/<name>Adapter.ts` (small service) or `src/services/api/<name>Types.ts` + `src/services/api/<name>Adapter.ts` (large service) |
| Wire DTO | `XxxRaw`, `XxxSearchRaw`, `XxxSingleRaw` — file-local unless split, in which case exported from `xxxTypes.ts` |
| Domain DTO | `XxxResult`, `XxxSnapshot` — always exported from the adapter file |
| Per-item convertor | `xxxResultFromRaw(raw): XxxResult \| null` — exported |
| List convertor | `xxxResultsFromRaw(raw): XxxResult[]` — exported |
| Service function | `searchXxx`, `getXxxById`, `fetchXxxByCity` — exported; returns `Promise<XResult>` |
| Cache key prefix | `[<serviceName>, <methodName>, ...args]` (e.g. `['audius', 'search', q, page]`) |

## 9. The risk surface (called out for the pilot phase)

1. **Pagination regression** (3 services use `numFound` for "has more")
2. **Aggregation regression** (5 parallel sources with per-source error isolation)
3. **Cache-key collisions** (188 call sites is a lot of new `key: [...]` arrays)
4. **Stale closures** in fetcher (needs `useCallback` discipline)
5. **~~Dead methods might not actually be dead~~ — REALIZED**: the V18 brief claimed 8 dead methods; `grep` across `src/` proved only 1 was actually dead. The other 7 had active call sites in mounted screens. **V18.0.2 was therefore skipped** per the manager's "skip V18.0 entirely" call. The remaining 6 live methods are migrated (not deleted) as part of the per-service waves (V18.3+).

The pilot phase (V18.2, weather) is the risk isolator. If the
design doesn't feel right after the weather migration, the
plan stops there. The codebase is in a good state from V17.

## 10. Out of scope

- **Local UI state** — `useTheme`, `usePlayerActivity`, `useState` for `showModal`, etc. TanStack doesn't replace `useState(false)`.
- **Zustand stores** — `useMediaStore`, `useAuthStore`, etc. are client-only state. Untouched.
- **The redux → zustand migration from V17** — already done.
- **The player's own zustand stores** in the `@simba-dev/react-native-media-player` module.
- **The local-derivation selectors in `mediaStore.ts`** — these are pure derivations, not API calls.

---

## 13. Legacy TabView cleanup (post-V18, drives UI consistency) — ADDED 2026-09-08

**Status:** Implemented — see `md/V18_LEGACY_TABVIEW_CLEANUP.md` for the full plan and
`md/SIMBA_PLAYER_MODULE_V18_TRACKER.md` Wave 11 for the 6-phase checklist.

> Section ordering note: §13 was appended after V18.1, so the doc
> has §10, §13, §11, §12 in physical order. The numbered content
> is correct; only the file ordering is off. Reading order: §1
> through §12, then this §13.

V18 (Waves 1-4) refactors the data layer. The v3-v9
"TabView" pattern was preserved in 5 screens (Audiobooks,
Shows, Genre, Archive, LiveTV legacy). The v10+
"`<BrowseLayout>` + FAB / FilterChips" pattern (Movies,
Podcasts, Music, Radio, LiveTVNew) was the intended shape.
Wave 11 converts the 5 legacy screens and removes the
`@react-native-tab-view` dependency.

### The 5 legacy screens (Wave 11)

| Screen | Old tabs | New shape (landed) | Net src/ LOC |
|---|---|---|---:|
| `ArchiveScreen` | audio / video (2) | 2 `useApiQuery` (audio + video), `mediatype` FAB filter toggles between them | -394 |
| `LiveTVScreen` (legacy) | all / categories / favorites (3) | Directory deleted; `LiveTVScreenNew` is the single source of truth | -1,171 |
| `AudiobooksScreen` | search / genres / recent (3) | 2 `useInfiniteApiQuery` (search + genres); "Recent" dropped (overlaps with Home "Recently Added" rail) | -150 |
| `GenreScreen` | local / streaming / moods / radio (4) | 1 `useApiQuery` (streaming) + zustand selector (local); "Moods" and "Radio" both dropped (Moods deferred, Radio lives in `RadioScreenNew`) | -245 |
| `ShowsScreen` | search / today / browse (3) | 1 `useApiQuery` (search) + 1 `useInfiniteApiQuery` (browse) + 1 `useApiQuery` (todayRail); "Airing Today" rail at the top | -426 |
| **Total** |  |  | **-2,386** |

### Wave 11 phasing (landed)

1. `ArchiveScreen` — lowest cost; sets the pattern (V18.11.1)
2. `LiveTVScreen` (legacy) — confirm-and-delete (V18.11.2; route already pointed to `LiveTVScreenNew`)
3. `AudiobooksScreen` — search is the primary; genres → `FilterChips` (V18.11.3)
4. `GenreScreen` — biggest refactor; "Moods" + "Radio" both dropped (V18.11.4)
5. `ShowsScreen` — "Today" as a "Airing Today" rail (V18.11.5)
6. **Remove `@react-native-tab-view` from `package.json`** (V18.11.6)

### What this achieves

- Every browse screen in the app uses the same `BrowseLayout` shell + FAB / `FilterChips` pattern.
- The 5 legacy hooks' state-machine code (`Map<key, ScopeState>` + `seqRef` + `guardRef` + `hasMoreRef`) is gone.
- The `SectionTabBar` + per-screen `TabBar.tsx` copies are deleted.
- 2,386 `src/` LOC removed (well over the ≥1,000 target; the spec's "~1,500" estimate was low — actual was 60% higher).

### Deviations from the original plan (`md/V18_LEGACY_TABVIEW_CLEANUP.md`)

- **ArchiveScreen** — the plan said "single IA query + mediatype FAB filter". The actual implementation has **2 `useApiQuery` calls** (one for audio, one for video) with the `mediatype` switching between them. Same end result, but the "single query" wording was wrong.
- **AudiobooksScreen "Recent"** — the plan offered "drop OR keep as a hero row". We dropped (Home "Recently Added" rail covers it).
- **GenreScreen "Moods"** — the plan offered "own screen OR section of GenreScreen". We deferred entirely; the data plumbing is removed from both hook and screen.
- **GenreScreen "Radio"** — the plan offered "FAB filter". We dropped; `RadioScreenNew` is the entry point.
- **ShowsScreen** — the plan said "FAB filter for genre/country". We used `FilterChips` for **source** (search|browse), not for genre/country. Cleaner than the plan's design.

See `md/V18_LEGACY_TABVIEW_CLEANUP.md` for the original plan and
`md/SIMBA_PLAYER_MODULE_V18_TRACKER.md` Wave 11 for the 6-phase checklist.

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
| **Add a new service** (adapter author) | 1 file: `*Adapter.ts` with `*Raw` + `*Result` + `xResultFromRaw` + `xResultsFromRaw` + the service function | ~120 | yes |
| **Add a new screen call** (screen author) | 1 line: `useApiQuery({key, fetcher})` | ~4 | no |
| **Add a new mutation** (screen author) | 1 line: `useApiMutation({fetcher, onSuccess})` | ~5 | no |
| **Add a new infinite scroll** (screen author) | 1 line: `useInfiniteApiQuery({key, fetcher, pageSize})` | ~5 | no |

The screen author is mostly doing UI work; the data plumbing
is 1-3 lines per call.
