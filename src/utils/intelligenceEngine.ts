// ─── Types ──────────────────────────────────────────────────

export interface SessionEntry {
  fileUri: string;
  title: string;
  position: number;
  duration: number;
  lastPlayedAt: string;
  thumbnailPath: string;
  mediaType?: 'video' | 'audio';
}

export interface WeightedEntry extends SessionEntry {
  /** Normalised score 0–1, higher = more likely to resume */
  score: number;
  /** Estimated completion fraction 0–1 */
  completionRatio: number;
}

// ─── Constants ──────────────────────────────────────────────

/** Entries with completion above this threshold are considered done. */
const COMPLETION_CUTOFF = 0.92;
/** Entries below this recency score are excluded (roughly 14 days old). */
const RECENCY_HALF_LIFE_HOURS = 336; // 14 days

// ─── Scoring ────────────────────────────────────────────────

/**
 * Calculate a normalised recency score based on hours since last played.
 * Uses exponential decay: score = 2^(-hours / halfLife)
 * This gives 1.0 for just-now, 0.5 at half-life, ~0.25 at 2x half-life.
 */
function recencyScore(lastPlayedAt: string): number {
  const elapsedMs = Date.now() - new Date(lastPlayedAt).getTime();
  const elapsedHours = elapsedMs / 3_600_000;
  if (elapsedHours < 0) return 0; // future date guard
  return Math.pow(2, -elapsedHours / RECENCY_HALF_LIFE_HOURS);
}

/**
 * Completion-based weight:
 * - Near 0% (barely started) → moderate value (0.6)
 * - ~30–70% (in progress) → highest value (1.0)
 * - >92% (nearly done) → lowest value (0.15)
 *
 * This ensures the "Continue Watching" shelf prioritises
 * in-progress items over barely-started or nearly-finished ones.
 */
function completionWeight(ratio: number): number {
  if (ratio <= 0 || !isFinite(ratio)) return 0.6;
  if (ratio >= COMPLETION_CUTOFF) return 0.15;
  // Gaussian-ish peak around 0.5
  return 0.6 + 0.4 * Math.exp(-4 * Math.pow(ratio - 0.5, 2));
}

/**
 * Compute the overall resume score for a single session entry.
 */
function calculateScore(entry: SessionEntry): number {
  const recency = recencyScore(entry.lastPlayedAt);
  const ratio = entry.duration > 0 ? entry.position / entry.duration : 0;
  const completion = completionWeight(ratio);
  return recency * completion;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Return session entries sorted by a weighted resume score (descending).
 * Filters out entries that are too old or have no meaningful playback.
 *
 * @param entries  Full list of session entries
 * @param count    Max results to return (default 20)
 */
export function getWeightedResumptionList(
  entries: SessionEntry[],
  count: number = 20,
): WeightedEntry[] {
  const now = Date.now();

  const scored = entries
    .map(e => {
      const score = calculateScore(e);
      const completionRatio = e.duration > 0 ? e.position / e.duration : 0;
      return { ...e, score, completionRatio } as WeightedEntry;
    })
    // Exclude entries with negligible recency
    .filter(e => e.score > 0.01)
    // Exclude entries where the file was barely opened (position < 1s and duration > 0)
    .filter(e => !(e.duration > 0 && e.position < 1))
    // Sort by score descending
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, count);
}

/**
 * Filter weighted list to video entries only.
 * Useful for the "Continue Watching" video shelf.
 */
export function getRecentVideoEntries(
  entries: SessionEntry[],
  count: number = 10,
): WeightedEntry[] {
  return getWeightedResumptionList(
    entries.filter(e => !e.mediaType || e.mediaType === 'video'),
    count,
  );
}

/**
 * Filter weighted list to audio entries only.
 * Useful for the "Continue Listening" audio shelf.
 */
export function getRecentAudioEntries(
  entries: SessionEntry[],
  count: number = 10,
): WeightedEntry[] {
  return getWeightedResumptionList(
    entries.filter(e => e.mediaType === 'audio'),
    count,
  );
}

/**
 * Simple recency-based sort (no completion weighting).
 * Useful for the "Recently Added" shelf.
 */
export function getRecentlyPlayed(
  entries: SessionEntry[],
  count: number = 10,
): SessionEntry[] {
  return [...entries]
    .filter(e => {
      const elapsedMs = Date.now() - new Date(e.lastPlayedAt).getTime();
      return elapsedMs >= 0;
    })
    .sort(
      (a, b) =>
        new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime(),
    )
    .slice(0, count);
}
