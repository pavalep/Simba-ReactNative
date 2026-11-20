import {useCallback, useImperativeHandle, type ForwardedRef} from 'react';
import {useStatsRollupStore} from '../../state';
import {
  useRecentHistoryStore,
  type RecentHistoryEntryInput,
  type RecentHistoryEntry,
} from '../../state';

export type {RecentHistoryEntry, RecentHistoryEntryInput} from '../../state';
export {MAX_RECENT_HISTORY_ENTRIES} from '../../state';

export interface RecentHistoryHandle {
  getRecent: () => RecentHistoryEntry[];
  addRecent: (entry: RecentHistoryEntryInput) => void;
  removeRecent: (fileUri: string) => void;
  clearRecent: () => void;
}

/**
 * The session id rides along with the write.
 *
 * It is what tells the lifetime play ledger "the user started this
 * again" apart from "the thirty-second checkpoint fired again". A
 * session id is monotonic per launch, so a new one IS a new viewing.
 */
function addRecentEntry(entry: RecentHistoryEntryInput, sessionId?: number): void {
  // The lifetime play ledger is `useStatsRollupStore` (zustand), and
  // it is PERSISTED - it is the reason the Stats screen still knows
  // how many times the user has played something after a cold start.
  // The `recordPlaybackStats` call is non-React and goes through
  // `useStatsRollupStore.getState()`.
  useStatsRollupStore.getState().recordPlaybackStats({
    fileUri: entry.fileUri,
    title: entry.title,
    duration: entry.duration,
    mediaType: entry.mediaType,
    type: entry.type,
    source: entry.source,
    provider: entry.provider,
    folderId: entry.folderId,
    ...(sessionId !== undefined ? {sessionId} : {}),
  });
}

/**
 * Public read/write façade for playback history.
 * Consumers do not know that the implementation is zustand-backed.
 */
export function useRecentHistory(
  ref?: ForwardedRef<RecentHistoryHandle>,
): RecentHistoryHandle & {list: RecentHistoryEntry[]} {
  const list = useRecentHistoryStore(s => s.entries);

  const addRecent = useCallback((entry: RecentHistoryEntryInput) => {
    addRecentEntry(entry);
    useRecentHistoryStore.getState().upsertRecentHistoryEntry(entry);
  }, []);

  const getRecent = useCallback(() => list, [list]);
  const removeRecent = useCallback((fileUri: string) => {
    useRecentHistoryStore.getState().removeRecentHistoryEntry(fileUri);
  }, []);
  const clearRecent = useCallback(() => {
    useRecentHistoryStore.getState().clearRecentHistory();
  }, []);

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
 * Non-React write façade for services that already own a store handle.
 * The retention policy remains private to this feature.
 */
export function addRecent(entry: RecentHistoryEntryInput, sessionId?: number): void {
  addRecentEntry(entry, sessionId);
  useRecentHistoryStore.getState().upsertRecentHistoryEntry(entry);
}


