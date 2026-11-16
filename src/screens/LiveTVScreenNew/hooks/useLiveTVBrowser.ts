// ─── Live TV Browser Hook ──────────────────────────────────────────────
// V18.6.2b: rewritten on `useApiQuery` (TanStack's single-query
// primitive) per the V18 ideal. The pre-V18 implementation was
// 361 lines with a per-scope `Map<key, ScopeState>`, `seqRef` for
// stale-request cancellation, `guardRef` for in-flight dedup,
// and a client-side `loadMore` that re-fetched with an
// ever-larger limit. The V18-ideal version is ~120 lines:
//
//   - The "scope" is just a TanStack queryKey. Every
//     (category, searchTerm) combination is its own cache entry;
//     revisiting a combination shows its cached list instantly.
//   - The "loadMore" is now client-side: we fetch the full
//     list (or filtered subset) once per scope and slice it
//     in a `useMemo`. The slice size grows as the user scrolls.
//   - The "stale-request cancellation" is TanStack's own
//     dedup — the queryKey changes when filters change, the
//     in-flight query is cancelled, the new one fires.
//   - The "in-flight dedup" is TanStack's per-key dedup —
//     only one fetch per (category, searchTerm) at a time.
//
// The public surface (returned shape) is unchanged so
// `LiveTVContent.tsx` doesn't move.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {type UseQueryResult} from '@tanstack/react-query';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import {
  getAllIPTVChannels,
  searchIPTVChannels,
  getChannelsByCategory,
  getIPTVCategories,
} from '../../../infrastructure/api/iptv/adapter';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';
import {useLiveFavoritesStore} from '../../../state';

const PAGE_SIZE = 50;
const FULL_LIMIT = 1000; // IPTV-org returns the full list; we slice client-side

export interface LiveTVFilters {
  category: string | null; // category name; null = all
}

export interface LiveTVScopeState {
  items: IPTVChannelResult[];
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

export interface LiveTVBrowseTags {
  categories: IPTVCategory[];
}

const EMPTY_FILTERS: LiveTVFilters = {category: null};

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return String(err);
}

// ─── Hook ────────────────────────────────────────────────────

