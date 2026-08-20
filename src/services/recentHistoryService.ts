import type {AppDispatch} from '../store';
import {
  addRecent,
  type RecentHistoryEntryInput,
} from '../features/recentHistory';

/** Compatibility bridge for player hooks during the module migration. */
export function recordPlaybackCheckpoint(
  dispatch: AppDispatch,
  payload: RecentHistoryEntryInput,
): void {
  addRecent(dispatch, payload);
}
