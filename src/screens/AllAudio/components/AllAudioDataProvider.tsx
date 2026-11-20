// ─── All Audio — AllAudioDataProvider ───────────────────────────────────
// Sits ABOVE the shell so the page's scope has ONE owner.
//
// WAVE B16 (Wave B) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts and
// Audiobooks screens have one: the scope must have ONE owner, and the
// shell's filter, sort and search field push into it.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the filter, the sort, the view and the search
// field, so the content reads `ctx` and hands them to the provider,
// which turns them into the hook's inputs.

import React, {
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {ScannedTrack} from '../../../state';
import {useAllAudioScreen} from '../hooks/useAllAudioScreen';

interface AllAudioDataContextValue {
  /** Every scanned audio track. */
  tracks: ScannedTrack[];
  /** The tracks the scope shows. */
  visibleTracks: ScannedTrack[];
  /** The scope's artist ('' when the page shows every artist). */
  scopeArtist: string;
  /** The order the list is in. */
  sortLabel: string;
  /** Play a track. */
  playTrack: (track: ScannedTrack) => void;
  /** The scan's state — the pull-to-refresh spinner. */
  refreshing: boolean;
  /** Run a full re-scan of the linked folders. */
  refresh: () => void;
  /** Push the shell's artist filter down into the scope. */
  setArtist: (artist: string) => void;
  /** Push the shell's search field down into the scope. */
  setQuery: (query: string) => void;
  /** Push the shell's sort down into the scope. */
  setSort: (sort: string) => void;
}

const AllAudioDataContext = React.createContext<AllAudioDataContextValue | null>(
  null,
);

export function useAllAudioData(): AllAudioDataContextValue {
  const ctx = useContext(AllAudioDataContext);
  if (!ctx) {
    throw new Error(
      'useAllAudioData must be used inside <AllAudioDataProvider>.',
    );
  }
  return ctx;
}

export const AllAudioDataProvider: React.FC<{
  children: ReactNode;
  /**
   * The route's artist scope — the page opens on it.
   *
   * It is passed IN rather than read from the hook, because the option
   * model's seed is applied once at mount: without it the page would
   * open showing every track and narrow to the artist one render
   * later — the same flash the seed itself avoids.
   */
  initialArtist?: string;
  /** The route's sort — the page opens in that order. */
  initialSort?: string;
}> = ({children, initialArtist, initialSort}) => {
  const [artist, setArtist] = useState(initialArtist ?? '');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort ?? '');

  const audio = useAllAudioScreen({artist, query, sort});

  // The setters are stable identities, so the content's push-down
  // effects do not re-run on every render of the provider.
  const stableSetArtist = useCallback((next: string) => setArtist(next), []);
  const stableSetQuery = useCallback((next: string) => setQuery(next), []);
  const stableSetSort = useCallback((next: string) => setSort(next), []);

  const value = useMemo<AllAudioDataContextValue>(
    () => ({
      tracks: audio.tracks,
      visibleTracks: audio.visibleTracks,
      scopeArtist: audio.scopeArtist,
      sortLabel: audio.sortLabel,
      playTrack: audio.playTrack,
      refreshing: audio.refreshing,
      refresh: audio.refresh,
      setArtist: stableSetArtist,
      setQuery: stableSetQuery,
      setSort: stableSetSort,
    }),
    [
      audio.tracks,
      audio.visibleTracks,
      audio.scopeArtist,
      audio.sortLabel,
      audio.playTrack,
      audio.refreshing,
      audio.refresh,
      stableSetArtist,
      stableSetQuery,
      stableSetSort,
    ],
  );

  return (
    <AllAudioDataContext.Provider value={value}>
      {children}
    </AllAudioDataContext.Provider>
  );
};
