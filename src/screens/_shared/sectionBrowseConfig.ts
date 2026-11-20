// ─── Section Browse Config (V20.7 / V20.8 / V20.9) ─────────────────────
//
// V20.7 — added `SectionBrowseConfigSearch` (the minimal slice the
//   shared `useSectionSearch` hook needs).
// V20.8 — added `SectionBrowseConfigOptions` (the minimal slice the
//   shared `useSectionOptions` hook needs).
// V20.9 — added the full `SectionBrowseConfig` (the union of both
//   slices plus the route, title, and renderContent fields). Lifted
//   from the 3 per-screen `types/index.ts` copies that lived at
//   `src/screens/{MusicScreen,MoviesScreen,PodcastsScreen}/types/index.ts`.
//   The 3 per-screen `types/index.ts` now re-export this shared type.

import type {ReactNode} from 'react';
import type {OptionGroup} from './sectionOptions';
import type {SectionRouteKey} from './sectionRoute';
import type {SectionRenderContext} from './sectionRenderContext';

export interface SectionBrowseConfigSearch {
  /** Per-screen route key (e.g. `'MusicScreen'`, `'MoviesScreen'`). */
  route: SectionRouteKey;
  /** Optional search config; `debounceMs` defaults to 300 in the hook. */
  search?: {placeholder?: string; debounceMs?: number};
}

export interface SectionBrowseConfigOptions {
  /** Per-screen route key (e.g. `'MusicScreen'`, `'MoviesScreen'`). */
  route: SectionRouteKey;
  /** Optional option-sheet groups (filter / sort / view). */
  options?: {groups: OptionGroup[]};
}

/** Full `SectionBrowseConfig` — the static description of a section
 *  (route, title, optional search/options, and the `renderContent`
 *  callback the shell uses to render the content's FlatList).
 *
 *  THE CONFIG DECLARES THE CHROME:
 *
 *  - `search` — when it is OMITTED the shell draws no search field;
 *  - `options` — when it is omitted or has no groups, the shell draws no
 *    filter button and no filter sheet.
 *
 *  A LIST page (no filters, no paging, no footer) is the same shell
 *  with those parts left out: it declares a search or it does not, and
 *  its content does not report a list end (there is no next page to
 *  reach). The eight browse catalogues all declare a search and at
 *  least one filter axis, so nothing changes for them. */
export interface SectionBrowseConfig {
  route: SectionRouteKey;
  title: string;
  search?: {placeholder?: string; debounceMs?: number};
  options?: {groups: OptionGroup[]};
  /**
   * The page's own surface.
   *
   * `'flat'` (the default) paints the app's background colour;
   * `'gradient'` paints the app's themed background→elevated gradient —
   * the surface the list pages wore before they joined the shell.
   *
   * The shell OWNS the surface, so the choice belongs in the config
   * rather than in each screen's own root: a screen that painted its
   * own background ON TOP of the shell's would cover it, which is the
   * defect the themed-root gate exists to catch.
   */
  background?: 'flat' | 'gradient';
  renderContent: (ctx: SectionRenderContext) => ReactNode;
}
