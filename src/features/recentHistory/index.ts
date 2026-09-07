import {useCallback, useImperativeHandle, type ForwardedRef} from 'react';
import {useSessionStore} from '../../state';
import {
  useRecentHistoryStore,
  MAX_RECENT_HISTORY_ENTRIES,
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

function addRecentEntry(entry: RecentHistoryEntryInput): void {
  // V17 Phase 77: the play-count + library roll-up moved to
  // `useSessionStore` (zustand). The `recordPlaybackStats` call
  // is non-React and goes through `useSessionStore.getState()`.
  useSessionStore.getState().recordPlaybackStats({
    fileUri: entry.fileUri,
    title: entry.title,
    duration: entry.duration,
    mediaType: entry.mediaType,
    type: entry.type,
    source: entry.source,
    provider: entry.provider,
    folderId: entry.folderId,
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
export function addRecent(entry: RecentHistoryEntryInput): void {
  addRecentEntry(entry);
  useRecentHistoryStore.getState().upsertRecentHistoryEntry(entry);
}

export function removeRecent(fileUri: string): void {
  useRecentHistoryStore.getState().removeRecentHistoryEntry(fileUri);
}

export function clearRecent(): void {
  useRecentHistoryStore.getState().clearRecentHistory();
}
