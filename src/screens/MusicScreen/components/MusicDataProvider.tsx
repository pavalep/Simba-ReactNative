// ─── Music Screen — MusicDataProvider ───────────────────────────────
// Sits ABOVE the shell so the single content stream shares ONE query
// instance — V18's per-scope cache lives in TanStack, not in this hook.
// Also owns the per-track press handler (uses the global `navigate`
// helper — content has no screen `navigation`).
//
// V18.3.3: the provider's API changes from "per-scope callbacks"
// (getScope(genre), ensureLoaded(genre), ...) to "single-scope
// data + actions" (items, fetchNextPage, setActiveGenre, ...).
// The content sets the active genre via setActiveGenre; the hook's
// useInfiniteApiQuery re-points the queryKey.

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {useMusicScreen} from '../hooks/useMusicScreen';
import {navigate} from '../../../navigation/navigationHelper';
import type {JamendoTrackResult} from '../../../types/api';

interface MusicDataContextValue {
  // `activeGenre` used to be here too. It had NO consumer — the content
  // reads the genre from the shell's filter, not from the context — so it
  // was a second copy of a fact nobody read.
  setActiveGenre: (genre: string) => void;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  items: JamendoTrackResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  /** The failed NEXT PAGE's error — the footer's copy, not the list's. */
  pageError: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  /**
   * The pull-to-refresh gesture's state. The spinner belongs to the
   * gesture, not to the query's fetch flag — see
   * `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  handleTrackPress: (item: JamendoTrackResult) => void;
}

const MusicDataContext = React.createContext<MusicDataContextValue | null>(
  null,
);

function useMusicData(): MusicDataContextValue {
  const ctx = React.useContext(MusicDataContext);
  if (!ctx) {
    throw new Error('useMusicData must be used inside <MusicDataProvider>.');
  }
  return ctx;
}

export {useMusicData};

export const MusicDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  // Single hook instance for the whole screen.
  const music = useMusicScreen();

  /**
   * A row tap opens the TRACK'S OWN PAGE.
   *
   * The row used to BE the play action: one tap played the track from
   * the list, and the row's comment said so. The track's own page is
   * now a real screen (B13-9) — the cover, the meta, the description
   * and the play button — so the row opens it and the play action
   * lives there. That is the grammar every other detail screen in the
   * app uses: the Movie detail and the Podcast detail are both opened
   * from a list and both carry their own play action.
   *
   * The source is named, not implied: the deep link
   * `simbaplayer://music/<trackId>` carries no source, and the screen
   * defaults it — but a row in THIS screen is always a Jamendo track,
   * so the row says so.
   */
  const handleTrackPress = useCallback((item: JamendoTrackResult) => {
    navigate('MusicDetail', {trackId: String(item.id), source: 'jamendo'});
  }, []);

  const value = useMemo<MusicDataContextValue>(
    () => ({
      setActiveGenre: music.setActiveGenre,
      setSearchTerm: music.setSearchTerm,
      isSearchActive: music.isSearchActive,
      items: music.items,
      hasLoaded: music.hasLoaded,
      isLoading: music.isLoading,
      isLoadingMore: music.isLoadingMore,
      hasNextPage: music.hasNextPage,
      error: music.error,
      pageError: music.pageError,
      fetchNextPage: music.fetchNextPage,
      refetch: music.refetch,
      refreshing: music.refreshing,
      refresh: music.refresh,
      handleTrackPress,
    }),
    [
      music.setActiveGenre,
      music.setSearchTerm,
      music.isSearchActive,
      music.items,
      music.hasLoaded,
      music.isLoading,
      music.isLoadingMore,
      music.hasNextPage,
      music.error,
      music.pageError,
      music.fetchNextPage,
      music.refetch,
      music.refreshing,
      music.refresh,
      handleTrackPress,
    ],
  );

  return (
    <MusicDataContext.Provider value={value}>
      {children}
    </MusicDataContext.Provider>
  );
};
