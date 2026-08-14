# SIMBA Mobile: UI/UX Elevation v10 — Unified Section Browse Pattern
## Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v10.md`](UI_UX_Elevation_Specification_v10.md)
> **Supersedes:** v9 icon pass (assets/constants only — carried forward, no conflicts)
> **Status:** 🔄 IN PROGRESS
> **Purpose:** Land all 8 Home section pages (Movies, Music, Radio, Live TV, Audiobooks, Podcasts, Shows, Archive) on one config-driven browse shell — `InternalHeader` + `SearchBar` + optional `FilterChips` + unified `TabView` + bottom-right `SectionFab` → `SectionOptionsSheet`. Content/cards stay per-section. Sub-pages are explicitly **out of scope**.
> **Shape:** 12 WAVES · 30 PHASES · ≥10 steps per phase · every phase has an **Error fix** and a **Validation** step.

---

## Implementation Strategy

```
WAVE 1:  FOUNDATION — config system + tab unification          (3 phases)
WAVE 2:  UNIFIED SHELL — SectionBrowseLayout + search + states (3 phases)
WAVE 3:  FAB + OPTIONS — SectionFab + SectionOptionsSheet      (3 phases)
WAVE 4:  FILTER PRIMITIVES — FilterChips + SectionContent      (3 phases)
WAVE 5:  MOVIES migration                                      (3 phases)
WAVE 6:  MUSIC migration                                       (2 phases)
WAVE 7:  RADIO migration                                       (2 phases)
WAVE 8:  LIVE TV migration                                     (2 phases)
WAVE 9:  AUDIOBOOKS migration                                  (2 phases)
WAVE 10: PODCASTS migration                                    (2 phases)
WAVE 11: SHOWS migration                                       (2 phases)
WAVE 12: ARCHIVE + FINAL VERIFICATION                          (3 phases)
```

> **Phase step convention:** steps 1–7 are the build steps; step 8 is the **Error fix**; step 9 is the **Validation**; step 10 is the **wrap-up/commit**. Check a box only when the action is actually done.

---

## WAVE 1: FOUNDATION — Config System & Tab Unification

### Phase 1.1 — `SectionBrowseConfig` Type + Section Registry
**File:** `src/screens/sections/sectionConfig.ts` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Define `SectionTab` type: `{key: string; title: string}`.
- [ ] 2. Define `OptionGroup` type: `{id: 'filter'|'sort'|'view'; title: string; options: {key; label; icon?}[]}`.
- [ ] 3. Define `SectionRenderContext`: `{query, activeChips, options, refreshing, offline, routeParams}`.
- [ ] 4. Define `SectionBrowseConfig` per spec §3.2 (route/title/search/tabs/quickChips/options/renderTab).
- [ ] 5. Create the registry `SECTION_CONFIGS: Record<SectionRouteKey, SectionBrowseConfig>` with 8 stub entries (title + route only, rest TODO).
- [ ] 6. Export `getSectionConfig(route: SectionRouteKey)` helper with a dev-mode `console.warn` on unknown route.
- [ ] 7. Type-check the stub registry against `RootStackParamList` keys (prove the key set matches, no errors yet).
- [ ] 8. **Error fix** — resolve any TS union mismatch between `SectionRouteKey` and `RootStackParamList`; `npx tsc --noEmit` and fix every error in this phase's files only.
- [ ] 9. **Validation** — `npx tsc --noEmit` exits 0; `SECTION_CONFIGS` has exactly 8 entries keyed by real route names.
- [ ] 10. Commit `feat(sections): v10 SectionBrowseConfig type + registry stubs`.

### Phase 1.2 — Tab-Source Unification (`useSectionTabs`)
**File:** `src/screens/sections/hooks/useSectionTabs.ts` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Audit the 4 tab-source patterns: constants (`MOVIE_CATEGORIES`, `PODCAST_CATEGORIES`), hook exports (`MUSIC_TABS`, `RADIO_TABS`, `LIVE_TV_TABS`), local arrays (Audiobooks, Shows), inline routes (Archive).
- [ ] 2. Record the exact current tab title list per section (8 lists) into this phase's notes for regression comparison.
- [ ] 3. Implement `toSectionTabs(raw): SectionTab[]` normalizer (accepts `{key;title}[]` or `Record<string,string>`).
- [ ] 4. Implement `useSectionTabs(config)` → `{tabs, initialTabIndex, setTab}` — resolves config.tabs, computes `initialTabIndex` from route param `initialTab`, guards out-of-range indices.
- [ ] 5. Add `tabKey` helpers so tab switching maps back to a source key (needed by content renderers).
- [ ] 6. Add a temporary dev-only snapshot log of the 8 normalized lists (not shipped).
- [ ] 7. Compare each normalized list against the audit notes; flag any reordering as an intentional diff.
- [ ] 8. **Error fix** — fix normalizer edge cases (empty arrays, duplicate keys, non-string titles, key collisions across the 8 lists); `npx tsc --noEmit` clean.
- [ ] 9. **Validation** — all 8 tab lists byte-identical to current screens; `tsc` 0; dev snapshot log shows no drift.
- [ ] 10. Commit `feat(sections): useSectionTabs normalizer` (dev check removed or untracked).

