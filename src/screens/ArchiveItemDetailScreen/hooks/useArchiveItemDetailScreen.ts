// ─── Archive Item Detail Screen Hook ───────────────────────────────────
// Phase 37.5: fetch an Internet Archive audio item + its ordered track
// list. Tracks stream straight into the AudioPlayer (with auto-advance).
//
// V18.5.3: migrated to `useApiQuery` per V18 ideal — 2 parallel
// queries (item + tracks) with `enabled: !!identifier` instead of
// a useState/useEffect/useCallback fetchData pair. The shape of
// the returned object is unchanged so the consumer doesn't move.

import {useApiQuery} from '../../../hooks/useApiQuery';
import {
  getInternetArchiveItemDetails,
  getArchiveTracks,
} from '../../../infrastructure/api/internetArchive/adapter';
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
  const itemQ = useApiQuery<InternetArchiveItemResult | null>({
    queryKey: ['internetArchive', 'item', identifier],
    queryFn: () => getInternetArchiveItemDetails(identifier),
    enabled: !!identifier,
  });

  const tracksQ = useApiQuery<ArchiveTrack[]>({
    queryKey: ['internetArchive', 'tracks', identifier],
    queryFn: () => getArchiveTracks(identifier),
    enabled: !!identifier,
  });

  return {
    item: itemQ.data ?? null,
    tracks: tracksQ.data ?? [],
    isLoading: itemQ.isFetching || tracksQ.isFetching,
    error:
      (itemQ.error as Error | null)?.message ??
      (tracksQ.error as Error | null)?.message ??
      null,
    retry: () => {
      void itemQ.refetch();
      void tracksQ.refetch();
    },
  };
}
