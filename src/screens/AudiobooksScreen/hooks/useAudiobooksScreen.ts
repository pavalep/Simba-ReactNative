// ─── Audiobooks Screen Hook ──────────────────────────────────────────
// Phase 3 formula: search bar above a react-native-tab-view tab bar.
//   • Search / Genres / New Releases are lazily-mounted scenes
//   • each (tab, searchTerm, genre) scope is cached independently —
//     toggling tabs never refetches or clears already-loaded data
//   • every list paginates via onEndReached (infinite scroll)
//
// V18.3.3: the per-scope cache that used to live in `scopes` (a
// Map<key, AudiobookScopeState>) is now TanStack's cache. The hook
// runs ONE useInfiniteApiQuery per tab (search / genres / recent);
// the queryKey includes the active searchTerm or selectedGenre. When
// the user switches tabs, the previously-fetched tab's data is
// served from TanStack's cache instantly (within staleTime).
//
// `ensureLoaded(tab)` is no longer needed — the queries run whenever
// their `enabled` flag is true. The screen's `AudiobookTabScene`
// renders a loading placeholder while the first page fetches and the
// cached data on re-mount.

import {useCallback, useMemo, useState} from 'react';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {
  searchAudiobooks,
  searchByGenre,
  getRecentAudiobooks,
} from '../../../services/api/librivoxAdapter';
import type {AudiobookResult} from '../../../types/api';

export type AudiobooksTab = 'search' | 'genres' | 'recent';

const PAGE_SIZE = 20;
const SEARCH_CACHE_TTL_MS = 600_000; // 10 min (matches old behavior)

function dedupe(items: AudiobookResult[]): AudiobookResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export interface AudiobookScope {
  items: AudiobookResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

function shapeQuery(
  query: ReturnType<typeof useInfiniteApiQuery<AudiobookResult[]>>,
): AudiobookScope {
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

export interface UseAudiobooksScreenResult {
  // search + selection state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string) => void;
  // the 3 scopes
  search: AudiobookScope;
  genres: AudiobookScope;
  recent: AudiobookScope;
}

export function useAudiobooksScreen(
  initialTab?: string,
  initialGenre?: string,
): UseAudiobooksScreenResult {
  const [_selectedTab] = useState<AudiobooksTab>(
    (initialTab as AudiobooksTab) || 'search',
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    initialGenre ?? null,
  );

  // Three independent infinite queries, one per tab. The queryKey
  // includes the term/genre so TanStack caches each unique scope.
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
    enabled: searchTerm.trim().length > 0,
    staleTime: SEARCH_CACHE_TTL_MS,
  });

  const genresQ = useInfiniteApiQuery<AudiobookResult[]>({
    queryKey: ['librivox', 'genres', selectedGenre ?? ''],
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
    enabled: !!selectedGenre,
    staleTime: SEARCH_CACHE_TTL_MS,
  });

  const recentQ = useInfiniteApiQuery<AudiobookResult[]>({
    queryKey: ['librivox', 'recent'],
    queryFn: ({pageParam}) =>
      getRecentAudiobooks({limit: PAGE_SIZE, page: pageParam as number}),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPageParam !== 'number') return undefined;
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPageParam + 1;
    },
    staleTime: SEARCH_CACHE_TTL_MS,
  });

  const setSelectedGenreToggle = useCallback((genre: string) => {
    setSelectedGenre(prev => (prev === genre ? null : genre));
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    isSearchActive: searchTerm.trim().length > 0,
    selectedGenre,
    setSelectedGenre: setSelectedGenreToggle,
    search: shapeQuery(searchQ),
    genres: shapeQuery(genresQ),
    recent: shapeQuery(recentQ),
  };
}
