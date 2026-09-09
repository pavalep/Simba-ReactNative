// ─── Browse All — SectionRouteKey type (V20.9) ────────────────────────
// The union of all Home Discover destinations. V20.9 lifted the
// canonical `SectionRouteKey` type to `src/screens/_shared/sectionRoute`.
// This file is now a re-export so the existing
// `import type {SectionRouteKey} from './browseAllRouteKey'`
// call site (BrowseAllShelf.tsx) keeps working without change.

export type {SectionRouteKey} from '../../_shared/sectionRoute';
