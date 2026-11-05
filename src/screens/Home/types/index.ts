import type {FollowedPodcast} from '../../../features/followedPodcasts';
import type {Bookmark} from '../../../features/bookmarks';
import type {RootStackParamList} from '../../../navigation/types';
import type {Playlist} from '../../../types/playlist';

export type HomeSection =
  | {type: 'GREETING'}
  | {type: 'SUBSECTION_TITLE'; label: string; variant?: 'overline' | 'displaySans' | 'displaySerif'}
  | {type: 'SHELF'; title: string; items: any[]; seeAllRoute?: keyof RootStackParamList | 'LocalFiles'}
  | {type: 'GENRE'; genres: {name: string; count: number}[]}
  | {type: 'PINNED_PLAYLISTS'; items: Playlist[]}
  | {type: 'BOOKMARKS'; items: Bookmark[]}
  | {type: 'FOLLOWED_PODCASTS'; items: FollowedPodcast[]}
  | {type: 'BROWSE_ALL'};
