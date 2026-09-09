// ─── Section Render Context (V20.9) ───────────────────────────────────
// Lifted from the 3 per-screen copies that lived at:
//   src/screens/MusicScreen/types/index.ts
//   src/screens/MoviesScreen/types/index.ts
//   src/screens/PodcastsScreen/types/index.ts
//
// The Podcasts copy was the KISS version (3 fields). The Music and
// Movies copies carried 4 additional legacy fields
// (`activeChips`, `refreshing`, `onRetry`, `routeParams`) that
// no v10 content actually reads. The PodcastsScreen file documented
// this in a comment; we honor that here by making the 4 extra
// fields OPTIONAL on the shared type so all 3 BrowseLayouts
// continue to type-check (Music/Movies pass 7; Podcasts passes 3).
//
// A future KISS pass (V20.14) could drop the optional fields
// entirely and refactor Music/Movies BrowseLayout to also pass
// just the 3 required fields.

import type {SectionOptionsMerged} from './sectionOptions';
import type {SectionRouteParams, SectionRouteKey} from './sectionRoute';

export interface SectionRenderContext {
  query: string;
  options: SectionOptionsMerged;
  offline: boolean;
  /** BrowseLayout-only — used by `<FilterChips>` for the active-filter
   *  pill row. No v10 content reads it from ctx. */
  activeChips?: Array<{key: string; label: string}>;
  /** Legacy no-op field — no v10 content reads it. The content's
   *  own data hook owns the refresh state. */
  refreshing?: boolean;
  /** Legacy no-op field — no v10 content reads it. The content's
   *  own data hook owns the retry callback. */
  onRetry?: () => void;
  /** Legacy no-op field — `routeParams` is a BrowseLayout prop,
   *  not a ctx field. Content receives it via the prop. */
  routeParams?: SectionRouteParams<SectionRouteKey>;
}
