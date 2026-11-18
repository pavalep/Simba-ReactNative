// ─── Audiobooks Screen — section shell types ───────────────────────────
//
// The section types live in `src/screens/_shared/`. This file
// re-exports the TWO the Audiobooks screen actually imports, so the
// existing `import ... from '../types'` calls keep working — the same
// shape as the Music and Movies screens' barrels.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

export interface BookRow {
  id: number;
  title: string;
  author: string;
  image: string;
  subtitle: string;
  totalTime: number;
  language: string;
}

export type AudiobooksScreenProps = import('../../../navigation/types').AudiobooksScreenProps;
