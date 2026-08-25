import type {
  VideoV3BufferRange,
  VideoV3Chapter,
  VideoV3SessionSnapshot,
  VideoV3SourceIdentity,
  VideoV3Track,
  VideoV3VideoMetrics,
} from '../domain/VideoV3Types';

export type VideoV3SessionEvent =
  | {type: 'snapshot'; snapshot: VideoV3SessionSnapshot}
  | {type: 'file-loaded'; generation: number}
  | {type: 'position-changed'; generation: number; position: number}
  | {type: 'duration-changed'; generation: number; duration: number | null}
  | {type: 'playback-state-changed'; generation: number; isPlaying: boolean}
  | {type: 'buffering-changed'; generation: number; isBuffering: boolean; cacheFill: number}
  | {type: 'cache-changed'; generation: number; ranges: readonly VideoV3BufferRange[]}
  | {type: 'seekable-changed'; generation: number; isSeekable: boolean}
  | {type: 'seeking-changed'; generation: number; isSeeking: boolean}
  | {type: 'tracks-changed'; generation: number; tracks: readonly VideoV3Track[]}
  | {type: 'chapters-changed'; generation: number; chapters: readonly VideoV3Chapter[]}
  | {type: 'chapter-changed'; generation: number; chapterId: number | null}
  | {type: 'video-metrics-changed'; generation: number; metrics: VideoV3VideoMetrics}
  | {type: 'first-frame'; generation: number}
  | {type: 'surface-attached'; generation: number}
  | {type: 'ended'; generation: number}
  | {type: 'error'; generation: number; code?: number; message: string};

export type VideoV3SessionListener = (event: VideoV3SessionEvent) => void;
export type VideoV3Unsubscribe = () => void;

export interface VideoV3LoadRequest {
  readonly source: VideoV3SourceIdentity;
  readonly startPosition?: number;
  readonly autoplay: boolean;
  /** Correlates the native file-loaded callback with this V3 load generation. */
  readonly requestToken?: string;
}

export interface VideoV3SeekRequest {
  readonly position: number;
  readonly generation: number;
}

export interface VideoV3SessionPort {
  getSnapshot(): VideoV3SessionSnapshot;
  subscribe(listener: VideoV3SessionListener): VideoV3Unsubscribe;
  refresh(): Promise<void>;
  load(request: VideoV3LoadRequest): Promise<number>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(request: VideoV3SeekRequest): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  selectTrack(trackId: number): Promise<void>;
  setCaptionVisibility(visible: boolean): Promise<void>;
  release(): Promise<void>;
}
