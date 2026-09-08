// ─── Podcast Categories Hook ───────────────────────────────────────────
// V20.4: rewritten on `useApiQuery` per the V18 ideal. The
// pre-V18 implementation was 67 lines with 3 useStates
// (remoteCategories, error, isLoading), 1 useEffect with a
// `cancelled` flag for stale-response cancellation, an inline
// static/remote merge with a Map<id, category> lookup, and a
// `source: 'api' | 'fallback'` derivation. The V18-ideal
// version is ~40 lines: 0 useState, 0 useEffect, 1
// `useApiQuery` for the remote categories, and 1 `useMemo`
// for the static-fallback merge.

import {useMemo} from 'react';
import {PODCAST_CATEGORIES, type PodcastCategory} from '../../../constants/podcastCategories';
import {
  getPodcastCategories,
  type PodcastCategoryResult,
} from '../../../services/api/podcastIndexAdapter';
import {useApiQuery} from '../../../hooks/useApiQuery';

interface PodcastCategoriesState {
  categories: PodcastCategory[];
  isLoading: boolean;
  error: Error | null;
  source: 'api' | 'fallback';
}

/**
 * Loads the Podcast Index category catalog for the browse
 * filter. The static catalog remains a deliberate offline /
 * startup fallback so the filter never disappears when the
 * metadata endpoint is unavailable.
 */
export function usePodcastCategories(): PodcastCategoriesState {
  const q = useApiQuery<PodcastCategoryResult[]>({
    queryKey: ['podcastIndex', 'categories'],
    queryFn: () => getPodcastCategories(),
    staleTime: 5 * 60_000, // categories don't change often
  });

  // Static / remote merge. We merge the static catalog's
  // icons + images with the remote catalog's id + name
  // values — the API returns only id + name, but the
  // static catalog carries the design assets. The result
  // is the API catalog with the static catalog's design
  // overlay (the first item is always the "All" entry).
  const merged = useMemo<PodcastCategory[]>(() => {
    if (!q.data) return PODCAST_CATEGORIES;
    const staticById = new Map(
      PODCAST_CATEGORIES.map(c => [String(c.id), c]),
    );
    const out: PodcastCategory[] = [PODCAST_CATEGORIES[0]];
    for (const cat of q.data) {
      const metadata = staticById.get(String(cat.id));
      if (metadata?.id === 'all') continue;
      out.push({
        id: cat.id,
        name: cat.name,
        icon: metadata?.icon ?? 'micVocal',
        image: metadata?.image ?? PODCAST_CATEGORIES[0].image,
      });
    }
    return out;
  }, [q.data]);

  return {
    categories: merged,
    isLoading: q.isFetching && !q.data,
    error: q.error instanceof Error ? q.error : q.error ? new Error('Category lookup failed') : null,
    source: q.data ? 'api' : 'fallback',
  };
}
