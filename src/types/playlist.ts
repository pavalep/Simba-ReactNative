import type {MediaKind, MediaLane, MediaSource} from './media';

/**
 * User playlist kinds. A playlist holds ONE playback lane.
 *
 * There is no mixed playlist. `MIXED` used to be a kind in its own right -
 * one list carrying the user's own film and their own music - and it was
 * removed on 2026-11-05: a list that spans two lanes is a QUEUE, not a
 * playlist, and the mixed kind turned every lane rule into a special case.
 *
 * A record persisted with the old kind is split into its two halves when it
 * is read back. `normalizePlaylistRecord` in `src/state/playlistsStore.ts` is
 * the ONE owner of that migration.
 */
export type PlaylistKind = 'AUDIO_ONLY' | 'VIDEO_ONLY';

export interface PlaylistItem {
  id: string;
  fileUri: string;
  title: string;
  duration: number;
  /** Last native-confirmed playback position for optional playlist resume. */
  position?: number;
  artist?: string;
  album?: string;
  thumbnailPath?: string;
  addedAt: string;
  /** Canonical coarse provenance used by badges and local-file reconciliation. */
  source: MediaSource;
  /** Product-facing semantic kind used by badges and content-area grouping. */
  type: MediaKind;
  /** Playback lane used to enforce separate audio/video playlists. */
  mediaType: MediaLane;
  /** Optional provider/catalog name, such as `jamendo` or `internet-archive`. */
  provider?: string;
  /** Optional stable linked-folder identity for local entries. */
  folderId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  /** Optional user-facing description for the playlist. */
  info?: string;
  kind: PlaylistKind;
  items: PlaylistItem[];
  /** D-P3: a pinned playlist sits at the top of the user's lists. */
  pinned: boolean;
  /** D-P3: when it was pinned - the pinned order is recency of pinning. */
  pinnedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const PLAYLIST_KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
};

/** The lane a playlist holds. */
export const playlistKindToLane = (kind: PlaylistKind): MediaLane =>
  kind === 'AUDIO_ONLY' ? 'audio' : 'video';

/**
 * Only these semantic media kinds can enter user playlists. Radio, live TV,
 * audiobooks, archives, and other live/specialized content stay outside the
 * playlist domain even when their playback lane happens to match - a lane
 * is not a permission.
 *
 * The list is about the KIND, and a caller that omits `type` is classified
 * as the broad 'audio' / 'video' by `normalizeMediaClassification`. So
 * whether an item may enter a playlist depends on the kind its caller
 * declares. That is a fact about the callers, not about this list.
 */
export const PLAYLIST_ALLOWED_MEDIA_KINDS: Record<PlaylistKind, readonly MediaKind[]> = {
  AUDIO_ONLY: ['audio', 'music', 'podcast'],
  VIDEO_ONLY: ['video', 'movie'],
};

/**
 * THE rule for "can this item go in that playlist".
 *
 * A playlist takes only its own lane, and only the media kinds that lane
 * allows. There is no mixed playlist to ask twice: one rule, one answer.
 */
export const isPlaylistMediaKindAllowed = (
  kind: PlaylistKind,
  mediaKind: MediaKind,
  mediaLane: MediaLane,
): boolean =>
  playlistKindToLane(kind) === mediaLane &&
  PLAYLIST_ALLOWED_MEDIA_KINDS[kind].includes(mediaKind);
