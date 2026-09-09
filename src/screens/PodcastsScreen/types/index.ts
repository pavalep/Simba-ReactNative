// ─── Podcasts Screen — section shell types (V20.9) ─────────────────────
//
// V20.9: the section types (SectionRouteKey, SectionRouteParams,
// SectionOptionGroupId, OptionItem, OptionGroup, SectionOptionsMerged,
// SectionRenderContext, SectionBrowseConfig) were lifted to
// `src/screens/_shared/`. This file is now a thin re-export so
// existing `import ... from '../types'` calls keep working without
// changes at any call site.
//
// Note: PodcastsScreen was already the KISS-screen for ctx
// (3 fields). MusicScreen and MoviesScreen pass 4 extra
// `activeChips` / `refreshing` / `onRetry` / `routeParams`
// fields; the shared `SectionRenderContext` types those as
// optional so both shapes continue to compile.

export type {SectionRouteKey, SectionRouteParams} from '../../_shared/sectionRoute';
export type {
  SectionOptionGroupId,
  OptionItem,
  OptionGroup,
  SectionOptionsMerged,
} from '../../_shared/sectionOptions';
export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';
