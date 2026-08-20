import type {MediaKind, MediaLane, MediaSource} from './media';

export interface MediaFile {
  uri: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  thumbnail?: string;
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  provider?: string;
  folderId?: string;
}

export interface MediaItem {
  uri: string;
  title: string;
  duration: number;
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  provider?: string;
  folderId?: string;
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

export type {
  PlaybackEntry,
  PlaybackEntryInput,
  PlaybackOrigin,
} from './playback';
export {normalizePlaybackEntry} from './playback';
