import {MpvPlayer} from '../../../../../native/player.api';
import {getLocalPath} from '../../../../../services/downloadService';
import type {
  MpvFileLoadedEvent,
  MpvPlaybackState,
} from '../../../../../native/NativeMpvPlayer';
import {
  createVideoV3SourceFingerprint,
  isSameVideoV3Source,
} from '../domain/VideoV3Fingerprint';
import {
  emptyVideoV3Snapshot,
  type VideoV3BufferRange,
  type VideoV3Chapter,
  type VideoV3SessionSnapshot,
  type VideoV3Track,
  type VideoV3VideoMetrics,
} from '../domain/VideoV3Types';
import type {
  VideoV3LoadRequest,
  VideoV3SeekRequest,
  VideoV3SessionEvent,
  VideoV3SessionListener,
  VideoV3SessionPort,
  VideoV3Unsubscribe,
} from '../ports/VideoV3SessionPort';

const MAX_VOLUME = 100;
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const MIN_POSITION = 0;

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function finiteOrZero(value: unknown): number {
  return finiteOrNull(value) ?? 0;
}

function readNative<T>(reader: () => T, fallback: T): T {
  try {
    return reader();
  } catch {
    return fallback;
  }
}

function normalizeRanges(ranges: readonly VideoV3BufferRange[]): VideoV3BufferRange[] {
  type MutableRange = {start: number; end: number};
  return ranges
    .map(range => ({
      start: Math.max(MIN_POSITION, finiteOrZero(range.start)),
      end: Math.max(MIN_POSITION, finiteOrZero(range.end)),
    }))
    .filter(range => range.end > range.start)
    .sort((left, right) => left.start - right.start)
    .reduce<MutableRange[]>((merged, range) => {
      const previous = merged[merged.length - 1];
      if (!previous || range.start > previous.end) {
        merged.push(range);
      } else {
        previous.end = Math.max(previous.end, range.end);
      }
      return merged;
    }, []);
}

function mapTrack(track: {
  id: number;
  type: 'video' | 'audio' | 'sub';
  title?: string;
  lang?: string;
  codec?: string;
  default: boolean;
  selected: boolean;
}): VideoV3Track {
  return {
    id: track.id,
    type: track.type,
    ...(track.title ? {title: track.title} : {}),
    ...(track.lang ? {language: track.lang} : {}),
    ...(track.codec ? {codec: track.codec} : {}),
    isDefault: track.default,
    isSelected: track.selected,
  };
}

function mapChapter(chapter: {
  id: number;
  title: string;
  startTime: number;
  endTime: number;
}): VideoV3Chapter {
  return {
    id: chapter.id,
    title: chapter.title,
    startTime: chapter.startTime,
    endTime: chapter.endTime,
  };
}

function mapPlaybackState(state: MpvPlaybackState): 'playing' | 'paused' | 'idle' {
  if (state === 'playing') return 'playing';
  if (state === 'paused') return 'paused';
  return 'idle';
}

/**
 * Presentation-neutral V3 session adapter.
 *
 * It owns native listeners, source generations, and the one mpv session. It
 * intentionally has no React, layout, icon, panel, or presentation concerns.
 */
export class VideoV3MpvSession implements VideoV3SessionPort {
  private snapshot: VideoV3SessionSnapshot = emptyVideoV3Snapshot();
  private readonly listeners = new Set<VideoV3SessionListener>();
  private nativeUnsubscribers: VideoV3Unsubscribe[] = [];
  private surfaceSubscription: {remove: () => void} | null = null;
  private pendingStartPosition: number | undefined;
  private activeFileGeneration: number | null = null;
  private expectedNativePath: string | null = null;
  private expectedLoadRequestToken: string | null = null;
  private loadRequestSequence = 0;
  private released = false;
  private releasePromise: Promise<void> | null = null;

  constructor() {
    this.subscribeToNativeEvents();
  }

  getSnapshot(): VideoV3SessionSnapshot {
    return this.snapshot;
  }

  subscribe(listener: VideoV3SessionListener): VideoV3Unsubscribe {
    if (this.released) return () => undefined;
    this.listeners.add(listener);
    listener({type: 'snapshot', snapshot: this.snapshot});
    return () => this.listeners.delete(listener);
  }

