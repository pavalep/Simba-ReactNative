/**
 * The batch-add report — B-034.
 *
 * ## Why this is a FEATURE rule and not a screen rule
 *
 * `addItemToPlaylist` **silently refuses** a lane mismatch: adding a video
 * to an `AUDIO_ONLY` playlist returns `{status: 'lane-mismatch'}` and puts
 * nothing in the list. The refusal lives in the status and NOWHERE ELSE.
 *
 * So a screen that toasts "Added N items" from the count it SELECTED is
 * claiming something the store never said. The report below is the one
 * place that turns the per-item statuses into a sentence, and it belongs
 * with the feature that produces the statuses — not inside one screen that
 * happens to call it.
 */

import type {AddPlaylistItemResult} from './types';

/**
 * Why an item did not make it into the playlist. Every branch is a REAL
 * outcome of `addItemToPlaylist` - the reason is named so the toast never
 * guesses.
 */
const skipReason = (status: AddPlaylistItemResult['status']): string => {
  switch (status) {
    case 'duplicate':
      return 'already in the playlist';
    case 'playlist-full':
      return 'the playlist is full';
    case 'lane-mismatch':
    case 'unsupported-media-kind':
      return 'the wrong type for that playlist';
    case 'playlist-not-found':
      return 'the playlist no longer exists';
    default:
      return 'not added';
  }
};

export interface BatchAddReport {
  /** How many items actually entered the playlist. */
  added: number;
  /** How many did not, and why. */
  skipped: number;
  /** The message the user sees. */
  message: string;
  severity: 'success' | 'warning' | 'error';
}

/**
 * The batch-add toast.
 *
 * It reports what HAPPENED, not what was SELECTED. The store refuses a
 * lane mismatch silently, so the old toast - which toasted the selected
 * count - claimed items had been added when they had been dropped. This
 * function takes the per-item statuses `addItem` returns and says the
 * truth about them.
 */
export const reportBatchAdd = (
  results: AddPlaylistItemResult[],
  playlistLabel: string,
): BatchAddReport => {
  const total = results.length;
  const added = results.filter(r => r.status === 'added').length;
  const skippedResults = results.filter(r => r.status !== 'added');
  const noun = total === 1 ? 'item' : 'items';

  if (skippedResults.length === 0) {
    return {
      added,
      skipped: 0,
      message: `Added ${added} ${noun} to ${playlistLabel}`,
      severity: 'success',
    };
  }

  const reasons = Array.from(new Set(skippedResults.map(r => skipReason(r.status))));
  const reasonText = reasons.join('; ');

  if (added === 0) {
    return {
      added: 0,
      skipped: skippedResults.length,
      message: `Nothing was added to ${playlistLabel} — ${skippedResults.length} ${noun} skipped (${reasonText}).`,
      severity: 'error',
    };
  }

  return {
    added,
    skipped: skippedResults.length,
    message: `Added ${added} of ${total} ${noun} to ${playlistLabel} — ${skippedResults.length} skipped (${reasonText}).`,
    severity: 'warning',
  };
};
