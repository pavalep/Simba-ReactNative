// ─── Music Screen Hook ─────────────────────────────────────────────────
// v10.1 FAB-only formula: per-scope cache + infinite scroll + search
// persistence. No tabs — the FAB's FILTER group is the genre picker.
//
// A "scope" is a (genre, searchTerm) pair. Previously cached manually
// in a Map<key, MusicScopeState>. V18.3.3: TanStack's cache IS the
// per-scope cache (each unique queryKey is cached for staleTime ms).
// The hook tracks ONE active scope at a time; switching genres /
// search terms re-points the queryKey, and TanStack serves cached
// data instantly if the user has visited that scope before.
//
// Fetch branches (single stream, filter-aware):
//   • search term → global Jamendo search
//   • genre ('' = none = "All") → genre browse / global popular
// Pagination via Jamendo's {limit, page} for ALL branches — the "All"
// stream paginates through `getPopularJamendoTracks(limit, page)`.

import {useCallback, useMemo, useState} from 'react';
import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
} from '../../../infrastructure/api/jamendo/adapter';
import type {JamendoTrackResult} from '../../../types/api';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';

export const JAMENDO_GENRES = [
  'rock',
  'pop',
  'jazz',
  'classical',
  'electronic',
  'hiphop',
  'metal',
  'blues',
  'country',
  'folk',
  'reggae',
  'latin',
] as const;

const PAGE_SIZE = 20;

function dedupe(items: JamendoTrackResult[]): JamendoTrackResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

async function fetchPage(
  term: string,
  genre: string,
  page: number,
): Promise<JamendoTrackResult[]> {
  if (term) {
    return searchJamendoTracks(term, {limit: PAGE_SIZE, page});
  }
  if (genre) {
    return getJamendoTracksByGenre(genre, {limit: PAGE_SIZE, page});
  }
  return getPopularJamendoTracks(PAGE_SIZE, page);
}

export interface UseMusicScreenResult {
  /** Current active genre (FAB filter); '' = "All". */
  activeGenre: string;
  setActiveGenre: (genre: string) => void;
  /** Debounced search term; persists across filter switches. */
  setSearchTerm: (term: string) => void;
  isSearchActive: boolean;
  items: JamendoTrackResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

export function useMusicScreen(): UseMusicScreenResult {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState('');

  const queryKey = useMemo(
    () => ['jamendo', 'music', activeGenre, searchTerm] as const,
    [activeGenre, searchTerm],
  );

  const query = useInfiniteApiQuery<JamendoTrackResult[]>({
    queryKey,
    queryFn: ({pageParam}) => fetchPage(searchTerm, activeGenre, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (_lastPage, _pages, lastPageParam) => {
      // End of stream: a 'more' fetch that produced fewer than PAGE_SIZE
      // rows is the last page. Without this guard, the partial-page
      // heuristic would never trip when the API consistently returns 0
      // rows past page 1, and loadMore would loop forever.
      if (typeof lastPageParam !== 'number') return undefined;
      return lastPageParam + 1;
    },
    staleTime: 60_000,
  });

  // Flatten all loaded pages + dedupe by id (Jamendo's offset pagination
  // can return the same row on adjacent pages).
  const items = useMemo(
    () => dedupe((query.data?.pages ?? []).flat()),
    [query.data],
  );

  return {
    activeGenre,
    setActiveGenre,
    setSearchTerm,
    isSearchActive: searchTerm.trim().length > 0,
    items,
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
