// ─── Archive Item Detail Screen Hook ───────────────────────────────────
// Phase 37.5: fetch an Internet Archive audio item + its ordered track
// list. Tracks stream straight into the AudioPlayer (with auto-advance).

import {useState, useEffect, useCallback} from 'react';
import {
  getInternetArchiveItemDetails,
  getArchiveTracks,
} from '../../../services/api/internetArchiveService';
import type {
  InternetArchiveItemResult,
  ArchiveTrack,
} from '../../../types/api';

interface UseArchiveItemDetailScreenReturn {
  item: InternetArchiveItemResult | null;
  tracks: ArchiveTrack[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useArchiveItemDetailScreen(
  identifier: string,
): UseArchiveItemDetailScreenReturn {
  const [item, setItem] = useState<InternetArchiveItemResult | null>(null);
  const [tracks, setTracks] = useState<ArchiveTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemData, trackData] = await Promise.all([
        getInternetArchiveItemDetails(identifier),
        getArchiveTracks(identifier),
      ]);
      if (!itemData) {
        setError('Item not found');
        return;
      }
      setItem(itemData);
      setTracks(trackData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setIsLoading(false);
    }
  }, [identifier]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {item, tracks, isLoading, error, retry: fetchData};
}
