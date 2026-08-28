import {MpvPlayer} from '../../../../native/player.api';
import {logger} from '../../../../lib/logger';
import {getLocalPath} from '../../../../services/downloadService';
import type {
  MpvFileLoadedEvent,
  MpvPlaybackState,
} from '../../../../native/NativeMpvPlayer';
import {
  createVideoSourceFingerprint,
  isSameVideoSource,
} from '../domain/VideoFingerprint';
import {
  emptyVideoSnapshot,
  type VideoBufferRange,
  type VideoChapter,
  type VideoSessionSnapshot,
  type VideoTrack,
  type VideoVideoMetrics,
} from '../domain/VideoTypes';
import type {
  VideoLoadRequest,
  VideoSeekRequest,
  VideoSessionEvent,
  VideoSessionListener,
  VideoSessionPort,
  VideoUnsubscribe,
} from '../ports/VideoSessionPort';
import {reduceVideoSessionEvent} from '../state/reduceVideoSessionEvent';
import {
  acquireVideoNativeLease,
  ownsVideoNativeLease,
  releaseVideoNativeLease,
  type VideoNativeLease,
} from './VideoNativeLease';

const MAX_VOLUME = 100;
const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const MIN_POSITION = 0;
const VIDEO_POLL_INTERVAL_MS = 750;
const FIRST_FRAME_WATCHDOG_MS = 12_000;
const VIDEO_OBSERVED_PROPERTIES = [
  'time-pos',
  'duration',
  'pause',
  'paused-for-cache',
  'cache-buffering-state',
  'demuxer-cache-state',
  'seekable',
  'seeking',
] as const;

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

