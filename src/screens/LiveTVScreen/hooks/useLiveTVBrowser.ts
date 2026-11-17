// ─── Live TV Browser Hook ──────────────────────────────────────────────
//
// WAVE B13.1 (2026-11-17) — rewritten on the catalogue.
//
// WHAT IT USED TO DO
// ------------------
// One TanStack query per (category, searchTerm) tuple, and EVERY query
// downloaded `api/channels.json` — 1,047,201 bytes on the wire, 8 MB
// decoded — and then rejected the whole answer, because that file has no
// stream URL. So every scope change cost a download and produced an
// error card.
//
// WHAT IT DOES NOW
// ----------------
// ONE query — `['iptv', 'catalogue']` — that downloads the playlist the
// source publishes for players (2,822,591 bytes) plus the two tiny maps
// that turn its ids into words, and builds the whole directory once.
// Everything after that is a filter over memory:
//
//   - a category filter is a comparison on the channel's category ID,
//   - a search is a comparison on the name, the country and the category,
//   - the page is a client-side slice of the rows in the scope.
//
// The scope used to be a QUERY KEY, so changing it was a download. It is
// now a `useMemo` over the catalogue, so changing it costs nothing.
//
// The catalogue is kept for an hour after the last screen stops watching
// it (`gcTime`), so leaving Live TV and coming back does not pay the
// download again.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {type UseQueryResult} from '@tanstack/react-query';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import {
  getIPTVCatalogue,
  IPTV_RETRIES,
  type IPTVCatalogue,
} from '../../../infrastructure/api/iptv/adapter';
import {filterIPTVChannels} from '../../../infrastructure/api/iptv/catalogue';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';
import {useLiveFavoritesStore} from '../../../state';

const PAGE_SIZE = 50;

/**
 * How long the catalogue stays fresh, and how long it stays in the cache.
 *
 * The source rebuilds its directory daily, so 30 minutes of freshness is
 * generous. The `gcTime` is the one that matters for the user: TanStack
 * drops a query after 5 minutes of nobody watching it by default, and
 * that would mean paying the 2.8 MB again on every visit.
 */
const CATALOGUE_STALE_MS = 30 * 60_000;
const CATALOGUE_GC_MS = 60 * 60_000;

export interface LiveTVFilters {
  /**
   * The category ID (`news`) — the source's own slug.
   *
   * It used to hold the category's NAME, and the deep link carried an
   * ID, so the two had to be translated into each other before a filter
   * could match anything. Now both sides speak the ID and the NAME is
   * only ever displayed.
   */
  category: string | null;
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

/** The route param is an id; the ids are lower case. */
function normalizeCategoryId(value?: string): string | null {
  const trimmed = (value ?? '').trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

// ─── Hook ────────────────────────────────────────────────────

export function useLiveTVBrowser(initialCategory?: string) {
  const {isOnline} = useNetworkStatus();

  const [filters, setFilters] = useState<LiveTVFilters>({
    category: normalizeCategoryId(initialCategory),
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const isSearchActive = searchTerm.trim().length > 0;
  const activeFilterCount = filters.category ? 1 : 0;

  /** Number of channels to display in the current scope (client-side slice). */
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // ── The ONE query. The whole directory, fetched once. ──
  const catalogueQuery: UseQueryResult<IPTVCatalogue> = useApiQuery<
    IPTVCatalogue
  >({
    queryKey: ['iptv', 'catalogue'],
    queryFn: ({signal}) => getIPTVCatalogue(signal),
    staleTime: CATALOGUE_STALE_MS,
    gcTime: CATALOGUE_GC_MS,
    retry: IPTV_RETRIES,
  });

  /**
   * The categories the sheet offers.
   *
   * Only the ones that ANSWER: `/api/categories.json` serves 30 ids, and
   * one of them (`xxx`) has no channels at all — its playlist is empty
   * (measured: status 200, 0 entries). Offering it would put a filter in
   * the sheet that can only ever produce "No channels match your
   * filters." The count is the app's own, computed from the catalogue.
   */
  const categories = useMemo(
    () =>
      (catalogueQuery.data?.categories ?? []).filter(c => c.channelCount > 0),
    [catalogueQuery.data],
  );

  /** The category's NAME — what the chip reads. */
  const categoryName = useMemo(
    () => categories.find(c => c.id === filters.category)?.name ?? '',
    [categories, filters.category],
  );

  // ── The scope, in memory. A category and a term, over the catalogue. ──
  const scopedChannels = useMemo(
    () =>
      filterIPTVChannels(catalogueQuery.data?.channels ?? [], {
        categoryId: filters.category,
        term: searchTerm,
      }),
    [catalogueQuery.data, filters.category, searchTerm],
  );

  // Reset the slice when the scope changes — a fresh scope starts
  // at PAGE_SIZE again.
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [filters.category, searchTerm]);

  const items = useMemo(
    () => scopedChannels.slice(0, displayCount),
    [scopedChannels, displayCount],
  );
  const hasMore = scopedChannels.length > displayCount;

  // ── Filter actions ──
  const setFilter = useCallback(
    (id: 'category', key: string) => {
      const next = normalizeCategoryId(key);
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
  const getScope = useCallback(
    (): LiveTVScopeState => ({
      items,
      // "The query has settled WITH DATA" — not "the query settled".
      //
      // It used to be `!!data || !!error`, which is true when the FIRST
      // page failed, and the screen's failure branch tested `!hasLoaded`.
      // So a page-1 failure fell through every branch and rendered an
      // EMPTY LIST: no message, no spinner, no button.
      hasLoaded: !!catalogueQuery.data,
      isLoading: catalogueQuery.isFetching,
      isLoadingMore: false, // client-side pagination has no separate "loading more" state
      error: errorMessage(catalogueQuery.error),
    }),
    [items, catalogueQuery.data, catalogueQuery.error, catalogueQuery.isFetching],
  );

  // ── Pagination actions ──
  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setDisplayCount(c => c + PAGE_SIZE);
  }, [hasMore]);

  const retry = useCallback(() => {
    void catalogueQuery.refetch();
  }, [catalogueQuery]);

  // The GESTURE owns the spinner, not the query. `isFetching` is also
  // true for a background refetch (the query is stale, the app comes
  // back to the foreground) — so binding the refresh control to it puts
  // a spinner for work the user never asked for in the one place that
  // says "refreshing". See `src/screens/_shared/pullToRefresh.ts`.
  //
  // It used to be a hardcoded `false`, so the pull-to-refresh spinner
  // never appeared at all: the user pulled, the list refetched, and
  // nothing said so.
  const {refreshing, refresh} = usePullToRefresh(catalogueQuery.refetch);

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
    /** The category's NAME — the chip's label. */
    categoryName,
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
    tags: {categories} as LiveTVBrowseTags,
    tagsLoaded: !!catalogueQuery.data,
    // favorites
    isFavoriteId,
    toggleFavorite,
    // `hasMore` for the screen's "show more" footer (the legacy `loadMore`
    // callback still works for backwards compat — see LiveTVContent's
    // `onEndReached`)
    hasMore,
  };
}
