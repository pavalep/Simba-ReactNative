# SIMBA Mobile: UI/UX Elevation v10.2 — Podcasts Movies-Replication
## Specification

> **Document Version:** 10.2.0 — Podcasts edition (2026-08-19)
> **Status:** ✅ **ACTIVE** — dedicated spec for the Podcasts wave (Wave 10 of v10.1)
> **Umbrella spec:** [UI_UX_Elevation_Specification_v10.1.md](UI_UX_Elevation_Specification_v10.1.md) — the Movies-reference edition. v10.2 is the **working document** for Podcasts only: same contract, Podcasts-specific data model, card, and config.
> **Tracker:** [UI_UX_Elevation_Progress_Tracker_v10.2.md](UI_UX_Elevation_Progress_Tracker_v10.2.md) — phases, gates, completion log for this wave.
> **Why a separate doc:** the Podcasts replication is a multi-phase effort. v10.1 stays the umbrella; v10.2 pins down exactly what "replicate Movies" means for Podcasts so execution never re-decides the design.

---

## 0. Contract (inherited from v10.1 §0 — Movies = reference)

- **Layout is identical to Movies.** Same shell anatomy (`InternalHeader` + `SearchBar` + active-only `FilterChips` + ONE content stream + gold `SectionFab` → `SectionOptionsSheet`), same states (loading/error/empty/offline/refresh), same scroll polish, same edge-case handling.
- **Content is the only difference.** Podcasts swaps: card = **PodcastRow** (list rows, not a grid), FILTER = **category single-select**, SORT = **recent / az**, VIEW = **list (fixed — the row IS the brand, no grid option)**.
- **Quality is uniform.** Every Movies hardening fix carries over **by replication, never by reinvention**: per-scope cache, stale-response guard, in-flow load-more footer, centered load/refresh pills, gold `RefreshControl`, cold-API `timeoutMs` policy.
- **When in doubt, copy Movies.** Read `useMoviesScreen.ts` + `MoviesContent.tsx` first; change ONLY the content.

---

## 1. TL;DR

Podcasts becomes a **Movies replication** on the FAB-only shell:

1. **SimbaStatusBar** → **InternalHeader** ("Podcasts") → **SearchBar** (placeholder *"Search podcasts…"*, persists across filters) → **FilterChips slot** (active category chip, gold, tap = clear to All)
2. **ONE content stream** — `PodcastRow` list rows (`SectionContent` DATA MODE, `view: 'list'`)
3. **Gold SectionFab** (badge = active filter count) → **SectionOptionsSheet**:
   - **FILTER** — Podcast Index categories (single-select; tap active option again = deselect → "All")
   - **SORT** — Recent / A–Z
   - **VIEW** — **omitted** (list layout is the brand)
   - **Reset**
4. States inside the list (centered load pill, `ErrorState` + retry, `EmptyState`, offline-aware, gold pull-to-refresh, in-flow footer)

**Default stream:** trending shows (Podcast Index has no "browse everything" — trending is the universal "All").

---

## 2. Rules (locked for this wave)

