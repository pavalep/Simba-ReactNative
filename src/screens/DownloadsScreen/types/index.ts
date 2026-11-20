// ─── Downloads — section shell types ───────────────────────────────────
//
// The section types live in `src/screens/_shared/`. This file
// re-exports the TWO the Downloads screen actually imports, so the
// `import ... from '../types'` calls keep working — the same shape as
// the Music, Movies, Podcasts, Audiobooks and All Audio screens'
// barrels.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

export type DownloadsScreenProps = import('../../../navigation/types').RootStackScreenProps<'Downloads'>;