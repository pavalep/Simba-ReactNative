// ─── Podcasts — Static Constants ───────────────────────────────────────
// Module-scope values shared by the screen's hook and content. Podcast
// Index paginates via a growing `max` window (no true offset), so the
// hook grows 25 → 50 → 100 and stops at the API cap.

/** First window size for any (category, term) scope. */
export const INITIAL_MAX = 25;

/** Hard cap from the Podcast Index API — the pagination ceiling. */
export const MAX_RESULTS_PER_QUERY = 100;
