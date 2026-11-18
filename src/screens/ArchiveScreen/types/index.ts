// ─── Archive Screen — section shell types ──────────────────────────────
//
// The section types live in `src/screens/_shared/`. This file
// re-exports the TWO the Archive screen actually imports, so the
// `import ... from '../types'` calls keep working — the same shape as the
// Music, Movies and Audiobooks screens' barrels.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

import type {ArchiveMediaType} from '../related/scopeConfig';
export type {ArchiveMediaType};

/**
 * One row of the archive list.
 *
 * The archive's two mediatypes return two different domain shapes
 * (`InternetArchiveItemResult` and `InternetArchiveVideoResult`), so the
 * list maps both onto this one row shape — the same mapping the screen
 * has always drawn.
 */
export interface ArchiveRow {
  identifier: string;
  title: string;
  creator: string;
  image: string;
  /** The meta line under the title — year, runtime. */
  subtitle: string;
}

export interface ArchiveRowCardProps {
  row: ArchiveRow;
  /** Which mediatype the row came from — the placeholder glyph. */
  scope: ArchiveMediaType;
  onPress: (row: ArchiveRow) => void;
}

export type ArchiveScreenProps = import('../../../navigation/types').ArchiveScreenProps;
