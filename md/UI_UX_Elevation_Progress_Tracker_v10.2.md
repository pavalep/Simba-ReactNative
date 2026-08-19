# SIMBA Mobile: UI/UX Elevation v10.2 — Podcasts Movies-Replication
## Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v10.2.md`](UI_UX_Elevation_Specification_v10.2.md)
> **Umbrella:** v10.1 (Movies-reference edition) — Wave 10. v10.2 is the dedicated execution doc for the Podcasts wave.
> **Status:** 🔄 IN PROGRESS — Phases 10.1–10.2 pending.
> **Purpose:** Land **Podcasts** on the FAB-only browse shell as an exact **Movies replication** — same layout, same states, same polish; content only (PodcastRow list, category FILTER, recent/az SORT, fixed list VIEW).
> **Shape:** 2 phases · 10 steps each · every phase has an **Error fix** and a **Validation** step · one **GATE** with a commit.
> **Reference to read first:** `useMoviesScreen.ts` + `MoviesContent.tsx` (⭐ Movies, ~99% stable, user-confirmed 2026-08-19).

---

## 0. Locked Decisions (do NOT revisit)

- **Movies is the reference.** Podcasts replicates it; only content differs.
- **No tabs anywhere.** `PODCAST_TABS`, `selectTabByTitle`, `TabView`, `TabBar`, `PodcastTabScene` are **deleted**, not carried forward.
- **Per-scope cache keyed by the filter+term, NOT sort:** `` `${categoryId}|${term}` `` — the API exposes **no sort parameter** (verified in `podcastIndexService.ts`), so sort is client-side and must **never re-key** the scope (else every sort toggle wastes a refetch). Music pattern.
- **Growing-max pagination:** Podcast Index has **no true offset** — `INITIAL_MAX = 25` doubles to `MAX_RESULTS_PER_QUERY = 100`; `hasMore = items.length >= maxRequested && maxRequested < MAX`.
- **Trending "All":** `categoryId === 'all'` + no term → `getTrendingPodcasts(max)`; else `searchPodcasts(term || categoryTitle, max)`. Search combines with the category.
- **Client-side sort:** API exposes no sort param. `recent` = descending numeric `id` (no date field on `PodcastResult`; feeds added chronologically), `az` = title. Copy-then-sort on a memo (`dep = items + sort`); never sort in place.
- **Route-param boundary:** `categoryId?: number` (nav types) normalized to a **string** key at the seed boundary so `useSectionOptions` seeds it (string-typed params only).
- **Cold-API policy:** cold first query = expected latency, never blind auto-retry (IA precedent: `timeoutMs: 30_000`).

---

## Standing rules (inherited from v10.1)

