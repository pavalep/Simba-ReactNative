# SIMBA Mobile: UI/UX Elevation v10.1 — Unified Section Browse (FAB-ONLY)
## Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v10.1.md`](UI_UX_Elevation_Specification_v10.1.md)
> **Supersedes:** v10.0.0 (tab-based shell) — **DEPRECATED 2026-08-14**, kept as historical record
> **Status:** 🔄 IN PROGRESS — Waves 1–6 done. **⭐ Movies is the reference screen** (user-confirmed ideal, 2026-08-19). Wave 10 (Podcasts) is the active replication target; Waves 7–9, 11–12 pending.
> **Purpose:** Land all 8 Home section pages (Movies, Music, Radio, Live TV, Audiobooks, Podcasts, Shows, Archive) on **one FAB-only browse shell**: `InternalHeader` + `SearchBar` + optional `FilterChips` (active-only) + **ONE content stream** + bottom-right `SectionFab` → `SectionOptionsSheet` (FILTER / SORT / VIEW). **No tabs anywhere.** Content/cards stay per-section. Sub-pages are explicitly **out of scope**.
> **Shape:** 12 WAVES · phases · ≥8 steps per phase · every phase has an **Error fix** and a **Validation** step.

---

## 0. Locked Decisions (do NOT revisit)

- **FAB-only is the universal pattern for ALL sections** — including Movies and Podcasts. Filters (genre/category/…) live in the FAB options sheet.
- **⭐ Movies is the reference implementation.** The user confirmed Movies is the ideal screen (~99% stable, 2026-08-19): *"the movies screen is 99% stable, lets replicate it to podcasts."* Every remaining section **replicates Movies** — same layout, same states, same polish — and swaps only its content: **card design, column count, and FILTER/SORT/VIEW groups differ per section; quality and layout are identical.**
- **Delete the old tab structure** — the v10 tab machinery that was "good for tabs" is not needed for this simpler way. During refactors, remove it (shell `TabView`, `SectionTabBar`, `useSectionTabs`, `tabs[]`), not keep it.
- **The "common way":** a user who visited Movies must feel instantly at home in every section — same shell, FAB, sheet, chip behavior. Only cards differ.
- **Flow (Movies reference):** search bar → default "All" stream → gold FAB → scrollable sheet where the user selects the category/genre; the selection appears as a selectable **chip**; tapping the chip (or the same sheet option again) clears back to "All".
- **Accepted tradeoff:** a filter switch costs **2 taps** (FAB → select) instead of one tab tap, in exchange for **unlimited genre scalability with zero UI changes**.
- **Future (NOT now, on the radar):** Home consolidates into **one horizontal card rail** (movies, podcasts, etc. as cards, no sub-sections) — revisit after all sections are on the FAB-only shell.

---

## Standing rules (carried from v10)

