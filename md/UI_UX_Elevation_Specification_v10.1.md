# SIMBA Mobile: UI/UX Elevation v10.1 — Unified Section Browse (FAB-ONLY)
## Specification

> **Document Version:** 10.1.0
> **Status:** ✅ **ACTIVE** — supersedes v10.0.0 (deprecated 2026-08-14)
> **Supersedes:** v10.0.0 (tab-based shell) — v10.1 removes tabs everywhere; filters live in the FAB options sheet.
> **Why:** The v10 tab shell proved too rigid. Every section had to define a tab list, but the real per-section variety is in **filters**, not tabs. Decision (2026-08-14, user): **no tabs anywhere — ONE stream per section + gold FAB → options sheet.** Tab machinery (`TabView` shell usage, `SectionTabBar`, `useSectionTabs`, `tabs[]`) is **deleted**, not carried forward.
> **Source issue (carried from v10):** The 8 Home section pages (Movies, Music, Radio, Live TV, Audiobooks, Podcasts, Shows, Archive) were hand-duplicated and drifted apart. A new user landing on Music after Movies sees a *different* "language", so they feel lost.

---

## 1. TL;DR

Unify all **8 section landing pages** onto **one config-driven screen shell** so every section feels like the same product. Every section gets the identical anatomy:

1. **SimbaStatusBar** (theme-aware, per-screen tint)
2. **InternalHeader** (title; count/actions as needed)
3. **SearchBar** (persists across filters/route; debounced; empty-state hint)
4. **FilterChips slot** *(optional)* — shows the **ACTIVE filter** as a chip (gold fill; tap = clear back to All / re-open the sheet). It is **feedback, not navigation** — never a tab bar.
5. **ONE content stream** — the section's cards in a FlatList (2-col grid ↔ 1-col list via FAB). **No tabs. No pager.**
6. **Gold SectionFab** (bottom-right, badge = active filter count) → **SectionOptionsSheet**:
   - **FILTER** group — single-select, scrollable (genres / categories / countries…)
   - **SORT** group — A–Z / Recent / Duration / Rating / Newest / Oldest…
   - **VIEW** group — Grid / List
   - **Reset** — clears filters + sort
7. States (loading skeleton, error + retry, empty, offline banner, gold pull-to-refresh) render **inside** the list.

The **"common way"** (the user-facing goal): a user who has used the Movies screen is instantly comfortable in Music — same shell, same FAB, same sheet, same chip behavior, same search. Only the cards differ.

---

## 2. Rules

1. **Cards may differ, shells may not.** Content is the only per-section part.
2. **The FAB is the only filter entrypoint.** No tabs, no pager, no inline filter bars, no header filter menus.
3. **2-tap filter switch** (FAB → select) is the **accepted tradeoff** — it buys unlimited filter scalability with **zero UI change** when a genre/category is added.
4. **Chips show the ACTIVE selection only.** Gold fill + inverse text; tap = clear back to "All" (fires `onSelect('')`).
5. **Search persists** — never cleared by a filter change, route param, or refresh. Switching sections returns to the same term (v10 `useSectionSearch` contract, unchanged).
6. **Provider above the shell** — the section's data hook runs **once**, above `SectionBrowseLayout`, so content shares ONE per-scope cache (no refetch when filters change back).
7. **Deep-links seed filters** — `{genre}` / `{categoryId}` / `{initialTab}` route params pre-select the FILTER group **and** its chip. They never select a tab (there are none).
8. **Tap-again-to-deselect** — tapping the active FILTER option clears it back to the default "All".
9. **Content states live in the list** — pull-to-refresh must work on empty/error screens (slots render inside the FlatList).
10. **RefreshControl is gold; density switch remounts the list** (`key={columns}`) so grid ↔ list can never render with a stale column count.

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
│   · 2-col grid ↔ 1-col list      │
│   · pagination (onEndReached)     │
│   · states INSIDE the list        │
│   · gold RefreshControl           │
└───────────────────────────────────┘
                     (Gold) FAB ────┐  badge = active filter count
┌── SectionOptionsSheet ────────────┘
│  FILTER  (scrollable, single-select)
│  SORT    (az / recent / duration …)
│  VIEW    (grid / list)
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

- **FILTER group:** single-select, scrollable list. Tapping the active option **again** clears to `{}` (back to "All"). Badge count = active filters + sort (view excluded).
- **SORT group:** client-side sort of the **loaded slice** (known trap — re-sort on every load-more append; `items` is a memo dep so it re-sorts automatically).
- **VIEW group:** Grid / List. The content list remounts on a column change (`key={section-list-${columns}}`).
- **Reset** clears filters + sort back to defaults.

### 3.5 FilterChips slot

- Derived from `options.filters` — one chip per active FILTER selection (e.g. `genre: 'rock'` → chip `Rock`).
- Rendered above the content; scrolls with it (ListHeaderComponent slot) — never fixed, never a tab bar.
- Active chip: gold fill + inverse text. Tap → clear (returns to "All").

### 3.6 States

| State | Slot |
|---|---|
| loading | `SkeletonList` (count 4) |
| error | `ErrorState` + retry → `ctx.onRetry` |
| empty | `EmptyState` (section-aware copy) |
| offline | shell banner strip over cached data |
| refresh | gold `RefreshControl` on the list root |

All slots render INSIDE the list so pull-to-refresh works on empty/error screens.

---

## 4. Per-section audit (FAB-only)