0. **Movies is the template.** `useMoviesScreen.ts` + `MoviesContent.tsx` are read first; Podcasts mirrors their structure and swaps only the content.
1. **No tabs anywhere.** Legacy `PODCAST_TABS` / `selectTabByTitle` / `TabView` / `TabBar` / `PodcastTabScene` are **deleted**, not carried forward.
2. **Provider above the shell.** `PodcastsDataProvider` runs the data hook **once**, above `SectionBrowseLayout`; content reads the shared per-scope cache via context. The active `sortKey` is read from `ctx.options.sort` **inside the content** (Music parity — sort is client-side).
3. **Per-scope cache keyed by the filter+term, NOT sort.** Key = `` `${categoryId}|${term}` `` — Podcast Index exposes **no sort parameter** (verified in `podcastIndexService.ts`), so sort is client-side and must **never re-key the scope** (toggling sort would otherwise waste a refetch every time).
4. **Scope state (Music shape):** `{items, maxRequested, hasLoaded, isLoading, isLoadingMore, error, categoryId, term}`; exported `EMPTY_SCOPE`; `scopes` record keyed per query tuple; per-key `seqRef` / `guardRef` drop stale responses.
5. **Growing-max pagination (no true offset).** `INITIAL_MAX = 25`, doubling each load-more to `MAX_RESULTS_PER_QUERY = 100`; `hasMore = items.length >= maxRequested && maxRequested < MAX`; 600ms load-more throttle (Movies parity).
6. **Trending "All".** `categoryId === 'all'` **and** no term → `getTrendingPodcasts(max)`; otherwise `searchPodcasts(term || categoryTitle, max)`. Search **combines** with the category filter.
7. **Sorting.** Server-side where the API allows; otherwise **client-side sort of the loaded slice** (Music pattern): copy-then-sort on a memo (`dep = items + sort`), never sort in place, re-sort on every append. **`recent` proxies via descending numeric `id`** — `PodcastResult` has no date field; feeds are added chronologically.
8. **Route-param boundary.** Nav type `categoryId?: number` (navigation/types.ts) vs FILTER **string** keys — normalize to a string key at the seed boundary so `useSectionOptions` can seed it (only `typeof value === 'string'` params are seeded).
9. **`retry` ≠ `refresh`.** `retry` invalidates seq + clears items + refetches `INITIAL_MAX`; `refresh` keeps items visible (gold pill, Movies parity).
10. **Cold-API policy.** A cold first query is expected latency, **not** an error — **never blind auto-retry**. Podcast Index TTLs warm after the first hit (IA precedent: `timeoutMs: 30_000`).

---

## 3. Architecture

```
PodcastsScreen.tsx                       (slim wrapper — Movies/Music shape)
 └─ <PodcastsDataProvider>               ← hook ONCE (`usePodcastsScreen()`), per-scope cache shared via context
     └─ <SectionBrowseLayout config={...}>
         ├─ SimbaStatusBar / InternalHeader / SearchBar ("Search podcasts…")
         ├─ FilterChips slot              (active category chip)
         ├─ {renderPodcastsContent(ctx)}  ← the ONLY Podcasts-specific part
         ├─ SectionFab (badge)
         └─ SectionOptionsSheet           (useSectionOptions)
```

### 3.1 Data flow

```
FILTER selection  ──▶ categoryId ('' → 'all')  ┐
SORT selection    ──▶ sortKey (recent | az)    ┘▶ scope key: `${categoryId}|${term}`  (sort NEVER re-keys)
shell search term ──▶ term (debounced)          ┘
                                    │
        scope cache (per key) ──────┘
                                    │
   isAllCategory (term empty + 'all')?  ──▶ getTrendingPodcasts(max)
                                    │
                        else ──▶ searchPodcasts(term || categoryTitle, max)
                                    │
               guardRef/seqRef stale-drop · dedupe by id
               initial = replace · load-more = append (max 25 → 100)
```

### 3.2 The hook (`usePodcastsScreen.ts`)

