// ─── Audiobooks Screen Hook ──────────────────────────────────────────
// V18.11.3: converted from the v3-v9 3-tab pattern
// (search / genres / recent) to the v10+ "single content stream +
// FAB" pattern. The "Recent" tab was dropped — its feed overlaps
// with the global "Recently Added" rail on Home. The screen
// now has one async stream (search OR genre) + a single FilterChips
// row that toggles between free-text search and a genre filter.

import {useCallback, useMemo, useState} from 'react';
import {useApiQuery, useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {
  searchAudiobooks,
  searchByGenre,
} from '../../../infrastructure/api/librivox/adapter';
import type {AudiobookResult} from '../../../types/api';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';

const PAGE_SIZE = 20;
const SEARCH_CACHE_TTL = 600_000; // 10 min

export interface UseAudiobooksScreenResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string) => void;
  items: AudiobookResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
  isOnline: boolean;
  refreshing: boolean;
  handleRefresh: () => void;
}

export function useAudiobooksScreen(
  initialGenre?: string,
): UseAudiobooksScreenResult {
  const {isOnline} = useNetworkStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    initialGenre ?? null,
  );

  const isSearchActive = searchTerm.trim().length > 0;

  // Two parallel infinite queries — one for "by term", one for
  // "by genre". Whichever is active is exposed; TanStack's cache
  // preserves each across term/genre switches.
  const searchQ = useInfiniteApiQuery<AudiobookResult[]>({
    queryKey: ['librivox', 'search', searchTerm],
    queryFn: ({pageParam}) =>
      searchAudiobooks(searchTerm, {limit: PAGE_SIZE, page: pageParam as number}),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPageParam !== 'number') return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    enabled: isSearchActive,
    staleTime: SEARCH_CACHE_TTL,
  });

  const genreQ = useInfiniteApiQuery<AudiobookResult[]>({
    queryKey: ['librivox', 'genre', selectedGenre ?? ''],
    queryFn: ({pageParam}) =>
      selectedGenre
        ? searchByGenre(selectedGenre, {limit: PAGE_SIZE, page: pageParam as number})
        : Promise.resolve([]),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPageParam !== 'number') return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    enabled: !!selectedGenre && !isSearchActive,
    staleTime: SEARCH_CACHE_TTL,
  });

  // Term takes priority over genre (matches the pre-V18 behavior).
  const active = isSearchActive ? searchQ : genreQ;

  const items = useMemo(
    () => dedupe((active.data?.pages ?? []).flat()),
    [active.data],
  );

  const handleRefresh = useCallback(() => {
    void active.refetch();
  }, [active]);

  return {
    searchTerm,
    setSearchTerm,
    isSearchActive,
    selectedGenre,
    setSelectedGenre,
    items,
    hasLoaded: !!active.data,
    isLoading: active.isFetching,
    isLoadingMore: active.isFetchingNextPage,
    hasNextPage: active.hasNextPage ?? false,
    error: active.error?.message ?? null,
    fetchNextPage: () => {
      void active.fetchNextPage();
    },
    refetch: () => {
      void active.refetch();
    },
    isOnline,
    refreshing: active.isFetching && !!active.data,
    handleRefresh,
  };
}

function dedupe(items: AudiobookResult[]): AudiobookResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}
