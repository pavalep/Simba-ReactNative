// ─── Live TV Screen — LiveTVDataProvider ──────────────────────────────
//
// Sits ABOVE the shell so the single content stream shares ONE query
// instance, and owns the per-channel press handler.
//
// WHY A PROVIDER
// --------------
// The content component must not reach for the navigation prop, and the
// scope (the category, the search term) must have ONE owner that the
// shell's filter and search field push into.
//
// The scope is pushed DOWN from the content, not pulled up from it:
// `BrowseLayout` owns the filter and the search field, so the content
// reads `ctx.options.filter` and `ctx.query` and hands them to the
// provider, which turns them into the hook's inputs.
//
// THE CATALOGUE QUERY
// -------------------
// The provider and the composition root BOTH read the catalogue — the
// root needs the categories (they are the filter axis) and the provider
// needs the channels (they are the rows). They read it through the SAME
// hook (`useLiveTVCatalogue`), so they read the SAME query: one cache
// entry, one download, two subscribers. TanStack dedupes the in-flight
// request, so the 2.8 MB directory is fetched once.

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {useResumeAwareLaunch} from '../../../infrastructure/player';
import {useLiveTVScreen} from '../hooks/useLiveTVScreen';
import {useLiveTVFavorites} from '../hooks/useLiveTVFavorites';
import {channelLaunchOptions} from '../related/channelRow';
import type {ChannelRow} from '../related/channelRow';
import type {IPTVChannelResult} from '../../../types/api';

interface LiveTVDataContextValue {
  /** The rows of the active scope. */
  items: IPTVChannelResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  /** Always false — the paging is a client-side slice with no fetch. */
  isLoadingMore: boolean;
  /** The scope has rows the list has not shown yet. */
  hasMore: boolean;
  /** The catalogue's failure — the error card's business. */
  error: string | null;
  /** Always null — there is no next page that can fail. */
  pageError: string | null;
  /** The active category id, or null for the whole catalogue. */
  activeCategory: string | null;
  /** Point the scope at a category (the shell's filter). */
  setActiveCategory: (categoryId: string) => void;
  /** Point the scope at a search term (the shell's search field). */
  setSearchTerm: (term: string) => void;
  /** True while a search term is on screen. */
  isSearchActive: boolean;
  /** The active category's NAME — what the empty state names. */
  scopeLabel: string | undefined;
  /** Show the next slice of the scope. */
  fetchNextPage: () => void;
  /** Run the catalogue again. */
  refetch: () => void;
  /** The pull-to-refresh gesture's state. */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  /** Is this channel one of the saved ones? */
  isFavoriteId: (id: string) => boolean;
  /** A row tap plays the channel. */
  handleChannelPress: (row: ChannelRow) => void;
}

const LiveTVDataContext = React.createContext<LiveTVDataContextValue | null>(
  null,
);

function useLiveTVData(): LiveTVDataContextValue {
  const ctx = React.useContext(LiveTVDataContext);
  if (!ctx) {
    throw new Error('useLiveTVData must be used inside <LiveTVDataProvider>.');
  }
  return ctx;
}

export {useLiveTVData};

export const LiveTVDataProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  // Single hook instance for the whole screen.
  const liveTV = useLiveTVScreen();
  const {isFavoriteId} = useLiveTVFavorites();
  const {openPlayer} = useResumeAwareLaunch();

  /**
   * A row tap plays the channel.
   *
   * The payload is ONE payload for both Live TV surfaces — the browse list
   * and the favourites list — so the same channel is recorded the same way
   * wherever it was tapped from (see `related/channelRow.ts`).
   */
  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      openPlayer(channelLaunchOptions(row));
    },
    [openPlayer],
  );

  const value = useMemo<LiveTVDataContextValue>(
    () => ({
      items: liveTV.items,
      hasLoaded: liveTV.hasLoaded,
      isLoading: liveTV.isLoading,
      isLoadingMore: liveTV.isLoadingMore,
      hasMore: liveTV.hasMore,
      error: liveTV.error,
      pageError: liveTV.pageError,
      activeCategory: liveTV.activeCategory,
      setActiveCategory: liveTV.setActiveCategory,
      setSearchTerm: liveTV.setSearchTerm,
      isSearchActive: liveTV.isSearchActive,
      scopeLabel: liveTV.scopeLabel,
      fetchNextPage: liveTV.fetchNextPage,
      refetch: liveTV.refetch,
      refreshing: liveTV.refreshing,
      refresh: liveTV.refresh,
      isFavoriteId,
      handleChannelPress,
    }),
    [
      liveTV.items,
      liveTV.hasLoaded,
      liveTV.isLoading,
      liveTV.isLoadingMore,
      liveTV.hasMore,
      liveTV.error,
      liveTV.pageError,
      liveTV.activeCategory,
      liveTV.setActiveCategory,
      liveTV.setSearchTerm,
      liveTV.isSearchActive,
      liveTV.scopeLabel,
      liveTV.fetchNextPage,
      liveTV.refetch,
      liveTV.refreshing,
      liveTV.refresh,
      isFavoriteId,
      handleChannelPress,
    ],
  );

  return (
    <LiveTVDataContext.Provider value={value}>
      {children}
    </LiveTVDataContext.Provider>
  );
};
