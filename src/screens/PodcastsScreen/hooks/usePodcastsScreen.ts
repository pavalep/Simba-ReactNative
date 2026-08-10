// ─── Podcasts Screen Hook ────────────────────────────────────────────
// Phase 3 formula: each podcast category is a TabView tab.
//   • search lives at screen level, scoped per (categoryName, searchTerm)
//   • per-scope cache + pagination via growing max-window
//   • auto-retry on reconnect, pull-to-refresh (ArchiveScreen variant)
//
// Podcast Index paginates via a growing `max` parameter (no true offset).
// hasMore = items.length >= currentMax && currentMax < MAX_RESULTS_PER_QUERY.

import {useCallback, useEffect, useRef, useState} from 'react';
import {searchPodcasts, getTrendingPodcasts} from '../../../services/api/podcastIndexService';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {PodcastResult} from '../../../types/api';

export interface PodcastCategoryTab {
  id: number | 'all';
  title: string;
  icon: string;
}

export const PODCAST_TABS: PodcastCategoryTab[] = PODCAST_CATEGORIES.slice(0, 12).map(c => ({
  id: c.id,
  title: c.name,
  icon: c.icon,
}));

const INITIAL_MAX = 25;
const MAX_RESULTS_PER_QUERY = 100;

export interface PodcastScopeState {
  items: PodcastResult[];
  /** Current max window size last requested. */
  maxRequested: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

const EMPTY_SCOPE: PodcastScopeState = {
  items: [],
  maxRequested: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

function scopeCacheKey(categoryTitle: string, term: string): string {
  return `podcast|${categoryTitle}|${term.trim()}`;
}

function dedupe(items: PodcastResult[]): PodcastResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

export function usePodcastsScreen(initialCategoryId?: number | 'all') {
  const {isOnline} = useNetworkStatus();

  const initialIndex = PODCAST_TABS.findIndex(t => t.id === initialCategoryId);
  const [tabIndex, setTabIndex] = useState(Math.max(0, initialIndex));

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;

  const [scopes, setScopes] = useState<Record<string, PodcastScopeState>>({});
  const [refreshing, setRefreshing] = useState(false);

  const seqRef = useRef<Record<string, number>>({});
  const guardRef = useRef<Set<string>>(new Set());
  const failedKeyRef = useRef<string | null>(null);
  const wasOnlineRef = useRef(isOnline);

  const selectedTab = PODCAST_TABS[tabIndex] ?? PODCAST_TABS[0];

  const keyFor = useCallback(
    (title: string) => scopeCacheKey(title, searchTerm),
    [searchTerm],
  );

  const getScope = useCallback(
    (title: string): PodcastScopeState =>
      scopes[keyFor(title)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (title: string, patch: Partial<PodcastScopeState>) => {
      const key = keyFor(title);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (title: string, max: number) => {
      const term = searchTerm.trim();
      const key = scopeCacheKey(title, term);

      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      patchScope(title, {isLoading: max <= INITIAL_MAX, isLoadingMore: max > INITIAL_MAX, error: null});

      try {
        // The 'all' synthetic category (id: 'all' in PODCAST_CATEGORIES) is
        // served by /podcasts/trending — there's no "browse everything"
        // endpoint in Podcast Index, but trending is a good universal
        // default. Any user search term still wins over the category.
        // Match by id (not by title) so the check survives localization.
        const isAllCategory =
          !term &&
          PODCAST_TABS.find(t => t.title === title)?.id === 'all';
        const items = isAllCategory
          ? await getTrendingPodcasts(max)
          : await searchPodcasts(term || title, max);

        if (seq !== (seqRef.current[key] ?? 0)) return;

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              items: dedupe([...cur.items, ...items]),
              maxRequested: max,
              hasLoaded: true,
              isLoading: false,
              isLoadingMore: false,
              error: null,
            },
          };
        });
        failedKeyRef.current = null;
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        failedKeyRef.current = key;
        patchScope(title, {
          isLoading: false,
          isLoadingMore: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load podcasts',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, patchScope],
  );

  const ensureLoaded = useCallback(
    (title: string) => {
      const scope = getScope(title);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(title, INITIAL_MAX);
    },
    [getScope, fetchPage],
  );

  const loadMore = useCallback(
    (title: string) => {
      const scope = getScope(title);
      const max = scope.maxRequested || INITIAL_MAX;
      if (
        !scope.hasLoaded ||
        scope.isLoading ||
        scope.isLoadingMore ||
        scope.items.length < max ||
        max >= MAX_RESULTS_PER_QUERY
      ) {
        return;
      }
      fetchPage(title, max * 2);
    },
    [getScope, fetchPage],
  );

  const retry = useCallback(
    (title: string) => {
      const key = keyFor(title);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {...prev, [key]: {...cur, items: [], hasLoaded: false}};
      });
      fetchPage(title, INITIAL_MAX);
    },
    [keyFor, fetchPage],
  );

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry(selectedTab.title);
    setRefreshing(false);
  }, [retry, selectedTab.title]);

  // ── Keep current tab loaded ──
  // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so the effects below
  // only re-fire when the selected tab actually changes — not on every
  // parent re-render (getScope / fetchPage change ref every render).
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;

  // ── Auto-retry on reconnect ──
  // [FIX-PODCASTS-LOOP] deps exclude `ensureLoaded` (changes ref every
  // render). The wasOnlineRef captures the previous value across renders
  // so the transition check still works.
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedKeyRef.current) {
      failedKeyRef.current = null;
      ensureLoadedRef.current(selectedTab.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, selectedTab.title]);

  useEffect(() => {
    ensureLoadedRef.current(selectedTab.title);
  }, [selectedTab.title]);

  const selectTabByTitle = useCallback((title: string) => {
    const idx = PODCAST_TABS.findIndex(t => t.title === title);
    if (idx >= 0) setTabIndex(idx);
  }, []);

  return {
    tabs: PODCAST_TABS,
    tabIndex,
    setTabIndex,
    selectedTab,
    selectTabByTitle,
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    // network
    isOnline,
    // scope
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
  };
}