- `usePodcastsScreen()` — no params (Music parity; the active filter/sort live in the shell's `useSectionOptions`, and the scope snapshot records `categoryId`/`term` provenance).
- Return (Movies parity): `searchQuery / searchTerm / setSearchQuery / setSearchTerm / isSearchActive / getScope / ensureLoaded / loadMore / retry / refresh`.
- `fetchPage(categoryId, max, kind)` — kind `'initial' | 'more'`; `loadMore` throttled 600ms via `lastLoadMoreAtRef`.
- `sortPodcasts` (client-side): pure copy-then-sort by `sortKey` — `recent` → `b.id - a.id` (descending id), `az` → title localeCompare; memo `dep = [items, sortKey]` so appends re-sort automatically.
- **Deleted:** `PODCAST_TABS`, `selectTabByTitle`.

### 3.3 `renderPodcastsContent(ctx)`

Reads `ctx.options.filter` → `categoryId` ('' → `'all'`), `ctx.options.sort` → `sortKey`, bridges `ctx.query` → `setSearchTerm`. Renders `SectionContent` DATA MODE (`view: 'list'`, `keyExtractor: item.id`), rows = `PodcastRow`.

---

## 4. UI spec

### 4.1 PodcastRow

```
┌────────────────────────────────────────────┐
│ [60×60]  Title (bodySmall, 1 line)     › │
│   art   Author (caption secondary)    │
│         [◉ 142 episodes] (goldDim)        │
└────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| thumb | 60×60, `FastImage`, `borderRadius: radius.sm`; fallback = `music` icon in `goldDim` |
| title | `bodySmall`, 1 line (`numberOfLines={1}`), primary text |
| author | `caption`, secondary text |
| episode badge | goldDim text, e.g. "142 episodes" |
| chevron | `chevronRight`, secondary/dim |
| container | `backgroundColor: colors.background.elevated`, `borderRadius: radius.md`, `padding: spacing.sm`, `gap: spacing.md` |
| tap | `navigate('PodcastDetail', {podcastId: item.id, podcastTitle: item.title})` |

### 4.2 States (Movies parity)

| State | Slot |
|---|---|
| loading | centered pill ("Loading…" orb) |
| error | `ErrorState` + retry → `ctx.onRetry` (offline-aware copy) |
| empty | `EmptyState`, section-aware copy (e.g. "No podcasts found for “{term}”") |
| offline | shell banner strip over cached data |
| refresh | gold `RefreshControl` + floating "Refreshing…" pill (items stay visible) |
| load-more | in-flow 56px footer (orb "Loading more…" / tap-to-retry / "You're all caught up") |

### 4.3 Config (`sectionConfig.ts` Podcasts entry)

- FILTER = category, **single-select**, options from `PODCAST_CATEGORIES` **excluding 'all'** (keys = String(id))
- SORT = recent (default) / az
- VIEW = **list, omitted as an option** (the row is the brand)
- `search: {placeholder: 'Search podcasts…'}`
- `renderContent: renderPodcastsContent`

---

## 5. Files to touch

| File | Change |
|---|---|
| `src/screens/PodcastsScreen/hooks/usePodcastsScreen.ts` | **Rework** to Movies pattern: per-scope cache keyed `(categoryId, term)` — sort is client-side so it never re-keys — growing-max pagination 25→100, trending when all+no-term else search, client-side sort, exported `EMPTY_SCOPE`. **Delete** `PODCAST_TABS` / `selectTabByTitle`. |
| `src/screens/PodcastsScreen/PodcastsContent.tsx` | **New:** `PodcastsDataProvider` above shell + `renderPodcastsContent(ctx)` + `PodcastRow` (4.1). |
| `src/screens/PodcastsScreen/PodcastsScreen.tsx` | **Slim wrapper** (Movies/Music shape): config + `useSectionOptions` + provider + shell. **Delete** TabView/TabBar/tab-scene code. |
| `src/screens/sections/sectionConfig.ts` | Podcasts entry per 4.3. |
| `src/navigation/types.ts` / linking | `categoryId?: number` route param normalized to a string key at the seed boundary (rule 8). |

---

## 6. Verification (Movies parity gate — v10.1 §7 applied to Podcasts)

1. `npx tsc --noEmit` exits 0.
2. No `TabView` / `TabBar` / tab-scene imports anywhere in Podcasts.
3. FAB badge reflects the active category; chip mirrors the FILTER selection; tapping the chip clears to "All" (trending).
4. Deep-link `{categoryId}` opens Podcasts with the chip pre-seeded and the stream filtered (string-key normalization holds).
5. Search persists across category/sort changes and route changes; search combines with the category.
6. Pull-to-refresh works on empty/error screens; refresh keeps items visible; retry invalidates + refetches.
7. Per-scope cache: switching category/search/sort never refetches a previously visited combination.
8. Parity spot-checks vs Movies: cold first load completes within `timeoutMs` (no blind retry); load-more appends in order with the in-flow footer; list rows never stretch; `hasMore` compares against `maxRequested`, never a page index.

---

## 7. Rollback

The rework is a **screen-local** change (hook + content + wrapper + config entry). Reverting is per-commit and does not unwind the shared shell work. The v10.1 legacy `PodcastTabScene` code is deleted — the deprecated v10 docs and git history hold the tab-based design if ever needed.

---

## 8. History

- **10.2.0 (2026-08-19)** — Created. Podcasts wave split out of v10.1 Wave 10 into a dedicated spec + tracker because the replication is multi-phase. Encodes: per-scope cache key `(categoryId, term)` — sort is client-side (Podcast Index has no sort param) and never re-keys the scope — growing-max pagination 25→100 (no true offset), trending "All", client-side recent/az sort (recent = descending `id`), string-key route-param normalization, `PodcastRow` card spec, Movies parity gate. **(2026-08-19 update)** — corrected the cache key to the Music pattern (`sortKey` dropped from the key) after verifying the API exposes no sort parameter.
