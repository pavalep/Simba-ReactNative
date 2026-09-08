// ─── Shows Screen Hook ──────────────────────────────────────────────────
// Phase 3 formula: per-scope cache + TabView scenes + infinite scroll.
//
// A "scope" is a (tab, searchTerm, selectedGenre) tuple. Previously
// cached in a Map<key, ShowScopeState>. V18.3.3: three independent
// useInfiniteApiQuery calls (one per tab); TanStack's cache provides
// the per-scope data preservation when the user toggles tabs.
//
// Tab semantics:
//   - 'search'  → searchShows(term), single page, enabled when term is set
//   - 'today'   → getSchedule() with dedupe-by-show, single page
//   - 'browse'  → getPopularShows(page, genre?), multi-page (TVMaze
//                  returns 250 per page; infinite until partial)
//
// P53: when `initialGenre` is set, the screen jumps to 'browse' with
// the genre pre-selected so the show list is populated on first paint.

import {useCallback, useMemo, useState} from 'react';
import {
  searchShows,
  getSchedule,
  getPopularShows,
} from '../../../services/api/tvmazeAdapter';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import type {TVMazeShow} from '../../../types/api';
import type {TVMazeScheduleItem} from '../../../services/api/tvmazeAdapter';

const PAGE_SIZE = 250;

export type ShowTab = 'search' | 'today' | 'browse';

function dedupe(items: TVMazeShow[]): TVMazeShow[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export interface ShowScope {
  items: TVMazeShow[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

function shapePaginated(
  query: ReturnType<typeof useInfiniteApiQuery<TVMazeShow[]>>,
): ShowScope {
  return {
    items: dedupe((query.data?.pages ?? []).flat()),
    hasLoaded: !!query.data,
    isLoading: query.isFetching,
    isLoadingMore: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    error: query.error?.message ?? null,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface UseShowsScreenResult {
  // tab + selection state
  selectedTab: ShowTab;
  selectTab: (tab: ShowTab) => void;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string) => void;
  // search state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  // the 3 scopes
  search: ShowScope;
  today: ShowScope;
  browse: ShowScope;
  // network status (for pull-to-refresh retry-on-reconnect)
  isOnline: boolean;
  // action
  handleRefresh: () => void;
  refreshing: boolean;
}

export function useShowsScreen(initialTab?: string, initialGenre?: string): UseShowsScreenResult {
  const {isOnline} = useNetworkStatus();
  const [selectedTab, setSelectedTab] = useState<ShowTab>(
    initialGenre ? 'browse' : (initialTab as ShowTab) || 'search',
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    initialGenre ?? null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isSearchActive = searchTerm.trim().length > 0;

  // ── Search tab: single page, enabled when term is set ──
  const searchQ = useApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'search', searchTerm],
    queryFn: () => searchShows(searchTerm),
    enabled: isSearchActive,
    staleTime: 600_000, // 10 min
  });
  const searchScope: ShowScope = useMemo(
    () => ({
      items: searchQ.data ?? [],
      hasLoaded: !isSearchActive || !!searchQ.data,
      isLoading: searchQ.isFetching,
      isLoadingMore: false,
      hasNextPage: false,
      error: searchQ.error?.message ?? null,
      fetchNextPage: () => {},
      refetch: () => {
        void searchQ.refetch();
      },
    }),
    [searchQ, isSearchActive],
  );

  // ── Today tab: single page, always refetch on mount (short server cache) ──
  const todayQ = useApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'today'],
    queryFn: async () => {
      const schedule = await getSchedule();
      // Dedupe by show id — one card per show airing today
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
  const todayScope: ShowScope = useMemo(
    () => ({
      items: todayQ.data ?? [],
      hasLoaded: !!todayQ.data,
      isLoading: todayQ.isFetching,
      isLoadingMore: false,
      hasNextPage: false,
      error: todayQ.error?.message ?? null,
      fetchNextPage: () => {},
      refetch: () => {
        void todayQ.refetch();
      },
    }),
    [todayQ],
  );

  // ── Browse tab: multi-page (TVMaze 250 per page) ──
  const browseQ = useInfiniteApiQuery<TVMazeShow[]>({
    queryKey: ['tvmaze', 'browse', selectedGenre ?? ''],
    queryFn: ({pageParam}) =>
      getPopularShows(pageParam as number, selectedGenre ?? undefined),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPageParam !== 'number') return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    staleTime: 3_600_000, // 1 hour
  });
  const browseScope: ShowScope = shapePaginated(browseQ);

  // Tab switch
  const selectTab = useCallback((tab: ShowTab) => {
    setSelectedTab(tab);
  }, []);

  const setSelectedGenreToggle = useCallback((genre: string) => {
    setSelectedGenre(prev => (prev === genre ? null : genre));
  }, []);

  // Pull-to-refresh: re-fetch the active tab's data
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedTab === 'search') {
      void searchQ.refetch();
    } else if (selectedTab === 'today') {
      void todayQ.refetch();
    } else {
      void browseQ.refetch();
    }
    setRefreshing(false);
  }, [selectedTab, searchQ, todayQ, browseQ]);

  return {
    selectedTab,
    selectTab,
    selectedGenre,
    setSelectedGenre: setSelectedGenreToggle,
    searchTerm,
    setSearchTerm,
    isSearchActive,
    search: searchScope,
    today: todayScope,
    browse: browseScope,
    isOnline,
    handleRefresh,
    refreshing,
  };
}