### Phase 1.3 — Shared Tab-Bar Contract (kill styling drift)
**File:** `src/screens/sections/components/SectionTabBar.tsx` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Inventory current tab-bar styling across all 8 screens (indicator, font, background, border, scroll behavior, lazy).
- [ ] 2. Extract the gold 3px indicator + `typography.tab` labels + `colors.background.primary` bar from the best existing implementation (Movies) into `SectionTabBar`.
- [ ] 3. Apply `lazy` + `scrollEnabled` as defaults; expose tab-bar overrides only via config, never per-screen inline.
- [ ] 4. Remove `hairlineWidth` border + hardcoded rgba from Archive/Shows tab styling in this phase (they adopt `SectionTabBar`).
- [ ] 5. Add `style` prop parity — Music's `TabView` gains the same `style` the other screens use (spec §4 row 2).
- [ ] 6. Render `SectionTabBar` in a temp preview and compare visually vs current Movies.
- [ ] 7. Add `accessibilityRole="tab"` + `accessibilityState={{selected}}` on each tab button.
- [ ] 8. **Error fix** — fix indicator misalignment when `scrollEnabled`, label truncation, safe-area bleed on gesture devices.
- [ ] 9. **Validation** — 8/8 screens resolve to identical tab-bar metrics (3px gold indicator, tab typography, same padding); `tsc` 0.
- [ ] 10. Commit `feat(sections): shared SectionTabBar contract`.

**Gate 1 ✅:** `SectionBrowseConfig` + `useSectionTabs` + `SectionTabBar` compile; the 8 normalized tab lists match current screens exactly.

---

## WAVE 2: UNIFIED SHELL

### Phase 2.1 — `SectionBrowseLayout` Shell Component
**File:** `src/screens/sections/SectionBrowseLayout.tsx` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Compose the shell: `SimbaStatusBar` → `InternalHeader` (`config.title`) → shared `SearchBar` → optional `FilterChips` slot → `SectionTabBar` → content area → `SectionFab`.
- [ ] 2. Implement `renderTab(tab, ctx)` dispatch via the config; each tab's content renders inside `SectionContent` (stubbed here, completed in 4.3).
- [ ] 3. Use `ScreenContainer` for horizontal padding; keep the tab bar edge-to-edge per current screens.
- [ ] 4. Keep the route structure: `RootNavigator` route components render `SectionBrowseLayout` and pass their existing params.
- [ ] 5. Add `initialTabIndex` effect: on mount, jump to the `initialTab` param (existing behavior must not regress).
- [ ] 6. Add a temp `PREVIEW_MODE` flag so Movies renders through the shell without deleting its old body yet.
- [ ] 7. Set a stable `key` per tab scene so state does not leak between tabs (parity with current lazy behavior).
- [ ] 8. **Error fix** — fix shell-level regressions: header/search/tab spacing px-identical to pre-migration; keyboard not covering search on focus.
- [ ] 9. **Validation** — Movies preview renders the full shell + 9 tabs; `tsc` 0; screenshot diff vs old Movies shows identical header/search/tab geometry.
- [ ] 10. Commit `feat(sections): SectionBrowseLayout shell (preview mode)`.

### Phase 2.2 — Shared Search Wiring (`useSectionSearch`)
**File:** `src/screens/sections/hooks/useSectionSearch.ts` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Implement `useSectionSearch(config)` → `{query, setQuery, debouncedQuery, clear, active}` with `debounceMs` from config (default 300).
- [ ] 2. Seed `query` from the route param (`query` preset from Home shelves) — pre-fill works on every section.
- [ ] 3. Keep search text **persisting across tab switches** (one hook at shell level, not per-tab) — the user's search-persistence standard.
- [ ] 4. Pass `debouncedQuery` through `SectionRenderContext` so every `renderTab` reads it without re-subscribing.
- [ ] 5. Pass shared `SearchBar` props from config: `placeholder`, `returnKeyType="search"`, clear button when query non-empty.
- [ ] 6. Add `accessibilityLabel` `"Search {config.title}"` on the search field.
- [ ] 7. Add a dev-only regression harness comparing Movies old vs new search results for the same keystrokes.
- [ ] 8. **Error fix** — fix debounce races (stale results arriving after a newer query), clear-on-tab-switch bugs, and double-fetch from `onChangeText` + `onDebouncedChange`.
- [ ] 9. **Validation** — type a query on Movies preview, switch tabs, return: text persists and the new tab filters; `tsc` 0.
- [ ] 10. Commit `feat(sections): useSectionSearch + shared SearchBar wiring`.

### Phase 2.3 — Section-Level States (refresh / offline / error / empty / skeleton)
**File:** `src/screens/sections/components/SectionContent.tsx` (NEW, partial)
**Status:** ⬜ PENDING

