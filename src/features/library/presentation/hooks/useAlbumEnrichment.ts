// ─── Album Enrichment (MusicBrainz) ─────────────────────────────────────
// P39.3: release-group detail (recordings + CAA cover flag) for an album
// opened from a MusicBrainz discography row; recordings are matched
// against local tracks to count "matched to your library".
//
// V18.3.3: migrated from useState/useEffect/useRef to useApiQuery.
// The zustand-derived `localTracks` selector stays as-is (it's
// a read-only snapshot, not async data). The `matchedCount`
// memo stays as-is (it's a pure derivation over the query data
// + zustand state). The `enabled: !!releaseGroupId` guard
// replaces the original `if (!releaseGroupId) return` early
// exit — TanStack skips the query entirely.

import {useMemo} from 'react';
import {useApiQuery} from '../../../../hooks/useApiQuery';
import {getReleaseGroupDetail} from '../../../../infrastructure/api/musicbrainz/adapter';
import type {MusicBrainzReleaseGroupDetail} from '../../../../types/api';
import {useMediaStore} from '../../../../state';

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
  const localTracks = useMediaStore(s =>
    s.tracks
      .filter(
        t =>
          (t.album || 'Unknown Album').toLowerCase() === albumTitle.toLowerCase() &&
          (t.artist || 'Unknown Artist').toLowerCase() === artistName.toLowerCase(),
      )
      .sort((a, b) => a.trackNumber - b.trackNumber),
  );

  const {data: releaseGroup, isFetching} = useApiQuery<MusicBrainzReleaseGroupDetail | null>({
    queryKey: ['musicbrainz', 'releaseGroup', releaseGroupId ?? ''],
    queryFn: () =>
      releaseGroupId
        ? getReleaseGroupDetail(releaseGroupId)
        : Promise.resolve(null),
    enabled: !!releaseGroupId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const matchedCount = useMemo(() => {
    if (!releaseGroup || localTracks.length === 0) return 0;
    const localTitles = new Set(localTracks.map(t => normalizeTitle(t.title)));
    return releaseGroup.recordings.filter(r =>
      localTitles.has(normalizeTitle(r.title)),
    ).length;
  }, [releaseGroup, localTracks]);

  return {releaseGroup: releaseGroup ?? null, isLoading: isFetching, matchedCount};
}
