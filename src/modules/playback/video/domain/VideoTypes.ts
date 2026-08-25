import type {MediaKind, MediaLane, MediaSource} from '../../../../types/media';

export interface VideoSourceIdentity {
  readonly uri: string;
  readonly title: string;
  readonly source: MediaSource;
  readonly type: MediaKind;
  readonly mediaLane: Extract<MediaLane, 'video'>;
  readonly provider?: string;
  readonly folderId?: string;
}

export type VideoSessionPhase =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'first-frame'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'seeking'
  | 'finished'
  | 'live'
  | 'error';

export interface VideoBufferRange {
  readonly start: number;
  readonly end: number;
}

export interface VideoTrack {
  readonly id: number;
  readonly type: 'video' | 'audio' | 'sub';
  readonly title?: string;
  readonly language?: string;
  readonly codec?: string;
  readonly isDefault: boolean;
  readonly isSelected: boolean;
}

export interface VideoChapter {
  readonly id: number;
  readonly title: string;
  readonly startTime: number;
  readonly endTime: number;
}

export interface VideoVideoMetrics {
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly fps: number;
  readonly codec: string;
}

export interface VideoSessionSnapshot {
  readonly generation: number;
  readonly source: VideoSourceIdentity | null;
  readonly sourceFingerprint: string | null;
  readonly phase: VideoSessionPhase;
  readonly position: number;
  readonly duration: number | null;
  readonly isPlaying: boolean;
  readonly isEnded: boolean;
  readonly isBuffering: boolean;
  readonly isSeeking: boolean;
  readonly isSeekable: boolean;
  readonly isLive: boolean;
  readonly bufferedRanges: readonly VideoBufferRange[];
  readonly cacheFill: number;
  readonly tracks: readonly VideoTrack[];
  readonly chapters: readonly VideoChapter[];
  readonly currentChapterId: number | null;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly speed: number;
  readonly hasFirstFrame: boolean;
  readonly hasSurfaceAttached: boolean;
  readonly videoMetrics: VideoVideoMetrics | null;
  readonly error: VideoError | null;
}

export interface VideoError {
  readonly code?: number;
  readonly message: string;
  readonly recoverable: boolean;
  readonly generation: number;
}

export interface VideoPlatformCapabilities {
  readonly canPictureInPicture: boolean;
  readonly canFullscreen: boolean;
  readonly canChangeOrientation: boolean;
}

export interface VideoCapabilities extends VideoPlatformCapabilities {
  readonly canPlay: boolean;
  readonly canPause: boolean;
  readonly canSeek: boolean;
  readonly canAdjustVolume: boolean;
  readonly canChangeSpeed: boolean;
  readonly canSelectAudioTrack: boolean;
  readonly canSelectCaptionTrack: boolean;
  readonly canViewChapters: boolean;
}

export interface VideoViewState {
  readonly session: VideoSessionSnapshot;
  readonly capabilities: VideoCapabilities;
}

export function emptyVideoSnapshot(): VideoSessionSnapshot {
  return {
    generation: 0,
    source: null,
    sourceFingerprint: null,
    phase: 'idle',
    position: 0,
    duration: null,
    isPlaying: false,
    isEnded: false,
    isBuffering: false,
    isSeeking: false,
    isSeekable: false,
    isLive: false,
    bufferedRanges: [],
    cacheFill: 0,
    tracks: [],
    chapters: [],
    currentChapterId: null,
    volume: 100,
    isMuted: false,
    speed: 1,
    hasFirstFrame: false,
    hasSurfaceAttached: false,
    videoMetrics: null,
    error: null,
  };
}