- Execute strictly against this tracker; verify each phase with `npx tsc --noEmit` exit 0.
- Commit each phase's code with `feat(...)`/`refactor(...)` message, then a **separate tracker backfill commit** `docs(v10.1): mark Phase X …`; commit gates when reached.
- Every phase ends with an **Error fix** step (scan for the phase's new failure modes) and a **Validation** step (tsc + visual).
- **Replication rule:** when migrating a section, read the Movies reference first (`MoviesContent.tsx` + `useMoviesScreen.ts`) and mirror its structure — provider above the shell, per-scope cache, states inside the list, in-flow footer, centered load/refresh pills, `timeoutMs` policy. Change ONLY the content.

---

## Completed (carried from v10 — see the deprecated v10 tracker for full phase detail)

| Wave | Scope | Status |
|---|---|---|
| 1 | Foundation & Config (`sectionConfig` registry, `SectionRouteParams`, section param types, `SectionRenderContext`) | ✅ done (v10) |
| 2 | Unified Shell (`SectionBrowseLayout`, `useSectionSearch`, `useSectionOptions`, `SectionContent` states) | ✅ done (v10) |
| 3 | FAB + Options sheet (`SectionFab` badge, `SectionOptionsSheet`, FILTER/SORT/VIEW groups) | ✅ done (v10) |
| 4 | FilterChips primitive (`FilterChips` single-select, gold active style) | ✅ done (v10) |
| 5 | Movies pilot (provider-above-shell, per-category scope cache, MovieCard grid, states, search persistence) | ✅ done (v10) — used **tabs**; **re-flipped to FAB-only in Wave 6.3** |

---

## WAVE 6: MUSIC + SHELL SIMPLIFICATION + MOVIES FLIP (⭐ FAB-only reference)

> **Design (locked):** search bar → "All" stream → gold FAB → sheet (Filter / Sort / Density). Selected filter = chip; tap chip or active option to clear. No tabs — the shell's `TabView` machinery is **removed**.

### Phase 6.1 — Shell simplification + Music on the simple shell
### Phase 6.2 — Music FAB sheet (genre/sort/density) + content + states
### Phase 6.3 — Movies flip to FAB-only (tabs removed)

**ALL DONE — see the v10.1 spec §6 for the exact file layout.**

### GATE 6 — Movies is now THE reference

- ✅ No tab bar in ANY migrated section (Movies, Music); shell has no `TabView`.
- ✅ Movies ⇄ Music filter/chip/FAB parity ("common way").
- ✅ Deep-links seed filters; search persists; states + refresh work.
- ✅ Old shell tab code (`useSectionTabs`) deleted; legacy `SectionTabBar` isolated to Shows/Archive.
- ✅ **Movies verified ~99% stable by the user (2026-08-19) → promoted to reference.** All remaining sections replicate it.
- ✅ Commit gate: `docs(v10.1): Wave 6 complete — FAB-only shell (Movies/Music)`.

---

## WAVES 7–12: remaining sections → FAB-only (replicate Movies)

> Each wave mirrors **Movies (the reference)** exactly: migrate the old screen onto the shell → define the FILTER group from its categories/genres → single stream + cards + states → **delete the old screen's tab code**. The old per-section TabView/`SectionTabBar` usage dies with its wave.

| Wave | Section | FILTER group | SORT | VIEW | Card |
|---|---|---|---|---|---|
| 7 | **Radio** | country / language | az | list | StationRow |
| 8 | **Live TV** | category | az | list | ChannelCard |
| 9 | **Audiobooks** | genre | az / recent | grid / list | CollectionCard |
| 10 | **Podcasts** ← **NEXT** | category (single-select) | recent / az | list | PodcastRow |
| 11 | **Shows** | genre | recent / az | list | EpisodeRow |
| 12 | **Archive** | audio / video / collections | newest / oldest / az | grid / list | ArchiveCard; **final cleanup: delete legacy `SectionTabBar`; audit remaining `react-native-tab-view` usage** |

> ⚠️ Note: the spec's §4 audit table is the single source of truth for each section's option groups — update it when a wave finalizes its groups.

---

## WAVE 10: PODCASTS — MOVIES REPLICATION (current work)

> **Design (locked):** replicates Movies exactly — same shell, same states, same polish. FILTER = category (single-select, default "All" → trending), SORT = recent/az, VIEW = **list** (PodcastRow is the brand; no grid). Per-scope cache keyed `(categoryId, searchTerm, sortKey)`; growing-max pagination (Podcast Index has no true offset — `max` doubles 25 → 100).
>
> 📄 **Dedicated execution docs:** this wave now runs under its own spec + tracker — [`UI_UX_Elevation_Specification_v10.2.md`](UI_UX_Elevation_Specification_v10.2.md) and [`UI_UX_Elevation_Progress_Tracker_v10.2.md`](UI_UX_Elevation_Progress_Tracker_v10.2.md) (created 2026-08-19). The phases below are the condensed version; v10.2 is canonical for Podcasts.

### Phase 10.1 — Podcasts hook rework to the Movies pattern

1. **Read the reference first:** `useMoviesScreen.ts` (per-scope cache, guardRef/seqRef, ensureLoaded/loadMore/retry/refresh).
2. **`usePodcastsScreen`:** scope state `{items, maxRequested, hasLoaded, isLoading, isLoadingMore, error, categoryId, sortKey, term}`; `EMPTY_SCOPE`; cache key `podcast|<categoryId>|<term>|<sortKey>`.
3. **Scope driving:** `categoryId` from the FILTER selection ('' → `'all'`), `sortKey` from the SORT selection, `term` from the shell search — same shape as Movies' `(categoryIds, searchTerm, sortKey)`.
4. **`fetchPage`:** `isAllCategory` (no term + category 'all') → `getTrendingPodcasts(max)`; else `searchPodcasts(term || categoryTitle, max)`; guardRef/seqRef dedupe + stale-drop; dedupe by `id`; initial replaces, more appends.
5. **Pagination:** `INITIAL_MAX = 25`, doubling to `MAX_RESULTS_PER_QUERY = 100`; `hasMore = items.length >= maxRequested && maxRequested < MAX`; 600ms load-more throttle (Movies parity).
6. **Sort:** server-side via the API (trending = natural; search supports sort by recent/az where the API allows) — otherwise client-side sort of the loaded slice (Music pattern). KISS: prefer whatever the API supports; document the choice.
7. **`retry`** invalidates seq, clears items, refetches INITIAL_MAX; **`refresh`** keeps items visible.
8. **Delete legacy tab machinery** from the hook (`PODCAST_TABS`, `selectTabByTitle`).
9. **Error fix:** type mismatch on route param (`categoryId?: number` in nav types vs `number | 'all'` legacy) — normalize the seed key to a string key at the boundary.
10. **Validation:** tsc exit 0; scope switches never double-fetch; stale responses dropped.

### Phase 10.2 — PodcastsContent (provider + card + renderContent)

1. **`PodcastsDataProvider`** above the shell — hook ONCE, context shared (Movies parity); `sortKey` prop fed from the screen's `optionsApi`.
2. **`renderPodcastsContent(ctx)`:** reads `ctx.options.filter` → `categoryId` ('' → `'all'`); `sortKey = ctx.options.sort`; bridges `ctx.query` → `setSearchTerm`.
3. **PodcastRow card** (from the legacy design, Movies-quality polish): 60×60 thumb (FastImage; `music` icon fallback in goldDim), title (bodySmall, 1 line), author (caption secondary), goldDim episode-count badge, chevronRight; `backgroundColor: colors.background.elevated`, `borderRadius: radius.md`, `padding: spacing.sm`, `gap: spacing.md`. List rows via `SectionContent` DATA MODE, `view: 'list'`.
4. **States — Movies parity:** centered load pill, refresh pill, in-flow footer (loading / tap-to-retry / "You're all caught up"), offline-aware ErrorState, section-aware EmptyState, gold RefreshControl.
5. **Podcast tap:** `navigate('PodcastDetail', {podcastId: item.id, podcastTitle: item.title})`.
6. **Config:** `sectionConfig.ts` — Podcasts entry: FILTER = category (single-select from `PODCAST_CATEGORIES`, excluding 'all'), SORT = recent/az, VIEW = list (no grid — the row IS the brand), `search: {placeholder: 'Search podcasts…'}`, `renderContent: renderPodcastsContent`.
7. **Slim wrapper:** `PodcastsScreen.tsx` = Movies/Music shape (config + `useSectionOptions` + provider + shell); **delete** the legacy TabView/TabBar/tab-scene code.
8. **Error fix:** no leftover `PodcastTabScene`/tab imports; deep-link seed (`categoryId`) vs default "All" conflict resolved.
9. **Validation:** tsc exit 0; **Movies parity spot-checks** (§7 of the spec): cold first load within `timeoutMs`, load-more appends in order, refresh keeps items visible, chip clears to All, search persists.
10. Commit `feat(podcasts): FAB-only Movies-replication`.

### GATE 10 — Podcasts is Movies-parity

- [ ] No tab bar; shell anatomy identical to Movies.
- [ ] FILTER (category) / SORT (recent/az) groups live in the FAB sheet; chip + badge behave like Movies.
- [ ] Trending "All" stream; search combines with the category filter.
- [ ] Deep-link `{categoryId}` seeds the chip + filtered stream.
- [ ] Per-scope cache: switching category/search/sort never refetches a cached scope.
- [ ] States + load-more footer + refresh pill match Movies; tsc exit 0.
- [ ] Commit gate: `docs(v10.1): Wave 10 complete — Podcasts (Movies reference)`.

---

## Completion Log

| Phase | Scope | Status |
|---|---|---|
| 1.x | Foundation & Config | ✅ (v10) |
| 2.x | Unified Shell | ✅ (v10) |
| 3.x | FAB + Options sheet | ✅ (v10) |
| 4.x | FilterChips primitive | ✅ (v10) |
| 5.x | Movies pilot (tabs) | ✅ (v10) |
| 6.1 | Shell simplification + Music shell | ✅ |
| 6.2 | Music FAB sheet + content + states | ✅ |
| 6.3 | Movies flip (FAB-only) → **⭐ reference** | ✅ |
| 7 | Radio | ⬜ *(config still `notImplemented` — do not mark done until `renderContent` lands)* |
| 8 | Live TV | ⬜ *(config still `notImplemented`)* |
| 9 | Audiobooks | ⬜ |
| 10 | Podcasts | ⬜ ← **in progress** |
| 11 | Shows | ⬜ |
| 12 | Archive + tab-code cleanup | ⬜ |

> A wave is ✅ only when its section's `SECTION_CONFIGS` entry has a real `renderContent` and the legacy screen's tab code is deleted. Radio/Live TV were previously over-marked; corrected 2026-08-19.

---

## Risks / Rollback

- **2-tap filter switch may feel slower** than tabs for power users — accepted tradeoff; the chip gives one-tap back to All.
- **Client-side sort on the loaded slice** is a known pagination trap — re-sort on every append (memo dep), never sort in place. Prefer server-side sort where the API supports it (Movies/IA pattern).
- **Podcast Index has no true offset pagination** — `max` grows 25 → 100; `hasMore` must compare against `maxRequested`, never against a page index.
- **Route-param type drift** (`categoryId?: number` vs `number | 'all'`) — normalize at the boundary so FILTER keys stay strings (seedable by `useSectionOptions`).
- **Cold-API first query** (IA = up to 30s on a cold CDN node) — expected latency, **not** an error; never blind auto-retry. Podcast Index TTLs are warm after the first hit.
- **Legacy `SectionTabBar`** must not leak into migrated sections — it is isolated to Shows/Archive until Wave 12 deletes it.
- **Rollback:** v10.1 shell is thinner than v10 — revert per-section commit; deprecated v10 docs hold the tab design if ever needed again.
