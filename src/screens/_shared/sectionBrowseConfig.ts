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
 *  callback the shell uses to render the content's FlatList). */
export interface SectionBrowseConfig {
  route: SectionRouteKey;
  title: string;
  search?: {placeholder?: string; debounceMs?: number};
  options?: {groups: OptionGroup[]};
  renderContent: (ctx: SectionRenderContext) => ReactNode;
}
