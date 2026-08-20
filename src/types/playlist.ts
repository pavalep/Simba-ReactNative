import type {MediaKind, MediaLane, MediaSource} from './media';

/** User playlist lanes. Mixed audio/video playlists are intentionally unsupported. */
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
  createdAt: string;
  updatedAt: string;
}

export const PLAYLIST_KIND_LABELS: Record<PlaylistKind, string> = {
  AUDIO_ONLY: 'Audio',
  VIDEO_ONLY: 'Video',
};

export const playlistKindToLane = (kind: PlaylistKind): MediaLane =>
  kind === 'AUDIO_ONLY' ? 'audio' : 'video';

/**
 * Only these semantic media kinds can enter user playlists. Radio, live TV,
 * audiobooks, archives, and other live/specialized content stay outside the
 * playlist domain even when their playback lane happens to match.
 */
export const PLAYLIST_ALLOWED_MEDIA_KINDS: Record<PlaylistKind, readonly MediaKind[]> = {
  AUDIO_ONLY: ['audio', 'music', 'podcast'],
  VIDEO_ONLY: ['video', 'movie'],
};

export const isPlaylistMediaKindAllowed = (
  kind: PlaylistKind,
  mediaKind: MediaKind,
  mediaLane: MediaLane,
): boolean =>
  playlistKindToLane(kind) === mediaLane &&
  PLAYLIST_ALLOWED_MEDIA_KINDS[kind].includes(mediaKind);

export type PlaylistLegacyKind = PlaylistKind | 'MIXED';
