import type {
  VideoError,
  VideoSessionPhase,
  VideoSessionSnapshot,
} from '../domain/VideoTypes';
import type {VideoSessionEvent} from '../ports/VideoSessionPort';
import {deriveLoadingState} from '../domain/deriveLoadingState';

function phaseAfterTransport(
  snapshot: VideoSessionSnapshot,
): VideoSessionPhase {
  if (snapshot.isSeeking) return 'seeking';
  if (snapshot.isBuffering) return 'buffering';
  if (snapshot.isPlaying) return snapshot.hasFirstFrame ? 'playing' : 'first-frame';
  if (snapshot.hasFirstFrame) return 'paused';
  if (snapshot.duration !== null || snapshot.source !== null) return 'ready';
  return 'idle';
}

function normalizeDuration(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * v11: every returned snapshot is wrapped so the discriminated
 * `loadingState` union and the derived `isLoading` alias are kept in
 * sync with the underlying transport flags. The view layer reads
 * `loadingState.kind`; the existing boolean consumers keep working
 * one release longer.
 */
function withLoadingState(
  snapshot: VideoSessionSnapshot,
): VideoSessionSnapshot {
  const loadingState = deriveLoadingState(snapshot);
  return {
    ...snapshot,
    loadingState,
    isLoading: loadingState.kind !== 'idle',
  };
}

/**
 * Pure synchronization reducer for native V3 events. Events from an older
 * source generation are ignored before they can mutate the current snapshot.
 */
export function reduceVideoSessionEvent(
  snapshot: VideoSessionSnapshot,
  event: VideoSessionEvent,
): VideoSessionSnapshot {
  if (event.type === 'snapshot') return withLoadingState(event.snapshot);
  if (event.generation !== snapshot.generation) return snapshot;

  switch (event.type) {
    case 'file-loaded':
      return withLoadingState({
        ...snapshot,
        phase: 'connecting',
        isEnded: false,
        isBuffering: false,
        isSeeking: false,
        hasFirstFrame: false,
        error: null,
      });
    case 'position-changed':
      return withLoadingState({...snapshot, position: Math.max(0, event.position)});
    case 'duration-changed':
      return withLoadingState({
        ...snapshot,
        duration: normalizeDuration(event.duration),
      });
    case 'playback-state-changed': {
      if (snapshot.isEnded && !event.isPlaying) return snapshot;
      const next = {...snapshot, isPlaying: event.isPlaying};
      return withLoadingState({...next, phase: phaseAfterTransport(next)});
    }
    case 'buffering-changed': {
      const next = {
        ...snapshot,
        isBuffering: event.isBuffering,
        cacheFill: Math.max(0, Math.min(1, event.cacheFill)),
      };
      return withLoadingState({...next, phase: phaseAfterTransport(next)});
    }
    case 'cache-changed':
      return withLoadingState({...snapshot, bufferedRanges: event.ranges});
    case 'seekable-changed':
      return withLoadingState({
        ...snapshot,
        isSeekable: event.isSeekable,
        isLive: !event.isSeekable && snapshot.source?.type === 'live-tv',
      });
    case 'seeking-changed': {
      const next = {...snapshot, isSeeking: event.isSeeking};
      return withLoadingState({...next, phase: phaseAfterTransport(next)});
    }
    case 'tracks-changed':
      return withLoadingState({...snapshot, tracks: event.tracks});
    case 'chapters-changed':
      return withLoadingState({...snapshot, chapters: event.chapters});
    case 'chapter-changed':
      return withLoadingState({...snapshot, currentChapterId: event.chapterId});
    case 'video-metrics-changed':
      return withLoadingState({...snapshot, videoMetrics: event.metrics});
    case 'first-frame':
      return withLoadingState({
        ...snapshot,
        hasFirstFrame: true,
        phase: snapshot.isPlaying ? 'playing' : 'paused',
      });
    case 'surface-attached':
      return withLoadingState({...snapshot, hasSurfaceAttached: true});
    case 'playback-restart': {
      // B1: `onPlaybackRestart` is the universal "mpv has resumed after a
      // stall" signal. If we were showing the buffering spinner, drop it and
      // let the reducer recompute the phase. If we weren't buffering, this
      // is a no-op — `playback-state-changed` will have already updated
      // `isPlaying` and the phase. v11: a stale event from a previous
      // generation is dropped at the top of the function, so the
      // resulting `loadingState` flip to `idle` cannot hide a current
      // stall on the active generation.
      if (!snapshot.isBuffering) return snapshot;
      const next = {...snapshot, isBuffering: false, cacheFill: 1};
      return withLoadingState({...next, phase: phaseAfterTransport(next)});
    }
    case 'ended':
      return withLoadingState({
        ...snapshot,
        phase: 'finished',
        isPlaying: false,
        isEnded: true,
        isBuffering: false,
        isSeeking: false,
      });
    case 'error': {
      const error: VideoError = {
        ...(event.code === undefined ? {} : {code: event.code}),
        message: event.message,
        // M5: the native bridge computes `recoverable` based on the source
        // of the error (end-file error / fatal log = not retryable; transient
        // network blip = retryable). The reducer forwards the real flag
        // instead of the previous hardcoded `true`.
        recoverable: event.recoverable,
        generation: event.generation,
      };
      return withLoadingState({
        ...snapshot,
        phase: 'error',
        isPlaying: false,
        isBuffering: false,
        isSeeking: false,
        error,
      });
    }
  }
}
