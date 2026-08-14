# SIMBA Mobile: UI/UX Elevation v10 — Unified Section Browse Pattern
## Specification

> **Document Version:** 10.0.0
> **Status:** 🔄 **IN PROGRESS** — plan approved; execution tracked in the v10 Progress Tracker
> **Supersedes:** v9 (per-section SVG icon pass) — this spec builds on top of it, not against it
> **Source issue:** The 8 Home section pages (Movies, Music, Radio, Live TV, Audiobooks, Podcasts, Shows, Archive) each follow roughly the same layout formula — `InternalHeader` + `SearchBar` + `TabView` — but they are **hand-duplicated and drifted apart**: 4 different tab-source patterns, 5 different chip implementations, tab-bar styling drift, 2 sections missing pull-to-refresh + offline handling, and no consistent way to expose per-section filters. A new user landing on Music after Movies sees a *different* "language", so they feel lost.

---

## 1. TL;DR

Unify all **8 section landing pages** onto **one config-driven screen shell** so every section feels like the same product. Each section page gets the identical anatomy:

1. `SimbaStatusBar` → `InternalHeader` (back + title + right action slot)
2. Shared `SearchBar` (section-scoped placeholder, state persists across tabs)
3. Optional `FilterChips` row (quick filters — only where the section needs them, same look everywhere)
4. `TabView` with the **same tab-bar contract** (gold 3px indicator, `typography.tab`, scrollable, lazy)
5. **Content area that stays per-section** — cards, grids, and list densities are *allowed* to differ (user decision: "content can be different, but cards style can differ")
6. **`SectionFab` on the bottom-right** → opens a `SectionOptionsSheet` (shared `BottomSheet`) with section-specific options: extra filters, sort order, view density — one discoverable pattern for "more things this section can do"

The driver for this is a new **`SectionBrowseConfig`** descriptor: every screen becomes a data-driven component (`SectionBrowseLayout`) + a config object. No screen keeps its own copy of the header/search/tab logic.

**Scope:** the 8 main section pages **only**. Sub-pages (detail screens, Genre, Album, Song, player, etc.) are explicitly **out of scope** — "sub pages we will handle next, not now".

---

## 2. The Problem (for posterity)

A new user opens the app, taps through Home rails, and each section speaks a slightly different UI dialect:

| # | Pain point | Where it lives today |
|---|---|---|
| 1 | **4 different tab-source patterns** — constants (`MOVIE_CATEGORIES`, `PODCAST_CATEGORIES`), hook exports (`MUSIC_TABS`, `RADIO_TABS`, `LIVE_TV_TABS`), local arrays (Audiobooks, Shows), inline routes (Archive) | All 8 screens |
| 2 | **Tab-bar styling drift** — Archive/Shows use `hairlineWidth` borders + hardcoded rgba, Music's `TabView` lacks the `style` prop other screens have | `ArchiveScreen.tsx`, `ShowsScreen.tsx`, `MusicScreen.tsx` |
| 3 | **5 different chip implementations** — `ScrollView` of genre chips (Music), `TagChips` FlatList (Radio), `CategoryChips` (Live TV), wrapping `View` of 20 genres (Audiobooks), `ARCHIVE_QUICK_SEARCHES` chips (Archive) | Music, Radio, Live TV, Audiobooks, Archive |
| 4 | **No shared FAB / options pattern** — two inline FABs exist (Library gold 56×56 "+", Home play) but sections have none; filters are buried or missing | All 8 sections |
| 5 | **Missing pull-to-refresh + offline handling** | Movies, Audiobooks |
| 6 | **Inconsistent empty/error states** — Music has unique "prompt" empties, Movies uses `Placeholder` + toast retry | Music, Movies |
| 7 | **Route params from Home shelves** (`initialTab` / `categoryId` / `genre` / `query`) work on some screens but are honored inconsistently | Movies ✓, Shows partial, others mixed |

The v10 unification removes the *shell* divergence while explicitly preserving the *content* divergence.

---

## 3. The Unified Pattern (the one style every section lands on)

### 3.1 Section anatomy (identical for all 8)

