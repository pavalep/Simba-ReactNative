# SIMBA Mobile: UI/UX Elevation v10.1 — Unified Section Browse (FAB-ONLY)
## Specification

> **Document Version:** 10.1.0 — Movies-reference edition (2026-08-19)
> **Status:** ✅ **ACTIVE** — supersedes v10.0.0 (deprecated 2026-08-14)
> **Reference implementation:** **⭐ Movies is the IDEAL screen.** Verified ~99% stable by the user (2026-08-19) — every remaining section **replicates Movies**: same shell, same states, same polish, same edge-case handling. Only the content differs.
> **Supersedes:** v10.0.0 (tab-based shell) — v10.1 removes tabs everywhere; filters live in the FAB options sheet.
> **Why:** The v10 tab shell proved too rigid. Every section had to define a tab list, but the real per-section variety is in **filters**, not tabs. Decision (2026-08-14, user): **no tabs anywhere — ONE stream per section + gold FAB → options sheet.** Tab machinery (`TabView` shell usage, `SectionTabBar`, `useSectionTabs`, `tabs[]`) is **deleted**, not carried forward.
> **Source issue (carried from v10):** The 8 Home section pages (Movies, Music, Radio, Live TV, Audiobooks, Podcasts, Shows, Archive) were hand-duplicated and drifted apart. A new user landing on Music after Movies sees a *different* "language", so they feel lost.

---

## 0. The v10.1 contract (Movies = reference)

- **Layout is identical for every section.** Same shell anatomy (below), same search/chip/FAB/sheet behavior, same states (loading/error/empty/offline/refresh), same scroll polish.
- **Content is the only difference.** Per section: card design, column count, and the FILTER / SORT / VIEW option groups. Even that follows the Movies shape — option groups drive the per-scope data cache; `renderContent(ctx)` renders the cards.
- **Quality is uniform.** Every hardening fix from Movies (lonely-item width, placeholder-cover fallback, in-flow footer, centered load/refresh pills, cold-API `timeoutMs`, per-scope cache, stale-response guard) carries to each new section **by replication**, never by reinvention.
- **When in doubt, copy Movies.** A section that differs from Movies anywhere except its cards/columns/filters is a spec deviation.

---

## 1. TL;DR

Unify all **8 section landing pages** onto **one config-driven screen shell** so every section feels like the same product. Every section gets the identical anatomy:

