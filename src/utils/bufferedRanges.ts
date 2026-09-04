/**
 * V11→V13 migration: this helper was previously in
 * `src/modules/playback/audio/rangeNormalization.ts`. Phase 55
 * deleted the V11 audio module; the helper moved to
 * `src/utils/bufferedRanges.ts` because it's not audio-specific
 * (it's a generic mpv cache-range normalizer used by the
 * transport state for the seek-bar's grey "downloaded" overlay).
 */

export interface BufferedTimeRange {
  start: number;
  end: number;
}

/**
 * Normalize native cache ranges for presentation and seeking decisions.
 *
 * mpv may emit ranges in arbitrary order and may temporarily report overlap
 * while ranges are being joined. Meaningful gaps are preserved: this function
 * never fills the timeline from zero to the furthest cached endpoint.
 */
export const normalizeBufferedRanges = (
  ranges: ReadonlyArray<Partial<BufferedTimeRange> | null | undefined>,
  duration?: number,
  adjacencyEpsilon = 0.05,
): BufferedTimeRange[] => {
  const hasDuration = Number.isFinite(duration) && (duration as number) > 0;
  const maxDuration = hasDuration ? (duration as number) : Number.POSITIVE_INFINITY;
  const epsilon = Number.isFinite(adjacencyEpsilon) && adjacencyEpsilon >= 0
    ? adjacencyEpsilon
    : 0.05;

  const validRanges = ranges
    .filter((range): range is Partial<BufferedTimeRange> => Boolean(range))
    .map(range => {
      const start = Number(range.start);
      const end = Number(range.end);
      return {
        start: Math.max(0, Math.min(maxDuration, start)),
        end: Math.max(0, Math.min(maxDuration, end)),
      };
    })
    .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  return validRanges.reduce<BufferedTimeRange[]>((normalized, range) => {
    const previous = normalized[normalized.length - 1];
    if (!previous || range.start > previous.end + epsilon) {
      normalized.push(range);
      return normalized;
    }

    previous.end = Math.max(previous.end, range.end);
    return normalized;
  }, []);
};

/**
 * Select the cache window that contains the current playhead.
 *
 * Historical ranges remain available in TransportContext for diagnostics and
 * future cache policy, but a production seek bar should not advertise a
 * disconnected island ahead of the area currently being played.
 */
export const selectCurrentBufferedWindow = (
  ranges: ReadonlyArray<Partial<BufferedTimeRange> | null | undefined>,
  position: number,
  duration?: number,
): BufferedTimeRange[] => {
  const normalized = normalizeBufferedRanges(ranges, duration);
  if (normalized.length === 0 || !Number.isFinite(position)) return [];

  const safePosition = Math.max(0, position);
  const activeIndex = normalized.findIndex(
    range => safePosition >= range.start && safePosition <= range.end,
  );
  return activeIndex >= 0 ? [normalized[activeIndex] as BufferedTimeRange] : [];
};