- [ ] 1. Implement `SectionContent` with 5 state slots — `loading`, `error`, `empty`, `offline`, `ready` — driven by `ctx`.
- [ ] 2. Pull-to-refresh: standard `RefreshControl` on each tab scene's scrollable root (tint = `colors.accent`).
- [ ] 3. Offline: shared banner strip under the tab bar when `ctx.offline`; content still renders cached data.
- [ ] 4. Error: shared `ErrorState` with retry calling `ctx.onRetry`; retry re-runs the tab's fetch without stacking requests.
- [ ] 5. Empty: shared `EmptyState` with section-aware title + suggestion from config (replaces Music's bespoke "prompt" empties without losing their copy).
- [ ] 6. Loading: `SkeletonList`/`SkeletonCard` by view density — no spinner flash (matches established skeleton convention).
- [ ] 7. Add `onRetry`, `refreshing`, `offline` to `SectionRenderContext`.
- [ ] 8. **Error fix** — fix RefreshControl-in-ScrollView double-scroll warnings, skeleton flash on fast networks, offline banner overlapping the FAB.
- [ ] 9. **Validation** — force offline + error + empty on Movies preview: all 5 states render correctly with a11y labels; `tsc` 0.
- [ ] 10. Commit `feat(sections): SectionContent states (refresh/offline/error/empty/skeleton)`.

**Gate 2 ✅:** Shell renders on Movies preview with unified search, states, and tab contract; old Movies body intact for A/B.

---

## WAVE 3: FAB + OPTIONS SHEET

### Phase 3.1 — `SectionFab` Shared Component
**File:** `src/screens/sections/components/SectionFab.tsx` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Read the inline gold FAB in `LibraryScreen.tsx` (56×56, `radius.pill`, accent) + Home's play FAB as visual precedents.
- [ ] 2. Implement `SectionFab` — 56×56, `radius.pill`, `colors.accent` background, `SvgIcon` (default `sliders`), shadow/elevation matching Library FAB.
- [ ] 3. Position: absolute bottom-right above tab content, offset by safe-area bottom inset; `zIndex` above scenes.
- [ ] 4. Hidden entirely when `config.options` is empty/undefined (config-driven visibility).
- [ ] 5. Add `accessibilityLabel` from config (e.g. `"Filter movies options"`) + `accessibilityRole="button"`.
- [ ] 6. `activeOpacity={0.85}`; press opens the options sheet (callback prop — the shell owns sheet visibility).
- [ ] 7. Ensure the FAB never overlaps the offline banner or covers the last list row (bottom padding on lists).
- [ ] 8. **Error fix** — fix press-through on tab scenes (FAB must not be intercepted by scene gestures), safe-area double-padding on gesture devices.
- [ ] 9. **Validation** — FAB renders only on configs with options; visual match with Library FAB (size, radius, color, shadow); `tsc` 0.
- [ ] 10. Commit `feat(sections): SectionFab (config-driven visibility)`.

### Phase 3.2 — `SectionOptionsSheet` (BottomSheet Wrapper)
**File:** `src/screens/sections/components/SectionOptionsSheet.tsx` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Wrap the shared `BottomSheet` (`snapPoints={['40%','75%']}`, drag-dismiss, `title={config.title}`).
- [ ] 2. Render each `OptionGroup` as a titled section: `filter` → vertical single-select rows; `sort` → radio rows; `view` → density toggle (grid-2 / list).
- [ ] 3. Each option row: label + `SvgIcon`; selected state = accent color + check mark (existing sheet styling language).
- [ ] 4. Selecting a value calls `ctx.onOptionChange` and keeps the sheet open (dismissed only by user).
- [ ] 5. Sync: quick `FilterChips` selection and the sheet's `filter` group share the same underlying state (one source of truth).
- [ ] 6. Reuse the sheet's existing `KeyboardAwareView` behavior (for future search-in-sheet).
- [ ] 7. Reuse the existing Android back + focus-trap — verify both fire correctly with option lists inside.
- [ ] 8. **Error fix** — fix snap-point content clipping for long option lists (wrap in scrollable), stale selection when config changes between opens.
- [ ] 9. **Validation** — open sheet on Movies preview: groups render, selections persist across open/close, back closes only the sheet (not the screen); `tsc` 0.
- [ ] 10. Commit `feat(sections): SectionOptionsSheet (BottomSheet wrapper)`.

### Phase 3.3 — `useSectionOptions` State Model
**File:** `src/screens/sections/hooks/useSectionOptions.ts` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Implement `useSectionOptions(config)` → `{state, setOption, reset}` where `state = {filters: Record<string,string|undefined>, sort, view}`.
- [ ] 2. Defaults: `view` from config (default `grid`), `sort` undefined (natural order), filters undefined.
- [ ] 3. In-memory per-section state (fresh on mount). Radio favorites keep their own hook persistence — out of scope to merge.
- [ ] 4. Expose `activeFilterCount` so the FAB shows a dot badge when options are active (helps new users notice applied state).
- [ ] 5. `reset()` clears all options (one-tap "Reset" row at the sheet bottom).
- [ ] 6. Merge into `SectionRenderContext.options`; `renderTab` reads only from context (no direct hook calls inside tab scenes).
- [ ] 7. Add a dev-only log of option transitions (removed before ship).
- [ ] 8. **Error fix** — fix stale-closure bugs when options change mid-fetch; ensure `activeFilterCount` updates on every set.
- [ ] 9. **Validation** — set sort + filter + density on Movies preview: content re-renders per selection, FAB badge counts, reset works; `tsc` 0.
- [ ] 10. Commit `feat(sections): useSectionOptions + FAB badge`.

**Gate 3 ✅:** FAB + options sheet functional on Movies preview with live-apply, badge, and reset.

---

## WAVE 4: FILTER PRIMITIVES

### Phase 4.1 — `FilterChips` Shared Component
**File:** `src/components/utility/FilterChips/FilterChips.tsx` (NEW)
**Status:** ⬜ PENDING

- [ ] 1. Read `SourceFilterChips` / `FilterAndSortControls` (Search), `TagChips` (Radio), `CategoryChips` (Live TV) — extract the common chip visual (rounded pill, border, active fill).
- [ ] 2. Implement `FilterChips` props: `{items, selectedKey, onSelect, singleSelect?, wrap?, count?}`.
- [ ] 3. Modes: `horizontal` scroll (default, Radio/Live TV parity) and `wrap` (Audiobooks' 20 genres).
- [ ] 4. Active chip: accent background + primary text; inactive: elevated background + secondary text; consistent `radius.pill` padding.
- [ ] 5. Optional `count` badge (e.g., favorites count) on the chip's right edge using `typography.caption`.
- [ ] 6. `accessibilityRole="button"` + `accessibilityState={{selected}}` per chip; label = chip text.
- [ ] 7. Selection semantics: `singleSelect=true` → tapping the active chip clears it (toggle); `false` → multi-select (future use).
- [ ] 8. **Error fix** — fix chip text truncation on long labels (Audiobooks 20-genre list), uneven heights in wrap mode, scroll jank on rapid taps.
- [ ] 9. **Validation** — render `FilterChips` in a dev screen in all 3 modes; snapshot-identical to current TagChips/CategoryChips visual; `tsc` 0.
- [ ] 10. Commit `feat(ui): FilterChips shared component`.

### Phase 4.2 — Migrate the 5 Chip Implementations → `FilterChips`
**Files:** Music, Radio, LiveTV, Archive, Audiobooks screens
**Status:** ⬜ PENDING

- [ ] 1. Music: replace the `ScrollView` genre chips (`JAMENDO_GENRES`) with `FilterChips` horizontal; keep the same "All" default.
- [ ] 2. Radio: replace `TagChips` FlatList with `FilterChips`; keep selection synced to the favorites tab.
- [ ] 3. Live TV: replace `CategoryChips` with `FilterChips`; keep the category jump behavior.
- [ ] 4. Archive: replace `ARCHIVE_QUICK_SEARCHES` chips with `FilterChips`; quick search sets the shared query (existing behavior preserved).
- [ ] 5. Audiobooks: replace the wrapping genre `View` (20 genres) with `FilterChips` wrap mode; remove the duplicate chips inside the empty state.
- [ ] 6. Delete or deprecate the 5 replaced implementations — no dead chip code in v10.
- [ ] 7. Verify each screen's chip selection still produces the same list as before (compare filtered counts in dev).
- [ ] 8. **Error fix** — fix selection drift (chips re-rendering with the wrong active key after tab switch) and chip-row height regressions.
- [ ] 9. **Validation** — all 5 screens' chip rows are style-identical; filter behavior unchanged; `npx tsc --noEmit` 0.
- [ ] 10. Commit `refactor(sections): adopt FilterChips across 5 sections`.

### Phase 4.3 — Shared Content Scaffolding (`SectionContent` complete)
**File:** `src/screens/sections/components/SectionContent.tsx` (complete)
**Status:** ⬜ PENDING

- [ ] 1. Add `grid` vs `list` scaffolding driven by `options.view`: `FlatList numColumns={2}` for grid, single-column for list — both with a shared `contentContainerStyle`.
- [ ] 2. Add `ListHeaderComponent` slot (chips that scroll with content, e.g., Radio — parity).
- [ ] 3. Standard `keyExtractor` + `onEndReached`/`onEndReachedThreshold` pass-through for paginated sections.
- [ ] 4. Render empty/error slots inside the FlatList (`ListEmptyComponent`) so pull-to-refresh still works on empty screens.
- [ ] 5. Attach `RefreshControl` to every scene's FlatList root via `SectionContent` (Movies/Audiobooks gain it here).
- [ ] 6. Set `removeClippedSubviews={false}` on grids to avoid Android blank-cell glitches during fast scroll.
- [ ] 7. Add `testID` convention: `section-{route}-{tabKey}-list`.
- [ ] 8. **Error fix** — fix grid column-gap/row-gap math to match current per-section card spacing (Movies 2-col vs Music single-col must not drift).
- [ ] 9. **Validation** — render each section's real card inside `SectionContent` (dev) in grid + list views; spacing snapshot-identical; `tsc` 0.
- [ ] 10. Commit `feat(sections): SectionContent grid/list scaffolding complete`.

**Gate 4 ✅:** `FilterChips` adopted in 5 sections; `SectionContent` handles all list shapes; no per-screen chip code remains.

---

## WAVE 5: MOVIES (pilot migration)

### Phase 5.1 — Movies → Config + Shell
**Files:** `sectionConfig.ts` (Movies entry), `src/screens/MoviesScreen/MoviesScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill the Movies config: `route:'MoviesScreen'`, `title:'Movies'`, `search.placeholder:'Search movies…'`, tabs from `MOVIE_CATEGORIES` (9 tabs), no quick chips, options {sort: Newest/Oldest/A–Z/Rating, view: grid}.
- [ ] 2. Rewrite `MoviesScreen.tsx` to render `<SectionBrowseLayout config={getSectionConfig('MoviesScreen')} />`.
- [ ] 3. Move the 2-col `MovieCard` grid into `renderTab` (content only — no header/search/tab code).
- [ ] 4. Preserve `initialTab` / `categoryId` / `query` route-param handling via the shell.
- [ ] 5. Keep `useMoviesScreen` data fetching intact; feed its output into `ctx` (loading/error/data).
- [ ] 6. Remove the old duplicated header/search/tab/viewpager code after parity is confirmed.
- [ ] 7. Delete the temp preview flag — Movies is now a real shell consumer.
- [ ] 8. **Error fix** — fix any regression vs the old screen (tab count, initial tab, query pre-fill, card layout).
- [ ] 9. **Validation** — `npx tsc --noEmit` 0; emulator: Movies matches the shell anatomy; shelf deep-links land on the right tab with query.
- [ ] 10. Commit `feat(movies): migrate to SectionBrowseLayout`.

### Phase 5.2 — Movies Content + Refresh + Offline
**Files:** `src/screens/MoviesScreen/` (hooks + grid)
**Status:** ⬜ PENDING

- [ ] 1. Wire `SectionContent` states to `useMoviesScreen`: loading → `SkeletonCard` grid, error → `ErrorState` + retry, empty → `EmptyState`.
- [ ] 2. Add pull-to-refresh (`RefreshControl`) calling the hook's refresh — Movies gains this in v10.
- [ ] 3. Add offline detection: `ctx.offline` banner under tabs + stale-content render.
- [ ] 4. Replace `Placeholder` + toast retry with shared `ErrorState` (keep toast for non-fatal errors).
- [ ] 5. Keep `MovieCard` visually untouched (cards may differ per spec); re-parent it into the `SectionContent` grid.
- [ ] 6. Verify `onEndReached` pagination still works inside the new FlatList scaffolding.
- [ ] 7. Add `testID`s for the grid and the offline banner.
- [ ] 8. **Error fix** — fix refresh-indicator/retry conflicts (retry must not stack requests) and offline-banner overlap.
- [ ] 9. **Validation** — offline: banner + cached list; kill network mid-load: ErrorState + retry recovers; `tsc` 0.
- [ ] 10. Commit `feat(movies): states, refresh, offline`.

### Phase 5.3 — Movies FAB Options + Polish
**Files:** `src/screens/sections/components/` (options wiring), Movies config
**Status:** ⬜ PENDING

- [ ] 1. Enable Movies options: sort (Newest/Oldest/A–Z/Rating) + view density (grid-2 / list).
- [ ] 2. Apply sort in the Movies `renderTab` data pipeline (pure function on the fetched array).
- [ ] 3. Apply view density via `SectionContent` (`numColumns` switch).
- [ ] 4. Confirm the FAB badge shows when sort ≠ default.
- [ ] 5. Verify the option sheet "Reset" returns to default sort + grid.
- [ ] 6. Visual polish: FAB does not overlap the last grid row and hides when the keyboard is open.
- [ ] 7. Compare against pre-migration screenshots (header/search/tab geometry + card spacing).
- [ ] 8. **Error fix** — fix sort/density race on tab switch (sort must re-apply per tab list).
- [ ] 9. **Validation** — Movies fully matches the v10 anatomy; all options live-apply; `tsc` 0; reviewer walk-through passes.
- [ ] 10. Commit `feat(movies): FAB options (sort + density) — pilot complete`.

**Gate 5 ✅:** Movies is fully migrated and is the reference implementation for Waves 6–11.

---

## WAVE 6: MUSIC

### Phase 6.1 — Music → Shell, Tabs, Chips
**Files:** Music config entry, `src/screens/MusicScreen/MusicScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Music config: tabs from `MUSIC_TABS` (via `useSectionTabs`), search "Search music…", quickChips = `JAMENDO_GENRES` (horizontal).
- [ ] 2. Rewrite `MusicScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('MusicScreen')} />`.
- [ ] 3. Move the single-col `TrackCard` list into `renderTab`.
- [ ] 4. Apply the shared tab-bar contract — fixes Music's missing `TabView` `style` parity.
- [ ] 5. Preserve `query` route-param pre-fill.
- [ ] 6. Keep `useMusicScreen` intact; feed `ctx`.
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix tab-bar parity regression (indicator position when tabs scroll) and chip re-render loops.
- [ ] 9. **Validation** — Music matches the shell anatomy; tabs + chips behave like Movies; `tsc` 0.
- [ ] 10. Commit `feat(music): migrate to SectionBrowseLayout`.

### Phase 6.2 — Music Content + FAB + Polish
**Files:** Music content, Music config
**Status:** ⬜ PENDING

- [ ] 1. Standardize Music empty states: replace bespoke "prompt" empties with shared `EmptyState` (keep the original copy as `title`/`suggestion`).
- [ ] 2. Add loading skeletons (`SkeletonList` for the single-col list).
- [ ] 3. Add error state + retry via `SectionContent`.
- [ ] 4. Enable Music options: sort (A–Z / Recent / Duration) + view (list / grid).
- [ ] 5. Wire chips ↔ options: chip select also reflects in the sheet's filter group (one source of truth).
- [ ] 6. Add RefreshControl + offline banner parity.
- [ ] 7. Verify `onEndReached` pagination parity.
- [ ] 8. **Error fix** — fix list↔grid density transition glitch and chip/option double-apply.
- [ ] 9. **Validation** — full Music walk-through vs pre-migration; `tsc` 0; screenshot diff of empty/error states.
- [ ] 10. Commit `feat(music): states, FAB options, chip sync`.

**Gate 6 ✅:** Music fully migrated; chip + sheet sync pattern proven for reuse.

---

## WAVE 7: RADIO

### Phase 7.1 — Radio → Shell, Tabs, Chips
**Files:** Radio config entry, `src/screens/RadioScreen/RadioScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Radio config: tabs from `RADIO_TABS` (top/genres/countries/languages/favorites), search "Search radio…", quickChips from the top languages/countries lists.
- [ ] 2. Rewrite `RadioScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('RadioScreen')} />`.
- [ ] 3. Move the `StationCard` list into `renderTab`; keep chip-scrolls-with-content placement via `ListHeaderComponent`.
- [ ] 4. Replace `TagChips` with `FilterChips` (verify 4.2 left no stragglers).
- [ ] 5. Preserve the long-press `OptionSheetDialog` + `PlaylistSheet` — do not touch their logic or sheets (out of scope).
- [ ] 6. Preserve favorites persistence via the Radio hook (out of scope to merge into `useSectionOptions`).
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix ListHeader chips/StationCard spacing and long-press interception inside the new scaffolding.
- [ ] 9. **Validation** — Radio matches the shell anatomy; favorites tab + long-press sheets still work; `tsc` 0.
- [ ] 10. Commit `feat(radio): migrate to SectionBrowseLayout`.

### Phase 7.2 — Radio Content + FAB + Polish
**Files:** Radio content, Radio config
**Status:** ⬜ PENDING

- [ ] 1. Add loading skeletons + error retry via `SectionContent`.
- [ ] 2. Add RefreshControl + offline banner parity.
- [ ] 3. Enable Radio options: quick country/language filter group (mirrors chips) + sort (A–Z / Popularity).
- [ ] 4. Verify the empty-favorites state renders shared `EmptyState` with a "discover stations" CTA.
- [ ] 5. Ensure the FAB sits above the long-press sheet without overlap.
- [ ] 6. Verify chip + sheet filter sync for countries/languages.
- [ ] 7. a11y sweep on StationCard rows + FAB.
- [ ] 8. **Error fix** — fix favorites-tab refresh when a station is un-favorited (list updates without a full reload).
- [ ] 9. **Validation** — full Radio walk-through vs pre-migration (incl. long-press flows); `tsc` 0.
- [ ] 10. Commit `feat(radio): states, FAB options, favorites parity`.

**Gate 7 ✅:** Radio migrated with zero regression on long-press sheets + favorites.

---

## WAVE 8: LIVE TV

### Phase 8.1 — Live TV → Shell, Tabs, Chips
**Files:** Live TV config entry, `src/screens/LiveTVScreen/LiveTVScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Live TV config: tabs from `LIVE_TV_TABS` (all/categories/favorites), search "Search live TV…", quickChips = `CategoryChips` list.
- [ ] 2. Rewrite `LiveTVScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('LiveTVScreen')} />`.
- [ ] 3. Move the `ChannelCard` list into `renderTab`.
- [ ] 4. Replace `CategoryChips` with `FilterChips` (verify 4.2 left no stragglers).
- [ ] 5. Preserve category jump behavior (chip tap = scroll to / filter the category).
- [ ] 6. Keep `useLiveTVScreen` intact; feed `ctx`.
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix channel-list scroll position reset on chip select and lazy-tab re-render jank.
- [ ] 9. **Validation** — Live TV matches the shell anatomy; category jump + favorites work; `tsc` 0.
- [ ] 10. Commit `feat(livetv): migrate to SectionBrowseLayout`.

### Phase 8.2 — Live TV Content + FAB + Polish
**Files:** Live TV content, Live TV config
**Status:** ⬜ PENDING

- [ ] 1. Add loading skeletons + error retry via `SectionContent`.
- [ ] 2. Add RefreshControl + offline banner parity.
- [ ] 3. Enable Live TV options: sort (A–Z / HD-first) + view (grid-2 / list).
- [ ] 4. Verify the empty-favorites state renders shared `EmptyState` with a "browse all channels" CTA.
- [ ] 5. Ensure the FAB sits above the channel list's last row.
- [ ] 6. Verify the favorites tab refreshes on unfavorite without a full reload.
- [ ] 7. a11y sweep on ChannelCard rows + FAB.
- [ ] 8. **Error fix** — fix HD-first sort applied inconsistently across tabs and grid gap drift on wide screens.
- [ ] 9. **Validation** — full Live TV walk-through vs pre-migration; `tsc` 0.
- [ ] 10. Commit `feat(livetv): states, FAB options, favorites parity`.

**Gate 8 ✅:** Live TV migrated; grid/list density + sort pattern proven.

---

## WAVE 9: AUDIOBOOKS

### Phase 9.1 — Audiobooks → Shell, Tabs, Chips
**Files:** Audiobooks config entry, `src/screens/AudiobooksScreen/AudiobooksScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Audiobooks config: tabs from the local `TABS` (search/genres/New Releases) via `useSectionTabs`, search "Search audiobooks…", quickChips = `LIBRIVOX_GENRES` in `wrap` mode.
- [ ] 2. Rewrite `AudiobooksScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('AudiobooksScreen')} />`.
- [ ] 3. Move the audiobook card list into `renderTab`.
- [ ] 4. Replace the wrapping genre `View` with `FilterChips` wrap mode (verify 4.2 removed the empty-state duplicate).
- [ ] 5. Keep the genre-chips-inside-empty-state removal behavior: empty state now guides to "browse all genres".
- [ ] 6. Keep `useAudiobooksScreen` (or equivalent) intact; feed `ctx`.
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix wrap-mode chip row heights with 20 genres and tab re-render when the genre list loads late.
- [ ] 9. **Validation** — Audiobooks matches the shell anatomy; chips wrap cleanly; `tsc` 0.
- [ ] 10. Commit `feat(audiobooks): migrate to SectionBrowseLayout`.

### Phase 9.2 — Audiobooks Content + Refresh + Offline + FAB
**Files:** Audiobooks content, Audiobooks config
**Status:** ⬜ PENDING

- [ ] 1. Add pull-to-refresh + offline banner — Audiobooks gains both in v10 (was missing).
- [ ] 2. Add loading skeletons + error retry via `SectionContent`.
- [ ] 3. Enable Audiobooks options: genre filter group (full 20 list) + sort (A–Z / Duration / Newest).
- [ ] 4. Verify chip + sheet genre sync (one source of truth).
- [ ] 5. Verify "New Releases" tab still ranks by release date after sort is applied.
- [ ] 6. Ensure the wrap chip row does not push the tab bar off-screen (scroll containment).
- [ ] 7. a11y sweep on cards + chips + FAB.
- [ ] 8. **Error fix** — fix genre-chip selection resetting the active tab and sort/duration race on "New Releases".
- [ ] 9. **Validation** — full Audiobooks walk-through vs pre-migration (refresh + offline included); `tsc` 0.
- [ ] 10. Commit `feat(audiobooks): states, refresh, offline, FAB options`.

**Gate 9 ✅:** Audiobooks migrated; wrap-mode chips + refresh/offline proven.

---

## WAVE 10: PODCASTS

### Phase 10.1 — Podcasts → Shell, Tabs
**Files:** Podcasts config entry, `src/screens/PodcastsScreen/PodcastsScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Podcasts config: tabs from `PODCAST_CATEGORIES.slice(0,12)` via `useSectionTabs`, search "Search podcasts…", no quick chips, options {sort: A–Z / Recent, view: list}.
- [ ] 2. Rewrite `PodcastsScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('PodcastsScreen')} />`.
- [ ] 3. Move the `PodcastCard` list into `renderTab`.
- [ ] 4. Preserve the 12-tab limit exactly (do not expand or reorder categories).
- [ ] 5. Preserve `query` route-param pre-fill.
- [ ] 6. Keep the podcasts data hook intact; feed `ctx`.
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix tab-bar scroll behavior with 12 tabs (scrollEnabled default must not clip the last tab) and lazy re-render jank.
- [ ] 9. **Validation** — Podcasts matches the shell anatomy; 12 tabs render and scroll; `tsc` 0.
- [ ] 10. Commit `feat(podcasts): migrate to SectionBrowseLayout`.

