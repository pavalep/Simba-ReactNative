// ─── Podcast Detail Screen Hook ───────────────────────────────────────
// V20.3: rewritten on `useApiQuery` + `useInfiniteApiQuery` per
// the V18 ideal. The pre-V18 implementation was 203 lines with
// 7 useStates (data triple + max + hasLoaded + isLoading +
// isLoadingMore + error), 4 useRefs (seqRef for stale-response
// cancellation, inFlightRef for in-flight dedup,
// lastLoadMoreAtRef for the 600ms scroll throttle, loadMoreRef
// as a "latest function" ref), a `Promise.all` for the parallel
// podcast+episodes fetch duplicated in both the initial effect
// AND the retry callback, and a `dedupeEpisodes` helper at
// the bottom of the file. The V18-ideal version is ~80 lines:
// 1 `useApiQuery` for the podcast metadata + 1
// `useInfiniteApiQuery` for the episodes (with `pageParam` =
// the doubling `max` window), 0 useState, 0 useRef, 0 dedupe
// helper.
//
// Junior-dev rule: 1 query for the podcast + 1 paginated
// query for the episodes. TanStack owns the cross-query
// coordination (no Promise.all, no useEffect, no
// dedupe).

import {useCallback} from 'react';
import {getPodcastById, getEpisodes} from '../../../infrastructure/api/podcastIndex/adapter';
import {useApiQuery, useInfiniteApiQuery} from '../../../hooks/useApiQuery';
import {INITIAL_MAX, MAX_RESULTS_PER_QUERY} from '../related/constants';
import text from '../related/textContent.json';
import type {PodcastResult, PodcastEpisodeResult} from '../../../types/api';

const DOUBLING = 2; // 25 → 50 → 100 → stop

interface UsePodcastDetailScreenReturn {
  podcast: PodcastResult | null;
  episodes: PodcastEpisodeResult[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasLoaded: boolean;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

export function usePodcastDetailScreen(
  podcastId: number,
): UsePodcastDetailScreenReturn {
  // ── Podcast metadata (single fetch) ──
  const podcastQ = useApiQuery<PodcastResult | null>({
    queryKey: ['podcastIndex', 'podcast', podcastId],
    queryFn: () => getPodcastById(podcastId),
    enabled: podcastId > 0,
    staleTime: 5 * 60_000, // metadata doesn't change often
  });

  // ── Episodes (paginated; doubling `max` window) ──
  const episodesQ = useInfiniteApiQuery<PodcastEpisodeResult[]>({
    queryKey: ['podcastIndex', 'episodes', podcastId],
    initialPageParam: INITIAL_MAX,
    queryFn: ({pageParam}) => getEpisodes(podcastId, pageParam as number),
    getNextPageParam: (lastPage, _pages, lastParam) => {
      if (lastPage.length === 0) return undefined;
      const currentMax = lastParam as number;
      if (currentMax >= MAX_RESULTS_PER_QUERY) return undefined;
      if (lastPage.length < currentMax) return undefined;
      return Math.min(currentMax * DOUBLING, MAX_RESULTS_PER_QUERY);
    },
    enabled: podcastId > 0,
    staleTime: 60_000,
  });

  const allPages = episodesQ.data?.pages ?? [];
  const episodes = allPages.flat();
  const hasMore = episodesQ.hasNextPage ?? false;

  const loadMore = useCallback(() => {
    if (episodesQ.hasNextPage && !episodesQ.isFetchingNextPage) {
      void episodesQ.fetchNextPage();
    }
  }, [episodesQ]);

  // Retry refetches BOTH the podcast metadata and the first
  // page of episodes. The legacy hook's `retry` callback
  // duplicated the Promise.all logic; here it's one line
  // per query.
  const retry = useCallback(() => {
    void podcastQ.refetch();
    void episodesQ.refetch();
  }, [podcastQ, episodesQ]);

  // Combine the per-query errors into a single message (the
  // first one wins; the second is shadowed). This matches
  // the legacy hook's behaviour where a Promise.all reject
  // surfaced as a single error string.
  const error =
    podcastQ.error
      ? podcastQ.error instanceof Error
        ? podcastQ.error.message
        : text.errors.loadFailed
      : episodesQ.error
      ? episodesQ.error instanceof Error
        ? episodesQ.error.message
        : text.errors.loadFailed
      : null;

  return {
    podcast: podcastQ.data ?? null,
    episodes,
    isLoading: podcastQ.isFetching || episodesQ.isFetching,
    isLoadingMore: episodesQ.isFetchingNextPage,
    error,
    hasLoaded: !!podcastQ.data || !!podcastQ.error || !!episodesQ.data || !!episodesQ.error,
    hasMore,
    loadMore,
    retry,
  };
}
