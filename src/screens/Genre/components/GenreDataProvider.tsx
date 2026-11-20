// ─── Genre — GenreDataProvider ─────────────────────────────────────────
// Sits ABOVE the shell so the page's scope has ONE owner.
//
// WAVE B16 (Wave B2) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts,
// Audiobooks and All Audio screens have one: the scope must have ONE
// owner.
//
// The scope here is the SOURCE — "My Library" or "Streaming" — and
// it is NOT the shell's scope: the page declares no search and no
// option groups, so the shell owns nothing to push down. The source
// toggle is the content's own control, and the provider is where it
// lives, so the content reads it from one place.

import React, {useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {useGenreScreen, type GenreSource} from '../hooks/useGenreScreen';

interface GenreDataContextValue {
  /** The genre the page is about. */
  genre: string;
  /** Which source the page is showing. */
  source: GenreSource;
  /** Switch the source. */
  setSource: (source: GenreSource) => void;
  /** The device's own tracks in this genre. */
  localTracks: ReturnType<typeof useGenreScreen>['localTracks'];
  /** The streaming catalogue's tracks in this genre. */
  streamingTracks: ReturnType<typeof useGenreScreen>['streamingTracks'];
  /** The streaming catalogue is in flight. */
  streamingLoading: boolean;
  /** The streaming catalogue could not be reached. */
  streamingFailed: boolean;
  /** Try the streaming catalogue again. */
  retryStreaming: () => void;
  /** Play a track from the device's own library. */
  playLocalTrack: ReturnType<typeof useGenreScreen>['playLocalTrack'];
  /** Play a track from the streaming catalogue. */
  playStreamingTrack: ReturnType<typeof useGenreScreen>['playStreamingTrack'];
};

const GenreDataContext = React.createContext<GenreDataContextValue | null>(null);

export function useGenreData(): GenreDataContextValue {
  const ctx = useContext(GenreDataContext);
  if (!ctx) {
    throw new Error('useGenreData must be used inside <GenreDataProvider>.');
  }
  return ctx;
};

export const GenreDataProvider: React.FC<{
  children: ReactNode;
  /** The genre the page is about. */
  genre: string;
  /** The source the page opens on — the route's `initialTab`. */
  initialSource: GenreSource;
}> = ({children, genre, initialSource}) => {
  const [source, setSource] = useState<GenreSource>(initialSource);

  const page = useGenreScreen({genre});

  // The setter is a stable identity, so the content's effect does not
  // re-run on every render of the provider.
  const stableSetSource = useCallback((next: GenreSource) => setSource(next), []);

  const value = useMemo<GenreDataContextValue>(
    () => ({
      genre,
      source,
      setSource: stableSetSource,
      localTracks: page.localTracks,
      streamingTracks: page.streamingTracks,
      streamingLoading: page.streamingLoading,
      streamingFailed: page.streamingFailed,
      retryStreaming: page.retryStreaming,
      playLocalTrack: page.playLocalTrack,
      playStreamingTrack: page.playStreamingTrack,
    }),
    [
      genre,
      source,
      stableSetSource,
      page.localTracks,
      page.streamingTracks,
      page.streamingLoading,
      page.streamingFailed,
      page.retryStreaming,
      page.playLocalTrack,
      page.playStreamingTrack,
    ],
  );

  return (
    <GenreDataContext.Provider value={value}>
      {children}
    </GenreDataContext.Provider>
  );
};