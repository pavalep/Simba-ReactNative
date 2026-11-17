// ─── Music Screen — section shell types (V20.9) ───────────────────────
//
// V20.9: the section types were lifted to `src/screens/_shared/`. This
// file re-exports the TWO the Music screen actually imports, so the
// existing `import ... from '../types'` calls keep working.
//
// The other six (SectionRouteKey, SectionRouteParams,
// SectionOptionGroupId, OptionItem, OptionGroup, SectionOptionsMerged)
// had no importer here — their real consumers import them from
// `_shared/` directly — so they are not re-exported.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';
