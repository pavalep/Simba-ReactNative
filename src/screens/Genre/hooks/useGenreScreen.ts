// ─── Genre Screen Hook ──────────────────────────────────────────────────
// V18.11.4: converted from the v3-v9 4-tab pattern
// (local / streaming / moods / radio) to the v10+ "single content
// stream + FAB" pattern.
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
import {getJamendoTracksByGenre} from '../../../services/api/jamendoAdapter';
import {getStationsByGenre} from '../../../services/api/radioBrowserService';
import {useMediaStore, type ScannedTrack} from '../../../state';
import {useToast} from '../../../components/feedback/Toast';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import type {JamendoTrackResult, RadioStationResult} from '../../../types/api';

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
  radioStations: RadioStationResult[];
  radioLoading: boolean;
  radioFailed: boolean;
  retryRadio: () => void;
  handlePlayTrack: (uri: string, title: string) => void;
  handlePlayStreaming: (track: JamendoTrackResult) => void;
  handlePlayStation: (station: RadioStationResult) => void;
  isOnline: boolean;
}

export function useGenreScreen(
  initialGenre: string,
  initialSource: GenreSource = 'local',
): UseGenreScreenResult {
  const allTracks = useMediaStore(s => s.tracks);
  const toast = useToast();
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

  // Surface page-1 streaming failures as a toast.
  if (streaming.error && !streaming.data) {
    // We don't use a useEffect here; the toast would re-fire on
    // every render. The consumer (screen) is responsible for
    // showing the error placeholder.
  }

  // ── Radio stations (V18.11.4: kept accessible but not as a "tab";
  //    a small "Live radio for this genre" link below the streaming
  //    list goes to RadioScreenNew with the genre pre-applied).
  const radio = useApiQuery<RadioStationResult[]>({
    queryKey: ['radioBrowser', 'byGenre', initialGenre, STREAMING_LIMIT],
    queryFn: () => getStationsByGenre(initialGenre, {limit: STREAMING_LIMIT}),
    staleTime: 60_000,
  });

  const retryRadio = useCallback(() => {
    void radio.refetch();
  }, [radio]);

  const handlePlayTrack = useCallback(
    (uri: string, title: string) => {
      // The screen wires this to the player via the consumer.
    },
    [],
  );

  const handlePlayStreaming = useCallback(
    (track: JamendoTrackResult) => {
      // The screen wires this to the player.
    },
    [],
  );

  const handlePlayStation = useCallback(
    (station: RadioStationResult) => {
      // The screen wires this to the player.
    },
    [],
  );

  return {
    genre: initialGenre,
    source,
    setSource,
    localTracks,
    streamingTracks: streaming.data ?? [],
    streamingLoading: streaming.isFetching,
    streamingFailed: !!streaming.error,
    retryStreaming,
    radioStations: radio.data ?? [],
    radioLoading: radio.isFetching,
    radioFailed: !!radio.error,
    retryRadio,
    handlePlayTrack,
    handlePlayStreaming,
    handlePlayStation,
    isOnline,
  };
}
