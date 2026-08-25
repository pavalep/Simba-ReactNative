import type {
  VideoV3Error,
  VideoV3SessionPhase,
  VideoV3SessionSnapshot,
} from '../domain/VideoV3Types';
import type {VideoV3SessionEvent} from '../ports/VideoV3SessionPort';

function phaseAfterTransport(
  snapshot: VideoV3SessionSnapshot,
): VideoV3SessionPhase {
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
 * Pure synchronization reducer for native V3 events. Events from an older
 * source generation are ignored before they can mutate the current snapshot.
 */
export function reduceVideoV3SessionEvent(
  snapshot: VideoV3SessionSnapshot,
  event: VideoV3SessionEvent,
): VideoV3SessionSnapshot {
  if (event.type === 'snapshot') return event.snapshot;
  if (event.generation !== snapshot.generation) return snapshot;

  switch (event.type) {
    case 'file-loaded':
      return {
        ...snapshot,
        phase: 'connecting',
        isEnded: false,
        isBuffering: false,
        isSeeking: false,
        hasFirstFrame: false,
        error: null,
      };
    case 'position-changed':
      return {...snapshot, position: Math.max(0, event.position)};
    case 'duration-changed':
      return {...snapshot, duration: normalizeDuration(event.duration)};
    case 'playback-state-changed': {
      if (snapshot.isEnded && !event.isPlaying) return snapshot;
      const next = {...snapshot, isPlaying: event.isPlaying};
      return {...next, phase: phaseAfterTransport(next)};
    }
    case 'buffering-changed': {
      const next = {
        ...snapshot,
        isBuffering: event.isBuffering,
        cacheFill: Math.max(0, Math.min(1, event.cacheFill)),
      };
      return {...next, phase: phaseAfterTransport(next)};
    }
    case 'cache-changed':
      return {...snapshot, bufferedRanges: event.ranges};
    case 'seekable-changed':
      return {
        ...snapshot,
        isSeekable: event.isSeekable,
        isLive: !event.isSeekable && snapshot.source?.type === 'live-tv',
      };
    case 'seeking-changed': {
      const next = {...snapshot, isSeeking: event.isSeeking};
      return {...next, phase: phaseAfterTransport(next)};
    }
    case 'tracks-changed':
      return {...snapshot, tracks: event.tracks};
    case 'chapters-changed':
      return {...snapshot, chapters: event.chapters};
    case 'chapter-changed':
      return {...snapshot, currentChapterId: event.chapterId};
    case 'video-metrics-changed':
      return {...snapshot, videoMetrics: event.metrics};
    case 'first-frame':
      return {
        ...snapshot,
        hasFirstFrame: true,
        phase: snapshot.isPlaying ? 'playing' : 'paused',
      };
    case 'surface-attached':
      return {...snapshot, hasSurfaceAttached: true};
    case 'ended':
      return {
        ...snapshot,
        phase: 'finished',
        isPlaying: false,
        isEnded: true,
        isBuffering: false,
        isSeeking: false,
      };
    case 'error': {
      const error: VideoV3Error = {
        ...(event.code === undefined ? {} : {code: event.code}),
        message: event.message,
        recoverable: true,
        generation: event.generation,
      };
      return {
        ...snapshot,
        phase: 'error',
        isPlaying: false,
        isBuffering: false,
        isSeeking: false,
        error,
      };
    }
  }
}