### Phase 10.2 — Podcasts Content + FAB + Polish
**Files:** Podcasts content, Podcasts config
**Status:** ⬜ PENDING

- [ ] 1. Add loading skeletons + error retry via `SectionContent`.
- [ ] 2. Add RefreshControl + offline banner parity.
- [ ] 3. Enable Podcasts options: sort (A–Z / Recent) + view (list / grid-2).
- [ ] 4. Verify the empty-category state renders shared `EmptyState` with a section-appropriate CTA.
- [ ] 5. Ensure the FAB sits above the last row and hides on keyboard open.
- [ ] 6. a11y sweep on PodcastCard rows + FAB.
- [ ] 7. Verify `onEndReached` pagination parity for large categories.
- [ ] 8. **Error fix** — fix sort applied to paginated data (only sort the loaded slice) and grid gap drift.
- [ ] 9. **Validation** — full Podcasts walk-through vs pre-migration; `tsc` 0.
- [ ] 10. Commit `feat(podcasts): states, FAB options, pagination parity`.

**Gate 10 ✅:** Podcasts migrated; 12-tab scroll + pagination-sort interaction proven.

---

## WAVE 11: SHOWS

### Phase 11.1 — Shows → Shell, Tabs, Chips
**Files:** Shows config entry, `src/screens/ShowsScreen/ShowsScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Shows config: tabs from the local `TABS` (search/today/browse) via `useSectionTabs`, search "Search shows…", quickChips = genre list (from `showCategories` / `LIBRIVOX`-style genre constants available).
- [ ] 2. Rewrite `ShowsScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('ShowsScreen')} />`.
- [ ] 3. Move the `ShowCard` list into `renderTab`.
- [ ] 4. Wire `initialTab` route param → shell `initialTabIndex` (Shows gains real deep-link parity).
- [ ] 5. Wire `initialGenre` route param → chip selection + tab (Shows gains the chip UI it lacked).
- [ ] 6. Keep the shows data hook intact; feed `ctx`.
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix `initialGenre` arriving before the chip list loads (queue until ready) and deep-link tab pre-selection.
- [ ] 9. **Validation** — Shows matches the shell anatomy; shelf deep-links land on the right tab + genre chip; `tsc` 0.
- [ ] 10. Commit `feat(shows): migrate to SectionBrowseLayout`.

### Phase 11.2 — Shows Content + FAB + Polish
**Files:** Shows content, Shows config
**Status:** ⬜ PENDING

- [ ] 1. Add loading skeletons + error retry via `SectionContent`.
- [ ] 2. Add RefreshControl + offline banner parity.
- [ ] 3. Enable Shows options: sort (Newest / A–Z) + view (list / grid-2).
- [ ] 4. Verify chip + sheet genre sync.
- [ ] 5. Ensure the "today" tab ignores sort (chronological by design) — document the exception.
- [ ] 6. a11y sweep on ShowCard rows + chips + FAB.
- [ ] 7. Verify `onEndReached` pagination parity.
- [ ] 8. **Error fix** — fix the "today" tab's sort exception (sort must not reorder it) and deep-link chip state reset on re-entry.
- [ ] 9. **Validation** — full Shows walk-through vs pre-migration (deep links included); `tsc` 0.
- [ ] 10. Commit `feat(shows): states, FAB options, deep-link parity`.

**Gate 11 ✅:** Shows migrated; `initialGenre` → chips pattern proven (the last per-section quirk closed).

---

## WAVE 12: ARCHIVE + FINAL VERIFICATION

### Phase 12.1 — Archive → Shell, Chips, Tab Drift Kill
**Files:** Archive config entry, `src/screens/ArchiveScreen/ArchiveScreen.tsx`
**Status:** ⬜ PENDING

- [ ] 1. Fill Archive config: tabs audio/video (from the inline routes via `useSectionTabs`), search "Search archive…", quickChips = `ARCHIVE_QUICK_SEARCHES` (quick search sets the shared query).
- [ ] 2. Rewrite `ArchiveScreen.tsx` to `<SectionBrowseLayout config={getSectionConfig('ArchiveScreen')} />`.
- [ ] 3. Move the `ArchiveCard` list into `renderTab`.
- [ ] 4. Adopt `SectionTabBar` — removes the fontSize-14 / hairlineWidth / hardcoded-rgba drift (spec §4 row 8).
- [ ] 5. Preserve audio/video route-param switching if the navigation passes a format param.
- [ ] 6. Keep the archive data hook intact; feed `ctx`.
- [ ] 7. Delete the old duplicated shell code.
- [ ] 8. **Error fix** — fix quick-search chips clearing when the tab changes and tab-bar height regression from the drift removal.
- [ ] 9. **Validation** — Archive matches the shell anatomy; audio/video tabs + quick searches work; `tsc` 0.
- [ ] 10. Commit `feat(archive): migrate to SectionBrowseLayout (drift killed)`.

### Phase 12.2 — Cross-Section Consistency & a11y Pass
**Files:** all 8 screens + shared components
**Status:** ⬜ PENDING

- [ ] 1. Walk all 8 sections side-by-side on emulator; flag any shell mismatch (header height, search width, tab indicator, FAB position).
- [ ] 2. Verify the 4 tab-source patterns are fully gone — grep for `MOVIE_CATEGORIES|MUSIC_TABS|RADIO_TABS|LIVE_TV_TABS|PODCAST_CATEGORIES|ARCHIVE_QUICK_SEARCHES` inside screens; only config/constants may reference them.
- [ ] 3. Verify zero per-screen chip implementations remain (grep `TagChips|CategoryChips|SourceFilterChips` usage).
- [ ] 4. Verify no per-screen tab-bar styling remains (grep `hairlineWidth|fontSize: 14` in tab contexts).
- [ ] 5. a11y audit: FAB labels, chip states, tab states, search labels on all 8 — consistent phrasing "Search {title}".
- [ ] 6. Theme audit: no new hardcoded colors; all shell visuals resolve to `colors`/`spacing`/`radius`/`typography` tokens.
- [ ] 7. State audit: every section renders loading/error/empty/offline consistently (screenshot matrix of all 8 × empty).
- [ ] 8. **Error fix** — fix every inconsistency found in the audits above before closing the wave.
- [ ] 9. **Validation** — screenshot matrix reviewed; a11y screen-reader sweep on 3 representative sections (Movies/Radio/Archive) passes.
- [ ] 10. Commit `chore(sections): cross-section consistency + a11y pass`.

### Phase 12.3 — Final Gate & Documentation
**Files:** repo-wide
**Status:** ⬜ PENDING

- [ ] 1. `npx tsc --noEmit` clean on the whole project.
- [ ] 2. Run the project linter (per repo config) — zero new warnings from v10 files.
- [ ] 3. Cold-launch emulator: walk all 8 sections from Home rails (deep links) — tab + query + genre presets all land correctly.
- [ ] 4. Refresh + offline + retry smoke on all 8 (dev-flight mode toggles).
- [ ] 5. Performance check: FAB/sheet open-close < 16 ms frame cost on mid-range device profile; grid scroll smooth.
- [ ] 6. Verify no regressions in the untouched shared components (`InternalHeader`, `SearchBar`, `BottomSheet`, `EmptyState`, `ErrorState`, `Skeleton*`).
- [ ] 7. Verify Home + Library still render their inline FABs unchanged (precedent components untouched).
- [ ] 8. **Error fix** — fix any final issues from the smoke tests; re-run the failing checks to green.
- [ ] 9. **Validation** — final checklist: 12 waves × gates all ✅; 8/8 sections on the unified shell; this tracker's checkboxes 100% complete.
- [ ] 10. Update the v10 Spec status → ✅ COMPLETE; write the v10 completion report entry in `md/v10_completion_report.md`; close the wave.

**Gate 12 ✅ (FINAL):** All 8 section pages land on the unified Section Browse Pattern; sub-pages untouched and ready for a future wave.

---

## Risks

1. **Tab reordering drift** — the 4→1 tab normalization must be byte-identical per section (Phase 1.2 comparison step guards this).
2. **Per-section card layout** — cards may differ but must not break the shared grid math (Phase 4.3 gap/column audit).
3. **Radio long-press sheets + favorites** — highest regression risk; pinned to "do not touch" in 7.1/7.2 and covered by gate 7.
4. **Search persistence** — the user's standard; covered by the shell-level single hook (2.2) and the tab-switch persistence test.
5. **Deep-link params** (`initialTab`/`categoryId`/`genre`/`query`) — must survive the shell rewrite; tested per section and in the final gate.
6. **Option state vs. server data** — sorting only the loaded slice (pagination) is a known trap (10.2 error-fix step).
7. **v9 icon pass** — v10 must not alter any `src/assets/svg` or constants files; icon wiring is untouched.

## Rollback

1. Revert the per-section migration commit(s) — old `*Screen.tsx` bodies are self-contained and restore the pre-v10 UI instantly.
2. Delete `src/screens/sections/` and `src/components/utility/FilterChips/` for a full revert; no other screen imports them in v10.
3. No asset/font/native-bundle changes — rollback is source-tree only (same as v8/v9).

## Completion Log

| Phase | Date | Result |
|---|---|---|
| 1.1 | — | ⬜ |
| 1.2 | — | ⬜ |
| 1.3 | — | ⬜ |
| 2.1 | — | ⬜ |
| 2.2 | — | ⬜ |
| 2.3 | — | ⬜ |
| 3.1 | — | ⬜ |
| 3.2 | — | ⬜ |
| 3.3 | — | ⬜ |
| 4.1 | — | ⬜ |
| 4.2 | — | ⬜ |
| 4.3 | — | ⬜ |
| 5.1 | — | ⬜ |
| 5.2 | — | ⬜ |
| 5.3 | — | ⬜ |
| 6.1 | — | ⬜ |
| 6.2 | — | ⬜ |
| 7.1 | — | ⬜ |
| 7.2 | — | ⬜ |
| 8.1 | — | ⬜ |
| 8.2 | — | ⬜ |
| 9.1 | — | ⬜ |
| 9.2 | — | ⬜ |
| 10.1 | — | ⬜ |
| 10.2 | — | ⬜ |
| 11.1 | — | ⬜ |
| 11.2 | — | ⬜ |
| 12.1 | — | ⬜ |
| 12.2 | — | ⬜ |
| 12.3 | — | ⬜ |