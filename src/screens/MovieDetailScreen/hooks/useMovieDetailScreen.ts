// ─── Movie Detail Screen Hook ────────────────────────────────────────────
// Fetches detailed info about an Internet Archive movie by identifier.

import {useState, useEffect, useCallback} from 'react';
import {getInternetArchiveVideoDetails} from '../../../services/api/internetArchiveService';
import type {InternetArchiveVideoResult} from '../../../types/api';

export function useMovieDetailScreen(identifier: string) {
  const [item, setItem] = useState<InternetArchiveVideoResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getInternetArchiveVideoDetails(identifier);
      if (result) {
        setItem(result);
      } else {
        setError('Movie not found');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load movie details',
      );
    } finally {
      setIsLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {item, isLoading, error, retry: fetchDetails};
}
