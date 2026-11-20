// ─── All Audio Screen — section shell types ──────────────────────────
//
// The section types live in `src/screens/_shared/`. This file
// re-exports the TWO the All Audio screen actually imports, so the
// `import ... from '../types'` calls keep working — the same shape as
// the Music, Movies, Podcasts and Audiobooks screens' barrels.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

export type AllAudioScreenProps = import('../../../navigation/types').RootStackScreenProps<'AllAudioScreen'>;
