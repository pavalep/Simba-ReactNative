// ─── Podcasts Screen Hook ──────────────────────────────────────────────
// V20.2: rewritten on `useInfiniteApiQuery` per the V18 ideal. The
// pre-V18 implementation was 189 lines with 7 useStates (the
// data triple + max + hasLoaded + isLoading + isLoadingMore +
// error), 3 useRefs (seqRef for stale-response cancellation,
// inFlightRef for in-flight dedup, lastLoadMoreAtRef for the
// 600ms scroll throttle), a 3-mode `fetchPage` (initial / more
// / retry), and a `dedupe` helper at the bottom of the file
// to dedup the per-page response. The V18-ideal version is
// ~100 lines: 1 useState (searchTerm), 1 useInfiniteApiQuery
// (with `pageParam` = the doubling `max` window), 0 useRefs,
// 0 dedupe helper.
//
// Podcast Index paginates by doubling a `max` window (no true
// offset): 25 → 50 → 100, then stop. The `getNextPageParam`
// reflects that:
//   - short page           → undefined (no more results)
//   - max at the API cap   → undefined
//   - otherwise             → min(max × 2, API cap)
//
// Per the V18.6.2 ideal, the active categoryId and searchTerm
// are part of the TanStack queryKey — every (categoryId,
// searchTerm) combination is its own cache entry. Revisiting
// a combination shows its cached list instantly; the "wipe +
// refetch on category change" pattern is now a no-op (the
// queryKey changes, TanStack refetches automatically).
//
// Junior-dev rule: 1 useState (for the controlled input
// echo) + 1 useInfiniteApiQuery (for the data). The pagination,
// dedup, stale-response cancellation, in-flight guard, and
// scroll throttle are all gone — TanStack owns them.

import {useCallback, useState} from 'react';
import {
  searchPodcasts,
  getTrendingPodcasts,
} from '../../../services/api/podcastIndexAdapter';
import {INITIAL_MAX, MAX_RESULTS_PER_QUERY} from '../related/constants';
import text from '../related/textContent.json';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import type {PodcastResult} from '../../../types/api';

const DOUBLING = 2; // 25 → 50 → 100 → stop

export interface UsePodcastsScreenReturn {
  // search
  searchTerm: string;
  setSearchTerm: (t: string) => void;
  isSearchActive: boolean;
  // active scope (set by the screen)
  activeCategoryId: string;
  setActiveCategoryId: (id: string) => void;
  // current list state
  items: PodcastResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  // actions
  loadMore: () => void;
  retry: () => void;
}

export function usePodcastsScreen(
  initialCategoryId: string = 'all',
): UsePodcastsScreenReturn {
  // ── Controlled-input echo (the search term is debounced upstream
  //    via the SearchBar's onDebouncedChange) ──
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;
  // Active category lives in the hook so the queryKey can
  // include it. The screen pushes changes via the setter.
  const [activeCategoryId, setActiveCategoryId] = useState(initialCategoryId);

  // ── The big one: server-paginated podcasts per
  //    (categoryId, searchTerm) tuple. The pageParam is
  //    the doubling `max` window. ──
  const q = useInfiniteApiQuery<PodcastResult[]>({
    queryKey: [
      'podcastIndex',
      'list',
      activeCategoryId,
      searchTerm.trim(),
    ],
    initialPageParam: INITIAL_MAX,
    queryFn: ({pageParam}) => {
      const max = pageParam as number;
      const term = searchTerm.trim();
      if (term) return searchPodcasts(term, max);
      return getTrendingPodcasts(max, activeCategoryId);
    },
    getNextPageParam: (lastPage, _pages, lastParam) => {
      // Short page = API returned fewer than `max` items = end of stream.
      if (lastPage.length === 0) return undefined;
      const currentMax = lastParam as number;
      if (currentMax >= MAX_RESULTS_PER_QUERY) return undefined;
      // The Podcast Index returns `max` items when more results
      // are available, fewer when the result set is exhausted.
      // If the last page was short, stop.
      if (lastPage.length < currentMax) return undefined;
      // Otherwise double the window, capped at the API limit.
      return Math.min(currentMax * DOUBLING, MAX_RESULTS_PER_QUERY);
    },
    staleTime: 60_000,
  });

  const allPages = q.data?.pages ?? [];
  const items = allPages.flat();
  const hasMore = q.hasNextPage ?? false;

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) {
      void q.fetchNextPage();
    }
  }, [q]);

  const retry = useCallback(() => {
    void q.refetch();
  }, [q]);

  // Convert TanStack's typed error into a human-readable string
  // (matches the legacy hook's behaviour — set a string
  // instead of an Error object so the consumer doesn't have
  // to handle a union).
  const errorMessage =
    q.error instanceof Error ? q.error.message : q.error
      ? text.errors.hookLoadFailed
      : null;

  return {
    searchTerm,
    setSearchTerm,
    isSearchActive,
    activeCategoryId,
    setActiveCategoryId,
    items,
    hasLoaded: !!q.data || !!q.error,
    isLoading: q.isFetching,
    isLoadingMore: q.isFetchingNextPage,
    hasMore,
    error: errorMessage,
    loadMore,
    retry,
  };
}
