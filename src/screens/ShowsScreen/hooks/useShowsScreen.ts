// ─── TV Shows Screen Hook ──────────────────────────────────────────────
// Phase 38.1/38.3: browse TVMaze by search / today's schedule / popular
// pages. Debounced search, auto-retry on reconnect, load-more browse.

import {useState, useEffect, useCallback, useRef} from 'react';
import {
  searchShows,
  getSchedule,
  getPopularShows,
} from '../../../services/api/tvmazeService';
import {useDebounce} from '../../../hooks/useDebounce';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {TVMazeShow} from '../../../types/api';

export type ShowsMode = 'search' | 'today' | 'browse';

export function useShowsScreen(initialTab?: string) {
  const {isOnline} = useNetworkStatus();

  const [mode, setMode] = useState<ShowsMode>(
    (initialTab as ShowsMode) || 'search',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TVMazeShow[]>([]);
  const [todayShows, setTodayShows] = useState<TVMazeShow[]>([]);
  const [browseShows, setBrowseShows] = useState<TVMazeShow[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const fetchingRef = useRef(false);
  const failedRef = useRef(false);

  const effectiveQuery = debouncedSearch.trim();

  // ── Per-mode loaders ──
  const loadSearch = useCallback(async () => {
    if (!effectiveQuery) {
      setSearchResults([]);
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const items = await searchShows(effectiveQuery);
      setSearchResults(items);
      failedRef.current = false;
    } catch (err) {
      failedRef.current = true;
      setError(err instanceof Error ? err.message : 'Failed to search shows');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [effectiveQuery]);

  const loadToday = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const schedule = await getSchedule();
      // Deduplicate by show id — one card per show airing today
      const unique = new Map<number, TVMazeShow>();
      for (const entry of schedule) {
        if (!unique.has(entry.show.id)) {
          unique.set(entry.show.id, entry.show);
        }
      }
      setTodayShows(Array.from(unique.values()));
      failedRef.current = false;
    } catch (err) {
      failedRef.current = true;
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadBrowse = useCallback(
    async (nextPage: number, append: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const items = await getPopularShows(nextPage);
        setBrowseShows(prev => (append ? [...prev, ...items] : items));
        setPage(nextPage);
        failedRef.current = false;
      } catch (err) {
        failedRef.current = true;
        setError(
          err instanceof Error ? err.message : 'Failed to load shows',
        );
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // Run the active mode's loader when mode/query changes
  useEffect(() => {
    if (mode === 'search') {
      loadSearch();
    } else if (mode === 'today') {
      loadToday();
    } else {
      loadBrowse(0, false);
    }
  }, [mode, loadSearch, loadToday, loadBrowse]);

  // ── Auto-retry the failed query when connectivity returns ──
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedRef.current) {
      failedRef.current = false;
      if (mode === 'search') {
        loadSearch();
      } else if (mode === 'today') {
        loadToday();
      } else {
        loadBrowse(page, false);
      }
    }
  }, [isOnline, mode, page, loadSearch, loadToday, loadBrowse]);

  const retry = useCallback(() => {
    setSearchResults([]);
    setTodayShows([]);
    setBrowseShows([]);
    if (mode === 'search') {
      loadSearch();
    } else if (mode === 'today') {
      loadToday();
    } else {
      loadBrowse(0, false);
    }
  }, [mode, loadSearch, loadToday, loadBrowse]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
  }, [retry]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || fetchingRef.current) return;
    loadBrowse(page + 1, true);
  }, [isLoadingMore, page, loadBrowse]);

  const handleModeChange = useCallback((next: ShowsMode) => {
    setMode(next);
  }, []);

  return {
    mode,
    setMode: handleModeChange,
    searchQuery,
    setSearchQuery,
    searchResults,
    todayShows,
    browseShows,
    isLoading,
    isLoadingMore,
    error,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
    handleLoadMore,
  };
}
