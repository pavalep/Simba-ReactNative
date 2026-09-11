// ─── Section Render Context (V20.9, KISS in V20.14) ─────────────────
// Lifted from the 3 per-screen copies that lived at:
//   src/screens/MusicScreen/types/index.ts
//   src/screens/MoviesScreen/types/index.ts
//   src/screens/PodcastsScreen/types/index.ts
//
// The Podcasts copy was the KISS version (3 fields). The Music and
// Movies copies carried 4 additional legacy fields
// (`activeChips`, `refreshing`, `onRetry`, `routeParams`) that
// no v10 content actually reads — confirmed by a `grep` for
// `ctx.activeChips | ctx.refreshing | ctx.onRetry | ctx.routeParams`
// across `src/` returning zero matches. V20.14 drops them.
//
// The Music / Movies BrowseLayouts previously passed those 4
// fields with no-op defaults (`refreshing: false`,
// `onRetry: () => {}`, etc.) — the sectionRenderContext docstring
// documented this. The KISS pass removes the dead-field
// assignments from those two BrowseLayouts as well.

import type {SectionOptionsMerged} from './sectionOptions';

export interface SectionRenderContext {
  query: string;
  options: SectionOptionsMerged;
  offline: boolean;
}
