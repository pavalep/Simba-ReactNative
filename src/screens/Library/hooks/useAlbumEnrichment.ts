// ─── Album Enrichment (MusicBrainz) ─────────────────────────────────────
// P39.3: release-group detail (recordings + CAA cover flag) for an album
// opened from a MusicBrainz discography row; recordings are matched
// against local tracks to count "matched to your library".

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {getReleaseGroupDetail} from '../../../services/api/musicbrainzService';
import {selectAlbumTracks} from '../../../store/slices/mediaSlice';
import {useAppSelector} from '../../../store';
import type {MusicBrainzReleaseGroupDetail} from '../../../types/api';

/** Lowercase, punctuation-collapsed title for fuzzy match (P39.3). */
function normalizeTitle(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface AlbumEnrichment {
  releaseGroup: MusicBrainzReleaseGroupDetail | null;
  isLoading: boolean;
  matchedCount: number;
}

export function useAlbumEnrichment(
  releaseGroupId: string | undefined,
  albumTitle: string,
  artistName: string,
): AlbumEnrichment {
  const localTracks = useAppSelector(state =>
    selectAlbumTracks(state, albumTitle, artistName),
  );
  const [releaseGroup, setReleaseGroup] =
    useState<MusicBrainzReleaseGroupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(!!releaseGroupId);
  const fetchingRef = useRef(false);

  const load = useCallback(async () => {
    if (!releaseGroupId || fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    try {
      const detail = await getReleaseGroupDetail(releaseGroupId);
      setReleaseGroup(detail);
    } catch {
      setReleaseGroup(null);
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [releaseGroupId]);

  useEffect(() => {
    load();
  }, [load]);

  const matchedCount = useMemo(() => {
    if (!releaseGroup || localTracks.length === 0) return 0;
    const localTitles = new Set(localTracks.map(t => normalizeTitle(t.title)));
    return releaseGroup.recordings.filter(r =>
      localTitles.has(normalizeTitle(r.title)),
    ).length;
  }, [releaseGroup, localTracks]);

  return {releaseGroup, isLoading, matchedCount};
}
