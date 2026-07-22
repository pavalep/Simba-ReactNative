export interface MediaFile {
  uri: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  thumbnail?: string;
}

export interface MediaItem {
  uri: string;
  title: string;
  duration: number;
  type: 'video' | 'audio';
  fileSize: number;
  dateAdded: string;
}

export interface Playlist {
  id: string;
  title: string;
  files: MediaFile[];
}

export type RepeatMode = 'off' | 'one' | 'all';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped' | 'error';

export interface PlayerSettings {
  playbackSpeed: number;
  equalizerPreset: string;
  sleepTimerMinutes: number;
  audioTrack?: string;
  subtitleTrack?: string;
}