export function useLiveTVBrowser(initialCategory?: string) {
  const {isOnline} = useNetworkStatus();

  const [filters, setFilters] = useState<LiveTVFilters>({
    category: initialCategory ?? null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;
  const activeFilterCount = filters.category ? 1 : 0;

  /** Number of channels to display in the current scope (client-side slice). */
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // ── The big one: one query per (category, searchTerm) tuple.
  //    Every combination is its own TanStack cache entry. ──
  const channelQuery: UseQueryResult<IPTVChannelResult[]> = useApiQuery<
    IPTVChannelResult[]
  >({
    queryKey: ['iptv', 'browse', filters.category, searchTerm.trim()],
    queryFn: async ({signal}) => {
      const term = searchTerm.trim();
      if (term) {
        return searchIPTVChannels(term, {limit: FULL_LIMIT}, signal);
      }
      if (filters.category) {
        return getChannelsByCategory(
          filters.category,
          {limit: FULL_LIMIT},
          signal,
        );
      }
      return getAllIPTVChannels({limit: FULL_LIMIT}, signal);
    },
    staleTime: 60_000,
  });

  // ── Categories (tags for the filter sheet) ──
  const categoriesQuery = useApiQuery<IPTVCategory[]>({
    queryKey: ['iptv', 'categories'],
    queryFn: () => getIPTVCategories(),
    staleTime: 5 * 60_000,
  });

  /**
   * The route param is a category ID; the source matches on the NAME.
   *
   * `getChannelsByCategory` filters with
   * `c.category.toLowerCase() === category.toLowerCase()` — and
   * `IPTVChannelResult.category` is the channel's category NAME. So an
   * id was compared against a name, and any category whose id differed
   * from its name filtered to zero channels. The chip's key had the same
   * problem (it was the id), so the selection stored something the
   * source could not match.
   *
   * The id is resolved to the name here, once the categories arrive, so
   * both the deep link and the sheet speak the source's own vocabulary.
   */
  useEffect(() => {
    if (!categoriesQuery.data || !initialCategory) return;
    const match = categoriesQuery.data.find(c => c.id === initialCategory);
    if (match && match.name !== filters.category) {
      setFilters(prev => ({...prev, category: match.name}));
    }
  }, [categoriesQuery.data, initialCategory, filters.category]);

  // ── Display slice (client-side pagination) ──
  // Reset the slice when the scope changes — a fresh scope starts
  // at PAGE_SIZE again.
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [filters.category, searchTerm]);

  const allItems = channelQuery.data ?? [];
  const items = useMemo(
    () => allItems.slice(0, displayCount),
    [allItems, displayCount],
  );
  const hasMore = allItems.length > displayCount;

  // ── Filter actions ──
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

  // ── Scope accessor (kept for the consumer's `getScope()` API) ──
  const getScope = useCallback((): LiveTVScopeState => ({
    items,
    // "The query has settled WITH DATA" — not "the query settled".
    //
    // It used to be `!!data || !!error`, which is true when the FIRST
    // page failed, and the screen's failure branch tested `!hasLoaded`.
    // So a page-1 failure fell through every branch and rendered an
    // EMPTY LIST: no message, no spinner, no button.
    hasLoaded: !!channelQuery.data,
    isLoading: channelQuery.isFetching,
    isLoadingMore: false, // client-side pagination has no separate "loading more" state
    error: errorMessage(channelQuery.error),
  }), [items, channelQuery.data, channelQuery.error, channelQuery.isFetching]);

  // ── Pagination actions ──
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setDisplayCount(c => c + PAGE_SIZE);
  }, [hasMore]);

  const retry = useCallback(() => {
    void channelQuery.refetch();
  }, [channelQuery]);

  // The GESTURE owns the spinner, not the query. `isFetching` is also
  // true for a background refetch (the query is stale, the app comes
  // back to the foreground) — so binding the refresh control to it puts
  // a spinner for work the user never asked for in the one place that
  // says "refreshing". See `src/screens/_shared/pullToRefresh.ts`.
  //
  // It used to be a hardcoded `false`, so the pull-to-refresh spinner
  // never appeared at all: the user pulled, the list refetched, and
  // nothing said so.
  const {refreshing, refresh} = usePullToRefresh(channelQuery.refetch);

  // ── Favorites ──
  // V23 W24 (2026-11-05) — select the stable array, derive outside the
  // selector. Filtering inside the selector built a NEW array on every call,
  // so zustand's `Object.is` comparison never matched and the store drove an
  // unbounded re-render loop ("Maximum update depth exceeded").
  const allFavorites = useLiveFavoritesStore(s => s.items);
  const favorites = useMemo(
    () => allFavorites.filter(f => f.kind === 'tv'),
    [allFavorites],
  );
  const isFavoriteId = useCallback(
    (id: string) => favorites.some(f => f.id === id),
    [favorites],
  );
  const toggleFavorite = useCallback((channel: IPTVChannelResult) => {
    const existing = favorites.find(f => f.id === channel.id);
    if (existing) {
      useLiveFavoritesStore.getState().removeLiveFavorite({kind: 'tv', id: channel.id});
      return;
    }
    useLiveFavoritesStore.getState().addLiveFavorite({
      kind: 'tv',
      id: channel.id,
      name: channel.name,
      url: channel.url,
      image: channel.image || '',
      subtitle: [channel.category, channel.country]
        .filter(Boolean)
        .join(' · '),
      addedAt: new Date().toISOString(),
    });
  }, [favorites]);

  return {
    // filters + search
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    searchQuery,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    isOnline,
    // data
    getScope,
    loadMore,
    retry,
    refreshing,
    handleRefresh: refresh,
    tags: {categories: categoriesQuery.data ?? []} as LiveTVBrowseTags,
    tagsLoaded: !!categoriesQuery.data,
    // favorites
    isFavoriteId,
    toggleFavorite,
    // `hasMore` for the screen's "show more" footer (the legacy `loadMore`
    // callback still works for backwards compat — see LiveTVContent's
    // `onEndReached`)
    hasMore,
  };
}
