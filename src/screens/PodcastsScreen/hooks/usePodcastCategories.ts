// ─── Podcast Categories Hook ───────────────────────────────────────────
// The Podcasts filter's category shelf.
//
// THE CURATED SET IS THE PRODUCT. Podcast Index's own `/categories/list`
// answers with 112 categories — Sexuality, Buddhism, Baseball, Golf —
// and every one of them is a decision the user should not have to make.
// The app ships a fixed, art-led set of genres with its own cover plates
// and glyphs, and this hook is what hands that set to the sheet.
//
// The live taxonomy is the CHECK, not the catalogue: it confirms that
// the curated ids still exist upstream. A curated genre the live
// taxonomy does not know is DROPPED — the app must never offer a tile
// whose `cat` the API has no category for — but the curated entry's
// own NAME and ASSETS are always kept, so a shelf tile can never be
// labelled with one genre's name and carry another genre's picture.

import {useMemo} from 'react';
import {PODCAST_CATEGORIES, type PodcastCategory} from '../../../constants/podcastCategories';
import {
  getPodcastCategories,
  type PodcastCategoryResult,
} from '../../../infrastructure/api/podcastIndex/adapter';
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

  const merged = useMemo<PodcastCategory[]>(() => {
    // No live taxonomy yet (offline, cold start, or the request
    // failed) — the curated set is the whole answer.
    if (!q.data || q.data.length === 0) return PODCAST_CATEGORIES;
    const liveIds = new Set(q.data.map(c => c.id));
    return PODCAST_CATEGORIES.filter(
      category => category.id === 'all' || liveIds.has(category.id),
    );
  }, [q.data]);

  return {
    categories: merged,
    isLoading: q.isFetching && !q.data,
    error: q.error instanceof Error ? q.error : q.error ? new Error('Category lookup failed') : null,
    source: q.data ? 'api' : 'fallback',
  };
}