| Section | Default stream | FILTER group (single-select) | SORT | VIEW | Card |
|---|---|---|---|---|---|
| **Movies** | All (popular) | movie categories | newest / oldest / az / rating | grid / list | MovieCard |
| **Music** | All (popular Jamendo) | Jamendo genres | az / recent / duration | grid / list | TrackCard |
| **Radio** | all stations | country / language | az | list | StationRow |
| **Live TV** | all channels | category | az | list | ChannelCard |
| **Audiobooks** | all collections | genre | az / recent | grid / list | CollectionCard |
| **Podcasts** | all shows | category | recent / az | list | PodcastRow |
| **Shows** | all episodes | genre | recent / az | list | EpisodeRow |
| **Archive** | mixed | audio / video / collections | newest / oldest / az | grid / list | ArchiveCard |

Filter groups are finalized inside each wave's phase (the Wave-6 Movies/Music configs are the reference).

---

## 5. Architecture

```
MusicScreen / MoviesScreen        (slim shell wrappers)
 └─ <MusicDataProvider> / <MoviesDataProvider>      ← data hook ONCE, cache shared via context
     └─ <SectionBrowseLayout config={...}>
         ├─ SimbaStatusBar / InternalHeader / SearchBar
         ├─ FilterChips slot        (active filter chip)
         ├─ {config.renderContent(ctx)}              ← the ONLY per-section part
         ├─ SectionFab (badge = activeFilterCount)
         └─ SectionOptionsSheet     (useSectionOptions)
```

- `useSectionSearch(config, routeParams)` — shell-level search; persists across everything; `query` route-param pre-fill.
- `useSectionOptions(routeParams)` — `{filters, sort, view}`; `filters = {[key]: key}` (single-select); **seeded from routeParams**; **tap-again-to-deselect**.
- Per-scope data cache: keyed `(filter, searchTerm)`; seq/guard refs drop stale responses; auto-retry on reconnect; pagination via `onEndReached`.
- Search → the stream becomes a search-results stream (typed term replaces the filter drive; both can combine: term + filter).

**REMOVED (v10.1):** `TabView` shell usage, `SectionTabBar` (from the shell), `useSectionTabs`, `tabs[]` in config, tab-preselect logic. The legacy `SectionTabBar` component survives **only** for un-migrated screens (Shows, Archive) until their wave converts them; it is deleted in the Wave-12 cleanup.

---

## 6. Files to touch (v10.1)

**Shell / shared**
- `src/screens/sections/SectionBrowseLayout.tsx` — de-tab: single content slot, chips slot, FAB, sheet.
- `src/screens/sections/sectionConfig.ts` — config: `renderContent(ctx)`, no `tabs`; Movies/Music filter groups.
- `src/screens/sections/hooks/useSectionOptions.ts` — tap-again-to-deselect + routeParams filter seed.
- `src/screens/sections/hooks/useSectionSearch.ts` — unchanged.
- `src/screens/sections/components/SectionContent.tsx` — de-tab testID (`section-{route}-list`).
- `src/screens/sections/hooks/useSectionTabs.ts` — **deleted**.
- `src/screens/sections/components/SectionTabBar/SectionTabBar.tsx` — removed from shell; **deleted in Wave 12** (legacy consumers remain).

**Movies (flip to FAB-only, Wave 6.3)**
- `src/screens/MoviesScreen/MoviesContent.tsx` — `renderMoviesContent(ctx)`, category filter drives scope.
- `src/screens/MoviesScreen/MoviesScreen.tsx` — wrapper (unchanged shape).

**Music (Wave 6)**
- `src/services/api/jamendoService.ts` — paginated popular fetch (`page` param).
- `src/screens/MusicScreen/hooks/useMusicScreen.ts` — single `(genre, searchTerm)` scope.
- `src/screens/MusicScreen/MusicContent.tsx` — provider + `renderMusicContent` + TrackCard grid/list.
- `src/screens/MusicScreen/MusicScreen.tsx` — wrapper.

**Deep-links**
- `src/navigation/types.ts` / linking / HomeScreen — `{genre}` / `{categoryId}` / `{initialTab}` seed the FILTER group.

---

## 7. Verification

1. `npx tsc --noEmit` exits 0.
2. No `TabView` import in the shell/config; **no tab bar visible in any migrated section**.
3. FAB badge reflects active filters; chip mirrors the FILTER selection; tapping the chip clears to "All".
4. Deep-links (`{genre}`, `{categoryId}`) open the section with the chip pre-selected and the stream filtered.
5. Search persists across filter changes and route changes.
6. Pull-to-refresh works on empty/error screens; grid ↔ list toggle remounts cleanly.
7. A user fluent in Movies is comfortable in Music without a tab bar in sight.

---

## 8. Rollback

v10.1 is a **thinner** shell than v10.0.0 (single content slot vs TabView) — reverting is per-section-commit and does not unwind v10's shared states/cards work. The deprecated v10 docs remain as the full historical record of the tab-based design.

---

## 9. History

- **10.1.0 (2026-08-14)** — **FAB-only.** Tabs removed everywhere; shell simplified to a single content stream; Wave 6 (Music) + Wave 6.3 (Movies flip) are the reference implementations for all remaining sections.
- **10.0.0** — tab-based unified shell (deprecated; see the v10 spec file).

## 10. On the radar (NOT now)

- **Home consolidation** (user, 2026-08-14): later, the Home screen drops its multiple sections and becomes **one horizontal card rail** (movies, podcasts, etc. as cards) with no sub-sections. Explicitly **not in this scope** — revisit after all sections are on the FAB-only shell.
