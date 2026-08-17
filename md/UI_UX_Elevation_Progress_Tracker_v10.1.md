# SIMBA Mobile: UI/UX Elevation v10.1 — Unified Section Browse (FAB-ONLY)
## Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v10.1.md`](UI_UX_Elevation_Specification_v10.1.md)
> **Supersedes:** v10.0.0 (tab-based shell) — **DEPRECATED 2026-08-14**, kept as historical record
> **Status:** 🔄 IN PROGRESS — Waves 1–6 done (Wave 6 = Music + Movies FAB-only); Waves 7–12 pending
> **Purpose:** Land all 8 Home section pages (Movies, Music, Radio, Live TV, Audiobooks, Podcasts, Shows, Archive) on **one FAB-only browse shell**: `InternalHeader` + `SearchBar` + optional `FilterChips` (active-only) + **ONE content stream** + bottom-right `SectionFab` → `SectionOptionsSheet` (FILTER / SORT / VIEW). **No tabs anywhere.** Content/cards stay per-section. Sub-pages are explicitly **out of scope**.
> **Shape:** 12 WAVES · phases · ≥8 steps per phase · every phase has an **Error fix** and a **Validation** step.

---

## 0. Locked Decisions (2026-08-14 — do NOT revisit)

- **FAB-only is the universal pattern for ALL sections** — including Movies and Podcasts. Filters (genre/category/…) live in the FAB options sheet.
- **Delete the old tab structure** — the v10 tab machinery that was "good for tabs" is not needed for this simpler way. During refactors, remove it (shell `TabView`, `SectionTabBar`, `useSectionTabs`, `tabs[]`), not keep it.
- **The "common way":** a user who visited Movies must feel instantly at home in Music — same shell, FAB, sheet, chip behavior. Only cards differ.
- **Flow (Music reference):** search bar → default "All" popular stream → gold FAB → scrollable sheet where the user selects the genre; the selected genre appears as a selectable **chip**; tapping the chip (or the same sheet option again) clears back to "All".
- **Accepted tradeoff:** a filter switch costs **2 taps** (FAB → select) instead of one tab tap, in exchange for **unlimited genre scalability with zero UI changes**.
- **Future (NOT now, on the radar):** Home consolidates into **one horizontal card rail** (movies, podcasts, etc. as cards, no sub-sections) — revisit after all sections are on the FAB-only shell.

---

## Standing rules (carried from v10)

