import type {FollowedPodcast} from '../../../features/followedPodcasts';
import type {Bookmark} from '../../../features/bookmarks';
import type {RootStackParamList} from '../../../navigation/types';

export type HomeSection =
  | {type: 'GREETING'}
  | {type: 'SUBSECTION_TITLE'; label: string; variant?: 'overline' | 'displaySans' | 'displaySerif'}
  | {type: 'SHELF'; title: string; items: any[]; seeAllRoute?: keyof RootStackParamList | 'LocalFiles'}
  | {type: 'GENRE'; genres: {name: string; count: number}[]}
  | {type: 'PLAYLISTS'; items: any[]}
  | {type: 'BOOKMARKS'; items: Bookmark[]}
  | {type: 'FOLLOWED_PODCASTS'; items: FollowedPodcast[]}
  | {type: 'BROWSE_ALL'};
