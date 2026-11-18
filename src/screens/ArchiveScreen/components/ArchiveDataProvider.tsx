// ─── Archive Screen — ArchiveDataProvider ──────────────────────────────
// Sits ABOVE the shell so the single content stream shares ONE query
// instance, and owns the row's press handler.
//
// WHY THE PROVIDER EXISTS
// -----------------------
// The same reason the Music, Movies and Audiobooks screens have one: the
// content component must not reach for the navigation prop, and the
// scope (the media type) and the search term must have ONE owner that
// the shell's filter sheet and search field push into.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the filter and the search field, so the content
// reads `ctx.options.filter` and `ctx.query` and hands them to the
// provider, which turns them into the hook's inputs.

import React, {useCallback, useMemo, useState, type ReactNode} from 'react';
import {navigate} from '../../../navigation/navigationHelper';
import {useArchiveScreen} from '../hooks/useArchiveScreen';
import type {ArchiveMediaType} from '../related/scopeConfig';
import type {ArchiveRow} from '../types';

interface ArchiveDataContextValue {
  /** The active media scope. */
  scope: ArchiveMediaType;
  /** The items of the active scope. */
  items: ReturnType<typeof useArchiveScreen>['items'];
  /** The source's total for the current query. */
  numFound: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  /** The failed NEXT PAGE's error — the footer's copy. */
  pageError: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  /** The pull-to-refresh gesture's state. */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  /** The term the source is actually answering. */
  activeTerm: string;
  /** True when the list ended at the archive's paging ceiling. */
  reachedPagingCeiling: boolean;
  /** Push the shell's filter down into the scope. */
  setScope: (scope: ArchiveMediaType) => void;
  /** Push the shell's search field down into the scope. */
  setSearchTerm: (term: string) => void;
  /** True while the user has a term on screen. */
  isSearchActive: boolean;
  /** A row tap opens the collection's OWN page. */
  handleRowPress: (row: ArchiveRow) => void;
}

const ArchiveDataContext = React.createContext<ArchiveDataContextValue | null>(
  null,
);

function useArchiveData(): ArchiveDataContextValue {
  const ctx = React.useContext(ArchiveDataContext);
  if (!ctx) {
    throw new Error(
      'useArchiveData must be used inside <ArchiveDataProvider>.',
    );
  }
  return ctx;
}

export {useArchiveData};

export const ArchiveDataProvider: React.FC<{
  children: ReactNode;
  /**
   * The scope the screen opens on — the route param's scope.
   *
   * It is passed in so the FIRST query is already the right one: the
   * provider would otherwise open on 'audio' and ask the archive for
   * audio, and only then learn from the shell that the route asked for
   * video — one wasted (and slow) request every time the screen is
   * opened on the video scope.
   */
  initialScope?: ArchiveMediaType;
  /**
   * The term the screen opens on — the route param's `query`.
   *
   * Passed in for the same reason as the scope: the shell's search field
   * is seeded with the route's term, so the provider has to start on
   * that term too. Otherwise the screen would first ask the archive for
   * the scope's curated default and only then for the term the route
   * asked for — and an Internet Archive query is slow enough (25–45 s
   * cold) that a wasted one is felt.
   */
  initialSearchTerm?: string;
}> = ({children, initialScope = 'audio', initialSearchTerm = ''}) => {
  // The active scope. The content pushes the shell's filter and search
  // term down here; the hook reads them as inputs.
  const [scope, setScope] = useState<ArchiveMediaType>(initialScope);
  const [activeSearchTerm, setSearchTerm] = useState(initialSearchTerm);

  const archive = useArchiveScreen({
    scope,
    searchTerm: activeSearchTerm,
  });

  /**
   * A row tap opens the COLLECTION'S OWN PAGE.
   *
   * An archive item is a collection — a show, an album, a record — and
   * not a playable file, so the row has no play action of its own. The
   * detail screen carries the track list, and the track list is what the
   * player is given. That is the grammar every other catalogue row in
   * the app uses: the Music row opens the track's page, the Movie row
   * opens the film's page, the Podcast row opens the feed's page.
   *
   * The video scope opens the movie page, the audio scope the archive
   * item's own page — the same split the screen has always drawn.
   */
  const handleRowPress = useCallback(
    (row: ArchiveRow) => {
      if (scope === 'video') {
        navigate('MovieDetail', {identifier: row.identifier, title: row.title});
        return;
      }
      navigate('ArchiveItemDetail', {
        identifier: row.identifier,
        title: row.title,
      });
    },
    [scope],
  );

  const isSearchActive = activeSearchTerm.trim().length > 0;

  const value = useMemo<ArchiveDataContextValue>(
    () => ({
      scope,
      items: archive.items,
      numFound: archive.numFound,
      hasLoaded: archive.hasLoaded,
      isLoading: archive.isLoading,
      isLoadingMore: archive.isLoadingMore,
      hasNextPage: archive.hasNextPage,
      error: archive.error,
      pageError: archive.pageError,
      fetchNextPage: archive.loadMore,
      refetch: archive.refetch,
      refreshing: archive.refreshing,
      refresh: archive.refresh,
      activeTerm: archive.activeTerm,
      reachedPagingCeiling: archive.reachedPagingCeiling,
      setScope,
      setSearchTerm,
      isSearchActive,
      handleRowPress,
    }),
    [
      scope,
      archive.items,
      archive.numFound,
      archive.hasLoaded,
      archive.isLoading,
      archive.isLoadingMore,
      archive.hasNextPage,
      archive.error,
      archive.pageError,
      archive.loadMore,
      archive.refetch,
      archive.refreshing,
      archive.refresh,
      archive.activeTerm,
      archive.reachedPagingCeiling,
      isSearchActive,
      handleRowPress,
    ],
  );

  return (
    <ArchiveDataContext.Provider value={value}>
      {children}
    </ArchiveDataContext.Provider>
  );
};
