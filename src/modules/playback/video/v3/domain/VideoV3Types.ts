import type {MediaKind, MediaLane, MediaSource} from '../../../../../types/media';

export interface VideoV3SourceIdentity {
  readonly uri: string;
  readonly title: string;
  readonly source: MediaSource;
  readonly type: MediaKind;
  readonly mediaLane: Extract<MediaLane, 'video'>;
  readonly provider?: string;
  readonly folderId?: string;
}

export type VideoV3SessionPhase =
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

export interface VideoV3BufferRange {
  readonly start: number;
  readonly end: number;
}

export interface VideoV3Track {
  readonly id: number;
  readonly type: 'video' | 'audio' | 'sub';
  readonly title?: string;
  readonly language?: string;
  readonly codec?: string;
  readonly isDefault: boolean;
  readonly isSelected: boolean;
}

export interface VideoV3Chapter {
  readonly id: number;
  readonly title: string;
  readonly startTime: number;
  readonly endTime: number;
}

export interface VideoV3VideoMetrics {
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly fps: number;
  readonly codec: string;
}

export interface VideoV3SessionSnapshot {
  readonly generation: number;
  readonly source: VideoV3SourceIdentity | null;
  readonly sourceFingerprint: string | null;
  readonly phase: VideoV3SessionPhase;
  readonly position: number;
  readonly duration: number | null;
  readonly isPlaying: boolean;
  readonly isEnded: boolean;
  readonly isBuffering: boolean;
  readonly isSeeking: boolean;
  readonly isSeekable: boolean;
  readonly isLive: boolean;
  readonly bufferedRanges: readonly VideoV3BufferRange[];
  readonly cacheFill: number;
  readonly tracks: readonly VideoV3Track[];
  readonly chapters: readonly VideoV3Chapter[];
  readonly currentChapterId: number | null;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly speed: number;
  readonly hasFirstFrame: boolean;
  readonly hasSurfaceAttached: boolean;
  readonly videoMetrics: VideoV3VideoMetrics | null;
  readonly error: VideoV3Error | null;
}

export interface VideoV3Error {
  readonly code?: number;
  readonly message: string;
  readonly recoverable: boolean;
  readonly generation: number;
}

export interface VideoV3PlatformCapabilities {
  readonly canPictureInPicture: boolean;
  readonly canFullscreen: boolean;
  readonly canChangeOrientation: boolean;
}

export interface VideoV3Capabilities extends VideoV3PlatformCapabilities {
  readonly canPlay: boolean;
  readonly canPause: boolean;
  readonly canSeek: boolean;
  readonly canAdjustVolume: boolean;
  readonly canChangeSpeed: boolean;
  readonly canSelectAudioTrack: boolean;
  readonly canSelectCaptionTrack: boolean;
  readonly canViewChapters: boolean;
}

export interface VideoV3ViewState {
  readonly session: VideoV3SessionSnapshot;
  readonly capabilities: VideoV3Capabilities;
}

export function emptyVideoV3Snapshot(): VideoV3SessionSnapshot {
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
