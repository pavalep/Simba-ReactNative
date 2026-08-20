import {useEffect, useMemo, useState} from 'react';
import {PODCAST_CATEGORIES, type PodcastCategory} from '../../../constants/podcastCategories';
import {getPodcastCategories} from '../../../services/api/podcastIndexService';

interface PodcastCategoriesState {
  categories: PodcastCategory[];
  isLoading: boolean;
  error: Error | null;
  source: 'api' | 'fallback';
}

/**
 * Loads the Podcast Index category catalog for the browse filter.
 * The static catalog remains a deliberate offline/startup fallback so the
 * filter never disappears when the metadata endpoint is unavailable.
 */
export function usePodcastCategories(): PodcastCategoriesState {
  const [remoteCategories, setRemoteCategories] = useState<PodcastCategory[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPodcastCategories()
      .then(categories => {
        if (cancelled) return;
        const staticById = new Map(
          PODCAST_CATEGORIES.map(category => [String(category.id), category]),
        );
        const merged: PodcastCategory[] = [PODCAST_CATEGORIES[0]];
        for (const category of categories) {
          const metadata = staticById.get(String(category.id));
          if (metadata?.id === 'all') continue;
          merged.push({
            id: category.id,
            name: category.name,
            icon: metadata?.icon ?? 'micVocal',
            image: metadata?.image ?? PODCAST_CATEGORIES[0].image,
          });
        }
        setRemoteCategories(merged);
        setError(null);
      })
      .catch(cause => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error('Category lookup failed'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      categories: remoteCategories ?? PODCAST_CATEGORIES,
      isLoading,
      error,
      source: remoteCategories ? 'api' : 'fallback',
    }),
    [error, isLoading, remoteCategories],
  );
}
