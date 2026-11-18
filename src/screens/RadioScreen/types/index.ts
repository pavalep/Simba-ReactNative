// ─── Radio Screen — types ────────────────────────────────────────────
//
// The browse types are the SHARED ones: `SectionBrowseConfig` (the
// static description of the section) and `SectionRenderContext` (what
// the shell hands the content). They live in `src/screens/_shared/` and
// are re-exported here, so this screen's own modules import them from
// one place — the same contract the Music, Movies, Podcasts and
// Audiobooks screens follow.

export type {SectionRenderContext} from '../../_shared/sectionRenderContext';
export type {SectionBrowseConfig} from '../../_shared/sectionBrowseConfig';

/**
 * The three filter axes.
 *
 * The group id IS the axis name, because a chip's key has to say which
 * axis it belongs to: the genre 'Rock' and a country called 'Rock' are
 * the same string, and clearing one must not clear the other.
 */
export type RadioFilterId = 'genre' | 'country' | 'language';

export type {StationRow} from '../related/stationRow';

export type {RootStackScreenProps} from '../../../navigation/types';
