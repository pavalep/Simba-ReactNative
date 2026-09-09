// ─── Genre Screen Hook ──────────────────────────────────────────────────
// V18.11.4: converted from the v3-v9 4-tab pattern
// (local / streaming / moods / radio) to the v10+ "single content
// stream + FAB" pattern.
//
// V18.11.6+post-audit: removed the dead `radio` useApiQuery. The
// "Radio" tab was dropped from the screen in V18.11.4, but the
// hook was still fetching radio stations for data the user never
// saw. Radio browsing now lives entirely in RadioScreenNew; this
// hook only knows about local + streaming.
//
// UX decisions (documented in V18_LEGACY_TABVIEW_CLEANUP.md):
//   - "Local" + "Streaming" are kept as the two main views.
//   - "Moods" was a multi-source Jamendo merge (4-5 tag queries
//     deduped by track id). It was a unique feature but added
//     significant complexity for a single FAB; deferred to a
//     future "Moods" entry-point.
//   - "Radio" duplicated the RadioScreenNew experience. The
//     user can navigate there from the Library/Home tabs.
//
// The "source" field in the genre screen output is now
// ('local' | 'streaming') only.

import {useCallback, useMemo, useState} from 'react';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {getJamendoTracksByGenre} from '../../../infrastructure/api/jamendo/adapter';
import {useMediaStore, type ScannedTrack} from '../../../state';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {JamendoTrackResult} from '../../../types/api';

const STREAMING_LIMIT = 30;

export type GenreSource = 'local' | 'streaming';

export interface UseGenreScreenResult {
  genre: string;
  source: GenreSource;
  setSource: (s: GenreSource) => void;
  localTracks: ScannedTrack[];
  streamingTracks: JamendoTrackResult[];
  streamingLoading: boolean;
  streamingFailed: boolean;
  retryStreaming: () => void;
  isOnline: boolean;
}

export function useGenreScreen(
  initialGenre: string,
  initialSource: GenreSource = 'local',
): UseGenreScreenResult {
  const allTracks = useMediaStore(s => s.tracks);
  const {isOnline} = useNetworkStatus();

  const [source, setSource] = useState<GenreSource>(initialSource);

  // ── Local: pure zustand-derived (no async) ──
  const localTracks = useMemo<ScannedTrack[]>(
    () =>
      allTracks
        .filter(t => t.genre.toLowerCase() === initialGenre.toLowerCase())
        .sort((a, b) => a.title.localeCompare(b.title)),
    [allTracks, initialGenre],
  );

  // ── Streaming: jamendo by genre ──
  const streaming = useApiQuery<JamendoTrackResult[]>({
    queryKey: ['jamendo', 'byGenre', initialGenre, STREAMING_LIMIT],
    queryFn: () => getJamendoTracksByGenre(initialGenre, {limit: STREAMING_LIMIT}),
    staleTime: 60_000,
  });

  const retryStreaming = useCallback(() => {
    void streaming.refetch();
  }, [streaming]);

  return {
    genre: initialGenre,
    source,
    setSource,
    localTracks,
    streamingTracks: streaming.data ?? [],
    streamingLoading: streaming.isFetching,
    streamingFailed: !!streaming.error,
    retryStreaming,
    isOnline,
  };
}
