// ─── Artist Enrichment (MusicBrainz) ────────────────────────────────────
// P39.1/39.2/39.6: search the artist on MusicBrainz, load the discography,
// and surface CAA cover URLs (from the front-cover flag — no extra HEAD
// requests). Any failure degrades to the local-only UI.

import {useEffect, useRef, useState} from 'react';
import {
  searchArtists,
  getArtistDiscography,
} from '../../../services/api/musicbrainzService';
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
  const [artist, setArtist] = useState<MusicBrainzArtist | null>(null);
  const [releases, setReleases] = useState<MusicBrainzRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!artistName.trim() || fetchingRef.current) return;
      fetchingRef.current = true;
      setIsLoading(true);
      try {
        const results = await searchArtists(artistName, {limit: 5});
        if (cancelled || results.length === 0) return;
        // Prefer an exact name match, else the top scoring result.
        const match =
          results.find(
            r => r.name.toLowerCase() === artistName.toLowerCase(),
          ) ?? results[0];
        const discography = await getArtistDiscography(match.id);
        if (cancelled) return;
        setArtist(match);
        setReleases(discography);
      } catch {
        // Graceful local-only fallback: no match, no error UI (P39.6).
      } finally {
        fetchingRef.current = false;
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [artistName]);

  return {artist, releases, isLoading};
}