```
┌──────────────────────────────────────┐
│ SimbaStatusBar                       │
│ ┌────────┬────────────────┬────────┐ │
│ │ ← back │     TITLE      │  right │ │  InternalHeader (unchanged, shared)
│ └────────┴────────────────┴────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🔍  Search <section>…            │ │  SearchBar (shared, section placeholder)
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ [All] [Genre] [Genre]   ⋮ more   │ │  FilterChips (optional, shared) — "quick"
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │   TAB 1 │ TAB 2 │ TAB 3 │  +  →  │ │  TabBar (shared contract, gold 3px)
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │      Content area (per-section)  │ │  Cards / grids / lists MAY differ
│ │      — cards can differ          │ │
│ └──────────────────────────────────┘ │
│                      ┌────────────┐  │
│                      │    ✦ FAB   │  │  SectionFab (shared, bottom-right)
│                      └─────┬──────┘  │
│                            └► SectionOptionsSheet (shared BottomSheet)
│                               • Filters (full list)  • Sort  • View density
└──────────────────────────────────────┘
```

Rules that make a new user never feel lost:

1. **Same frame everywhere** — header, search, tabs, FAB render at the exact same coordinates on all 8 sections.
2. **Search means the same thing** — filters the currently selected tab's list; query text persists across tab switches and section re-entry.
3. **The FAB is the "more" button** — one consistent affordance. Whatever a section can do beyond the default tab view (extra filters, sort, density) lives in the bottom sheet.
4. **Quick chips are optional and identical when present** — same chip style, same selection behavior (single-select toggle by default), same `count` badge language.
5. **Cards may differ, shells may not** — per the user's direction, card style per section stays (MovieCard grid ≠ StationCard list), but they must render inside the same grid/list scaffolding with the same loading/empty/error language.

### 3.2 The `SectionBrowseConfig` descriptor

```ts
// src/screens/sections/sectionConfig.ts (new — the single source of truth)

export interface SectionBrowseConfig {
  /** Route key that this section is registered under in RootStackParamList */
  route: SectionRouteKey;            // 'MoviesScreen' | 'MusicScreen' | …

  title: string;                     // header title

  /** Where the shared SearchBar sits. Always on. */
  search: {
    placeholder: string;
    debounceMs?: number;             // default 300
  };

  /** The tab bar. Unified source — one shape for all 8. */
  tabs: SectionTab[];                // {key, title}[] + lazy/scroll flags are global

  /** Optional quick-filter chips rendered below search. */
  quickChips?: {
    source: (string)[] | ((ctx) => string[]);
    singleSelect?: boolean;          // default true
    initialKey?: string;
  };

  /** What the FAB → options sheet exposes. */
  options?: {
    groups: OptionGroup[];           // 'filter' | 'sort' | 'view'
  };

  /** Content renderer per tab — the ONLY per-section part. */
  renderTab: (tab: SectionTab, ctx: SectionRenderContext) => React.ReactNode;
}
```

`SectionRenderContext` carries: current `query`, active chips, option state (sort/filter/view), refresh/offline flags, and the section's navigation params (`initialTab`, `categoryId`, `genre`, `query`).

### 3.3 FAB → Options sheet pattern (the "may be a fab on right?" — yes)

- **`SectionFab`** — shared, 56×56, `radius.pill`, gold accent (`colors.accent`), `SvgIcon` (sliders/filter glyph per section icon set), `accessibilityLabel` from config, `zIndex` above tab content, safe-area bottom inset.
- **`SectionOptionsSheet`** — wraps the existing shared `BottomSheet` (`snapPoints={['40%','75%']}`, drag-dismiss, Android back handled). Content is generated from config `options.groups`:
  - `filter` group → `FilterChips` in vertical list form (single-select)
  - `sort` group → radio rows (e.g., Movies: Newest / Oldest / A–Z / Rating)
  - `view` group → density toggle (grid 2-col / list)
- Option state is **per-section, in-memory** (v10: no persistence required; persisting favorites is out of scope — Radio favorites already persist via its own hook and are untouched).
- If a section's options sheet would be empty → FAB hidden for that section (config-driven).

### 3.4 Chips vs. FAB — when to use which

- **Quick chips (FilterChips):** 2–6 high-frequency filters the user reaches for immediately (Radio top languages, Live TV category jump, Archive quick searches, Music genre shortcuts).
- **Options sheet:** everything else — full genre list (20+), sort orders, view density, secondary filters.

---

## 4. Section-by-Section Audit (which pages need the rework)