- Execute strictly against this tracker; verify each phase with `npx tsc --noEmit` exit 0.
- Commit each phase's code with `feat(...)`/`refactor(...)` message, then a **separate tracker backfill commit** `docs(v10.1): mark Phase X …`; commit gates when reached.
- Every phase ends with an **Error fix** step (scan for the phase's new failure modes) and a **Validation** step (tsc + visual).

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

## WAVE 6: MUSIC + SHELL SIMPLIFICATION + MOVIES FLIP (FAB-only reference)

> **Design (locked):** search bar → "All" popular stream → gold FAB → sheet (Genre / Sort / Density). Selected genre = chip; tap chip or active option to clear. No tabs — the shell's `TabView` machinery is **removed**.

### Phase 6.1 — Shell simplification + Music on the simple shell

1. **Config:** `SectionBrowseConfig` drops `tabs`; `renderTab(tab, ctx)` → `renderContent(ctx)`; keep `options.groups` (FILTER/SORT/VIEW) and `quickChips?`. Music entry: FILTER group = Jamendo genres (single-select, default All), SORT = az/recent/duration, VIEW = grid/list.
2. **Shell de-tab:** `SectionBrowseLayout` removes `TabView`, `SectionTabBar`, `useSectionTabs`, route-preselect logic → header → search → FilterChips slot → `{config.renderContent(ctx)}` → FAB → sheet. `ctx.activeChips` derived from `options.filters`.
3. **Delete `useSectionTabs.ts`** (no importers after the shell change). `SectionTabBar` stays only for legacy Shows/Archive screens (deleted in Wave 12).
4. **`useSectionOptions`:** FILTER branch taps an already-active key → clear to `{}` (tap-again-to-deselect); filter **seed from routeParams** (`genre`, `categoryId`, `initialTab`).
5. **MusicScreen** slims to the shell wrapper (delete old TabView/search/3-tab scenes).
6. **`useMusicScreen` rework:** single `(genre, searchTerm)` paginated scope; `getPopularJamendoTracks(limit, page)` gains the `page` param (backward-compatible).
7. **Home deep-links:** `{genre}` seeds the FILTER group + chip; `{initialTab:'popular'}` becomes a no-op (no tabs).
8. **Delete old Music shell code** (MUSIC_TABS, 3-tab scenes, old header/search).
9. **Error fix:** no stale `renderTab`/tab imports; shell renders without a pager; chip wiring type-safe.
10. **Validation:** tsc exit 0; Music opens with "All" stream; FAB opens the sheet; no tab bar visible.
11. Commit `feat(music): FAB-only shell migration`.

### Phase 6.2 — Music FAB sheet (genre/sort/density) + content + states

1. **Sheet groups:** Genre (scrollable single-select from `JAMENDO_GENRES`), Sort (az / recent / duration), View (grid / list) with icons.
2. **FilterChips slot:** active genre chip (`Rock` …) — gold fill, tap clears to All; "All" state = no chip.
3. **`MusicDataProvider`** above the shell (hook ONCE, cache via context).
4. **`renderMusicContent(ctx)`:** 2-col TrackCard grid / 1-col list via `SectionContent` DATA MODE; client-side sort on the loaded slice; `onEndReached` pagination; remount on column change.
5. **Search:** typed term turns the stream into Jamendo search results (combines with the genre filter).
6. **Track tap:** `navigate('AudioPlayer', {fileUri, fileTitle, artworkUri, source: 'jamendo'})`.
7. **States:** skeleton / error+retry / empty (section copy) / offline banner / gold RefreshControl — inside the list.
8. **Error fix:** sort-with-pagination trap (re-sort on append), density-switch stale-column trap, genre+search combined scope key.
9. **Validation:** tsc exit 0; switch genre via sheet → chip updates + stream refilters; tap chip → back to All; grid↔list clean; search persists.
10. Commit `feat(music): FAB sheet (genre/sort/density) + states`.

### Phase 6.3 — Movies flip to FAB-only (tabs removed)

1. **Movies config:** FILTER group = `MOVIE_CATEGORIES` (single-select, default All); SORT (newest/oldest/az/rating) + VIEW (grid/list) unchanged.
2. **`renderMoviesContent(ctx)`:** category scope = `ctx.options.filters.category` (or All/popular default); provider-above-shell unchanged.
3. **Deep-links:** `{initialTab}` / `{categoryId}` now **seed the FILTER group + chip** (previously tab-preselect).
4. **Remove Movies tab wiring:** `tabs` → no tabs; delete the tab-driven scene keying.
5. **FilterChips slot:** active category chip (gold, tap clears).
6. **Error fix:** any leftover `tabs`/tab-scene references; deep-link seed vs default "All" conflict.
7. **Validation:** tsc exit 0; Home→Movies deep-links land on the right category chip + filtered stream; Movies behaves like Music.
8. Commit `feat(movies): FAB-only (tabs removed)`.

### GATE 6 — FAB-only shell is the reference

- ✅ No tab bar in ANY migrated section (Movies, Music); shell has no `TabView`.
- ✅ Movies ⇄ Music filter/chip/FAB parity ("common way").
- ✅ Deep-links seed filters; search persists; states + refresh work.
- ✅ Old shell tab code (`useSectionTabs`) deleted; legacy `SectionTabBar` isolated to Shows/Archive.
- ✅ Commit gate: `docs(v10.1): Wave 6 complete — FAB-only shell (Movies/Music)`.

---

## WAVES 7–12: remaining sections → FAB-only

> Each wave mirrors Wave 6 exactly: migrate the old screen onto the shell → define the FILTER group from its categories/genres → single stream + cards + states → **delete the old screen's tab code**. The old per-section TabView/`SectionTabBar` usage dies with its wave.

| Wave | Section | FILTER group (single-select) | Notes |
|---|---|---|---|
| 7 | **Radio** | country / language | StationRow cards; az sort |
| 8 | **Live TV** | category | ChannelCard; az sort |
| 9 | **Audiobooks** | genre | CollectionCard; grid/list |
| 10 | **Podcasts** | category | PodcastRow; recent/az |
| 11 | **Shows** | genre | EpisodeRow; recent/az |
| 12 | **Archive** | audio / video / collections | ArchiveCard; **final cleanup: delete legacy `SectionTabBar`; audit remaining `react-native-tab-view` usage** |

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
| 6.3 | Movies flip (FAB-only) | ✅ |
| 7 | Radio | ✅ |
| 8 | Live TV | ⬜ |
| 9 | Audiobooks | ⬜ |
| 10 | Podcasts | ⬜ |
| 11 | Shows | ⬜ |
| 12 | Archive + tab-code cleanup | ⬜ |

---

## Risks / Rollback

- **2-tap filter switch may feel slower** than tabs for power users — accepted tradeoff; the chip gives one-tap back to All.
- **Client-side sort on the loaded slice** is a known pagination trap — re-sort on every append (memo dep), never sort in place.
- **Legacy `SectionTabBar`** must not leak into migrated sections — it is isolated to Shows/Archive until Wave 12 deletes it.
- **Rollback:** v10.1 shell is thinner than v10 — revert per-section commit; deprecated v10 docs hold the tab design if ever needed again.
