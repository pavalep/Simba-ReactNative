// ─── More From This Artist (streaming) ──────────────────────────────────
// P39.5: Jamendo search by artist name → quick-play streaming rows on
// Song/Album pages. Fails silently — offline just hides the section.
//
// V18.3.3: migrated from useState/useEffect/useRef to useApiQuery.
// The "exclude this track id" filter moves into a useMemo (pure
// data transform, no need for it in the queryFn key). The retry
// function wraps TanStack's `refetch`. The `enabled` flag prevents
// the fetch when the artist name is empty (matches the original
// `if (!artistName.trim()) return` guard).

import {useMemo} from 'react';
import {useApiQuery} from './useApiQuery';
import {searchJamendoTracks} from '../services/api/jamendoAdapter';
import type {JamendoTrackResult} from '../types/api';

export function useMoreFromArtist(
  artistName: string,
  excludeTrackId?: string,
  limit: number = 6,
): {tracks: JamendoTrackResult[]; isLoading: boolean; retry: () => void} {
  const enabled = artistName.trim().length > 0;

  const {data, isFetching, refetch} = useApiQuery<JamendoTrackResult[]>({
    queryKey: [
      'jamendo',
      'moreFromArtist',
      artistName,
      excludeTrackId ?? '',
      limit,
    ],
    queryFn: () => searchJamendoTracks(artistName, {limit}),
    enabled,
    staleTime: 60_000,
  });

  const tracks = useMemo(() => {
    if (!data) return [];
    return excludeTrackId
      ? data.filter(t => String(t.id) !== excludeTrackId)
      : data;
  }, [data, excludeTrackId]);

  return {
    tracks,
    isLoading: isFetching,
    retry: () => {
      void refetch();
    },
  };
}
