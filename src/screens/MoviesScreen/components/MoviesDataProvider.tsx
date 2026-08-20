// ─── Movies Screen — MoviesDataProvider ──────────────────────────────
// Sits ABOVE the shell so the single content stream shares ONE per-scope
// cache — the legacy "switching categories never refetches" behavior.
//
// The active `sortKey` arrives as a prop from the screen (composition
// root), so changing "sort by" re-fetches page 1 in the new server-side
// order. Also owns the per-movie resolution state + press handler (uses
// the global `navigate` helper — content has no screen `navigation`).

import React, {useCallback, useMemo, useState, type ReactNode} from 'react';
import {useToast} from '../../../components/feedback/Toast';
import {usePlaybackCommands} from '../../../modules/playback';
import {resolveInternetArchiveVideoDetails} from '../../../services/api/internetArchiveService';
import type {InternetArchiveVideoResult} from '../../../types/api';
import {
  useMoviesScreenParams,
  type MovieScopeState,
} from '../hooks/useMoviesScreen';

interface MoviesDataContextValue {
  isSearchActive: boolean;
  /** Hook-synced search term (drives the per-scope cache key). */
  searchTerm: string;
  getScope: (categoryIds: readonly string[]) => MovieScopeState;
  ensureLoaded: (categoryIds: readonly string[]) => void;
  loadMore: (categoryIds: readonly string[]) => void;
  retry: (categoryIds: readonly string[]) => void;
  refresh: (categoryIds: readonly string[]) => void;
  setSearchTerm: (term: string) => void;
  resolvingId: string | null;
  handleMoviePress: (item: InternetArchiveVideoResult) => void;
}

const MoviesDataContext = React.createContext<MoviesDataContextValue | null>(
  null,
);

export function useMoviesData(): MoviesDataContextValue {
  const ctx = React.useContext(MoviesDataContext);
  if (!ctx) {
    throw new Error('useMoviesData must be used inside <MoviesDataProvider>.');
  }
  return ctx;
}

export const MoviesDataProvider: React.FC<{
  children: ReactNode;
  /** Active sort key (undefined = IA default). Fed from the screen's
   *  `optionsApi` — changing it re-keys the scope cache and re-fetches
   *  page 1 in the new server-side order. */
  sortKey?: string;
}> = ({children, sortKey}) => {
  const toast = useToast();
  const {openPlayer} = usePlaybackCommands();
  // Single hook instance for the whole screen — the one content stream
  // reads the SAME (categoryIds, searchTerm, sortKey) scope cache via
  // context.
  const movies = useMoviesScreenParams({sortKey});

  // Per-movie resolution state. Failures surface as a top-of-screen toast
  // (auto-dismiss + close button) rather than an inline banner — same
  // pattern as the rest of the app.
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleMoviePress = useCallback(
    async (item: InternetArchiveVideoResult) => {
      // Validate the URL *before* navigating into the player: retry the
      // metadata API up to 3 times (toast on each switch) and refuse to
      // navigate if the URL is still bad — surface a toast instead.
      setResolvingId(item.identifier);
      try {
        const details = await resolveInternetArchiveVideoDetails(
          item.identifier,
          (attempt, max) => {
            toast.show(
              `Trying alternate server… (attempt ${attempt}/${max})`,
              'info',
              {duration: 1800},
            );
          },
        );
        if (!details || details.streamingUrl.endsWith('/')) {
          toast.show(
            'No Video File — this item does not have a playable video file. Please try a different movie.',
            'error',
            {duration: 6000},
          );
          return;
        }
        openPlayer({
          uri: details.streamingUrl,
          title: item.title,
          duration: item.duration ?? 0,
          startPosition: 0,
          source: 'api',
          type: 'movie',
          mediaType: 'video',
          provider: 'internetarchive',
        });
      } catch (err) {
        const detail =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to fetch the video file. Please try again.';
        toast.show(`Unable to Load — ${detail}`, 'error', {duration: 6000});
      } finally {
        setResolvingId(null);
      }
    },
    [openPlayer, toast],
  );

  // Stabilize the context value: depend on each individual property
  // so the memo only invalidates when one of them actually changes,
  // not every time `movies` (a fresh object) is returned from the hook.
  // Without this, every provider render gives the consumer a new
  // `ensureLoaded` ref, re-firing the mount effect.
  const value = useMemo<MoviesDataContextValue>(
    () => ({
      isSearchActive: movies.isSearchActive,
      searchTerm: movies.searchTerm,
      getScope: movies.getScope,
      ensureLoaded: movies.ensureLoaded,
      loadMore: movies.loadMore,
      retry: movies.retry,
      refresh: movies.refresh,
      setSearchTerm: movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    }),
    [
      movies.isSearchActive,
      movies.searchTerm,
      movies.getScope,
      movies.ensureLoaded,
      movies.loadMore,
      movies.retry,
      movies.refresh,
      movies.setSearchTerm,
      resolvingId,
      handleMoviePress,
    ],
  );

  return (
    <MoviesDataContext.Provider value={value}>
      {children}
    </MoviesDataContext.Provider>
  );
};
