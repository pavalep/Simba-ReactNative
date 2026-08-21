export type Segment = 'audio' | 'artists' | 'albums' | 'folders';
export type ContentMode = 'library' | 'playlists';
export type FilterType = 'ALL' | 'AUDIO_ONLY' | 'VIDEO_ONLY';
export type LocalMediaFilter = 'all' | 'video' | 'audio';
export type SortOption = 'name' | 'dateAdded' | 'size' | 'duration' | 'artist' | 'album';

import type {RootStackScreenProps as RootProps} from '../../../navigation/types';
export type {RootProps as RootStackScreenProps};
export type AlbumDetailScreenProps = RootProps<'AlbumDetail'>;
export type ArtistDetailScreenProps = RootProps<'ArtistDetail'>;
