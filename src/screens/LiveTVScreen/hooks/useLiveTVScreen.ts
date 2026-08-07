// ─── Live TV Screen Hook ──────────────────────────────────────────────
// Phase 3 TabView formula: per-scope cache + client-side pagination
// + search. Tabs: 'all' | 'categories' | 'favorites'.
// IPTV pagination model: full JSON fetched, client-side slice(0, limit).
// loadMore bumps the limit: 50 → 100 → 150 → … hasMore = len >= limit.

import {useCallback, useEffect, useRef, useState} from 'react';
import {
  getAllIPTVChannels,
  searchIPTVChannels,
  getChannelsByCategory,
  getIPTVCategories,
} from '../../../services/api/iptvService';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  addLiveFavorite,
  removeLiveFavorite,
  selectLiveFavoritesByKind,
} from '../../../store/slices/liveFavoritesSlice';
import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';

// ─── Public types ────────────────────────────────────────────

export type LiveTVTab = 'all' | 'categories' | 'favorites';

export const LIVE_TV_TABS: Array<{key: LiveTVTab; title: string}> = [
  {key: 'all', title: 'All Channels'},
  {key: 'categories', title: 'Categories'},
  {key: 'favorites', title: 'Favorites'},
];

// ─── Scope ───────────────────────────────────────────────────

const INITIAL_LIMIT = 50;

