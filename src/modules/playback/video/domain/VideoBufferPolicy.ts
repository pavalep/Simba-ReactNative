import type {VideoBufferRange} from './VideoTypes';

const DEFAULT_ADJACENCY_EPSILON_SECONDS = 0.05;

export interface VideoBufferPresentation {
  readonly nativeRanges: readonly VideoBufferRange[];
  readonly visibleRanges: readonly VideoBufferRange[];
  readonly activeRange: VideoBufferRange | null;
  readonly fill: number;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalizes native cache ranges without filling gaps between disconnected
 * islands. The complete normalized range set remains available for state and
 * diagnostics; presentation chooses a smaller truthful window.
 */
export function normalizeVideoBufferedRanges(
  ranges: readonly VideoBufferRange[],
  duration: number | null,
  adjacencyEpsilonSeconds = DEFAULT_ADJACENCY_EPSILON_SECONDS,
): VideoBufferRange[] {
  const maxDuration = finite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const epsilon = finite(adjacencyEpsilonSeconds) && adjacencyEpsilonSeconds >= 0
    ? adjacencyEpsilonSeconds
    : DEFAULT_ADJACENCY_EPSILON_SECONDS;
  const validRanges = ranges
    .filter(range => finite(range.start) && finite(range.end))
    .map(range => ({
      start: Math.max(0, Math.min(maxDuration, range.start)),
      end: Math.max(0, Math.min(maxDuration, range.end)),
    }))
    .filter(range => range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  return validRanges.reduce<VideoBufferRange[]>((normalized, range) => {
    const previous = normalized[normalized.length - 1];
    if (!previous || range.start > previous.end + epsilon) {
      normalized.push(range);
      return normalized;
    }
    normalized[normalized.length - 1] = {
      ...previous,
      end: Math.max(previous.end, range.end),
    };
    return normalized;
  }, []);
}

/**
 * Renders only the buffered range containing the playhead. This intentionally
 * hides disconnected islands ahead of the current playback window so the seek
 * bar does not promise continuous playback that native cache does not have.
 */
export function selectVideoActiveBufferedRange(
  ranges: readonly VideoBufferRange[],
  position: number,
  duration: number | null,
): VideoBufferRange | null {
  if (!finite(position)) return null;
  const normalized = normalizeVideoBufferedRanges(ranges, duration);
  const active = normalized.find(
    range => position >= range.start && position <= range.end,
  );
  return active ?? null;
}

export function createVideoBufferPresentation(
  ranges: readonly VideoBufferRange[],
  position: number,
  duration: number | null,
  fill: number,
): VideoBufferPresentation {
  const nativeRanges = normalizeVideoBufferedRanges(ranges, duration);
  const activeRange = selectVideoActiveBufferedRange(nativeRanges, position, duration);
  return {
    nativeRanges,
    visibleRanges: activeRange ? [activeRange] : [],
    activeRange,
    fill: Math.max(0, Math.min(1, finite(fill) ? fill : 0)),
  };
}
