// ─── Podcasts Screen Hook ──────────────────────────────────────────────
// Manages category selection & search, fetches results from Podcast Index,
// and returns loading/error/data state.
//
// 54.2/54.3/54.4: offline-aware (auto-retry on reconnect), retry(),
// pull-to-refresh and onEndReached pagination (grows the `max` request
// parameter and dedupes by feed id).

import {useState, useEffect, useCallback, useRef} from 'react';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import {searchPodcasts} from '../../../services/api/podcastIndexService';
import {useDebounce} from '../../../hooks/useDebounce';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {PodcastResult} from '../../../types/api';

interface ResultsMap {
  [key: string]: PodcastResult[];
}

/** Ceiling for paginated results per query (API has no true offset). */
const MAX_RESULTS_PER_QUERY = 100;

export function usePodcastsScreen(initialCategoryId?: number) {
  const {isOnline} = useNetworkStatus();

  const [selectedCategory, setSelectedCategory] = useState<number>(
    initialCategoryId ?? PODCAST_CATEGORIES[0]?.id ?? 0,
  );
  const [results, setResults] = useState<ResultsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef<Set<string>>(new Set());
  /** Key of the most recently failed fetch — retried on reconnect. */
  const failedKeyRef = useRef<string | null>(null);
  /** Per-key max results requested so far (pagination). */
  const maxByKeyRef = useRef<Record<string, number>>({});

  const currentKey = searchQuery.trim()
    ? `search_${searchQuery.trim().toLowerCase()}`
    : `cat_${selectedCategory}`;

  const fetchByTerm = useCallback(
    async (term: string, key: string) => {
      if (fetchingRef.current.has(key)) return;

      fetchingRef.current.add(key);
      setIsLoading(true);
      setError(null);

      const max = maxByKeyRef.current[key] ?? 25;

      try {
        const items = await searchPodcasts(term, max);
        // Dedupe by feed id (pagination re-fetches a growing window).
        setResults(prev => {
          const merged = [...(prev[key] ?? []), ...items];
          const seen = new Set<number>();
          const deduped = merged.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
          return {...prev, [key]: deduped};
        });
        failedKeyRef.current = null;
      } catch (err) {
        failedKeyRef.current = key;
        setError(
          err instanceof Error ? err.message : 'Failed to load podcasts',
        );
      } finally {
        fetchingRef.current.delete(key);
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Fetch when category or debounced search changes
  useEffect(() => {
    const activeSearch = debouncedSearch.trim();
    if (activeSearch) {
      const key = `search_${activeSearch.toLowerCase()}`;
      fetchByTerm(activeSearch, key);
    } else if (selectedCategory) {
      const category = PODCAST_CATEGORIES.find(c => c.id === selectedCategory);
      if (category) {
        const key = `cat_${category.id}`;
        fetchByTerm(category.name, key);
      }
    }
  }, [debouncedSearch, selectedCategory, fetchByTerm]);

  // 54.2: auto-retry the failed query when connectivity returns
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedKeyRef.current) {
      const key = failedKeyRef.current;
      const term = key.startsWith('search_')
        ? key.slice('search_'.length)
        : PODCAST_CATEGORIES.find(c => `cat_${c.id}` === key)?.name;
      if (term) {
        failedKeyRef.current = null;
        fetchByTerm(term, key);
      }
    }
  }, [isOnline, fetchByTerm]);

  // 54.3: pull-to-refresh — clear the current key and re-fetch
  const retry = useCallback(() => {
    const term = searchQuery.trim() || currentKey.startsWith('cat_')
      ? PODCAST_CATEGORIES.find(c => `cat_${c.id}` === currentKey)?.name ??
        searchQuery.trim()
      : searchQuery.trim();
    if (!term) return;
    setResults(prev => {
      const next = {...prev};
      delete next[currentKey];
      return next;
    });
    fetchByTerm(term, currentKey);
  }, [currentKey, searchQuery, fetchByTerm]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
  }, [retry]);

  // 54.4: onEndReached — request a larger window for the current query
  const loadMore = useCallback(() => {
    const current = results[currentKey] ?? [];
    const max = maxByKeyRef.current[currentKey] ?? 25;
    if (
      fetchingRef.current.has(currentKey) ||
      current.length < max ||
      max >= MAX_RESULTS_PER_QUERY
    ) {
      return;
    }
    maxByKeyRef.current = {...maxByKeyRef.current, [currentKey]: max * 2};
    const term = searchQuery.trim();
    if (term) {
      fetchByTerm(term, currentKey);
    } else {
      const category = PODCAST_CATEGORIES.find(c => c.id === selectedCategory);
      if (category) fetchByTerm(category.name, currentKey);
    }
  }, [currentKey, results, searchQuery, selectedCategory, fetchByTerm]);

  return {
    selectedCategory,
    setSelectedCategory,
    results,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    /** 54.2: true while offline — screens can tailor messaging */
    isOnline,
    /** 54.3: pull-to-refresh current query */
    refreshing,
    handleRefresh,
    /** 54.7: retry the failed / current query */
    retry,
    /** 54.4: fetch a larger window for the current query */
    loadMore,
    /** 54.4: whether more results can be requested */
    hasMore:
      (results[currentKey] ?? []).length >=
        (maxByKeyRef.current[currentKey] ?? 25) &&
      (maxByKeyRef.current[currentKey] ?? 25) < MAX_RESULTS_PER_QUERY,
  };
}
