// ─── Podcasts Screen Hook ────────────────────────────────────────────
// v10.2: Podcasts = Movies replication (⭐ Movies is the reference).
// FAB-only single-select: per-scope cache + infinite scroll + search
// persistence. No tabs — the FAB's FILTER group is the category picker.
//
// Podcast Index paginates via a growing `max` parameter (no true offset):
//   • hasMore = items.length >= maxRequested && maxRequested < MAX
//   • loadMore doubles the window (25 → 50 → 100)
//
// The API exposes no sort parameter — sorting is client-side on the
// loaded slice (copy-then-sort on a memo; never in place). Because the
// sort happens purely in the consumer, `sortKey` is deliberately NOT
// part of the cache key (Music pattern): toggling sort must never
// re-key the scope and waste a refetch.
//
// A "scope" is a ({categoryId, searchTerm}) pair:
//   • picking a category invalidates that id's scope (fresh fetch)
//   • typing a search invalidates the term key (fresh fetch)
//   • revisiting a combination shows its cached list instantly
//
// The 'all' synthetic category (id 'all') is served by /podcasts/trending
// — there's no "browse everything" endpoint in Podcast Index. A search
// term always wins over the category stream.

import {useCallback, useRef, useState} from 'react';
import {searchPodcasts, getTrendingPodcasts} from '../../../services/api/podcastIndexService';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import type {PodcastResult} from '../../../types/api';

const INITIAL_MAX = 25;
export const MAX_RESULTS_PER_QUERY = 100;

/** Podcasts has no true offset — pagination doubles a max window. */
export interface PodcastScopeState {
  items: PodcastResult[];
  /** Current max window size last requested. */
  maxRequested: number;
  hasLoaded: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  /** Snapshot of the inputs that produced this scope — used to detect
   *  when the consumer flips the selection and we need to refetch. */
  categoryId: string;
  term: string;
}

/** Shared immutable empty state — keeps memoized consumers stable. */
export const EMPTY_SCOPE: PodcastScopeState = {
  items: [],
  maxRequested: 0,
  hasLoaded: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  categoryId: 'all',
  term: '',
};

/** Stable cache key — per (category, search term) combination.
 *  Deliberately excludes sortKey: sort is client-side (Music pattern),
 *  so toggling it must never re-key the scope and waste a refetch. */
export function scopeCacheKey(categoryId: string, term: string): string {
  return `${categoryId}|${term.trim()}`;
}

