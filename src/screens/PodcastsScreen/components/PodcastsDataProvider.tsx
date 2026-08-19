// ─── Podcasts — Data Provider ─────────────────────────────────────────
// One `usePodcastsScreen()` instance, mounted ABOVE the shell so the
// single content stream reads from the SAME hook state (no per-scope
// cache — see the hook header for the rationale). Also owns the podcast
// press handler (uses the global `navigate` helper — the content has no
// screen `navigation`).

import React, {useCallback, useMemo, type ReactNode} from 'react';
import {usePodcastsScreen} from '../hooks/usePodcastsScreen';
import {navigate} from '../../../navigation/navigationHelper';
import type {PodcastResult} from '../../../types/api';

interface PodcastsDataContextValue {
  isSearchActive: boolean;
  searchTerm: string;
  items: PodcastResult[];
  maxRequested: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  setSearchTerm: (term: string) => void;
  load: (categoryId: string) => void;
  loadMore: (categoryId: string) => void;
  retry: (categoryId: string) => void;
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
    navigate('PodcastDetail', {
      podcastId: item.id,
      podcastTitle: item.title,
    });
  }, []);

  const value = useMemo<PodcastsDataContextValue>(
    () => ({
      isSearchActive: podcasts.isSearchActive,
      searchTerm: podcasts.searchTerm,
      items: podcasts.items,
      maxRequested: podcasts.maxRequested,
      hasLoaded: podcasts.hasLoaded,
      isLoading: podcasts.isLoading,
      isLoadingMore: podcasts.isLoadingMore,
      error: podcasts.error,
      setSearchTerm: podcasts.setSearchTerm,
      load: podcasts.load,
      loadMore: podcasts.loadMore,
      retry: podcasts.retry,
      handlePodcastPress,
    }),
    // Stabilize the context value — depend on each property individually
    // so the memo only invalidates when one of them actually changes,
    // not every render (`podcasts` is a fresh object each time) — the
    // Phase 5.2b fix that prevented re-render loops.
    [
      podcasts.isSearchActive,
      podcasts.searchTerm,
      podcasts.items,
      podcasts.maxRequested,
      podcasts.hasLoaded,
      podcasts.isLoading,
      podcasts.isLoadingMore,
      podcasts.error,
      podcasts.setSearchTerm,
      podcasts.load,
      podcasts.loadMore,
      podcasts.retry,
      handlePodcastPress,
    ],
  );

  return (
    <PodcastsDataContext.Provider value={value}>
      {children}
    </PodcastsDataContext.Provider>
  );
};