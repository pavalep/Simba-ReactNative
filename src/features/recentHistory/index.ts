import {
  useCallback,
  useImperativeHandle,
  type ForwardedRef,
} from 'react';
import {useAppDispatch, useAppSelector, type AppDispatch} from '../../store';
import {recordPlaybackStats} from '../../store/slices/sessionSlice';
import {
  selectRecentHistoryForDisplay,
  upsertRecentHistoryEntry,
  removeRecentHistoryEntry,
  clearRecentHistory,
  type RecentHistoryEntryInput,
  type RecentHistoryEntry,
} from './recentHistoryReducer';

export type {RecentHistoryEntry, RecentHistoryEntryInput} from './recentHistoryReducer';
export {MAX_RECENT_HISTORY_ENTRIES} from './recentHistoryReducer';

export interface RecentHistoryHandle {
  getRecent: () => RecentHistoryEntry[];
  addRecent: (entry: RecentHistoryEntryInput) => void;
  removeRecent: (fileUri: string) => void;
  clearRecent: () => void;
}

function dispatchRecent(dispatch: AppDispatch, entry: RecentHistoryEntryInput): void {
  dispatch(upsertRecentHistoryEntry(entry));
  dispatch(
    recordPlaybackStats({
      fileUri: entry.fileUri,
      title: entry.title,
      duration: entry.duration,
      mediaType: entry.mediaType,
      type: entry.type,
      source: entry.source,
      provider: entry.provider,
      folderId: entry.folderId,
    }),
  );
}

/**
 * Public read/write façade for playback history.
 * Consumers do not know that the implementation is Redux-backed.
 */
export function useRecentHistory(
  ref?: ForwardedRef<RecentHistoryHandle>,
): RecentHistoryHandle & {list: RecentHistoryEntry[]} {
  const dispatch = useAppDispatch();
  const list = useAppSelector(selectRecentHistoryForDisplay);

  const addRecent = useCallback(
    (entry: RecentHistoryEntryInput) => {
      dispatchRecent(dispatch, entry);
    },
    [dispatch],
  );

  const getRecent = useCallback(() => list, [list]);
  const removeRecent = useCallback(
    (fileUri: string) => dispatch(removeRecentHistoryEntry(fileUri)),
    [dispatch],
  );
  const clearRecent = useCallback(
    () => dispatch(clearRecentHistory()),
    [dispatch],
  );

  useImperativeHandle(
    ref,
    () => ({
      getRecent,
      addRecent,
      removeRecent,
      clearRecent,
    }),
    [addRecent, clearRecent, getRecent, removeRecent],
  );

  return {list, getRecent, addRecent, removeRecent, clearRecent};
}

/**
 * Non-React write façade for services that already own a dispatch instance.
 * The reducer, normalization, and retention policy remain private to this feature.
 */
export function addRecent(dispatch: AppDispatch, entry: RecentHistoryEntryInput): void {
  dispatchRecent(dispatch, entry);
}

export function removeRecent(dispatch: AppDispatch, fileUri: string): void {
  dispatch(removeRecentHistoryEntry(fileUri));
}

export function clearRecent(dispatch: AppDispatch): void {
  dispatch(clearRecentHistory());
}
