// ─── Live TV Screen Hook ──────────────────────────────────────────────
//
// THE SCOPE
// ---------
// The shell owns the scope: the filter sheet owns the CATEGORY and the
// search field owns the TERM. This hook receives both and turns them into
// rows. It does not own a filter of its own — the old screen's
// `useLiveTVBrowser` kept `filters` and `searchQuery` in its own state,
// which is how the screen came to have a second chip row and a second
// search field.
//
// THE SCOPE IS A CATEGORY **AND** A TERM
// --------------------------------------
// The source cannot answer a search term and a category "at the same
// time" in the sense the Podcast Index cannot — but that is because the
// Podcast Index has ONE endpoint per question. The IPTV source has NO
// per-scope endpoint at all: the request is the whole directory
// (`GET {base}/index.category.m3u` + `/api/categories.json` +
// `/api/countries.json`, no query parameters at all — see
// `src/infrastructure/api/iptv/adapter.ts`), and the scope is applied IN
// MEMORY by `filterIPTVChannels`, which tests the category and the term
// against the SAME row:
//
//     if (categoryId && channel.categoryId !== categoryId) return false;
//     if (!term) return true;
//     return name.includes(term) || country.includes(term) || category.includes(term);
//
// So a term and a category narrow to the INTERSECTION, and both apply.
// The shell's `autoClearFilterOnSearch` / `autoClearSearchOnFilter` rules
// stay OFF for this screen: they exist to stop the user holding a filter
// that looks applied and is not, and here the filter IS applied.
//
// PAGINATION
// ----------
// The rows are a client-side slice of the catalogue (50 at a time), so
// there is no next page to fail: `isLoadingMore` is always false and the
// footer's "couldn't load more" branch is unreachable. The old screen
// re-derived "is there more?" from a SECOND copy of the page size, which
// said "maybe more" even when every channel was already on screen, and
// the footer's "tap to retry" then rendered and did nothing.

import {useCallback, useEffect, useMemo, useState} from 'react';
import {filterIPTVChannels} from '../../../infrastructure/api/iptv/catalogue';
import {usePullToRefresh} from '../../_shared/pullToRefresh';
import {normalizeCategoryId} from '../related/browseConfig';
import {useLiveTVCatalogue} from './useLiveTVCatalogue';
import type {IPTVCategory, IPTVChannelResult} from '../../../types/api';

/** How many channels the list shows at a time (a client-side slice). */
const PAGE_SIZE = 50;

export interface UseLiveTVScreenResult {
  /** The active category id, or null for the whole catalogue. */
  activeCategory: string | null;
  /** Point the scope at a category (the shell's filter). */
  setActiveCategory: (categoryId: string) => void;
  /** Point the scope at a search term (the shell's search field). */
  setSearchTerm: (term: string) => void;
  /** True while a search term is on screen. */
  isSearchActive: boolean;
  /** The catalogue's categories — the filter axis's rows. */
  categories: IPTVCategory[];
  /**
   * The active category's NAME — what the empty state and the chip read.
   *
   * It is the source's own name for the category ("News"), never the id:
   * the id is the vocabulary of the FILTER, the name is the vocabulary of
   * the user. `undefined` when no category is active.
   */
  scopeLabel: string | undefined;
  /** The rows of the active scope. */
  items: IPTVChannelResult[];
  /** The catalogue has loaded (with data). */
  hasLoaded: boolean;
  isLoading: boolean;
  /** Always false: the paging is a client-side slice with no fetch. */
  isLoadingMore: boolean;
  /** The scope has rows the list has not shown yet. */
  hasMore: boolean;
  /** The catalogue's failure — the error card's business. */
  error: string | null;
  /** Always null: there is no next page that can fail. */
  pageError: string | null;
  /** Show the next slice of the scope. */
  fetchNextPage: () => void;
  /** Run the catalogue again. */
  refetch: () => void;
  /**
   * True while a user-started pull-to-refresh is running.
   *
   * NOT `isFetching`: that flag is also true for a background refetch (the
   * query is stale, the app comes back to the foreground), and the refresh
   * spinner would then say "refreshing" for work the user never asked for.
   * See `src/screens/_shared/pullToRefresh.ts`.
   */
  refreshing: boolean;
  /** Run the pull-to-refresh gesture. */
  refresh: () => Promise<void>;
}

export function useLiveTVScreen(): UseLiveTVScreenResult {
  const catalogue = useLiveTVCatalogue();

  const [activeCategory, setActiveCategoryState] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTermState] = useState('');

  const setActiveCategory = useCallback((categoryId: string) => {
    setActiveCategoryState(normalizeCategoryId(categoryId));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  // The scope, in memory: a category AND a term over the catalogue.
  const scopedChannels = useMemo(
    () =>
      filterIPTVChannels(catalogue.channels, {
        categoryId: activeCategory,
        term: searchTerm,
      }),
    [catalogue.channels, activeCategory, searchTerm],
  );

  // How much of the scope the list shows.
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // A fresh scope starts at PAGE_SIZE again.
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [activeCategory, searchTerm]);

  const items = useMemo(
    () => scopedChannels.slice(0, displayCount),
    [scopedChannels, displayCount],
  );
  const hasMore = scopedChannels.length > displayCount;

  // The active category's NAME, for the copy that names it.
  const scopeLabel = useMemo(() => {
    if (!activeCategory) return undefined;
    return (
      catalogue.categories.find(category => category.id === activeCategory)
        ?.name ?? activeCategory
    );
  }, [activeCategory, catalogue.categories]);

  const fetchNextPage = useCallback(() => {
    if (!hasMore) return;
    setDisplayCount(count => count + PAGE_SIZE);
  }, [hasMore]);

  // The GESTURE owns the spinner, not the query.
  const {refreshing, refresh} = usePullToRefresh(catalogue.refetch);

  return {
    activeCategory,
    setActiveCategory,
    setSearchTerm,
    isSearchActive: searchTerm.trim().length > 0,
    categories: catalogue.categories,
    scopeLabel,
    items,
    hasLoaded: catalogue.hasLoaded,
    isLoading: catalogue.isLoading,
    isLoadingMore: false,
    hasMore,
    error: catalogue.error,
    pageError: null,
    fetchNextPage,
    refetch: catalogue.refetch,
    refreshing,
    refresh,
  };
}
