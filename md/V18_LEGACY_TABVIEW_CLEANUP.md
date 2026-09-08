# V18 Legacy TabView Cleanup Plan

**Status:** Planning — committed alongside the V18 work
**Author:** Senior dev review · 2026-09-08
**Driver:** UI consistency. The codebase has two patterns for browse
screens; the v10+ "FAB-only" pattern (Movies / Podcasts / Music /
Radio / LiveTVNew) is the intended shape. The 5 legacy screens
below still use `<TabView>` + per-scope state machines. The data
layer was cleaned in V18.3.3 (hooks now use `useApiQuery`); this
plan addresses the UI and the lingering state-machine complexity.

---

## 1. The 5 legacy screens

| Screen | Current tabs | Target shape | Migration cost |
|---|---|---|---|
| `AudiobooksScreen` | search / genres / recent (3) | search is the primary stream; "genre" becomes a FAB filter chip group; "recent" becomes its own section / drops to "Recently Added" rail | Medium — Genres fits as a chip; "Recent" needs a design call |
| `ShowsScreen` | search / today / browse (3) | search + browse collapse into a single FAB-filtered stream; "today" becomes a hero section above the list | High — "Today" is a date-scoped query, not a filter; needs product decision |
| `GenreScreen` | local / streaming / moods / radio (4) | local stays; streaming + radio become FAB filters (Jamendo + Radio-Browser); "moods" is a distinct feature — could move to its own entry | High — 4-way split; "moods" is a unique feature |
| `ArchiveScreen` | audio / video (2) | collapses to a single IA query with a `mediatype` FAB filter | **Low** — 2 tabs that are already semantically a filter |
| `LiveTVScreen` (legacy) | all / categories / favorites (3) | `LiveTVScreenNew` already has the FAB pattern; legacy is kept for the route `LiveTVScreen` which might still be navigated to. The cleanest fix: delete the legacy screen and rename the route to point to New. | **Low** if the New screen is feature-complete |

---

## 2. Phasing

**Phase 1 — `ArchiveScreen` (lowest cost, sets the pattern)**
- Replace the 2 tabs with a single IA query + a `mediatype` FAB filter (audio / video / all).
- Delete the `<TabView>` import from this screen.
- The `useArchiveScreen` hook simplifies to one `useApiQuery`.

**Phase 2 — `LiveTVScreen` (legacy)**
- Check whether any route still navigates to the legacy `LiveTVScreen`. If only the New one is used, delete the legacy screen + its hook + its component, and rename the New screen's route.
- If the legacy is still navigated to from somewhere (the P41 Genre screen, the Home rails, etc.), migrate the legacy screen to use the New's hook (`useLiveTVBrowser`).

**Phase 3 — `AudiobooksScreen`**
- Search is the primary stream (no tab).
- "Genre" becomes a chip filter (FAB-triggered chip group, similar to the Movies category filter).
- "Recent" decision: either drop it (LibriVox "Recent" is a feed that overlaps with the global "Recently Added" rail) or keep it as a hero row.
- Delete the `<TabView>` from the screen.

**Phase 4 — `GenreScreen`**
- 4 tabs split into: local tracks (library filter), streaming (Jamendo by genre), moods (feature section), radio (Radio-Browser by genre).
- The "Moods" tab is a unique feature — the cleanest design is a separate entry point on the Genre screen, or a dedicated "Moods" screen.
- "Streaming" + "Radio" can be FAB-filtered; "Local" is a library filter.

**Phase 5 — `ShowsScreen`**
- 3 tabs collapse to: search + browse (FAB filter for genre/country) + a "Today" rail at the top.
- "Today" is a date-scoped query (TVMaze `/schedule` for today's date); it doesn't fit a filter. Best path: surface as a "Airing Today" rail above the search results.
- Delete the `<TabView>` from the screen.

**Phase 6 — remove the dependency**
- Once all 5 screens are converted, remove `@react-native-tab-view` from `package.json` and `package-lock.json`.
- Verify no other code in `src/` imports `react-native-tab-view` (grep for `from 'react-native-tab-view'`).
- Run `npx tsc --noEmit` and `npx jest` to confirm nothing else breaks.

---

## 3. What stays after this work

- `BrowseLayout` (the v10+ FAB shell) becomes the ONLY browse surface pattern.
- `SectionTabBar` + `ArchiveScreen/browse/TabBar.tsx` + `ShowsScreen/browse/TabBar.tsx` — all deleted.
- The 5 legacy hooks' state-machine code (`Map<key, ScopeState>`, `seqRef`, `guardRef`, `hasMoreRef`) is gone.
- All browse screens have a single `useApiQuery` for the active scope.

---

## 4. What changes

- 5 screen `index.tsx` files (UI rewrite to use `BrowseLayout` + a single data stream + FAB filter).
- 5 hook files (simplified to one `useApiQuery` + tab-state-via-`BrowseLayout` if needed).
- 1 dependency removed from `package.json`.
- ~1,500 lines of state-machine + TabView wiring removed (estimate).

---

## 5. What this plan does NOT touch

- Data adapters (already V18-clean).
- `useApiQuery` / TanStack plumbing (already in place).
- Other tab patterns in the app (e.g., the React Navigation stack's tab navigator at the root level is a different concept and stays).

---

## 6. Open questions for the user

1. **Audiobooks "Recent" tab** — keep, drop, or move to a separate section?
2. **GenreScreen "Moods" tab** — its own screen, or a section of GenreScreen?
3. **ShowsScreen "Today" tab** — a "Airing Today" rail at the top, or kept as a separate browse mode?
4. **LiveTVScreen legacy** — confirm it's safe to delete (check nav routes).

These can be answered phase-by-phase. Phase 1 (Archive) has no open question; phase 5 (Shows) has 1; the others have 1 each.