| # | Section page | Current state (audited) | v10 rework |
|---|---|---|---|
| 1 | `MoviesScreen` | `InternalHeader` "Movies" ✓ · `SearchBar` "Search movies…" ✓ · `TabView` of `MOVIE_CATEGORIES` (9 tabs) ✓ · 2-col `MovieCard` grid · `Placeholder` + toast retry · **no RefreshControl / offline** | Migrate to shell + config. Add refresh + offline. Add FAB options (sort: Newest/Oldest/A–Z/Rating; density). Tabs from config. |
| 2 | `MusicScreen` | `MUSIC_TABS` from hook · genre chips via horizontal `ScrollView` (`JAMENDO_GENRES`) · single-col `TrackCard` · **`TabView` lacks `style` prop** · unique "prompt" empty states | Tabs from config. Chips → `FilterChips`. Standardize empty states. Add FAB (genre filter, sort). Fix `TabView` style parity. |
| 3 | `RadioScreen` | `RADIO_TABS` from hook (top/genres/countries/languages/favorites) · `TagChips` FlatList as ListHeader · `StationCard` · long-press `OptionSheetDialog` / `PlaylistSheet` | Tabs from config. Chips → `FilterChips`. **Preserve long-press sheets untouched.** Add FAB (language/country quick filter). |
| 4 | `LiveTVScreen` | `LIVE_TV_TABS` (all/categories/favorites) · `CategoryChips` · `ChannelCard` | Tabs from config. Chips → `FilterChips`. Add FAB (category jump, sort A–Z/HD). |
| 5 | `AudiobooksScreen` | local `TABS` (search/genres/New Releases) · wrapping `View` genre chips from `LIBRIVOX_GENRES` (20 genres) also rendered inside empty state · **no RefreshControl / offline** | Tabs from config. Chips → `FilterChips` wrap mode. Add refresh + offline. Add FAB (genre list, sort). |
| 6 | `PodcastsScreen` | tabs = `PODCAST_CATEGORIES.slice(0,12)` · `PodcastCard` | Tabs from config. Add FAB (sort, density). |
| 7 | `ShowsScreen` | local `TABS` (search/today/browse) · accepts `initialTab`/`initialGenre` params but **no chip UI** | Tabs from config. Wire `initialTab`/`initialGenre` → chips + selected tab. Add FAB. |
| 8 | `ArchiveScreen` | inline routes (audio/video) · `ARCHIVE_QUICK_SEARCHES` chips below SearchBar · **tab styling drift** (fontSize 14, `hairlineWidth` border, hardcoded rgba) | Tabs from config. Chips → `FilterChips`. Kill styling drift → shared tab-bar contract. Add FAB (format filter, sort). |

**Pages NOT reworked in v10 (deferred):** all sub/detail pages — `MovieDetailScreen`, `MusicDetailScreen`, `RadioScreen` long-press sheets, `AudiobookDetailScreen`, `PodcastDetailScreen`, `ShowDetailScreen`, `GenreScreen`, `Album`, `Artist`, `Song`, `NowPlaying`, players, `SearchScreen`, `LibraryScreen` FAB (kept as-is; its inline FAB becomes the precedent the new `SectionFab` generalizes, but is not migrated).

---

## 5. Architecture

```
src/screens/sections/                    (NEW — the unified browse system)
├── sectionConfig.ts                     SectionBrowseConfig type + the 8 configs
├── SectionBrowseLayout.tsx              One screen shell (header+search+chips+tabs+FAB)
├── components/
│   ├── SectionFab.tsx                   Shared FAB (bottom-right, gold)
│   ├── SectionOptionsSheet.tsx          BottomSheet wrapper driven by config options
│   └── SectionContent.tsx               Grid/List scaffolding + states (loading/error/empty/offline)
└── hooks/
    ├── useSectionTabs.ts                Tab-source normalizer (4 patterns → 1)
    ├── useSectionSearch.ts              Debounced query state, persists across tabs
    └── useSectionOptions.ts             Options state (filter/sort/view) per section

src/components/utility/FilterChips/      (NEW — shared chip row)
src/screens/{Movies,Music,Radio,LiveTV,Audiobooks,Podcasts,Shows,Archive}Screen/
    └── *Screen.tsx                      Slim down to: <SectionBrowseLayout config={…} />
                                          + per-section renderTab content (cards move here)
```

### 5.1 What gets reused as-is (no changes)

- `InternalHeader` — already shared, no rework.
- `SearchBar` — already shared, accepts `placeholder`/`debounceMs`/`onDebouncedChange`.
- `BottomSheet` — already shared, already handles drag-dismiss, Android back, snap points, focus trap.
- `EmptyState` (feedback + utility), `ErrorState`, `Skeleton*` — already shared; v10 only aligns *which* one each section uses.
- `ScreenContainer`, theme tokens (`colors`, `spacing`, `radius`, `typography.tab`).
- Navigation params contract in `src/navigation/types.ts` (`initialTab`/`categoryId`/`genre`/`query`) — preserved, honored through config.

