import type {VideoV3BufferRange} from './VideoV3Types';

const DEFAULT_ADJACENCY_EPSILON_SECONDS = 0.05;

export interface VideoV3BufferPresentation {
  readonly nativeRanges: readonly VideoV3BufferRange[];
  readonly visibleRanges: readonly VideoV3BufferRange[];
  readonly activeRange: VideoV3BufferRange | null;
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
export function normalizeVideoV3BufferedRanges(
  ranges: readonly VideoV3BufferRange[],
  duration: number | null,
  adjacencyEpsilonSeconds = DEFAULT_ADJACENCY_EPSILON_SECONDS,
): VideoV3BufferRange[] {
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

  return validRanges.reduce<VideoV3BufferRange[]>((normalized, range) => {
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
export function selectVideoV3ActiveBufferedRange(
  ranges: readonly VideoV3BufferRange[],
  position: number,
  duration: number | null,
): VideoV3BufferRange | null {
  if (!finite(position)) return null;
  const normalized = normalizeVideoV3BufferedRanges(ranges, duration);
  const active = normalized.find(
    range => position >= range.start && position <= range.end,
  );
  return active ?? null;
}

export function createVideoV3BufferPresentation(
  ranges: readonly VideoV3BufferRange[],
  position: number,
  duration: number | null,
  fill: number,
): VideoV3BufferPresentation {
  const nativeRanges = normalizeVideoV3BufferedRanges(ranges, duration);
  const activeRange = selectVideoV3ActiveBufferedRange(nativeRanges, position, duration);
  return {
    nativeRanges,
    visibleRanges: activeRange ? [activeRange] : [],
    activeRange,
    fill: Math.max(0, Math.min(1, finite(fill) ? fill : 0)),
  };
}
