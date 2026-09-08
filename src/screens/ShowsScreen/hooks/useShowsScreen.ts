// ─── Shows Screen Hook ──────────────────────────────────────────────────
// V18.11.5: converted from the v3-v9 3-tab pattern
// (search / today / browse) to the v10+ "single content stream +
// FAB" pattern.
//
// UX decision:
//   - "Today" tab dropped (was a date query to TVMaze `/schedule`).
//     Surfacing it as a "Airing Today" rail at the top of the
//     search/browse list is a follow-up; the data hook is in
//     place (the today query still exists in this hook) so the
//     screen can add a hero rail later without re-architecting
//     the data flow.
//   - "Search" is the primary stream when a term is set.
//   - "Browse" is the primary stream when no term is set —
//     uses TVMaze's paginated `/shows` endpoint.
//
// Single useApiQuery for the active stream. The other query
// is suspended via `enabled`.

import {useCallback, useMemo, useState} from 'react';
import {useApiQuery, useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {
  searchShows,
  getSchedule,
  getPopularShows,
  type TVMazeScheduleItem,
} from '../../../services/api/tvmazeAdapter';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {TVMazeShow} from '../../../types/api';

const PAGE_SIZE = 250;
const SEARCH_CACHE_TTL = 600_000;

export type ShowSource = 'search' | 'browse';

export interface UseShowsScreenResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  source: ShowSource;
  setSource: (s: ShowSource) => void;
  items: TVMazeShow[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  // Today's schedule (for a future "Airing Today" rail — kept
  // available so the screen can add a hero rail without a hook
  // refactor).
  todaysItems: TVMazeShow[];
  todaysLoading: boolean;
  todaysError: string | null;
  retryTodays: () => void;
  isOnline: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
}

export function useShowsScreen(
  initialTab?: string,
  initialGenre?: string,
): UseShowsScreenResult {
  const {isOnline} = useNetworkStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [source, setSource] = useState<ShowSource>(
    initialTab === 'search' ? 'search' : 'browse',
  );

  const isSearchActive = searchTerm.trim().length > 0;

  // Today's schedule — fetched once on mount. Independent of the
  // active search/browse query; designed to surface as a hero
  // rail. The list is unique by show id (deduped at the API
  // boundary).
  const todaysQ = useApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'todayRail'],
    queryFn: async () => {
      const schedule = await getSchedule();
      const unique = new Map<number, TVMazeShow>();
      for (const entry of schedule as TVMazeScheduleItem[]) {
        if (!unique.has(entry.show.id)) {
          unique.set(entry.show.id, entry.show);
        }
      }
      return Array.from(unique.values());
    },
    staleTime: 1_800_000, // 30 min
  });

  // The active stream — search or browse, dispatched by the
  // current source + term.
  const searchQ = useApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'search', searchTerm],
    queryFn: () => searchShows(searchTerm),
    enabled: isSearchActive,
    staleTime: SEARCH_CACHE_TTL,
  });

  const browseQ = useInfiniteApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'browse', initialGenre ?? ''],
    queryFn: ({pageParam}) =>
      getPopularShows(pageParam as number, initialGenre ?? undefined),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPageParam !== 'number') return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    enabled: !isSearchActive,
    staleTime: 3_600_000,
  });

  const active = isSearchActive ? searchQ : browseQ;

  const items = useMemo(
    () => dedupe((active.data && 'pages' in active.data ? active.data.pages : [])?.flat() ?? []),
    [active.data],
  );

  const handleRefresh = useCallback(() => {
    void active.refetch();
  }, [active]);

  return {
    searchTerm,
    setSearchTerm,
    isSearchActive,
    source,
    setSource,
    items,
    hasLoaded: !!active.data,
    isLoading: active.isFetching,
    isLoadingMore: 'isFetchingNextPage' in active ? active.isFetchingNextPage : false,
    hasNextPage: 'hasNextPage' in active ? active.hasNextPage ?? false : false,
    error: 'error' in active ? active.error?.message ?? null : null,
    fetchNextPage: () => {
      if ('fetchNextPage' in active) void active.fetchNextPage();
    },
    refetch: () => {
      void active.refetch();
    },
    todaysItems: todaysQ.data ?? [],
    todaysLoading: todaysQ.isFetching,
    todaysError: todaysQ.error?.message ?? null,
    retryTodays: () => {
      void todaysQ.refetch();
    },
    isOnline,
    refreshing: active.isFetching && !!active.data,
    handleRefresh,
  };
}

function dedupe(items: TVMazeShow[]): TVMazeShow[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}