1. **SimbaStatusBar** (theme-aware, per-screen tint)
2. **InternalHeader** (title; count/actions as needed)
3. **SearchBar** (persists across filters/route; debounced; empty-state hint)
4. **FilterChips slot** *(optional)* — shows the **ACTIVE filter** as a chip (gold fill; tap = clear back to All / re-open the sheet). It is **feedback, not navigation** — never a tab bar.
5. **ONE content stream** — the section's cards in a FlatList (grid or list, per section). **No tabs. No pager.**
6. **Gold SectionFab** (bottom-right, badge = active filter count) → **SectionOptionsSheet**:
   - **FILTER** group — the section's categories/genres (single- or multi-select, scrollable)
   - **SORT** group — A–Z / Recent / Duration / Rating / Newest / Oldest…
   - **VIEW** group — Grid / List *(omitted when the section's layout is its brand — see Movies)*
   - **Reset** — clears filters + sort
7. States (loading skeleton, error + retry, empty, offline banner, gold pull-to-refresh) render **inside** the list.

The **"common way"** (the user-facing goal): a user who has used the Movies screen is instantly comfortable in Music — same shell, same FAB, same sheet, same chip behavior, same search. Only the cards differ.

---

## 2. Rules

0. **Movies is the reference.** The Movies implementation (`MoviesContent.tsx` + `useMoviesScreen.ts`) is the template for every section. New sections replicate its structure and only swap content.
1. **Cards may differ, shells may not.** Content is the only per-section part.
2. **The FAB is the only filter entrypoint.** No tabs, no pager, no inline filter bars, no header filter menus.
3. **2-tap filter switch** (FAB → select) is the **accepted tradeoff** — it buys unlimited filter scalability with **zero UI change** when a genre/category is added.
4. **Chips show the ACTIVE selection only.** Gold fill + inverse text; tap = clear back to "All" (fires `onSelect('')`).
5. **Search persists** — never cleared by a filter change, route param, or refresh. Switching sections returns to the same term (v10 `useSectionSearch` contract, unchanged).
6. **Provider above the shell** — the section's data hook runs **once**, above `SectionBrowseLayout`, so content shares ONE per-scope cache (no refetch when filters change back). The active `sortKey` arrives as a prop from the screen's `optionsApi`.
7. **Deep-links seed filters** — `{genre}` / `{categoryId}` / `{initialTab}` route params pre-select the FILTER group **and** its chip. They never select a tab (there are none).
8. **Tap-again-to-deselect** — tapping the active FILTER option clears it back to the default "All".
9. **Content states live in the list** — pull-to-refresh must work on empty/error screens (slots render inside the FlatList).
10. **RefreshControl is gold; density switch remounts the list** (`key={columns}`) so grid ↔ list can never render with a stale column count.
11. **Per-scope cache keyed by the full query** — `(filter, searchTerm, sortKey)` so switching back to a previous filter/sort/search never refetches.

---

## 3. Unified Shell

### 3.1 Anatomy

```
┌───────────────────────────────────┐
│ SimbaStatusBar                    │
│ InternalHeader   (title)          │
│ SearchBar        (persists)       │
│ FilterChips      (active only)    │  ← optional slot, NOT a tab bar
├───────────────────────────────────┤
│ ONE content stream                │
│   · grid (per section) ↔ list     │
│   · pagination (onEndReached)     │
│   · states INSIDE the list        │
│   · gold RefreshControl           │
└───────────────────────────────────┘
                     (Gold) FAB ────┐  badge = active filter count
┌── SectionOptionsSheet ────────────┘
│  FILTER  (scrollable, per-section)
│  SORT    (per-section)
│  VIEW    (grid / list — optional)
│  Reset
└───────────────────────────────────┘
```

### 3.2 SectionBrowseConfig (descriptor)

```ts
type SectionBrowseConfig = {
  route: string;
  title: string;
  search: {placeholder: string; debounceMs?: number};
  options?: {groups: SectionOptionGroup[]};   // FILTER | SORT | VIEW (any order)
  quickChips?: FilterChipItem[];              // optional, future use
  renderContent: (ctx: SectionRenderContext) => ReactNode;  // the ONLY per-section part
};
```

**REMOVED vs v10:** `tabs[]`, `renderTab(tab, ctx)`, tab-bar machinery, route-preselect index logic. The shell renders exactly one content slot.

### 3.3 SectionRenderContext

```ts
type SectionRenderContext = {
  query: string;                  // debounced search term (shell-owned)
  activeChips: FilterChipItem[];  // derived from options.filters (FILTER selection)
  options: SectionOptions;        // {filters, sort, view} — single source of truth
  refreshing: boolean;
  offline: boolean;
  onRetry: () => void;
  routeParams: SectionRouteParams;
};
```

### 3.4 FAB → Options sheet

- **FILTER group:** the section's categories/genres. **Movies = multi-select** (categories OR'd in the query, `collapsedRowLimit` tucks the long tail behind SHOW MORE); **Music/Podcasts = single-select**. Tapping the active option **again** clears to `{}` (back to "All"). Badge count = active filters + sort (view excluded).
- **SORT group:** per section. **Movies = server-side** (IA `sort[]` param — no client sorting; pagination appends in order). **Music = client-side sort of the loaded slice** (known trap — re-sort on every load-more append; `items` is a memo dep so it re-sorts automatically).
- **VIEW group:** Grid / List. **Omitted on Movies** — its 2-col 16:9 hero grid IS the brand (see §4). When present, the content list remounts on a column change (`key={columns}`).
- **Reset** clears filters + sort back to defaults.

### 3.5 FilterChips slot

- Derived from `options.filters` — one chip per active FILTER selection (e.g. `filter: ['rock']` → chip `Rock`).
- Rendered above the content; scrolls with it (ListHeaderComponent slot) — never fixed, never a tab bar.
- Active chip: gold fill + inverse text. Tap → clear (returns to "All").

### 3.6 States

