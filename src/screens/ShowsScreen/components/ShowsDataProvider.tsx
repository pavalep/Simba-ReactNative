// ─── Shows Screen — ShowsDataProvider ──────────────────────────────────
//
// Sits ABOVE the shell so the single content stream shares ONE query
// instance, and owns the per-show press handler.
//
// The provider exists for the same reason the Music, Movies, Podcasts and
// Audiobooks screens have one: the content component must not reach for
// the navigation prop, and the scope (the show list, the search term)
// must have ONE owner that the shell's filter sheet and search field
// push into.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the filter sheet and the search field, so the
// content reads `ctx.options.filters.scope` and `ctx.query` and hands
// them here, and the provider turns them into the hook's inputs.

import React, {useCallback, useMemo, useState, type ReactNode} from 'react';
import {navigate} from '../../../navigation/navigationHelper';
import {useShowsScreen, type ShowsScopeKind} from '../hooks/useShowsScreen';
import type {TVMazeShow} from '../../../types/api';

interface ShowsDataContextValue {
  /** The scope the source is answering. */
  scopeKind: ShowsScopeKind;
  /** The shows the scope is answering. */
  items: TVMazeShow[];
  /** The shows airing today — the rail in the catalogue scope. */
  todayItems: TVMazeShow[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  /** The FIRST page's failure — the error card's business. */
  error: string | null;
  /** The failed NEXT PAGE's error — the footer's business. */
  pageError: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  /** The pull-to-refresh gesture's state. */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  /** The active scope group's selection — `undefined` until the shell says. */
  activeScope: string | undefined;
  /** The active search term. */
  activeSearchTerm: string;
  /** Push the shell's scope group down into the scope. */
  setActiveScope: (scope: string) => void;
  /** Push the shell's search field down into the scope. */
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  /** A row tap opens the SHOW'S OWN PAGE. */
  handleShowPress: (show: TVMazeShow) => void;
}

const ShowsDataContext = React.createContext<ShowsDataContextValue | null>(
  null,
);

function useShowsData(): ShowsDataContextValue {
  const ctx = React.useContext(ShowsDataContext);
  if (!ctx) {
    throw new Error(
      'useShowsData must be used inside <ShowsDataProvider>.',
    );
  }
  return ctx;
}

export {useShowsData};

export const ShowsDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  // The active scope. The content pushes the shell's scope group and
  // search term down here; the hook reads them as inputs.
  //
  // The scope starts UNDEFINED, not '': the provider sits above the
  // shell, so the shell's filter reaches it through the content's
  // effect. `undefined` says "the shell has not said yet", and the hook
  // asks for nothing until it has — a deep link asking for the "Airing
  // today" scope must not fetch the catalogue on the way there.
  const [activeScope, setActiveScope] = useState<string | undefined>(undefined);
  const [activeSearchTerm, setSearchTerm] = useState('');

  const shows = useShowsScreen({
    scope: activeScope,
    searchTerm: activeSearchTerm,
  });

  /**
   * A row tap opens the SHOW'S OWN PAGE.
   *
   * A SHOW is not a playable file — it is a SERIES, and the only thing
   * this app can play is a local file matched to an episode by name (see
   * `ShowDetailScreen`). So the row carries no play action, no "Play
   * Next" and no "Add to Queue": there is nothing in the app to queue,
   * and a control that cannot act must not occupy space.
   *
   * The show's own page is where the actions that CAN act live —
   * bookmarking the show, sharing it, and playing a matched episode.
   * That is the grammar every other catalogue row in the app uses: the
   * Music row opens the track's page, the Movie row opens the film's
   * page, the Podcast row opens the feed's page and the Audiobook row
   * opens the book's page.
   */
  const handleShowPress = useCallback((show: TVMazeShow) => {
    navigate('ShowDetail', {showId: show.id, showName: show.name});
  }, []);

  const value = useMemo<ShowsDataContextValue>(
    () => ({
      scopeKind: shows.scopeKind,
      items: shows.items,
      todayItems: shows.todayItems,
      hasLoaded: shows.hasLoaded,
      isLoading: shows.isLoading,
      isLoadingMore: shows.isLoadingMore,
      hasNextPage: shows.hasNextPage,
      error: shows.error,
      pageError: shows.pageError,
      fetchNextPage: shows.fetchNextPage,
      refetch: shows.refetch,
      refreshing: shows.refreshing,
      refresh: shows.refresh,
      activeScope,
      activeSearchTerm,
      setActiveScope,
      setSearchTerm,
      isSearchActive: shows.isSearchActive,
      handleShowPress,
    }),
    [
      shows.scopeKind,
      shows.items,
      shows.todayItems,
      shows.hasLoaded,
      shows.isLoading,
      shows.isLoadingMore,
      shows.hasNextPage,
      shows.error,
      shows.pageError,
      shows.fetchNextPage,
      shows.refetch,
      shows.refreshing,
      shows.refresh,
      shows.isSearchActive,
      activeScope,
      activeSearchTerm,
      handleShowPress,
    ],
  );

  return (
    <ShowsDataContext.Provider value={value}>
      {children}
    </ShowsDataContext.Provider>
  );
};