function normalizeRanges(ranges: readonly VideoBufferRange[]): VideoBufferRange[] {
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
}): VideoTrack {
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
}): VideoChapter {
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

function normalizeDuration(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Presentation-neutral V3 session adapter.
 *
 * It owns native listeners, source generations, and the one mpv session. It
 * intentionally has no React, layout, icon, panel, or presentation concerns.
 */
export class VideoMpvSession implements VideoSessionPort {
  private snapshot: VideoSessionSnapshot = emptyVideoSnapshot();
  private readonly listeners = new Set<VideoSessionListener>();
  private nativeUnsubscribers: VideoUnsubscribe[] = [];
  private surfaceSubscription: {remove: () => void} | null = null;
  private pendingStartPosition: number | undefined;
  private activeFileGeneration: number | null = null;
  private expectedNativePath: string | null = null;
  private expectedLoadRequestToken: string | null = null;
  private loadRequestSequence = 0;
  private released = false;
  private releasePromise: Promise<void> | null = null;
  private nativeLease: VideoNativeLease | null = null;
  private observedProperties = new Set<string>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private firstFrameWatchdogTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.subscribeToNativeEvents();
  }

  getSnapshot(): VideoSessionSnapshot {
    return this.snapshot;
  }

  subscribe(listener: VideoSessionListener): VideoUnsubscribe {
    if (this.released) return () => undefined;
    this.listeners.add(listener);
    // E5: wrap the synchronous initial emit in try/catch so a throwing
    // listener can't prevent the unsubscribe lambda from being returned.
    // The listener remains in the set; the caller can still unsubscribe
    // via the returned function on the next render.
    try {
      listener({type: 'snapshot', snapshot: this.snapshot});
    } catch (error) {
      logger.warn('[PlaybackTrace][V3][subscribe:listener:threw]', error);
    }
    return () => this.listeners.delete(listener);
  }

  async load(request: VideoLoadRequest): Promise<number> {
    this.assertUsable();
    const fingerprint = createVideoSourceFingerprint(request.source);

    if (isSameVideoSource(this.snapshot.sourceFingerprint, request.source) && this.snapshot.phase !== 'error') {
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
      ...emptyVideoSnapshot(),
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
      this.nativeLease = acquireVideoNativeLease();
      const initialized = MpvPlayer.initPlayer();
      if (!initialized) {
        throw new Error('The native video session could not be initialized.');
      }
      this.updateSnapshot(current => ({
        ...current,
        phase: 'connecting',
      }));
      this.observeNativeProperties();
      this.startPolling();
      this.armFirstFrameWatchdog(generation);
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
      const refreshed = {
        ...current,
        ...(position === null ? {} : {position}),
        ...(duration === null ? {} : {duration: normalizeDuration(duration)}),
        ...(volume === null ? {} : {volume: Math.max(0, Math.min(MAX_VOLUME, volume))}),
        ...(isMuted === null ? {} : {isMuted}),
        ...(speed === null ? {} : {speed: Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed))}),
      };
      if (!nativeState) return refreshed;
      return reduceVideoSessionEvent(refreshed, {
        type: 'playback-state-changed',
        generation: refreshed.generation,
        isPlaying: mapPlaybackState(nativeState) === 'playing',
      });
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

  async seek(request: VideoSeekRequest): Promise<void> {
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

  async next(): Promise<void> {
    this.assertUsable();
    MpvPlayer.next();
  }

  async previous(): Promise<void> {
    this.assertUsable();
    MpvPlayer.previous();
  }

  async release(): Promise<void> {
    if (this.releasePromise) return this.releasePromise;
    this.released = true;
    this.releasePromise = Promise.resolve(this.teardownNativeSession());
    return this.releasePromise;
  }

  private teardownNativeSession(): void {
    this.clearFirstFrameWatchdog();
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    const ownsNativeSession =
      this.nativeLease !== null && ownsVideoNativeLease(this.nativeLease);
    if (ownsNativeSession) {
      this.observedProperties.forEach(property => {
        try {
          MpvPlayer.unobserveProperty(property);
        } catch {
          // The native module may already be partially torn down.
        }
      });
    }
    this.observedProperties.clear();

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

    if (ownsNativeSession) {
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
      releaseVideoNativeLease(this.nativeLease!);
    }
    this.nativeLease = null;
  }

  private armFirstFrameWatchdog(generation: number): void {
    this.clearFirstFrameWatchdog();
    this.firstFrameWatchdogTimer = setTimeout(() => {
      this.firstFrameWatchdogTimer = null;
      if (
        this.released ||
        generation !== this.snapshot.generation ||
        this.snapshot.hasFirstFrame ||
        this.snapshot.phase === 'error'
      ) return;
      this.setError(
        generation,
        'Video did not produce a first frame. Check the connection and retry.',
        true,
      );
    }, FIRST_FRAME_WATCHDOG_MS);
  }

  private clearFirstFrameWatchdog(): void {
    if (this.firstFrameWatchdogTimer === null) return;
    clearTimeout(this.firstFrameWatchdogTimer);
    this.firstFrameWatchdogTimer = null;
  }

  private observeNativeProperties(): void {
    VIDEO_OBSERVED_PROPERTIES.forEach(property => {
      try {
        MpvPlayer.observeProperty(property);
        this.observedProperties.add(property);
      } catch {
        // Polling remains available if a property is unsupported by a build.
      }
    });
  }

  private startPolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = setInterval(() => {
      if (this.released || !this.hasActiveFile()) return;
      this.refresh().catch(() => undefined);
    }, VIDEO_POLL_INTERVAL_MS);
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
        this.applySessionEvent({
          type: 'playback-state-changed',
          generation: this.snapshot.generation,
          isPlaying: mapPlaybackState(state) === 'playing',
        });
      }),
      MpvPlayer.on('onPositionChanged', ({position}) => {
        if (!this.hasActiveFile() || !Number.isFinite(position)) return;
        this.applySessionEvent({
          type: 'position-changed',
          generation: this.snapshot.generation,
          position,
        });
      }),
      MpvPlayer.on('onDurationChanged', ({duration}) => {
        if (!this.hasActiveFile()) return;
        this.applySessionEvent({
          type: 'duration-changed',
          generation: this.snapshot.generation,
          duration: finiteOrNull(duration),
        });
      }),
      MpvPlayer.on('onBuffering', ({percent, isBuffering}) => {
        if (!this.hasActiveFile()) return;
        const fill = Math.max(0, Math.min(1, finiteOrZero(percent) / 100));
        this.applySessionEvent({
          type: 'buffering-changed',
          generation: this.snapshot.generation,
          isBuffering: isBuffering ?? (fill > 0 && fill < 1),
          cacheFill: isBuffering === true && fill === 0 ? this.snapshot.cacheFill : fill,
        });
      }),
      MpvPlayer.on('onCacheState', ({ranges, fill}) => {
        if (!this.hasActiveFile()) return;
        const generation = this.snapshot.generation;
        this.applySessionEvent({
          type: 'cache-changed',
          generation,
          ranges: normalizeRanges(ranges),
        });
        const normalizedFill = finiteOrNull(fill);
        if (normalizedFill !== null) {
          this.applySessionEvent({
            type: 'buffering-changed',
            generation,
            isBuffering: this.snapshot.isBuffering,
            cacheFill: Math.max(0, Math.min(1, normalizedFill)),
          });
        }
      }),
      MpvPlayer.on('onSeekable', ({seekable}) => {
        if (!this.hasActiveFile()) return;
        this.applySessionEvent({
          type: 'seekable-changed',
          generation: this.snapshot.generation,
          isSeekable: seekable,
        });
      }),
      MpvPlayer.on('onSeeking', ({seeking}) => {
        if (!this.hasActiveFile()) return;
        this.applySessionEvent({
          type: 'seeking-changed',
          generation: this.snapshot.generation,
          isSeeking: seeking,
        });
      }),
      MpvPlayer.on('onTracksChanged', ({tracks}) => {
        if (!this.hasActiveFile()) return;
        this.applySessionEvent({
          type: 'tracks-changed',
          generation: this.snapshot.generation,
          tracks: tracks.map(mapTrack),
        });
      }),
      MpvPlayer.on('onChapterChanged', ({chapter}) => {
        if (!this.hasActiveFile()) return;
        this.applySessionEvent({
          type: 'chapter-changed',
          generation: this.snapshot.generation,
          chapterId: chapter?.id ?? null,
        });
      }),
      MpvPlayer.on('onVideoParamsChanged', ({params}) => {
        if (!this.hasActiveFile()) return;
        const metrics: VideoVideoMetrics = {
          width: finiteOrZero(params.videoWidth),
          height: finiteOrZero(params.videoHeight),
          aspectRatio: finiteOrZero(params.aspectRatio),
          fps: finiteOrZero(params.fps),
          codec: params.codec,
        };
        this.applySessionEvent({
          type: 'video-metrics-changed',
          generation: this.snapshot.generation,
          metrics,
        });
      }),
      MpvPlayer.on('videoReconfig', () => {
        if (!this.hasActiveFile()) return;
        this.clearFirstFrameWatchdog();
        const generation = this.snapshot.generation;
        this.applySessionEvent({type: 'first-frame', generation});
        this.emit({type: 'first-frame', generation});
        this.applyPendingStart();
      }),
      MpvPlayer.on('onEndFile', ({reason, requestId}) => {
        if (!this.isCurrentNativeEvent(requestId) || reason !== 0) return;
        this.clearFirstFrameWatchdog();
        const generation = this.snapshot.generation;
        this.applySessionEvent({type: 'ended', generation});
        this.emit({type: 'ended', generation});
      }),
      // B1: mpv emits `onPlaybackRestart` when playback resumes after a stall
      // (cache refill, end-of-stream seek, etc.). If the reducer still has
      // `isBuffering=true` because `onBuffering(percent:100)` arrived in a
      // racy order, this event clears the spinner. The reducer guards
      // against the no-op case so we don't force a phase recompute when
      // the user is already in `playing`.
      MpvPlayer.on('onPlaybackRestart', () => {
        if (!this.hasActiveFile()) return;
        const generation = this.snapshot.generation;
        this.applySessionEvent({type: 'playback-restart', generation});
        this.emit({type: 'playback-restart', generation});
      }),
      MpvPlayer.on('onError', ({code, recoverable, message, requestId}) => {
        if (!this.isCurrentNativeEvent(requestId)) return;
        this.clearFirstFrameWatchdog();
        this.applySessionEvent({
          type: 'error',
          generation: this.snapshot.generation,
          code,
          recoverable,
          message,
        });
      }),
      MpvPlayer.on('onVolumeChanged', ({volume}) => {
        if (!this.hasActiveFile()) return;
        this.updateSnapshot(current => ({
          ...current,
          volume: Math.max(0, Math.min(MAX_VOLUME, finiteOrZero(volume))),
        }));
      }),
      MpvPlayer.on('onSpeedChanged', ({speed}) => {
        if (!this.hasActiveFile()) return;
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
    let tracks: VideoTrack[] = this.snapshot.tracks.slice();
    let chapters: VideoChapter[] = this.snapshot.chapters.slice();
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
    this.applySessionEvent({type: 'file-loaded', generation});
    this.applySessionEvent({type: 'duration-changed', generation, duration});
    this.applySessionEvent({type: 'tracks-changed', generation, tracks});
    this.applySessionEvent({type: 'chapters-changed', generation, chapters});
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

  private isCurrentNativeEvent(requestId?: string): boolean {
    if (!this.hasActiveFile()) return false;
    if (this.expectedLoadRequestToken === null) return true;
    return requestId === this.expectedLoadRequestToken;
  }

  private setError(generation: number, message: string, recoverable: boolean, code?: number): void {
    if (generation !== this.snapshot.generation || this.released) return;
    this.clearFirstFrameWatchdog();
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
    this.emit({type: 'error', generation, ...(code === undefined ? {} : {code}), recoverable, message});
  }

  private updateSnapshot(
    updater: (current: VideoSessionSnapshot) => VideoSessionSnapshot,
  ): void {
    if (this.released) return;
    this.snapshot = updater(this.snapshot);
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    this.emit({type: 'snapshot', snapshot: this.snapshot});
  }

  private applySessionEvent(event: VideoSessionEvent): void {
    if (event.type !== 'snapshot' && event.generation !== this.snapshot.generation) {
      return;
    }
    this.updateSnapshot(current => reduceVideoSessionEvent(current, event));
  }

  private emit(event: VideoSessionEvent): void {
    // E5: per-listener try/catch so one bad listener doesn't stop the
    // rest from receiving the event. We don't unsubscribe on throw —
    // a single misbehaving event handler shouldn't drop the subscription
    // for a structurally-valid listener.
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.warn('[PlaybackTrace][V3][emit:listener:threw]', error);
      }
    });
  }

  private assertUsable(): void {
    if (this.released) throw new Error('The V3 video session has been released.');
  }
}
