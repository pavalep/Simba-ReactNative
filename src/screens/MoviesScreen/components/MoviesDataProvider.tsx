// ─── Movies Screen — MoviesDataProvider ──────────────────────────────
// V18.6.2c: rewritten to use the V18-ideal useMoviesScreen hook.
// The active scope (categoryIds, searchTerm, sortKey) is now
// tracked in the provider's own state; the consumer (MoviesContent)
// pushes scope changes down via setActiveCategoryIds /
// setSearchTerm. The hook (useMoviesScreen) is a pure function
// of those inputs — no per-scope Map, no seqRef, no guardRef.
//
// The provider also owns the per-movie resolution state +
// press handler (the IA partial-replication retry).

import React, {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {useToast} from '../../../components/feedback/Toast';
import {
  resolveStreamType,
  usePlayerActivity,
} from '@simba-dev/react-native-media-player';
import {resolveInternetArchiveVideoDetails} from '../../../services/api/internetArchiveAdapter';
import type {InternetArchiveVideoResult} from '../../../types/api';
import {
  useMoviesScreen,
  type MovieScopeState,
} from '../hooks/useMoviesScreen';

interface MoviesDataContextValue {
  /** The active scope's data. (V18-ideal: no `getScope(ids)` — the
   *  provider tracks the active scope, the consumer reads `data`.) */
  data: MovieScopeState;
  /** Refetch the active scope (used for retry / pull-to-refresh). */
  refetch: () => void;
  /** Client-side slice growth (used for infinite scroll). */
  loadMore: () => void;
  /** Active scope state + setters. */
  activeCategoryIds: readonly string[];
  activeSearchTerm: string;
  setActiveCategoryIds: (ids: readonly string[]) => void;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  /** Per-movie resolution state + press handler. */
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
  /** Active sort key (undefined = IA default). Fed from the
   *  screen's `optionsApi` — changing it re-keys the scope cache
   *  and re-fetches page 1 in the new server-side order. */
  sortKey?: string;
}> = ({children, sortKey}) => {
  const toast = useToast();
  const {openPlayer} = usePlayerActivity();

  // Active scope state. The screen pushes changes via the
  // setters; the hook reads them as inputs.
  const [activeCategoryIds, setActiveCategoryIds] = useState<
    readonly string[]
  >([]);
  const [activeSearchTerm, setActiveSearchTerm] = useState('');

  // Pure hook — every (categoryIds, searchTerm, sortKey) tuple
  // is its own TanStack cache entry. No per-scope state machine.
  const movies = useMoviesScreen({
    categoryIds: activeCategoryIds,
    searchTerm: activeSearchTerm,
    sortKey,
  });

  // Per-movie resolution state. Failures surface as a top-of-
  // screen toast (auto-dismiss + close button) rather than an
  // inline banner — same pattern as the rest of the app.
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleMoviePress = useCallback(
    async (item: InternetArchiveVideoResult) => {
      // Validate the URL *before* navigating into the player:
      // retry the metadata API up to 3 times (toast on each
      // switch) and refuse to navigate if the URL is still bad.
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
          startPositionMs: 0,
          type: resolveStreamType('movie'),
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

  const isSearchActive = activeSearchTerm.trim().length > 0;

  const value = useMemo<MoviesDataContextValue>(
    () => ({
      data: movies.data,
      refetch: movies.refetch,
      loadMore: movies.loadMore,
      activeCategoryIds,
      activeSearchTerm,
      setActiveCategoryIds,
      setSearchTerm: setActiveSearchTerm,
      isSearchActive,
      resolvingId,
      handleMoviePress,
    }),
    [
      movies.data,
      movies.refetch,
      movies.loadMore,
      activeCategoryIds,
      activeSearchTerm,
      isSearchActive,
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
