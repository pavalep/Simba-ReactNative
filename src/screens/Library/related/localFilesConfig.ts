import type {SvgIconName} from '../../../components/utility/SvgIcon';
import type {
  ContentMode,
  FilterType,
  LocalMediaFilter,
  Segment,
  SortOption,
} from '../types';

export const LOCAL_FILE_SEGMENTS: Array<{
  key: Segment;
  label: string;
  icon: SvgIconName;
}> = [
  {key: 'folders', label: 'Folders', icon: 'folder'},
  {key: 'audio', label: 'Audio', icon: 'music'},
  {key: 'artists', label: 'Artists', icon: 'headphones'},
  {key: 'albums', label: 'Albums', icon: 'list'},
];

export const LOCAL_MEDIA_FILTERS: Array<{
  key: LocalMediaFilter;
  label: string;
}> = [
  {key: 'all', label: 'All'},
  {key: 'video', label: 'Video'},
  {key: 'audio', label: 'Audio'},
];

export const LOCAL_SORT_OPTIONS: Array<{
  key: SortOption;
  label: string;
}> = [
  {key: 'name', label: 'Name'},
  {key: 'dateAdded', label: 'Newest'},
  {key: 'size', label: 'Size'},
  {key: 'duration', label: 'Duration'},
  {key: 'artist', label: 'Artist'},
  {key: 'album', label: 'Album'},
];

export const LOCAL_CONTENT_MODES: Array<{
  key: ContentMode;
  label: string;
}> = [
  {key: 'library', label: 'Library'},
  {key: 'playlists', label: 'Playlists'},
];

/** Mixed queues are intentionally not exposed by the v11 product contract. */
export const LOCAL_PLAYLIST_FILTERS: Array<{
  key: FilterType;
  label: string;
}> = [
  {key: 'ALL', label: 'All'},
  {key: 'AUDIO_ONLY', label: 'Audio'},
  {key: 'VIDEO_ONLY', label: 'Video'},
];

export const LOCAL_VIEW_TOGGLE_SEGMENTS: Segment[] = ['audio'];
export const LOCAL_SORT_SEGMENTS: Segment[] = ['audio'];
export const LOCAL_FILTER_SEGMENTS: Segment[] = ['audio'];
export const LOCAL_GRID_GAP = 8;
