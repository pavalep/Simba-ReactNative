import type {FollowedPodcast} from '../../../features/followedPodcasts';
import type {Bookmark} from '../../../features/bookmarks';
import type {RootStackParamList} from '../../../navigation/types';
import type {Playlist} from '../../../types/playlist';
import type {HomeMediaShelfItem} from '../components/HomeMediaShelf';

export type HomeSection =
  | {type: 'GREETING'}
  | {type: 'SUBSECTION_TITLE'; label: string; variant?: 'overline' | 'displaySans' | 'displaySerif'}
  | {
      type: 'SHELF';
      title: string;
      /**
       * The rail's own item type, not `any[]`.
       *
       * F-10: this arm carried `items: any[]`, so nothing checked that the
       * store's `RecentHistoryEntry[]` actually fitted the rail that
       * renders it. The rail's contract is `HomeMediaShelfItem[]`, and
       * `RecentHistoryEntry` satisfies it field for field - so the hole
       * was hiding nothing today, and now the compiler says so.
       */
      items: HomeMediaShelfItem[];
      seeAllRoute?: keyof RootStackParamList | 'LocalFiles';
    }
  | {type: 'PINNED_PLAYLISTS'; items: Playlist[]}
  | {type: 'BOOKMARKS'; items: Bookmark[]}
  | {type: 'FOLLOWED_PODCASTS'; items: FollowedPodcast[]}
  | {type: 'BROWSE_ALL'};
