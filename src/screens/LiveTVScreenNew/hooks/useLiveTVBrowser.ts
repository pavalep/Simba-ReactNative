// ─── Live TV Browser Hook ──────────────────────────────────────────────
// Wave 8: single-stream, FAB-only browse model for Live TV.
// Mirrors useRadioBrowser but adapted to IPTV's client-side pagination:
//   • first call fetches limit=PAGE_SIZE channels
//   • loadMore re-fetches with limit += PAGE_SIZE (cheap; IPTV-org is
//     statically cached at 10 minutes)
//   • category filter narrows the client-side slice when set
//
// Scope key = `${category}|${term}` so each (filter, search) combo is cached.

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

const PAGE_SIZE = 50;

export interface LiveTVFilters {
  category: string | null; // category name; null = all
}

export interface LiveTVScopeState {
  items: IPTVChannelResult[];
  /** Total channels fetched from the API (cache ceiling for slicing). */
  sourceCount: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

export interface LiveTVBrowseTags {
  categories: IPTVCategory[];
}

const EMPTY_SCOPE: LiveTVScopeState = {
  items: [],
  sourceCount: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

const EMPTY_FILTERS: LiveTVFilters = {category: null};

function scopeCacheKey(category: string | null, term: string): string {
  return `tv|${category || ''}|${term.trim()}`;
}

// ─── Hook ────────────────────────────────────────────────────

export function useLiveTVBrowser(initialCategory?: string) {
  const {isOnline} = useNetworkStatus();
  const dispatch = useAppDispatch();

  const [filters, setFilters] = useState<LiveTVFilters>({
    category: initialCategory ?? null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;

  const [scopes, setScopes] = useState<
    Record<string, LiveTVScopeState>
  >({});
  const [refreshing, setRefreshing] = useState(false);

  const [tags, setTags] = useState<LiveTVBrowseTags>({categories: []});
  const [tagsLoaded, setTagsLoaded] = useState(false);

  // ── Internal bookkeeping ──
  const seqRef = useRef<Record<string, number>>({});
  const guardRef = useRef<Set<string>>(new Set());
  const failedKeyRef = useRef<string | null>(null);
  const wasOnlineRef = useRef(isOnline);

  // ── Redux favorites ──
  const favorites = useAppSelector(s =>
    selectLiveFavoritesByKind(s, 'tv'),
  );
  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );

  const activeFilterCount = filters.category ? 1 : 0;

  // ── Scope key + accessor ──
  const keyFor = useCallback(
    () => scopeCacheKey(filters.category, searchTerm),
    [filters.category, searchTerm],
  );

  const getScope = useCallback((): LiveTVScopeState => {
    const key = keyFor();
    return scopes[key] ?? EMPTY_SCOPE;
  }, [scopes, keyFor]);

  // ── setFilter (string '' → null) ──
  const setFilter = useCallback(
    (id: 'category', key: string) => {
      const next = key ? key : null;
      if (id === 'category') {
        setFilters(prev =>
          prev.category === next ? prev : {...prev, category: next},
        );
      }
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // ── Fetch a window of channels ──
  // mode 'initial' → replaces items, fetches up to PAGE_SIZE
  // mode 'more'    → appends, fetches up to limit += PAGE_SIZE
  const fetchPage = useCallback(
    async (limit: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const key = keyFor();

      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] =
        (seqRef.current[key] ?? 0) + 1);

      setScopes(prev => {
        const cur = prev[key] ?? EMPTY_SCOPE;
        return {
          ...prev,
          [key]: {
            ...cur,
            isLoading: mode === 'initial',
            isLoadingMore: mode === 'more',
            error: null,
          },
        };
      });

      try {
        let items: IPTVChannelResult[] = [];
        if (term) {
          // Search hits all categories – ignore category filter
          // (matches the search-vision over the whole catalog)
          items = await searchIPTVChannels(term, {limit});
        } else if (filters.category) {
          items = await getChannelsByCategory(filters.category, {limit});
        } else {
          items = await getAllIPTVChannels({limit});
        }

        if (seq !== (seqRef.current[key] ?? 0)) return; // stale

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          const next: IPTVChannelResult[] =
            mode === 'more' ? dedupe([...cur.items, ...items]) : items;
          return {
            ...prev,
            [key]: {
              ...cur,
              items: next,
              sourceCount: items.length,
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
        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              isLoading: false,
              isLoadingMore: false,
              error:
                err instanceof Error
                  ? err.message
                  : 'Failed to load channels',
            },
          };
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, filters.category, keyFor],
  );

  // ── Public actions ──
  const ensureLoaded = useCallback(() => {
    const key = keyFor();
    if (scopes[key]?.hasLoaded || scopes[key]?.isLoading) return;
    fetchPage(PAGE_SIZE, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyFor, scopes, fetchPage]);

  const loadMore = useCallback(() => {
    const cur = getScope();
    if (
      !cur.hasLoaded ||
      cur.isLoading ||
      cur.isLoadingMore ||
      cur.items.length === 0
    ) {
      return;
    }
    // hasMore proxy: when the previous response came back at the limit,
    // there are likely more. (Client-side slice = requested limit.)
    const nextLimit = cur.items.length + PAGE_SIZE;
    fetchPage(nextLimit, 'more');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getScope, fetchPage]);

  const retry = useCallback(() => {
    const key = keyFor();
    seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
    setScopes(prev => {
      const cur = prev[key];
      if (!cur) return prev;
      return {
        ...prev,
        [key]: {...cur, items: [], sourceCount: 0, hasLoaded: false},
      };
    });
    fetchPage(PAGE_SIZE, 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyFor, fetchPage]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    retry();
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);

  // ── Tags effect: fetch IPTV categories once ──
  useEffect(() => {
    let cancelled = false;
    if (isSearchActive) {
      // While the user is searching, no category list is needed in the sheet
      return;
    }
    setTagsLoaded(false);
    (async () => {
      try {
        const cats = await getIPTVCategories();
        if (!cancelled) {
          setTags({categories: cats});
          setTagsLoaded(true);
        }
      } catch {
        if (!cancelled) setTagsLoaded(true);
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
      ensureLoaded();
    }
  }, [isOnline, ensureLoaded]);

  // ── Keep current scope loaded ──
  const ensureLoadedRef = useRef(ensureLoaded);
  ensureLoadedRef.current = ensureLoaded;
  useEffect(() => {
    ensureLoadedRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyFor()]);

  // ── Favorites actions ──
  const toggleFavorite = useCallback(
    (channel: IPTVChannelResult) => {
      const existing = favorites.find(f => f.id === channel.id);
      if (existing) {
        dispatch(removeLiveFavorite({kind: 'tv', id: channel.id}));
        return;
      }
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
    },
    [favorites, dispatch],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      dispatch(removeLiveFavorite({kind: 'tv', id}));
    },
    [dispatch],
  );

  return {
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refreshing,
    handleRefresh,
    tags,
    tagsLoaded,
    favorites,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  };
}

// ─── helpers ────────────────────────────────────────────────

function dedupe(items: IPTVChannelResult[]): IPTVChannelResult[] {
  const seen = new Set<string>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}
