import {create} from 'zustand';
import {useMemo} from 'react';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import type {DownloadRecord, DownloadStatus} from '../services/downloadService';

/**
 * V17 Phase 84: replaces `downloadsSlice` (Redux + redux-persist
 * whitelist) with `useDownloadsStore` (Zustand + persist, key
 * 'downloads' to match the whitelist).
 *
 * The reactive UI mirror of `downloadService`. The service's
 * AsyncStorage manifest is the source of truth (survives
 * restarts + powers the sync offline remap); this store just
 * feeds badges, buttons and the Downloads screen. The store
 * is hydrated by `hydrateDownloads()` at boot and on every
 * service event.
 */

export interface DownloadsState {
  records: DownloadRecord[];
}

export interface DownloadsActions {
  hydrateDownloads: (records: DownloadRecord[]) => void;
  upsertDownload: (record: DownloadRecord) => void;
  setDownloadStatus: (input: {uri: string; status: DownloadStatus; error?: string}) => void;
  removeDownload: (uri: string) => void;
  reset: () => void;
  setRecords: (records: DownloadRecord[]) => void;
}

const initialState: DownloadsState = {
  records: [],
};

export const useDownloadsStore = create<DownloadsState & DownloadsActions>()(
  persist(
    (set) => ({
      ...initialState,

      hydrateDownloads: (records) => set({records}),

      upsertDownload: (record) =>
        set((s) => {
          const idx = s.records.findIndex(r => r.uri === record.uri);
          if (idx >= 0) {
            const next = s.records.slice();
            next[idx] = record;
            return {records: next};
          }
          return {records: [...s.records, record]};
        }),

      setDownloadStatus: ({uri, status, error}) =>
        set((s) => ({
          records: s.records.map(r =>
            r.uri === uri
              ? {
                  ...r,
                  status,
                  ...(error !== undefined ? {error} : {}),
                }
              : r,
          ),
        })),

      removeDownload: (uri) =>
        set((s) => ({records: s.records.filter(r => r.uri !== uri)})),

      reset: () => set({...initialState}),

      setRecords: (records) => set({records}),
    }),
    {
      name: 'downloads',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);

// ─── Derived hooks (memoize on records) ──────────────────────

/** Returns a record by URI. Memoized — same URI returns the
 *  same reference until records change. */
export function useDownloadByUri(uri: string): DownloadRecord | null {
  const records = useDownloadsStore(s => s.records);
  return useMemo(
    () => records.find(r => r.uri === uri) ?? null,
    [records, uri],
  );
}

/** Set of completed-download URIs. Powers the offline badges. */
export function useDownloadedUriSet(): Set<string> {
  const records = useDownloadsStore(s => s.records);
  return useMemo(
    () => new Set(records.filter(r => r.status === 'done').map(r => r.uri)),
    [records],
  );
}

/** Total bytes for all done downloads. */
export function useDownloadsTotalBytes(): number {
  const records = useDownloadsStore(s => s.records);
  return useMemo(
    () => records
      .filter(r => r.status === 'done')
      .reduce((sum, r) => sum + (r.size || 0), 0),
    [records],
  );
}
