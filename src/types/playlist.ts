import type {MediaKind, MediaLane, MediaSource} from './media';

/**
 * A playlist that holds ONE playback lane: `AUDIO_ONLY` holds audio,
 * `VIDEO_ONLY` holds video.
 */
export type SingleLanePlaylistKind = 'AUDIO_ONLY' | 'VIDEO_ONLY';

/**
 * User playlist kinds. `MIXED` holds both lanes - one list can carry the
 * user's own film and their own music.
 *
 * `MIXED` is NOT a legacy shape. It used to be: the old store split a
 * `MIXED` record into an audio sibling and a video sibling on the way in,
 * which destroyed the playlist - its name, its id and half its items - and
 * told the user nothing. The kind is first-class now, so a mixed playlist
 * is preserved WHOLE.
 */
export type PlaylistKind = SingleLanePlaylistKind | 'MIXED';

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
  MIXED: 'Mixed',
};

/** The lane a single-lane playlist holds. `MIXED` holds both, so it has none. */
export const playlistKindToLane = (kind: SingleLanePlaylistKind): MediaLane =>
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
export const PLAYLIST_ALLOWED_MEDIA_KINDS: Record<SingleLanePlaylistKind, readonly MediaKind[]> = {
  AUDIO_ONLY: ['audio', 'music', 'podcast'],
  VIDEO_ONLY: ['video', 'movie'],
};

/**
 * THE rule for "can this item go in that playlist".
 *
 * A single-lane playlist takes only its own lane. A `MIXED` playlist takes
 * either lane - but it is bound by the SAME allow-list, so a radio station
 * or an audiobook is refused by a mixed playlist exactly as it is by a
 * single-lane one. The mixed case is not a second rule; it is this rule,
 * asked twice.
 */
export const isPlaylistMediaKindAllowed = (
  kind: PlaylistKind,
  mediaKind: MediaKind,
  mediaLane: MediaLane,
): boolean => {
  if (kind === 'MIXED') {
    return (
      isPlaylistMediaKindAllowed('AUDIO_ONLY', mediaKind, mediaLane) ||
      isPlaylistMediaKindAllowed('VIDEO_ONLY', mediaKind, mediaLane)
    );
  }
  return (
    playlistKindToLane(kind) === mediaLane &&
    PLAYLIST_ALLOWED_MEDIA_KINDS[kind].includes(mediaKind)
  );
};
