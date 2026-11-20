// ─── All Videos — AllVideosDataProvider ────────────────────────────────
// Sits ABOVE the shell so the page's scope has ONE owner.
//
// WAVE B16 (Wave B2) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts,
// Audiobooks and All Audio screens have one: the scope must have ONE
// owner, and the shell's filter, sort and search field push into it.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the sort, the view and the search field, so the
// content reads `ctx` and hands them to the provider, which turns them
// into the hook's inputs.

import React, {useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import type {ScannedTrack} from '../../../state';
import {useAllVideosScreen} from '../hooks/useAllVideosScreen';

interface AllVideosDataContextValue {
  /** Every scanned video track on the device. */
  videoTracks: ScannedTrack[];
  /** The tracks the scope shows. */
  visibleTracks: ScannedTrack[];
  /** The order the list is in. */
  sortLabel: string;
  /** Play a track. */
  playTrack: (track: ScannedTrack) => void;
  /** The scan's state — the pull-to-refresh spinner. */
  refreshing: boolean;
  /** Run a full re-scan of the linked folders. */
  refresh: () => void;
  /** Push the shell's search field down into the scope. */
  setQuery: (query: string) => void;
  /** Push the shell's sort down into the scope. */
  setSort: (sort: string) => void;
};

const AllVideosDataContext = React.createContext<AllVideosDataContextValue | null>(
  null,
);

export function useAllVideosData(): AllVideosDataContextValue {
  const ctx = useContext(AllVideosDataContext);
  if (!ctx) {
    throw new Error('useAllVideosData must be used inside <AllVideosDataProvider>.');
  }
  return ctx;
};

export const AllVideosDataProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('title');

  const page = useAllVideosScreen({query, sort});

  // The setters are stable identities, so the content's push-down
  // effects do not re-run on every render of the provider.
  const stableSetQuery = useCallback((next: string) => setQuery(next), []);
  const stableSetSort = useCallback((next: string) => setSort(next), []);

  const value = useMemo<AllVideosDataContextValue>(
    () => ({
      videoTracks: page.videoTracks,
      visibleTracks: page.visibleTracks,
      sortLabel: page.sortLabel,
      playTrack: page.playTrack,
      refreshing: page.refreshing,
      refresh: page.refresh,
      setQuery: stableSetQuery,
      setSort: stableSetSort,
    }),
    [
      page.videoTracks,
      page.visibleTracks,
      page.sortLabel,
      page.playTrack,
      page.refreshing,
      page.refresh,
      stableSetQuery,
      stableSetSort,
    ],
  );

  return (
    <AllVideosDataContext.Provider value={value}>
      {children}
    </AllVideosDataContext.Provider>
  );
};