### 5.2 What gets promoted / created

| Component | Status | Source |
|---|---|---|
| `FilterChips` | **NEW shared** | Generalize `SourceFilterChips`/`FilterAndSortControls` (Search) + `TagChips` (Radio) + `CategoryChips` (Live TV) into one component |
| `SectionFab` | **NEW shared** | Generalize the inline gold FAB from `LibraryScreen.tsx` + Home play FAB |
| `SectionOptionsSheet` | **NEW** | Wraps shared `BottomSheet` |
| `SectionBrowseLayout` | **NEW** | Extracts the duplicated shell from all 8 screens |
| `useSectionTabs` | **NEW** | Normalizes constants / hook exports / local arrays / inline routes → `SectionTab[]` |

### 5.3 Tab-bar contract (kills the drift)

Every section's `TabView`/`TabBar` renders with: `lazy` + `scrollEnabled` + gold **3px** active indicator, `typography.tab` labels, tab bar background `colors.background.primary`, `renderTabBar` from one shared module. Archive/Shows `hairlineWidth` + hardcoded rgba removed.

---

## 6. Files to Touch (estimated)

**New (5 files):**
- `src/screens/sections/sectionConfig.ts`
- `src/screens/sections/SectionBrowseLayout.tsx`
- `src/screens/sections/hooks/useSectionTabs.ts`, `useSectionSearch.ts`, `useSectionOptions.ts`
- `src/components/utility/FilterChips/FilterChips.tsx`
- `src/screens/sections/components/SectionFab.tsx`, `SectionOptionsSheet.tsx`, `SectionContent.tsx`

**Migrated (8 screens):**
- `src/screens/MoviesScreen/MoviesScreen.tsx` (+ its hooks folder)
- `src/screens/MusicScreen/MusicScreen.tsx`
- `src/screens/RadioScreen/RadioScreen.tsx`
- `src/screens/LiveTVScreen/LiveTVScreen.tsx`
- `src/screens/AudiobooksScreen/AudiobooksScreen.tsx`
- `src/screens/PodcastsScreen/PodcastsScreen.tsx`
- `src/screens/ShowsScreen/ShowsScreen.tsx`
- `src/screens/ArchiveScreen/ArchiveScreen.tsx`

**Touched (shared, minor):**
- `src/navigation/types.ts` (no param changes — only doc comment updates if needed)
- `src/navigation/RootNavigator.tsx` (screen files re-point to shell; routes unchanged)
- `src/theme/tokens.ts` (only if a FAB accent token is missing; prefer existing `colors.accent`)

**Not touched:** all sub/detail screens, `SearchScreen`, `LibraryScreen` (its inline FAB stays this wave), constants files from v9 (icon pass).

---

## 7. Verification

1. `npx tsc --noEmit` clean after every phase (each phase has an explicit Validation step).
2. Emulator cold-launch walk-through of all 8 sections: same frame, same search behavior, same FAB, tabs indent correctly, chips identical.
3. Per-section content checks: grid/list/card styles preserved per section.
4. Home-shelf deep links: tapping a shelf card lands on the right section + right tab (`initialTab`), with `query` pre-filled when provided.
5. Refresh pull works on all 8 (Movies/Audiobooks gain it), offline banner appears when offline.
6. FAB sheet: options apply live, chip selection inside sheet syncs with quick chips, empty-sheet sections hide FAB.
7. Accessibility: `accessibilityLabel` on FAB, chips, tabs; sheet focus-trap intact (existing `BottomSheet` behavior).
8. No regressions on the shared components list (Section 5.1).

---

## 8. Rollback

v10 is additive + per-screen migration. Each section migration is one commit; revert any section by restoring its previous `*Screen.tsx` and removing its config entry.

1. `git revert` the per-section commit(s) — the old screen files are self-contained.
2. Delete `src/screens/sections/` if full rollback needed; restore all 8 `*Screen.tsx` from the pre-v10 commit.
3. Shared components `FilterChips`, `SectionFab`, `SectionOptionsSheet`, `SectionBrowseLayout` have no side effects outside the 8 screens — no other screen imports them in v10.
4. No asset, font, or native-bundle changes. Rollback is source-tree only.

---

## 9. Doc / Version History

| Version | Status | Summary |
|---|---|---|
| v8 | ✅ COMPLETE | Per-weight font architecture |
| v9 | ✅ COMPLETE | Per-section SVG icon pass (assets + constants + SvgIcon) |
| v10 | 🔄 IN PROGRESS | Unified Section Browse Pattern (this doc) |
