// ─── Types ──────────────────────────────────────────────────

export type PlaylistKind = 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED';

export interface PlaylistItem {
  id: string;
  fileUri: string;
  title: string;
  duration: number;
  artist?: string;
  album?: string;
  thumbnailPath?: string;
  addedAt: string;
  /** New in Phase 22: tracks whether item is audio or video for mixed playlist display */
  mediaType?: 'audio' | 'video';
}

export interface Playlist {
  id: string;
  name: string;
  kind: PlaylistKind;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}
