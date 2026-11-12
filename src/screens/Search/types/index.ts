import type {RootStackScreenProps} from '../../../navigation/types';

export type SearchScreenProps = RootStackScreenProps<'Search'>;

/**
 * The catalogues the search can look in.
 *
 * 2026-11-12 (SEARCH_PAGE_REDESIGN): the type moved here from
 * `components/SourceFilterChips.tsx`, which was deleted. That file was
 * the SIXTH implementation of a chip row the app already has
 * (`components/utility/FilterChips`), and it owned the type that
 * `RemoteResults` imported — so deleting the file would have taken the
 * type with it. The type is a fact about the SCREEN, not about a chip
 * row, and the screen's own types folder is where it belongs.
 *
 * It then moved AGAIN, to `utils/searchFilters.ts`, because the type is
 * now the SCOPE — the axis that decides which catalogues are on screen
 * and which of the remote sources are visible. It lives with the rules
 * that use it, and the screen's types folder re-exports it so the
 * call sites keep one import.
 *
 * The values are unchanged: All, Local, Music, TV, Audiobooks, Archive.
 * `podcasts` and `radio` are GONE — their adapters are not built, so
 * those two chips could only ever draw an empty page.
 */
export type {SearchScope} from '../utils/searchFilters';