export function dedupe(items: PodcastResult[]): PodcastResult[] {
  const seen = new Set<number>();
  return items.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

/** Client-side sort of the loaded slice (API exposes no sort param).
 *  Pure copy-then-sort — never mutates the input. `recent` proxies via
 *  descending numeric `id` (PodcastResult has no date field; feeds are
 *  added chronologically). `az` = title. undefined = natural order. */
export function sortPodcasts(
  items: PodcastResult[],
  sortKey?: string,
): PodcastResult[] {
  const sorted = [...items];
  if (sortKey === 'recent') {
    sorted.sort((a, b) => b.id - a.id);
  } else if (sortKey === 'az') {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }
  return sorted;
}

/** Resolve a FILTER key (string) back to the category name used as the
 *  search query. Unknown keys fall back to the key itself. */
function categoryNameFor(categoryId: string): string {
  return (
    PODCAST_CATEGORIES.find(c => String(c.id) === categoryId)?.name ??
    categoryId
  );
}

export interface UsePodcastsScreenReturn {
  // search
  searchQuery: string;
  /** Raw (untrimmed) search term — the cache-key component the provider
   *  re-exposes so consumers can key load effects on it. */
  searchTerm: string;
  setSearchQuery: (q: string) => void;
  setSearchTerm: (t: string) => void;
  isSearchActive: boolean;
  // per-scope data + actions
  getScope: (categoryId: string) => PodcastScopeState;
  ensureLoaded: (categoryId: string) => void;
  loadMore: (categoryId: string) => void;
  retry: (categoryId: string) => void;
  refresh: (categoryId: string) => void;
}

export function usePodcastsScreen(): UsePodcastsScreenReturn {
  // ── Search (debounced upstream via SearchBar onDebouncedChange) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [scopes, setScopes] = useState<Record<string, PodcastScopeState>>({});
  /** Monotonic per-key sequence — drops stale/out-of-order responses. */
  const seqRef = useRef<Record<string, number>>({});
  /** In-flight keys — one fetch per scope at a time. */
  const guardRef = useRef<Set<string>>(new Set());

  const isSearchActive = searchTerm.trim().length > 0;

  const keyFor = useCallback(
    (id: string) => scopeCacheKey(id, searchTerm),
    [searchTerm],
  );

  const getScope = useCallback(
    (id: string): PodcastScopeState => scopes[keyFor(id)] ?? EMPTY_SCOPE,
    [scopes, keyFor],
  );

  const patchScope = useCallback(
    (id: string, patch: Partial<PodcastScopeState>) => {
      const key = keyFor(id);
      setScopes(prev => ({
        ...prev,
        [key]: {...(prev[key] ?? EMPTY_SCOPE), ...patch},
      }));
    },
    [keyFor],
  );

  const fetchPage = useCallback(
    async (id: string, max: number, mode: 'initial' | 'more') => {
      const term = searchTerm.trim();
      const key = keyFor(id);
      if (guardRef.current.has(key)) return;
      guardRef.current.add(key);

      const seq = (seqRef.current[key] = (seqRef.current[key] ?? 0) + 1);

      if (mode === 'initial') {
        patchScope(id, {isLoading: true, error: null, term});
      } else {
        patchScope(id, {isLoadingMore: true, error: null, term});
      }

      try {
        // The 'all' synthetic category is served by /podcasts/trending —
        // there's no "browse everything" endpoint in Podcast Index, but
        // trending is a good universal default. A search term wins.
        const isAllCategory = !term && id === 'all';
        const items = isAllCategory
          ? await getTrendingPodcasts(max)
          : await searchPodcasts(term || categoryNameFor(id), max);

        if (seq !== (seqRef.current[key] ?? 0)) return; // stale response

        setScopes(prev => {
          const cur = prev[key] ?? EMPTY_SCOPE;
          return {
            ...prev,
            [key]: {
              ...cur,
              categoryId: id,
              term,
              items:
                mode === 'more'
                  ? dedupe([...cur.items, ...items])
                  : items,
              maxRequested: max,
              hasLoaded: true,
              isLoading: false,
              isLoadingMore: false,
              error: null,
            },
          };
        });
      } catch (err) {
        if (seq !== (seqRef.current[key] ?? 0)) return;
        patchScope(id, {
          isLoading: false,
          isLoadingMore: false,
          error:
            err instanceof Error ? err.message : 'Failed to load podcasts',
        });
      } finally {
        guardRef.current.delete(key);
      }
    },
    [searchTerm, patchScope, keyFor],
  );

  /** Load the first window for a category if it isn't loaded yet (mount). */
  const ensureLoaded = useCallback(
    (id: string) => {
      const scope = getScope(id);
      if (scope.hasLoaded || scope.isLoading) return;
      fetchPage(id, INITIAL_MAX, 'initial');
    },
    [getScope, fetchPage],
  );

  /** Infinite scroll: grow the max window when available. */
  const lastLoadMoreAtRef = useRef<Record<string, number>>({});
  const loadMore = useCallback(
    (id: string) => {
      const scope = getScope(id);
      const max = scope.maxRequested || INITIAL_MAX;
      if (!scope.hasLoaded || scope.isLoading || scope.isLoadingMore) return;
      if (scope.items.length < max || max >= MAX_RESULTS_PER_QUERY) return;

      const now = Date.now();
      const lastAt = lastLoadMoreAtRef.current[keyFor(id)] ?? 0;
      if (now - lastAt < 600) return;
      lastLoadMoreAtRef.current[keyFor(id)] = now;

      fetchPage(id, max * 2, 'more');
    },
    [getScope, fetchPage, keyFor],
  );

  /** Re-fetch the first window after an error (invalidates stale in-flight seq). */
  const retry = useCallback(
    (id: string) => {
      const key = keyFor(id);
      seqRef.current[key] = (seqRef.current[key] ?? 0) + 1;
      setScopes(prev => {
        const cur = prev[key];
        if (!cur) return prev;
        return {
          ...prev,
          [key]: {...cur, items: [], hasLoaded: false, error: null},
        };
      });
      fetchPage(id, INITIAL_MAX, 'initial');
    },
    [keyFor, fetchPage],
  );

  /** Pull-to-refresh: re-fetch the first window while KEEPING items visible. */
  const refresh = useCallback(
    (id: string) => {
      const scope = getScope(id);
      if (scope.isLoading || scope.isLoadingMore) return;
      fetchPage(id, INITIAL_MAX, 'initial');
    },
    [getScope, fetchPage],
  );

  return {
    searchQuery,
    searchTerm,
    setSearchQuery,
    setSearchTerm,
    isSearchActive,
    getScope,
    ensureLoaded,
    loadMore,
    retry,
    refresh,
  };
}
