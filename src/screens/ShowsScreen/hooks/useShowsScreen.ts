// ─── Shows Screen Hook ──────────────────────────────────────────────────
// Phase 3 formula: per-scope cache + TabView scenes + infinite scroll.
//
// A "scope" is a (tab, searchTerm) pair. Every combination is cached
// independently (`key = "${tab}|${term}"`), so:
//   • toggling tabs never loses results already loaded for that scope
//   • typing a search never clears the browse or today data
//   • scrolling back to a visited tab shows its cached list instantly
// Pagination for browse is driven by TVMaze's 250-per-page response —
// `loadMore` fetches the next page only while the last page was full.

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  searchShows,
  getSchedule,
  getPopularShows,
} from '../../../services/api/tvmazeService';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {TVMazeShow} from '../../../types/api';

const PAGE_SIZE = 250;

export type ShowTab = 'search' | 'today' | 'browse';

export interface ShowScopeState {
  items: TVMazeShow[];
  /** Last loaded page (1-based). 0 = nothing loaded yet. */
  page: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

/** Shared immutable empty state — keeps memoized scenes stable. */
export const EMPTY_SCOPE: ShowScopeState = {
  items: [],
  page: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

export function scopeCacheKey(tab: ShowTab, term: string): string {
  return `${tab}|${term.trim()}`;
}

function dedupe(items: TVMazeShow[]): TVMazeShow[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export function useShowsScreen(initialTab?: string) {
  const {isOnline} = useNetworkStatus();
  const [selectedTab, setSelectedTab] = useState<ShowTab>(
    (initialTab as ShowTab) || 'search',
  );

  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  // searchQuery = live input; searchTerm = settled (debounced) value.
  // The term persists across tab switches by design.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [scopes, setScopes] = useState<Record<string, ShowScopeState>>({});
  const [refreshing, setRefreshing] = useState(false);

  /** Monotonic per-key sequence — drops stale/out-of-order responses. */
  const seqRef = useRef<Record<string, number>>({});
  /** In-flight keys — one fetch per scope at a time. */
  const guardRef = useRef<Set<string>>(new Set());
  /** Per-scope hasMore flag — true when the last browse page was full. */
  const hasMoreRef = useRef<Record<string, boolean>>({});
  /** Was the last fetch a failure? Reset on success, set on error. */
  const failedRef = useRef(false);

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (tab: ShowTab) => scopeCacheKey(tab, searchTerm),
    [searchTerm],
  );

  const getScope = useCallback(
    (tab: ShowTab): ShowScopeState =>
      scopes[keyFor(tab)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (tab: ShowTab, patch: Partial<ShowScopeState>) => {
      const key = keyFor(tab);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  // ── Core fetcher ────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (tab: ShowTab, page: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const key = scopeCacheKey(tab, term);

      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      if (mode === 'initial') {
        patchScope(tab, {isLoading: true, error: null});
      } else {
        patchScope(tab, {isLoadingMore: true, error: null});
      }

      try {
        let items: TVMazeShow[] = [];
        let scopeHasMore = false;

        if (tab === 'search') {
          if (!term) {
            // Stay empty/ready when no search term
            setScopes(prev => {
              const cur = prev[key] ?? EMPTY_SCOPE;
              return {
                ...prev,
                [key]: {
                  ...cur,
                  items: [],
                  page: 0,
                  hasLoaded: true,
                  isLoading: false,
                  isLoadingMore: false,
                  error: null,
                },
              };
            });
            failedRef.current = false;
            return;
          }
          items = await searchShows(term);
          scopeHasMore = false;
        } else if (tab === 'today') {
          const schedule = await getSchedule();
          // Deduplicate by show id — one card per show airing today
          const unique = new Map<number, TVMazeShow>();
          for (const entry of schedule) {
            if (!unique.has(entry.show.id)) {
              unique.set(entry.show.id, entry.show);
            }
          }
          items = Array.from(unique.values());
          scopeHasMore = false;
        } else {
          // browse — real pagination via page param
          items = await getPopularShows(page);
          scopeHasMore = items.length === PAGE_SIZE;
        }

        if (seq !== (seqRef.current[key] ?? 0)) return; // stale response

        failedRef.current = false;
        hasMoreRef.current[key] = scopeHasMore;

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              items:
                mode === 'more'
                  ? dedupe([...cur.items, ...items])
                  : items,
              page,
              hasLoaded: true,
              isLoading: false,
              isLoadingMore: false,
              error: null,
            },
          };
        });
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        failedRef.current = true;
        patchScope(tab, {
          isLoading: false,
          isLoadingMore: false,
          error: err instanceof Error ? err.message : 'Failed to load shows',
        });
      } finally {
        guardRef.current.delete(key);
        if (mode === 'initial') setRefreshing(false);
      }
    },
    [searchTerm, patchScope],
  );

  // ── Public actions ──────────────────────────────────────────────────

  /** Load page 1 for a tab if it isn't loaded yet (scene mount).
   *  The 'today' tab always reloads fresh (short server-side cache). */
  const ensureLoaded = useCallback(
    (tab: ShowTab) => {
      const scope = getScope(tab);
      // 'today' tab always reloads fresh; other tabs skip if already loaded
      if (tab !== 'today' && (scope.hasLoaded || scope.isLoading)) return;
      fetchPage(tab, 1, 'initial');
    },
    [getScope, fetchPage],
  );

  /** Infinite scroll: fetch the next page. Only the browse tab paginates. */
  const loadMore = useCallback(
    (tab: ShowTab) => {
      if (tab !== 'browse') return;
      const scope = getScope(tab);
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (!hasMoreRef.current[keyFor(tab)]) return;
      fetchPage(tab, scope.page + 1, 'more');
    },
    [getScope, fetchPage, keyFor],
  );

  /** Re-fetch page 1 after an error (invalidates any stale in-flight seq). */
  const retry = useCallback(
    (tab: ShowTab) => {
      const key = keyFor(tab);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
      });
      fetchPage(tab, 1, 'initial');
    },
    [keyFor, fetchPage],
  );

  /** Pull-to-refresh: invalidate and re-fetch page 1. */
  const handleRefresh = useCallback(
    (tab: ShowTab) => {
      setRefreshing(true);
      retry(tab);
    },
    [retry],
  );

  /** Tab switch — search text intentionally survives. */
  const selectTab = useCallback((tab: ShowTab) => {
    setSelectedTab(tab);
  }, []);

  // ── Auto-load on tab change / search term change ────────────────────

  useEffect(() => {
    if (selectedTab) {
      ensureLoaded(selectedTab);
    }
  }, [selectedTab, ensureLoaded, keyFor]);

  // ── Auto-retry when connectivity returns ────────────────────────────

  // Keep stable refs so the effect can read latest values without
  // re-registering on every state change.
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const selectedTabRef = useRef(selectedTab);
  selectedTabRef.current = selectedTab;

  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedRef.current) {
      fetchPageRef.current(selectedTabRef.current, 1, 'initial');
    }
  }, [isOnline]);

  return {
    selectedTab,
    selectTab,
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    // per-scope data + actions
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    // pull-to-refresh
    refreshing,
    handleRefresh,
    isOnline,
  };
}
