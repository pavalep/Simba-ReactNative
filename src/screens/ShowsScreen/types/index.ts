// ─── Shows Screen — section shell types ─────────────────────────────────
//
// The section types live in `src/screens/_shared/`. This file
// re-exports the TWO the Shows screen actually imports, so the
// existing `import ... from '../types'` calls keep working — the same
// shape as the Music, Movies, Podcasts and Audiobooks screens' barrels.
//
// The old barrel also re-exported `RootStackScreenProps`; nothing
// imported it from here (the screen's own props came from
// `navigation/types`), so it is gone rather than kept as a second
// path to the same type.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

export type {ShowsScreenProps} from '../../../navigation/types';
