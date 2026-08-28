import type {
  VideoBufferRange,
  VideoChapter,
  VideoSessionSnapshot,
  VideoSourceIdentity,
  VideoTrack,
  VideoVideoMetrics,
} from '../domain/VideoTypes';

export type VideoSessionEvent =
  | {type: 'snapshot'; snapshot: VideoSessionSnapshot}
  | {type: 'file-loaded'; generation: number}
  | {type: 'position-changed'; generation: number; position: number}
  | {type: 'duration-changed'; generation: number; duration: number | null}
  | {type: 'playback-state-changed'; generation: number; isPlaying: boolean}
  | {type: 'buffering-changed'; generation: number; isBuffering: boolean; cacheFill: number}
  | {type: 'cache-changed'; generation: number; ranges: readonly VideoBufferRange[]}
  | {type: 'seekable-changed'; generation: number; isSeekable: boolean}
  | {type: 'seeking-changed'; generation: number; isSeeking: boolean}
  | {type: 'tracks-changed'; generation: number; tracks: readonly VideoTrack[]}
  | {type: 'chapters-changed'; generation: number; chapters: readonly VideoChapter[]}
  | {type: 'chapter-changed'; generation: number; chapterId: number | null}
  | {type: 'video-metrics-changed'; generation: number; metrics: VideoVideoMetrics}
  | {type: 'first-frame'; generation: number}
  | {type: 'surface-attached'; generation: number}
  | {type: 'playback-restart'; generation: number}
  | {type: 'ended'; generation: number}
  | {type: 'error'; generation: number; code?: number; recoverable: boolean; message: string};

export type VideoSessionListener = (event: VideoSessionEvent) => void;
export type VideoUnsubscribe = () => void;

export interface VideoLoadRequest {
  readonly source: VideoSourceIdentity;
  readonly startPosition?: number;
  readonly autoplay: boolean;
  /** Correlates the native file-loaded callback with this V3 load generation. */
  readonly requestToken?: string;
}

export interface VideoSeekRequest {
  readonly position: number;
  readonly generation: number;
}

export interface VideoSessionPort {
  getSnapshot(): VideoSessionSnapshot;
  subscribe(listener: VideoSessionListener): VideoUnsubscribe;
  refresh(): Promise<void>;
  load(request: VideoLoadRequest): Promise<number>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(request: VideoSeekRequest): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  selectTrack(trackId: number): Promise<void>;
  setCaptionVisibility(visible: boolean): Promise<void>;
  /** W2.4: advance to the next item in the mpv playlist (no-op on a
   *  single-item playlist). */
  next(): Promise<void>;
  /** W2.4: jump to the previous item in the mpv playlist. */
  previous(): Promise<void>;
  release(): Promise<void>;
}
