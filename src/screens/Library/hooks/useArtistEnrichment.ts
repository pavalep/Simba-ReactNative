// ─── Artist Enrichment (MusicBrainz) ────────────────────────────────────
// P39.1/39.2/39.6: search the artist on MusicBrainz, load the discography,
// and surface CAA cover URLs (from the front-cover flag — no extra HEAD
// requests). Any failure degrades to the local-only UI.
//
// V18.3.3: migrated to useApiQuery. The two sequential fetches
// (search → discography) happen inside the queryFn. The graceful
// local-only fallback (P39.6) is preserved by catching errors
// inside the queryFn and returning the empty state — TanStack
// never sees the throw, so `isError` stays false.

import {useApiQuery} from '../../../hooks/useApiQuery';
import {
  searchArtists,
  getArtistDiscography,
} from '../../../services/api/musicbrainzAdapter';
import type {
  MusicBrainzArtist,
  MusicBrainzRelease,
} from '../../../types/api';

export interface ArtistEnrichment {
  artist: MusicBrainzArtist | null;
  releases: MusicBrainzRelease[];
  isLoading: boolean;
}

export function useArtistEnrichment(artistName: string): ArtistEnrichment {
  const {data, isFetching} = useApiQuery<{
    artist: MusicBrainzArtist | null;
    releases: MusicBrainzRelease[];
  }>({
    queryKey: ['musicbrainz', 'artist', artistName],
    queryFn: async () => {
      if (!artistName.trim()) return {artist: null, releases: []};
      try {
        const results = await searchArtists(artistName, {limit: 5});
        if (results.length === 0) return {artist: null, releases: []};
        // Prefer an exact name match, else the top scoring result.
        const match =
          results.find(
            r => r.name.toLowerCase() === artistName.toLowerCase(),
          ) ?? results[0];
        const releases = await getArtistDiscography(match.id);
        return {artist: match, releases};
      } catch {
        // Graceful local-only fallback: no match, no error UI (P39.6).
        return {artist: null, releases: []};
      }
    },
    enabled: artistName.trim().length > 0,
    staleTime: 60 * 60 * 1000,
  });

  return {
    artist: data?.artist ?? null,
    releases: data?.releases ?? [],
    isLoading: isFetching,
  };
}
