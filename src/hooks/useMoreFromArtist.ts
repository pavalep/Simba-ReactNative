// ─── More From This Artist (streaming) ──────────────────────────────────
// P39.5: Jamendo search by artist name → quick-play streaming rows on
// Song/Album pages. Fails silently — offline just hides the section.

import {useCallback, useEffect, useRef, useState} from 'react';
import {searchJamendoTracks} from '../services/api/jamendoService';
import type {JamendoTrackResult} from '../types/api';

export function useMoreFromArtist(
  artistName: string,
  excludeTrackId?: string,
  limit: number = 6,
): {tracks: JamendoTrackResult[]; isLoading: boolean; retry: () => void} {
  const [tracks, setTracks] = useState<JamendoTrackResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    if (!artistName.trim() || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const results = await searchJamendoTracks(artistName, {limit});
      setTracks(
        excludeTrackId
          ? results.filter(t => String(t.id) !== excludeTrackId)
          : results,
      );
    } catch {
      setTracks([]);
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [artistName, excludeTrackId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(() => {
    load();
  }, [load]);

  return {tracks, isLoading, retry};
}