- Execute strictly against this tracker; verify each phase with `npx tsc --noEmit` exit 0.
- Commit each phase's code with `feat(...)`/`refactor(...)` message, then a **separate tracker backfill commit** `docs(v10.2): mark Phase X …`; commit the gate when reached.
- Every phase ends with an **Error fix** step (scan for the phase's new failure modes) and a **Validation** step (tsc + visual).
- **Replication rule:** mirror Movies' structure exactly — provider above the shell, per-scope cache, states inside the list, in-flow footer, centered load/refresh pills, `timeoutMs` policy. Change ONLY the content.

---

## PHASE 10.1 — Podcasts hook rework to the Movies pattern

> **Goal:** `usePodcastsScreen.ts` becomes a Movies-shaped hook: per-scope cache, growing-max pagination, trending/search routing, client-side sort, stale-drop.

1. **Read the reference first:** `useMoviesScreen.ts` (per-scope cache, `guardRef`/`seqRef`, `ensureLoaded`/`loadMore`/`retry`/`refresh`, 600ms load-more throttle).
2. **`usePodcastsScreen`:** scope state `{items, maxRequested, hasLoaded, isLoading, isLoadingMore, error, categoryId, term}`; **exported** `EMPTY_SCOPE`; cache key `` `${categoryId}|${term}` `` (sort excluded — Music pattern).
3. **Scope driving:** `categoryId` from the FILTER selection ('' → `'all'`), `term` from the shell search — Music's `(genre, searchTerm)` shape (sort is client-side in the content, never in the key).
4. **`fetchPage`:** `isAllCategory` (no term + category `'all'`) → `getTrendingPodcasts(max)`; else `searchPodcasts(term || categoryTitle, max)`; `guardRef`/`seqRef` dedupe + stale-drop; dedupe by `id`; initial replaces, more appends.
5. **Pagination:** `INITIAL_MAX = 25`, doubling to `MAX_RESULTS_PER_QUERY = 100`; `hasMore = items.length >= maxRequested && maxRequested < MAX`; 600ms load-more throttle (Movies parity).
6. **Sort:** client-side (API exposes no sort param — documented): `recent` = descending `id`, `az` = title; copy-then-sort on a memo (`dep = items + sort`), never in place, re-sort on append.
7. **`retry`** invalidates seq, clears items, refetches `INITIAL_MAX`; **`refresh`** keeps items visible.
8. **Delete legacy tab machinery** from the hook (`PODCAST_TABS`, `selectTabByTitle`).
9. **Error fix:** route-param type drift (`categoryId?: number` vs FILTER string keys) — normalize the seed key to a string at the boundary; ensure `''`/`'all'` never double-fetch the same stream.
10. **Validation:** `npx tsc --noEmit` exit 0; scope switches never double-fetch; stale responses dropped; sort memo re-sorts on append.

## PHASE 10.2 — PodcastsContent (provider + card + renderContent) + slim wrapper + config

> **Goal:** the Movies-parity Podcasts screen: `PodcastsDataProvider` above the shell, `PodcastRow` list, states, config entry, legacy tab code deleted.

1. **`PodcastsDataProvider`** above the shell — hook ONCE (`usePodcastsScreen()`), context shared (Music parity — no sort prop; sort is client-side in the content).
2. **`renderPodcastsContent(ctx)`:** reads `ctx.options.filter` → `categoryId` ('' → `'all'`); `sortKey = ctx.options.sort`; bridges `ctx.query` → `setSearchTerm`; `sortedItems = useMemo(() => sortPodcasts(items, sortKey), [items, sortKey])`.
3. **PodcastRow card** (spec §4.1): 60×60 thumb (FastImage; `music` icon fallback in goldDim), title (`bodySmall`, 1 line), author (`caption` secondary), goldDim episode-count badge, `chevronRight`; container `backgroundColor: colors.background.elevated`, `borderRadius: radius.md`, `padding: spacing.sm`, `gap: spacing.md`. Rendered via `SectionContent` DATA MODE, `view: 'list'`.
4. **States — Movies parity:** centered load pill, refresh pill, in-flow footer (loading / tap-to-retry / "You're all caught up"), offline-aware ErrorState, section-aware EmptyState, gold RefreshControl.
5. **Podcast tap:** `navigate('PodcastDetail', {podcastId: item.id, podcastTitle: item.title})`.
6. **Config:** `sectionConfig.ts` — Podcasts entry: FILTER = category (single-select from `PODCAST_CATEGORIES`, excluding `'all'`), SORT = recent/az, VIEW = list (fixed, omitted — the row IS the brand), `search: {placeholder: 'Search podcasts…'}`, `renderContent: renderPodcastsContent`.
7. **Slim wrapper:** `PodcastsScreen.tsx` = Movies/Music shape (config + `useSectionOptions` + provider + shell); **delete** legacy TabView/TabBar/tab-scene code.
8. **Error fix:** no leftover `PodcastTabScene`/tab imports; deep-link seed (`categoryId`) vs default "All" conflict resolved via string-key normalization.
9. **Validation:** `npx tsc --noEmit` exit 0; **Movies parity spot-checks** (spec §6): cold first load within `timeoutMs`, load-more appends in order, refresh keeps items visible, chip clears to All, search persists + combines.
10. Commit `feat(podcasts): FAB-only Movies-replication`.

---

## GATE 10 — Podcasts is Movies-parity

- [ ] No tab bar; shell anatomy identical to Movies.
- [ ] FILTER (category) / SORT (recent/az) groups live in the FAB sheet; chip + badge behave like Movies.
- [ ] Trending "All" stream; search combines with the category filter.
- [ ] Deep-link `{categoryId}` seeds the chip + filtered stream.
- [ ] Per-scope cache: switching category/search/sort never refetches a cached scope.
- [ ] States + load-more footer + refresh pill match Movies; `npx tsc --noEmit` exit 0.
- [ ] Commit gate: `docs(v10.2): Wave 10 complete — Podcasts (Movies reference)`.

---

## Completion Log

| Phase | Scope | Status |
|---|---|---|
| 10.1 | Hook rework to Movies pattern (per-scope cache, growing-max pagination, trending/search, client-side sort) | ✅ done |
| 10.2 | PodcastsContent (provider + PodcastRow + renderContent) + slim wrapper + config | ✅ done |
| GATE 10 | Movies parity + commit gate | ⬜ pending (runtime parity spot-checks + commits) |

---

## Risks / Rollback

- **Client-side sort on the loaded slice** is a known pagination trap — re-sort on every append (memo dep), never sort in place.
- **Podcast Index has no true offset pagination** — `max` grows 25 → 100; `hasMore` must compare against `maxRequested`, never a page index.
- **Route-param type drift** (`categoryId?: number` vs string FILTER keys) — normalize at the seed boundary so keys stay strings (seedable by `useSectionOptions`).
- **Cold-API first query** (Podcast Index TTLs warm after first hit) — expected latency, not an error; never blind auto-retry.
- **Legacy tab code leak** — `PODCAST_TABS` / `selectTabByTitle` / tab-scene imports must be deleted in the same wave, not orphaned.
- **Rollback:** screen-local change (hook + content + wrapper + config); revert per-commit; v10 docs/git hold the tab design.