| State | Slot |
|---|---|
| loading | centered pill ("Loading…" orb) — Movies style, replaces the shared skeleton grid |
| error | `ErrorState` + retry → `ctx.onRetry` (offline-aware copy) |
| empty | `EmptyState` (section-aware copy) |
| offline | shell banner strip over cached data |
| refresh | gold `RefreshControl` on the list root + floating "Refreshing…" pill (items stay visible) |
| load-more | **in-flow 56px footer** (orb "Loading more…" / tap-to-retry / "You're all caught up") |

All slots render INSIDE the list so pull-to-refresh works on empty/error screens.

---

## 4. Per-section audit (FAB-only)

| Section | Default stream | FILTER group | SORT | VIEW | Card |
|---|---|---|---|---|---|
| **⭐ Movies** *(reference)* | All (IA natural order) | movie categories (**multi-select**, OR'd) | popular / newest / oldest / az / rating (**server-side**) | — (2-col 16:9 hero grid is the brand) | MovieCard (16:9 full-bleed, gradient scrim) |
| **Music** | All (popular Jamendo) | Jamendo genres (single-select) | az / recent / duration (client-side) | grid / list | TrackCard |
| **Radio** | all stations | country / language | az | list | StationRow |
| **Live TV** | all channels | category | az | list | ChannelCard |
| **Audiobooks** | all collections | genre | az / recent | grid / list | CollectionCard |
| **Podcasts** | all shows (trending) | category (single-select) | recent / az | list | PodcastRow |
| **Shows** | all episodes | genre | recent / az | list | EpisodeRow |
| **Archive** | mixed | audio / video / collections | newest / oldest / az | grid / list | ArchiveCard |

Filter groups are finalized inside each wave's phase — **the Movies config is the reference** (§2 rule 0). Every section's `options.groups` follow the same shape; only the option lists differ.

---

## 5. Architecture

```
MoviesScreen / MusicScreen / PodcastsScreen    (slim shell wrappers)
 └─ <MoviesDataProvider> / <MusicDataProvider> / <PodcastsDataProvider>  ← data hook ONCE, cache shared via context
     └─ <SectionBrowseLayout config={...}>
         ├─ SimbaStatusBar / InternalHeader / SearchBar
         ├─ FilterChips slot        (active filter chip)
         ├─ {config.renderContent(ctx)}              ← the ONLY per-section part
         ├─ SectionFab (badge = activeFilterCount)
         └─ SectionOptionsSheet     (useSectionOptions)
```

- `useSectionSearch(config, routeParams)` — shell-level search; persists across everything; `query` route-param pre-fill.
- `useSectionOptions(routeParams)` — `{filters, sort, view}`; **seeded from routeParams**; **tap-again-to-deselect**; the merged record is the single source of truth read by the provider above the shell.
- Per-scope data cache (Movies reference): keyed `(filter, searchTerm, sortKey)`; seq/guard refs drop stale responses; `ensureLoaded`/`loadMore`/`retry`/`refresh`; pagination via `onEndReached`.
- Search → the stream becomes a search-results stream (typed term replaces the filter drive; both can combine: term + filter).
- Cold-API timeout policy: per-API `timeoutMs` in `ApiConfig` (IA = 30s). A cold first query is expected latency — **no blind auto-retry**.

**REMOVED (v10.1):** `TabView` shell usage, `SectionTabBar` (from the shell), `useSectionTabs`, `tabs[]` in config, tab-preselect logic. The legacy `SectionTabBar` component survives **only** for un-migrated screens (Shows, Archive) until their wave converts them; it is deleted in the Wave-12 cleanup.

---

## 6. Files to touch (v10.1)

**Shell / shared (done — Wave 1–4)**
- `src/screens/sections/SectionBrowseLayout.tsx` — single content slot, chips slot, FAB, sheet.
- `src/screens/sections/sectionConfig.ts` — config: `renderContent(ctx)`, no `tabs`; per-section option groups.
- `src/screens/sections/hooks/useSectionOptions.ts` — tap-again-to-deselect + routeParams filter seed.
- `src/screens/sections/hooks/useSectionSearch.ts` — unchanged.
- `src/screens/sections/components/SectionContent.tsx` — DATA MODE scaffold (grid/list math, states, testID).
- `src/screens/sections/hooks/useSectionTabs.ts` — **deleted**.
- `src/screens/sections/components/SectionTabBar/SectionTabBar.tsx` — removed from shell; **deleted in Wave 12** (legacy consumers remain).

**⭐ Movies — DONE, the reference (Wave 6.3)**
- `src/screens/MoviesScreen/MoviesContent.tsx` — `renderMoviesContent(ctx)`, provider above shell, category filter drives scope, 2-col hero grid.
- `src/screens/MoviesScreen/MoviesScreen.tsx` — wrapper.
- `src/screens/MoviesScreen/hooks/useMoviesScreen.ts` — per-scope cache keyed `(categoryIds, searchTerm, sortKey)`, server-side IA sort.

**Music — DONE (Wave 6)**
- `src/services/api/jamendoService.ts` — paginated popular fetch (`page` param).
- `src/screens/MusicScreen/hooks/useMusicScreen.ts` — single `(genre, searchTerm)` scope.
- `src/screens/MusicScreen/MusicContent.tsx` — provider + `renderMusicContent` + TrackCard grid/list.
- `src/screens/MusicScreen/MusicScreen.tsx` — wrapper.

**Podcasts — NEXT (Wave 10, Movies replication)**
- `src/screens/PodcastsScreen/hooks/usePodcastsScreen.ts` — rework to Movies pattern: per-scope cache keyed `(categoryId, searchTerm, sortKey)`, growing-max pagination (25 → 100), trending when "all" + no term, search otherwise.
- `src/screens/PodcastsScreen/PodcastsContent.tsx` — **new**: `PodcastsDataProvider` above the shell + `renderPodcastsContent(ctx)` + PodcastRow card (60×60 thumb, title/author, episode-count badge, chevron).
- `src/screens/PodcastsScreen/PodcastsScreen.tsx` — slim wrapper (Movies/Music shape); delete legacy TabView/TabBar scenes.
- `src/screens/sections/sectionConfig.ts` — Podcasts entry: FILTER = category (single-select from `PODCAST_CATEGORIES`), SORT = recent/az, VIEW = list, `renderContent: renderPodcastsContent`.

**Deep-links**
- `src/navigation/types.ts` / linking / HomeScreen — `{genre}` / `{categoryId}` / `{initialTab}` seed the FILTER group.

---

## 7. Verification (Movies parity gate)

A section passes when it is **indistinguishable in behavior and polish from Movies**:

1. `npx tsc --noEmit` exits 0.
2. No `TabView` import in the shell/config; **no tab bar visible in any migrated section**.
3. FAB badge reflects active filters; chip mirrors the FILTER selection; tapping the chip clears to "All".
4. Deep-links (`{genre}`, `{categoryId}`) open the section with the chip pre-selected and the stream filtered.
5. Search persists across filter changes and route changes.
6. Pull-to-refresh works on empty/error screens; grid ↔ list toggle remounts cleanly.
7. A user fluent in Movies is comfortable in every section without a tab bar in sight.
8. Parity spot-checks vs Movies: cold first load never times out below the API `timeoutMs`; load-more appends in order with the in-flow footer; lonely trailing card never stretches; refresh keeps items visible.

---

## 8. Rollback

v10.1 is a **thinner** shell than v10.0.0 (single content slot vs TabView) — reverting is per-section-commit and does not unwind v10's shared states/cards work. The deprecated v10 docs remain as the full historical record of the tab-based design.

---

## 9. History

- **10.1.0 (2026-08-19)** — **Movies-reference edition.** User confirms Movies is the ideal screen (~99% stable) and orders the remaining sections (Podcasts first) to **replicate Movies** — layout identical, content (cards/columns/filters) per-section, quality uniform. Specification updated to encode this contract (§0, §2 rule 0, §7 parity gate).
- **10.1.0 (2026-08-14)** — **FAB-only.** Tabs removed everywhere; shell simplified to a single content stream; Wave 6 (Music) + Wave 6.3 (Movies flip) land the first two sections.
- **10.0.0** — tab-based unified shell (deprecated; see the v10 spec file).

## 10. On the radar (NOT now)

- **Home consolidation** (user, 2026-08-14): later, the Home screen drops its multiple sections and becomes **one horizontal card rail** (movies, podcasts, etc. as cards) with no sub-sections. Explicitly **not in this scope** — revisit after all sections are on the FAB-only shell.
