// ─── Section Browse Config — Search + Options Subsets (V20.7/V20.8) ────
// The minimal shape of `SectionBrowseConfig` that the shared
// `useSectionSearch` and `useSectionOptions` hooks need.
//
// The 3 per-screen `SectionBrowseConfig` types at
// `src/screens/{MusicScreen,MoviesScreen,PodcastsScreen}/types/index.ts`
// are structurally identical, and each includes these fields. The
// 3 per-screen `types/index.ts` re-export this shared type so
// existing consumers keep working.

import type {OptionGroup} from './sectionOptions';

export interface SectionBrowseConfigSearch {
  /** Per-screen route key (e.g. `'MusicScreen'`, `'MoviesScreen'`). */
  route: string;
  /** Optional search config; `debounceMs` defaults to 300 in the hook. */
  search?: {placeholder?: string; debounceMs?: number};
}

export interface SectionBrowseConfigOptions {
  /** Per-screen route key (e.g. `'MusicScreen'`, `'MoviesScreen'`). */
  route: string;
  /** Optional option-sheet groups (filter / sort / view). */
  options?: {groups: OptionGroup[]};
}
