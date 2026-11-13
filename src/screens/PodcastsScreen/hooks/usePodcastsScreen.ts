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
// (with `pageParam` = the doubling `max` window), 0 useRefs.
//
// Podcast Index paginates by doubling a `max` window (no true
// offset): 25 → 50 → 100, then stop. The `getNextPageParam`
// reflects that:
//   - short page           → undefined (no more results)
//   - max at the API cap   → undefined
//   - otherwise             → min(max × 2, API cap)
//
// The de-dupe is NOT TanStack's job — TanStack de-dupes REQUESTS,
// not rows. Because the pages nest (`max=50` re-sends the first 25
// rows of `max=25`), the flattened list has to drop the repeats
// itself, or every podcast is rendered three times under a duplicate
// React key. The shared contract lives in
// `infrastructure/api/podcastIndex/pagination.ts`, so this screen
// and the detail screen cannot drift apart.
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
// stale-response cancellation, in-flight guard, and scroll
// throttle are all gone — TanStack owns them.

import {useCallback, useState} from 'react';
import {
  searchPodcasts,
  getTrendingPodcasts,
} from '../../../infrastructure/api/podcastIndex/adapter';
import {
  flattenUniqueById,
  nextPageMax,
} from '../../../infrastructure/api/podcastIndex/pagination';
import {INITIAL_MAX, MAX_RESULTS_PER_QUERY} from '../related/constants';
import text from '../related/textContent.json';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import type {PodcastResult} from '../../../types/api';

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
  /**
   * The error from a failed NEXT PAGE — the load-more that did not
   * make it. `error` covers the FIRST page (the error card), so the
   * footer reports this one and the two never say the same failure
   * twice.
   */
  pageError: string | null;
  // actions
  loadMore: () => void;
  retry: () => void;
  /**
   * True while a user-started pull-to-refresh is running.
   *
   * NOT `isFetching`: that flag is also true while the next PAGE is
   * loading, and the refresh spinner then appeared at the top of the
   * list for a fetch the user never asked for. See
   * `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
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
    getNextPageParam: (lastPage, _pages, lastParam) =>
      nextPageMax(lastParam as number, lastPage.length, MAX_RESULTS_PER_QUERY),
    staleTime: 60_000,
  });

  // The pages NEST: `max=50` re-sends the first 25 rows of `max=25`.
  // Flattening them raw rendered every podcast three times under
  // duplicate React keys, so the pages are de-duplicated by id here.
  const allPages = q.data?.pages ?? [];
  const items = flattenUniqueById(allPages);
  const hasMore = q.hasNextPage ?? false;

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) {
      void q.fetchNextPage();
    }
  }, [q]);

  const retry = useCallback(() => {
    void q.refetch();
  }, [q]);

  // The pull-to-refresh gesture owns the spinner. The query's own
  // `isFetching` cannot: it is true while the next PAGE loads, and the
  // spinner then showed up at the top of the list mid-scroll.
  const {refreshing, refresh} = usePullToRefresh(q.refetch);

  // Convert TanStack's typed error into a human-readable string
  // (matches the legacy hook's behaviour — set a string
  // instead of an Error object so the consumer doesn't have
  // to handle a union).
  const errorMessage =
    q.error instanceof Error ? q.error.message : q.error
      ? text.errors.hookLoadFailed
      : null;

  // ONE FAILURE, ONE MESSAGE. `error` is the FIRST page's failure and
  // the error card owns it; the footer's copy is only for a failed
  // load-more.
  const pageError = q.isFetchNextPageError ? errorMessage : null;

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
    pageError,
    loadMore,
    retry,
    refreshing,
    refresh,
  };
}
