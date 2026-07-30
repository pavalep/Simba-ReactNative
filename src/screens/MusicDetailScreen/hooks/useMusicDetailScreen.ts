import {useState, useEffect} from 'react';
import {getJamendoTrackById} from '../../../services/api/jamendoService';
import {getAudiusTrackById} from '../../../services/api/audiusService';
import type {JamendoTrackResult, AudiusTrackResult} from '../../../types/api';

type TrackResult = JamendoTrackResult | AudiusTrackResult | null;

export function useMusicDetailScreen(
  trackId: string,
  source: 'jamendo' | 'audius',
): {track: TrackResult; isLoading: boolean; error: string | null} {
  const [track, setTrack] = useState<TrackResult>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchTrack = async () => {
      try {
        let result: TrackResult = null;

        if (source === 'jamendo') {
          const jamendoId = parseInt(trackId, 10);
          if (isNaN(jamendoId)) {
            throw new Error('Invalid track ID');
          }
          result = (await getJamendoTrackById(jamendoId)) ?? null;
        } else if (source === 'audius') {
          result = (await getAudiusTrackById(trackId)) ?? null;
        }

        if (!cancelled) {
          setTrack(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to load track details',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchTrack();

    return () => {
      cancelled = true;
    };
  }, [trackId, source]);

  return {track, isLoading, error};
}
