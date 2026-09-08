// ─── Section Browse Config — Search Subset (V20.7) ────────────────────
// The minimal shape of `SectionBrowseConfig` that the shared
// `useSectionSearch` hook (`src/hooks/useSectionSearch.ts`) needs.
//
// The 3 per-screen `SectionBrowseConfig` types at
// `src/screens/{MusicScreen,MoviesScreen,PodcastsScreen}/types/index.ts`
// are structurally identical, and each includes these fields. The
// 3 per-screen `types/index.ts` re-export this shared type so
// existing consumers keep working.

export interface SectionBrowseConfigSearch {
  /** Per-screen route key (e.g. `'MusicScreen'`, `'MoviesScreen'`). */
  route: string;
  /** Optional search config; `debounceMs` defaults to 300 in the hook. */
  search?: {placeholder?: string; debounceMs?: number};
}
