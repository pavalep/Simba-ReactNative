import {useState, useEffect} from 'react';
import {getPodcastById, getEpisodes} from '../../../services/api/podcastIndexService';
import type {PodcastResult, PodcastEpisodeResult} from '../../../types/api';

interface UsePodcastDetailScreenReturn {
  podcast: PodcastResult | null;
  episodes: PodcastEpisodeResult[];
  isLoading: boolean;
  error: string | null;
}

export function usePodcastDetailScreen(
  podcastId: number,
): UsePodcastDetailScreenReturn {
  const [podcast, setPodcast] = useState<PodcastResult | null>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [podcastData, episodesData] = await Promise.all([
          getPodcastById(podcastId),
          getEpisodes(podcastId),
        ]);

        if (!cancelled) {
          setPodcast(podcastData);
          setEpisodes(episodesData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load podcast',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [podcastId]);

  return {podcast, episodes, isLoading, error};
}