  async load(request: VideoV3LoadRequest): Promise<number> {
    this.assertUsable();
    const fingerprint = createVideoV3SourceFingerprint(request.source);

    if (isSameVideoV3Source(this.snapshot.sourceFingerprint, request.source)) {
      if (request.startPosition !== undefined) {
        await this.seek({
          generation: this.snapshot.generation,
          position: request.startPosition,
        });
      }
      if (request.autoplay) await this.play();
      return this.snapshot.generation;
    }

    const generation = this.snapshot.generation + 1;
    this.pendingStartPosition = this.normalizeRequestedPosition(request.startPosition);
    this.activeFileGeneration = null;
    this.expectedNativePath = getLocalPath(request.source.uri) ?? request.source.uri;
    const requestToken = request.requestToken ?? `v3-${generation}-${++this.loadRequestSequence}`;
    this.expectedLoadRequestToken = requestToken;
    this.snapshot = {
      ...emptyVideoV3Snapshot(),
      generation,
      hasSurfaceAttached: this.snapshot.hasSurfaceAttached,
      source: request.source,
      sourceFingerprint: fingerprint,
      phase: 'preparing',
      isLive: request.source.type === 'live-tv',
      isSeekable: request.source.type !== 'live-tv',
    };
    this.emitSnapshot();

    try {
      const initialized = MpvPlayer.initPlayer();
      if (!initialized) {
        throw new Error('The native video session could not be initialized.');
      }
      this.updateSnapshot(current => ({
        ...current,
        phase: 'connecting',
      }));
      // Set intent before loadFile because a native test double or bridge may
      // emit file-loaded synchronously during the call.
      this.pendingAutoplay = request.autoplay;
      MpvPlayer.loadFileWithRequestId(request.source.uri, requestToken);
      return generation;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video load failed.';
      this.setError(generation, message, true);
      throw error;
    }
  }

  private pendingAutoplay = false;