export interface LiveTVScopeState {
  items: IPTVChannelResult[];
  limit: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

const EMPTY_SCOPE: LiveTVScopeState = {
  items: [],
  limit: INITIAL_LIMIT,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

// ─── Helpers ─────────────────────────────────────────────────

function scopeCacheKey(
  tab: LiveTVTab,
  term: string,
  category: string,
): string {
  return `${tab}|${term.trim()}|${category || ''}`;
}

function dedupe(items: IPTVChannelResult[]): IPTVChannelResult[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

// ─── Hook ────────────────────────────────────────────────────

export function useLiveTVScreen(initialCategoryId?: string) {
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  // ── Tab / category ──
  const [selectedTab, setSelectedTab] = useState<LiveTVTab>(
    initialCategoryId ? 'categories' : 'all',
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [categories, setCategories] = useState<IPTVCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // ── Search (lives at screen level, applies across all tabs) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;

  // ── Per-scope state ──
  const [scopes, setScopes] = useState<Record<string, LiveTVScopeState>>({});
  const [refreshing, setRefreshing] = useState(false);

  const seqRef = useRef<Record<string, number>>({});
  const guardRef = useRef<Set<string>>(new Set());
  const failedKeyRef = useRef<string | null>(null);
  const wasOnlineRef = useRef(isOnline);

  // ── Redux favorites ──
  const favorites = useAppSelector(s => selectLiveFavoritesByKind(s, 'tv'));

  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );

  // ── Scope accessors ──
  const keyFor = useCallback(
    (tab: LiveTVTab) =>
      scopeCacheKey(tab, searchTerm, selectedCategory ?? ''),
    [searchTerm, selectedCategory],
  );

  const getScope = useCallback(
    (tab: LiveTVTab): LiveTVScopeState =>
      tab === 'favorites'
        ? {
            ...EMPTY_SCOPE,
            items: favorites as unknown as IPTVChannelResult[],
            hasLoaded: true,
          }
        : (scopes[keyFor(tab)] ?? EMPTY_SCOPE),
    [scopes, keyFor, favorites],
  );

  const patchScope = useCallback(
    (tab: LiveTVTab, patch: Partial<LiveTVScopeState>) => {
      if (tab === 'favorites') return;
      const key = keyFor(tab);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  // ── Core fetch ───────────────────────────────────────────
  // client-side pagination: each loadMore call bumps limit by
  // INITIAL_LIMIT. hasMore = items.length >= scope.limit.
  const fetchPage = useCallback(
    async (
      tab: LiveTVTab,
      limit: number,
      mode: 'initial' | 'more',
    ) => {
      if (tab === 'favorites') return;
      const term = searchTerm.trim();
      const key = scopeCacheKey(tab, term, selectedCategory ?? '');

      // deduplication guard
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      // stale guard
      const seq = (seqRef.current[key] =
        (seqRef.current[key] ?? 0) + 1);

      patchScope(tab, {
        isLoading: mode === 'initial',
        isLoadingMore: mode === 'more',
        error: null,
      });

      try {
        let items: IPTVChannelResult[] = [];

        if (term) {
          // Search across all tabs
          items = await searchIPTVChannels(term, {limit});
        } else {
          switch (tab) {
            case 'all':
              items = await getAllIPTVChannels({limit});
              break;
            case 'categories':
              if (selectedCategory) {
                items = await getChannelsByCategory(selectedCategory, {
                  limit,
                });
              }
              break;
          }
        }

        // stale guard – discard if a newer fetch started
        if (seq !== (seqRef.current[key] ?? 0)) return;

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
              limit,
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
        patchScope(tab, {
          isLoading: false,
          isLoadingMore: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load channels',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, selectedCategory, patchScope],
  );

  // ── Public actions ───────────────────────────────────────

  const ensureLoaded = useCallback(
    (tab: LiveTVTab) => {
      if (tab === 'favorites') return;
      if (tab === 'categories' && !selectedCategory) return;
      const scope = getScope(tab);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(tab, INITIAL_LIMIT, 'initial');
    },
    [getScope, fetchPage, selectedCategory],
  );

  const loadMore = useCallback(
    (tab: LiveTVTab) => {
      if (tab === 'favorites') return;
      const scope = getScope(tab);
      if (
        !scope.hasLoaded ||
        scope.isLoading ||
        scope.isLoadingMore
      )
        return;
      // hasMore = items at least equal the requested limit
      if (scope.items.length < scope.limit) return;
      const nextLimit = scope.limit + INITIAL_LIMIT;
      fetchPage(tab, nextLimit, 'more');
    },
    [getScope, fetchPage],
  );

  const retry = useCallback(
    (tab: LiveTVTab) => {
      if (tab === 'favorites') return;
      const key = keyFor(tab);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {
          ...prev,
          [key]: {...cur, items: [], hasLoaded: false},
        };
      });
      fetchPage(tab, INITIAL_LIMIT, 'initial');
    },
    [keyFor, fetchPage],
  );

  // ── Pull-to-refresh ──
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (selectedTab !== 'favorites') retry(selectedTab);
    setRefreshing(false);
  }, [retry, selectedTab]);

  // ── Categories (ipty-org) ──
  useEffect(() => {
    let cancelled = false;
    if (isSearchActive) {
      setCategories([]);
      setCategoriesLoaded(false);
      return;
    }
    setCategoriesLoaded(false);
    (async () => {
      try {
        const list = await getIPTVCategories();
        if (!cancelled) {
          setCategories(list);
          setCategoriesLoaded(true);
        }
      } catch {
        if (!cancelled) setCategoriesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSearchActive]);

  // ── Auto-retry on reconnect ──
  useEffect(() => {
    const wasOnline = wasOnlineRef.current;
    wasOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && failedKeyRef.current) {
      failedKeyRef.current = null;
      ensureLoaded(selectedTab);
    }
  }, [isOnline, ensureLoaded, selectedTab]);

  // ── Keep current tab loaded ──
  // [FIX-PODCASTS-LOOP] Stash ensureLoaded in a ref so the effect only
  // re-fires when the selected tab actually changes — not on every
  // parent re-render (getScope / fetchPage change ref every render).
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current(selectedTab);
  }, [selectedTab]);

  // ── Tab/category selectors ──
  // IMPORTANT: selectTab does NOT clear search text
  const selectTab = useCallback((tab: LiveTVTab) => {
    setSelectedTab(tab);
  }, []);

  // IMPORTANT: selectCategory does NOT clear search text
  const selectCategory = useCallback((cat: string | null) => {
    setSelectedCategory(cat);
  }, []);

  // ── Redux favorites actions ──
  const toggleFavorite = useCallback(
    (channel: IPTVChannelResult) => {
      const existing = favorites.find(f => f.id === channel.id);
      if (existing) {
        dispatch(removeLiveFavorite({kind: 'tv', id: channel.id}));
      } else {
        dispatch(
          addLiveFavorite({
            kind: 'tv',
            id: channel.id,
            name: channel.name,
            url: channel.url,
            image: channel.logo || '',
            subtitle: [channel.category, channel.country]
              .filter(Boolean)
              .join(' · '),
            addedAt: new Date().toISOString(),
          }),
        );
      }
    },
    [favorites, dispatch],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      dispatch(removeLiveFavorite({kind: 'tv', id}));
    },
    [dispatch],
  );

  // ── Public API ────────────────────────────────────────────
  return {
    // tab
    selectedTab,
    selectTab,
    selectedCategory,
    selectCategory,
    categories,
    categoriesLoaded,
    // search
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    // scope
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
    // favorites
    favorites,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  };
}
