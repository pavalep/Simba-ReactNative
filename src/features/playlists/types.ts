/**
 * The result types the playlist feature reports.
 *
 * They live here, and not in `index.ts`, so the feature's own reporting
 * helpers can name a status without importing the facade that calls them.
 * `index.ts` re-exports both, so the public API is unchanged:
 *
 *     import type {AddPlaylistItemResult} from '../../features/playlists';
 *
 * still works exactly as it did before.
 */

import type {Playlist, PlaylistItem} from '../../types/playlist';

/** What `createPlaylist` did. */
export type CreatePlaylistResult =
  | {status: 'created'; playlist: Playlist}
  | {status: 'limit-reached'; max: number};

/**
 * What `addItemToPlaylist` did.
 *
 * Every status here is a REAL outcome. A caller that reports a count must
 * read it from these statuses, because the store REFUSES some items
 * silently — the refusal is in the status, and nowhere else.
 */
export type AddPlaylistItemResult =
  | {status: 'added'; playlist: Playlist; item: PlaylistItem}
  | {status: 'playlist-not-found'}
  | {status: 'duplicate'; playlist: Playlist; item: PlaylistItem}
  | {status: 'playlist-full'; playlist: Playlist; max: number}
  | {status: 'lane-mismatch'; playlist: Playlist; item: PlaylistItem}
  | {status: 'unsupported-media-kind'; playlist: Playlist; item: PlaylistItem};
