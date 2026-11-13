// ─── Podcasts — Data Provider ─────────────────────────────────────────
// V20.2: rewritten on the V18-ideal `usePodcastsScreen` (single
// `useInfiniteApiQuery` with `pageParam` = the doubling `max`
// window). The provider still owns the podcast press handler
// (uses the global `navigate` helper — the content has no
// screen `navigation`).
//
// The active categoryId is tracked in the hook as part of the
// TanStack queryKey. The screen pushes scope changes via
// `setActiveCategoryId(id)`; the hook refetches automatically.
// This replaces the legacy `load(id)` "wipe + refetch" pattern
// with a one-liner setter.

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {usePodcastsScreen} from '../hooks/usePodcastsScreen';
import {navigate} from '../../../navigation/navigationHelper';
import type {PodcastResult} from '../../../types/api';

interface PodcastsDataContextValue {
  isSearchActive: boolean;
  searchTerm: string;
  items: PodcastResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  /** The error from a failed load-more — the footer's copy. */
  pageError: string | null;
  setSearchTerm: (term: string) => void;
  setActiveCategoryId: (id: string) => void;
  loadMore: () => void;
  retry: () => void;
  /**
   * The pull-to-refresh gesture's state. The spinner belongs to the
   * gesture, not to the query's fetch flag — see
   * `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
  handlePodcastPress: (item: PodcastResult) => void;
}

const PodcastsDataContext = React.createContext<PodcastsDataContextValue | null>(
  null,
);

export function usePodcastsData(): PodcastsDataContextValue {
  const ctx = React.useContext(PodcastsDataContext);
  if (!ctx) {
    throw new Error(
      'usePodcastsData must be used inside <PodcastsDataProvider>.',
    );
  }
  return ctx;
}

export const PodcastsDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  const podcasts = usePodcastsScreen();

  const handlePodcastPress = useCallback((item: PodcastResult) => {
    navigate('PodcastDetail', {podcastId: item.id});
  }, []);

  const value = useMemo<PodcastsDataContextValue>(
    () => ({
      isSearchActive: podcasts.isSearchActive,
      searchTerm: podcasts.searchTerm,
      items: podcasts.items,
      hasLoaded: podcasts.hasLoaded,
      isLoading: podcasts.isLoading,
      isLoadingMore: podcasts.isLoadingMore,
      hasMore: podcasts.hasMore,
      error: podcasts.error,
      pageError: podcasts.pageError,
      setSearchTerm: podcasts.setSearchTerm,
      setActiveCategoryId: podcasts.setActiveCategoryId,
      loadMore: podcasts.loadMore,
      retry: podcasts.retry,
      refreshing: podcasts.refreshing,
      refresh: podcasts.refresh,
      handlePodcastPress,
    }),
    [
      podcasts.isSearchActive,
      podcasts.searchTerm,
      podcasts.items,
      podcasts.hasLoaded,
      podcasts.isLoading,
      podcasts.isLoadingMore,
      podcasts.hasMore,
      podcasts.error,
      podcasts.pageError,
      podcasts.setSearchTerm,
      podcasts.setActiveCategoryId,
      podcasts.loadMore,
      podcasts.retry,
      podcasts.refreshing,
      podcasts.refresh,
      handlePodcastPress,
    ],
  );

  return (
    <PodcastsDataContext.Provider value={value}>
      {children}
    </PodcastsDataContext.Provider>
  );
};
