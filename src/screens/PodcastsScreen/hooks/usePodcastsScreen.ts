// ─── Podcasts Screen Hook (KISS) ──────────────────────────────────────
// Single current-list state — NO per-scope cache. Every category/term
// change (and pull-to-refresh) wipes the current items and fetches
// fresh from the API. The active filter (category / search term) is
// preserved across refresh — only the list resets.
//
// Podcast Index exposes no sort parameter and we don't client-side sort
// either — items render in API-returned order, and loadMore appends in
// order.
//
// Podcast Index paginates by doubling a `max` window (no true offset):
//   • loadMore doubles (25 → 50 → 100) when the API returned a full page
//   • 600ms throttle + in-flight guard prevent endReached spam
//
// Single-select category: the shell sends one id at a time
// ('all' → the unfiltered trending stream; otherwise → the official
// `/podcasts/trending?cat={id}` filter). A search term always wins over
// the category stream and uses `/search/byterm`.

import {useCallback, useRef, useState} from 'react';
import {
  searchPodcasts,
  getTrendingPodcasts,
} from '../../../services/api/podcastIndexService';
import {INITIAL_MAX, MAX_RESULTS_PER_QUERY} from '../related/constants';
import text from '../related/textContent.json';
import type {PodcastResult} from '../../../types/api';

/** Drop duplicates a paginated response can re-emit (same id seen). */
function dedupe(items: PodcastResult[]): PodcastResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export interface UsePodcastsScreenReturn {
  // search
  searchTerm: string;
  setSearchTerm: (t: string) => void;
  isSearchActive: boolean;
  // current list state (no per-scope cache)
  items: PodcastResult[];
  maxRequested: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  // actions
  /** Wipe and fetch the first window — used on category/search change,
   *  on retry, AND on pull-to-refresh (same call: clear → loading →
   *  fresh data). Resets pagination back to INITIAL_MAX. */
  load: (categoryId: string) => void;
  /** Append the next page — called from onEndReached. */
  loadMore: (categoryId: string) => void;
  /** Re-fetch the first window (alias for `load`). */
  retry: (categoryId: string) => void;
}

export function usePodcastsScreen(): UsePodcastsScreenReturn {
  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  const [searchTerm, setSearchTerm] = useState('');

  // ── Single current-list state — no Record<key, scope> cache ──
  const [items, setItems] = useState<PodcastResult[]>([]);
  const [maxRequested, setMaxRequested] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSearchActive = searchTerm.trim().length > 0;

  // Monotonic seq — drops stale responses when the consumer races the
  // API with a fast filter/search change. Not a cache: just staleness
  // protection.
  const seqRef = useRef(0);
  // One in-flight fetch at a time.
  const inFlightRef = useRef(false);
  // 600ms throttle on loadMore so onEndReached can't pound the API.
  const lastLoadMoreAtRef = useRef(0);

  const fetchPage = useCallback(
    async (categoryId: string, max: number, mode: 'initial' | 'more') => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const seq = ++seqRef.current;

      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const term = searchTerm.trim();
        // A typed search term wins; otherwise use the category-aware
        // trending endpoint with the selected Podcast Index category ID.
        const result = term
          ? await searchPodcasts(term, max)
          : await getTrendingPodcasts(max, categoryId);

        if (seq !== seqRef.current) return; // stale response

        if (mode === 'more') {
          setItems(prev => dedupe([...prev, ...result]));
        } else {
          setItems(result);
        }
        setMaxRequested(max);
        setHasLoaded(true);
      } catch (err) {
        if (seq !== seqRef.current) return;
        setError(
          err instanceof Error ? err.message : text.errors.hookLoadFailed,
        );
        setHasLoaded(true);
      } finally {
        if (seq === seqRef.current) {
          inFlightRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [searchTerm],
  );

  const load = useCallback(
    (categoryId: string) => {
      // Wipe + invalidate any in-flight so a stale response can't land
      // after a fresh category/search change. No cache to invalidate —
      // this IS the cache invalidation.
      seqRef.current++;
      inFlightRef.current = false;
      setItems([]);
      setMaxRequested(0);
      setError(null);
      setHasLoaded(false);
      setIsLoading(false);
      setIsLoadingMore(false);
      fetchPage(categoryId, INITIAL_MAX, 'initial');
    },
    [fetchPage],
  );

  const loadMore = useCallback(
    (categoryId: string) => {
      const max = maxRequested || INITIAL_MAX;
      if (isLoading || isLoadingMore) return;
      // Only paginate when the previous window was full — a short page
      // means there's nothing left at this window size.
      if (items.length < max) return;
      if (max >= MAX_RESULTS_PER_QUERY) return;

      const now = Date.now();
      if (now - lastLoadMoreAtRef.current < 600) return;
      lastLoadMoreAtRef.current = now;

      fetchPage(categoryId, max * 2, 'more');
    },
    [fetchPage, items.length, maxRequested, isLoading, isLoadingMore],
  );

  const retry = useCallback(
    (categoryId: string) => {
      load(categoryId);
    },
    [load],
  );

  return {
    searchTerm,
    setSearchTerm,
    isSearchActive,
    items,
    maxRequested,
    hasLoaded,
    isLoading,
    isLoadingMore,
    error,
    load,
    loadMore,
    retry,
  };
}