  async refresh(): Promise<void> {
    this.assertUsable();
    const nativeState = readNative<MpvPlaybackState | null>(
      () => MpvPlayer.getPlaybackState(),
      null,
    );
    const position = finiteOrNull(readNative(() => MpvPlayer.getPosition(), NaN));
    const duration = finiteOrNull(readNative(() => MpvPlayer.getDuration(), NaN));
    const volume = finiteOrNull(readNative(() => MpvPlayer.getVolume(), NaN));
    const isMuted = readNative<boolean | null>(() => MpvPlayer.isMuted(), null);
    const speed = finiteOrNull(readNative(() => MpvPlayer.getSpeed(), NaN));

    this.updateSnapshot(current => {
      if (current.isEnded && nativeState !== 'playing') {
        return {
          ...current,
          ...(position === null ? {} : {position}),
          ...(duration === null ? {} : {duration}),
        };
      }
      const mapped = nativeState ? mapPlaybackState(nativeState) : null;
      return {
        ...current,
        ...(position === null ? {} : {position}),
        ...(duration === null ? {} : {duration}),
        ...(volume === null ? {} : {volume: Math.max(0, Math.min(MAX_VOLUME, volume))}),
        ...(isMuted === null ? {} : {isMuted}),
        ...(speed === null ? {} : {speed: Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed))}),
        ...(mapped === null ? {} : {
          isPlaying: mapped === 'playing',
          phase:
            current.isSeeking || current.isBuffering
              ? current.phase
              : mapped === 'playing'
                ? current.hasFirstFrame ? 'playing' : 'first-frame'
                : mapped === 'paused' ? 'paused' : current.phase,
        }),
      };
    });
  }

  async play(): Promise<void> {
    this.assertUsable();
    MpvPlayer.play();
  }

  async pause(): Promise<void> {
    this.assertUsable();
    MpvPlayer.pause();
  }

  async seek(request: VideoV3SeekRequest): Promise<void> {
    this.assertUsable();
    if (request.generation !== this.snapshot.generation) return;
    if (!this.snapshot.isSeekable) return;

    const duration = this.snapshot.duration;
    const requested = Math.max(MIN_POSITION, request.position);
    const position = duration === null ? requested : Math.min(requested, duration);
    this.updateSnapshot(current => ({
      ...current,
      phase: 'seeking',
      isSeeking: true,
      isEnded: false,
    }));
    MpvPlayer.seekTo(position);
  }

  async setVolume(volume: number): Promise<void> {
    this.assertUsable();
    const nextVolume = Math.max(0, Math.min(MAX_VOLUME, volume));
    MpvPlayer.setVolume(nextVolume);
    this.updateSnapshot(current => ({...current, volume: nextVolume}));
  }

  async setMuted(muted: boolean): Promise<void> {
    this.assertUsable();
    MpvPlayer.setMuted(muted);
    this.updateSnapshot(current => ({...current, isMuted: muted}));
  }

  async setSpeed(speed: number): Promise<void> {
    this.assertUsable();
    const nextSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));
    MpvPlayer.setSpeed(nextSpeed);
    this.updateSnapshot(current => ({...current, speed: nextSpeed}));
  }

  async selectTrack(trackId: number): Promise<void> {
    this.assertUsable();
    const track = this.snapshot.tracks.find(item => item.id === trackId);
    if (!track) return;
    MpvPlayer.selectTrack(trackId);
  }

  async setCaptionVisibility(visible: boolean): Promise<void> {
    this.assertUsable();
    if (visible) {
      const selectedCaption = this.snapshot.tracks.find(
        track => track.type === 'sub' && track.isSelected,
      );
      const defaultCaption = this.snapshot.tracks.find(
        track => track.type === 'sub' && track.isDefault,
      );
      const target = selectedCaption ?? defaultCaption;
      if (target) MpvPlayer.setTrack('sub', target.id);
    } else {
      MpvPlayer.setTrack('sub', 'no');
    }
  }

  async release(): Promise<void> {
    if (this.releasePromise) return this.releasePromise;
    this.released = true;
    this.releasePromise = Promise.resolve().then(() => {
      this.pendingStartPosition = undefined;
      this.pendingAutoplay = false;
      this.activeFileGeneration = null;
      this.expectedNativePath = null;
      this.expectedLoadRequestToken = null;
      const subscriptions = this.nativeUnsubscribers;
      this.nativeUnsubscribers = [];
      subscriptions.forEach(unsubscribe => unsubscribe());
      this.surfaceSubscription?.remove();
      this.surfaceSubscription = null;
      this.listeners.clear();
      try {
        MpvPlayer.stop();
      } catch {
        // The native player may already be stopped during partial teardown.
      }
      try {
        MpvPlayer.destroy();
      } catch {
        // Release remains idempotent even when native teardown is partial.
      }
    });
    return this.releasePromise;
  }

  private subscribeToNativeEvents(): void {
    this.surfaceSubscription = MpvPlayer.onSurfaceAttached(() => {
      if (this.released) return;
      this.updateSnapshot(current => ({
        ...current,
        hasSurfaceAttached: true,
      }));
      this.emit({type: 'surface-attached', generation: this.snapshot.generation});
    }) ?? null;

    this.nativeUnsubscribers = [
      MpvPlayer.on('onFileLoaded', payload => this.handleFileLoaded(payload)),
      MpvPlayer.on('onPlaybackStateChanged', ({state}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => {
          if (current.isEnded && state !== 'playing') return current;
          const mapped = mapPlaybackState(state);
          return {
            ...current,
            isPlaying: mapped === 'playing',
            phase:
              current.isSeeking || current.isBuffering
                ? current.phase
                : mapped === 'playing'
                  ? current.hasFirstFrame
                    ? 'playing'
                    : 'first-frame'
                  : mapped === 'paused'
                    ? 'paused'
                    : current.phase,
          };
        });
      }),
      MpvPlayer.on('onPositionChanged', ({position}) => {
        if (!this.hasActiveFile() || !Number.isFinite(position)) return;
        this.updateSnapshot(current => ({...current, position}));
      }),
      MpvPlayer.on('onDurationChanged', ({duration}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          duration: finiteOrNull(duration),
        }));
      }),
      MpvPlayer.on('onBuffering', ({percent}) => {
        if (!this.hasActiveFile()) return;
        const fill = Math.max(0, Math.min(1, finiteOrZero(percent) / 100));
        this.updateSnapshot(current => ({
          ...current,
          cacheFill: fill,
          isBuffering: fill > 0 && fill < 1,
          phase: fill > 0 && fill < 1 ? 'buffering' : current.phase,
        }));
      }),
      MpvPlayer.on('onCacheState', ({ranges, fill}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          bufferedRanges: normalizeRanges(ranges),
          cacheFill: Math.max(0, Math.min(1, finiteOrZero(fill))),
        }));
      }),
      MpvPlayer.on('onSeekable', ({seekable}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          isSeekable: seekable,
          isLive: !seekable && current.source?.type === 'live-tv',
        }));
      }),
      MpvPlayer.on('onSeeking', ({seeking}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          isSeeking: seeking,
          phase: seeking ? 'seeking' : current.isPlaying ? 'playing' : 'paused',
        }));
      }),
      MpvPlayer.on('onTracksChanged', ({tracks}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          tracks: tracks.map(mapTrack),
        }));
      }),
      MpvPlayer.on('onChapterChanged', ({chapter}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          currentChapterId: chapter?.id ?? null,
        }));
      }),
      MpvPlayer.on('onVideoParamsChanged', ({params}) => {
        if (!this.hasActiveFile()) return;
        const metrics: VideoV3VideoMetrics = {
          width: finiteOrZero(params.videoWidth),
          height: finiteOrZero(params.videoHeight),
          aspectRatio: finiteOrZero(params.aspectRatio),
          fps: finiteOrZero(params.fps),
          codec: params.codec,
        };
        this.updateSnapshot(current => ({...current, videoMetrics: metrics}));
      }),
      MpvPlayer.on('videoReconfig', () => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          hasFirstFrame: true,
          phase: current.isPlaying ? 'playing' : 'paused',
        }));
        this.emit({type: 'first-frame', generation: this.snapshot.generation});
        this.applyPendingStart();
      }),
      MpvPlayer.on('onEndFile', ({reason}) => {
        if (!this.hasActiveFile() || reason !== 0) return;
        this.updateSnapshot(current => ({
          ...current,
          phase: 'finished',
          isPlaying: false,
          isEnded: true,
          isBuffering: false,
          isSeeking: false,
        }));
        this.emit({type: 'ended', generation: this.snapshot.generation});
      }),
      MpvPlayer.on('onError', ({code, message}) => {
        this.setError(this.snapshot.generation, message, true, code);
      }),
      MpvPlayer.on('onVolumeChanged', ({volume}) => {
        this.updateSnapshot(current => ({
          ...current,
          volume: Math.max(0, Math.min(MAX_VOLUME, finiteOrZero(volume))),
        }));
      }),
      MpvPlayer.on('onSpeedChanged', ({speed}) => {
        this.updateSnapshot(current => ({
          ...current,
          speed: Math.max(MIN_SPEED, Math.min(MAX_SPEED, finiteOrZero(speed))),
        }));
      }),
    ];
  }

  private handleFileLoaded(payload: MpvFileLoadedEvent): void {
    if (
      this.expectedLoadRequestToken !== null &&
      payload.requestId !== this.expectedLoadRequestToken
    ) {
      return;
    }
    if (
      this.expectedLoadRequestToken === null &&
      this.expectedNativePath !== null &&
      payload.resolvedPath !== undefined &&
      payload.resolvedPath !== this.expectedNativePath
    ) {
      return;
    }
    const generation = this.snapshot.generation;
    let duration: number | null = this.snapshot.duration;
    let tracks: VideoV3Track[] = this.snapshot.tracks.slice();
    let chapters: VideoV3Chapter[] = this.snapshot.chapters.slice();
    try {
      duration = finiteOrNull(MpvPlayer.getDuration());
    } catch {
      duration = null;
    }
    try {
      tracks = MpvPlayer.getTracks().map(mapTrack);
    } catch {
      tracks = [];
    }
    try {
      chapters = MpvPlayer.getChapters().map(mapChapter);
    } catch {
      chapters = [];
    }
    this.activeFileGeneration = generation;
    this.updateSnapshot(current => ({
      ...current,
      phase: 'connecting',
      duration,
      tracks,
      chapters,
      isEnded: false,
      isBuffering: false,
      isSeeking: false,
      isSeekable: current.source?.type !== 'live-tv',
      hasFirstFrame: false,
      error: null,
    }));
    this.emit({type: 'file-loaded', generation});
    this.applyPendingStart();
  }

  private applyPendingStart(): void {
    const position = this.pendingStartPosition;
    this.pendingStartPosition = undefined;
    if (position !== undefined && this.snapshot.isSeekable) {
      const target = this.snapshot.duration === null
        ? position
        : Math.min(position, this.snapshot.duration);
      MpvPlayer.seekTo(Math.max(MIN_POSITION, target));
    }
    if (this.pendingAutoplay) {
      this.pendingAutoplay = false;
      MpvPlayer.play();
    }
  }

  private normalizeRequestedPosition(position: number | undefined): number | undefined {
    if (position === undefined || !Number.isFinite(position)) return undefined;
    return Math.max(MIN_POSITION, position);
  }

  private hasActiveFile(): boolean {
    return this.activeFileGeneration === this.snapshot.generation;
  }

  private setError(generation: number, message: string, recoverable: boolean, code?: number): void {
    if (generation !== this.snapshot.generation || this.released) return;
    const error = {
      ...(code === undefined ? {} : {code}),
      message,
      recoverable,
      generation,
    };
    this.updateSnapshot(current => ({
      ...current,
      phase: 'error',
      isPlaying: false,
      isBuffering: false,
      isSeeking: false,
      error,
    }));
    this.emit({type: 'error', generation, ...(code === undefined ? {} : {code}), message});
  }

  private updateSnapshot(
    updater: (current: VideoV3SessionSnapshot) => VideoV3SessionSnapshot,
  ): void {
    if (this.released) return;
    this.snapshot = updater(this.snapshot);
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    this.emit({type: 'snapshot', snapshot: this.snapshot});
  }

  private emit(event: VideoV3SessionEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  private assertUsable(): void {
    if (this.released) throw new Error('The V3 video session has been released.');
  }
}
