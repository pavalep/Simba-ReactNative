// ─── Music Detail Screen Hook ──────────────────────────────────────────
// V18.3.3: migrated to useApiQuery. The discriminated `source`
// (jamendo vs audius) is captured in the queryKey so the cache
// separates the two. The queryFn selects the right adapter based
// on `source` and returns the union type `TrackResult`.

import {useApiQuery} from '../../../hooks/useApiQuery';
import {getJamendoTrackById} from '../../../services/api/jamendoAdapter';
import {getAudiusTrackById} from '../../../services/api/audiusAdapter';
import type {JamendoTrackResult, AudiusTrackResult} from '../../../types/api';

type TrackResult = JamendoTrackResult | AudiusTrackResult | null;

export function useMusicDetailScreen(
  trackId: string,
  source: 'jamendo' | 'audius',
): {track: TrackResult; isLoading: boolean; error: string | null} {
  const {data, isFetching, error} = useApiQuery<TrackResult>({
    queryKey: ['music', 'detail', source, trackId],
    queryFn: async (): Promise<TrackResult> => {
      if (source === 'jamendo') {
        const id = parseInt(trackId, 10);
        if (Number.isNaN(id)) throw new Error('Invalid track ID');
        return (await getJamendoTrackById(id)) ?? null;
      }
      return (await getAudiusTrackById(trackId)) ?? null;
    },
  });

  return {
    track: data ?? null,
    isLoading: isFetching,
    error: error?.message ?? null,
  };
}
