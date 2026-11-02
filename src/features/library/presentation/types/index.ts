export type Segment = 'audio' | 'artists' | 'albums' | 'folders';
export type ContentMode = 'library' | 'playlists';
/**
 * The Library's playlist filter: every playlist kind, plus `ALL`.
 *
 * `PlaylistKind` is the ONE owner of the kinds, so the filter cannot
 * fall behind a kind the domain already knows about.
 */
export type FilterType = 'ALL' | PlaylistKind;
export type LocalMediaFilter = 'all' | 'video' | 'audio';
export type SortOption = 'name' | 'dateAdded' | 'size' | 'duration' | 'artist' | 'album';

import type {PlaylistKind} from '../../../../types/playlist';
import type {RootStackScreenProps as RootProps} from '../../../../navigation/types';
export type {RootProps as RootStackScreenProps};
export type AlbumDetailScreenProps = RootProps<'AlbumDetail'>;
export type ArtistDetailScreenProps = RootProps<'ArtistDetail'>;
