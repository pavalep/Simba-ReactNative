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
}

export interface Playlist {
  id: string;
  name: string;
  kind: PlaylistKind;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}
