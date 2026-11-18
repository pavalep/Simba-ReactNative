// ─── Radio — the browse query ────────────────────────────────────────
//
// The radio-browser adapter's station list for ONE scope.
//
// The scope is the (genre, country, language, search term) tuple. Every
// tuple is its own TanStack cache entry, and revisiting a tuple shows
// its cached list instantly.
//
// THE SCOPE IS ONE REQUEST — MEASURED
// ---------------------------------
// The radio-browser ENDPOINT takes a term and the filter axes in ONE
// request: `?name=jazz&tag=rock` answers both, and the answer is
// neither the name-only set nor the tag-only set (measured 2026-11-18
// against `de1.api.radio-browser.info`). The adapter exposes that
// request as `searchStationsWithFilters`.
//
// The screen used to enforce "one thing at a time" instead: the
// adapter had no combined request, so the shell's
// `autoClearFilterOnSearch` / `autoClearSearchOnFilter` rules made the
// last choice win and the other axis disappear. The rules are OFF now,
// because the source CAN answer both — a filter that is silently
// dropped is the exact defect those rules existed to prevent.

import {useMemo} from 'react';
import {
  searchStationsWithFilters,
  getTopStations,
  RADIO_BROWSER_RETRIES,
  type RadioFilterSet,
} from '../../../infrastructure/api/radioBrowser/adapter';
import {useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import type {RadioStationResult} from '../../../types/api';

/** The station list's page size. */
const PAGE_SIZE = 30;

/**
 * The active scope — the three filter axes and the search term.
 *
 * An empty axis means "no filter on this axis".
 */
export interface RadioScope {
  genre: string;
  country: string;
  language: string;
  searchTerm: string;
}

export const EMPTY_RADIO_SCOPE: RadioScope = {
  genre: '',
  country: '',
  language: '',
  searchTerm: '',
};

export interface RadioBrowseState {
  items: RadioStationResult[];
  /**
   * "The query settled WITH DATA".
   *
   * It used to mean "the query settled" (`!!data || !!error`), which is
   * TRUE when the FIRST page failed — and every failure branch on the
   * screen tested `!hasLoaded`, so a page-1 failure fell through every
   * branch and rendered a BLANK LIST: no message, no spinner, no
   * button.
   */
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  /** The source's own `hasNextPage` — not a re-derived guess. */
  hasMore: boolean;
  /** The FIRST page's failure — the error card's business. */
  error: string | null;
  /**
   * The failed NEXT PAGE's error — the footer's copy.
   *
   * ONE FAILURE, ONE MESSAGE: the list's error and the footer's error
   * are different failures, and the footer used to announce the first
   * one too ("Couldn't load MORE" for a load-more that never started).
   */
  pageError: string | null;
  loadMore: () => void;
  retry: () => void;
  /**
   * True while a user-started pull-to-refresh is running.
   *
   * NOT `isFetching`: that flag is also true while the next PAGE loads
   * and during a background refetch, so the refresh spinner used to
   * appear at the top of the list for a fetch the user never asked for.
   * See `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
}

export function useRadioBrowser(scope: RadioScope): RadioBrowseState {
  const queryKey = useMemo(
    () =>
      [
        'radioBrowser',
        'browse',
        scope.genre,
        scope.country,
        scope.language,
        scope.searchTerm.trim(),
      ] as const,
    [scope.genre, scope.country, scope.language, scope.searchTerm],
  );

  const query = useInfiniteApiQuery<RadioStationResult[]>({
    queryKey,
    queryFn: ({pageParam, signal}) => {
      const page = pageParam as number;
      const term = scope.searchTerm.trim();
      const filters: RadioFilterSet = {};
      if (scope.genre) filters.genre = scope.genre;
      if (scope.country) filters.country = scope.country;
      if (scope.language) filters.language = scope.language;
      // A term AND the filters travel in ONE request. An empty term is
      // safe to send — the endpoint answers `name=` exactly like no
      // name at all (measured) — so the filter-only path is the same
      // call.
      if (term || Object.keys(filters).length > 0) {
        return searchStationsWithFilters(
          term,
          filters,
          {limit: PAGE_SIZE, page},
          signal,
        );
      }
      return getTopStations({limit: PAGE_SIZE, page}, signal);
    },
    initialPageParam: 1,
    // A page that came back SHORT is the last page — the source has
    // nothing more to give.
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : (lastPageParam as number) + 1,
    staleTime: 60_000,
    retry: RADIO_BROWSER_RETRIES,
  });

  const items = useMemo(() => (query.data?.pages ?? []).flat(), [query.data]);

  // The GESTURE owns the spinner, not the query — see
  // `src/screens/_shared/pullToRefresh.ts`.
  const {refreshing, refresh} = usePullToRefresh(query.refetch);

  return {
    items,
    hasLoaded: !!query.data,
    isLoading: query.isFetching,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    error: query.error?.message ?? null,
    pageError: query.isFetchNextPageError ? (query.error?.message ?? null) : null,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
    retry: () => {
      void query.refetch();
    },
    refreshing,
    refresh,
  };
}
