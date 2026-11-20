// ─── Genre — data hook ─────────────────────────────────────────────────
//
// WAVE B16 (Wave B2) — rewritten.
//
// V18.11.4: converted from the v3-v9 4-tab pattern
// (local / streaming / moods / radio) to the v10+ "single content
// stream + FAB" pattern.
//
// V18.11.6+post-audit: removed the dead `radio` useApiQuery. The
// "Radio" tab was dropped from the screen in V18.11.4, but the
// hook was still fetching radio stations for data the user never
// saw. Radio browsing now lives entirely in RadioScreen; this
// hook only knows about local + streaming.
//
// UX decisions (documented in V18_LEGACY_TABVIEW_CLEANUP.md):
//   - "Local" + "Streaming" are kept as the two main views.
//   - "Moods" was a multi-source Jamendo merge (4-5 tag queries
//     deduped by track id). It was a unique feature but added
//     significant complexity for a single FAB; deferred to a
//     future "Moods" entry-point.
//   - "Radio" duplicated the RadioScreen experience. The
//     user can navigate there from the Library/Home tabs.
//
// The SOURCE is no longer owned by this hook: it is the page's own
// toggle, and the provider owns it, so this hook is a pure function
// of {genre, source}.

import {useCallback, useMemo} from 'react';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {
  getJamendoTracksByGenre,
  JAMENDO_RETRIES,
} from '../../../infrastructure/api/jamendo/adapter';
import {useMediaStore, type ScannedTrack} from '../../../state';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import type {JamendoTrackResult} from '../../../types/api';

const STREAMING_LIMIT = 30;

export type GenreSource = 'local' | 'streaming';

export interface UseGenreScreenParams {
  /** The genre the page is about. */
  genre: string;
};

export interface UseGenreScreenResult {
  localTracks: ScannedTrack[];
  streamingTracks: JamendoTrackResult[];
  streamingLoading: boolean;
  streamingFailed: boolean;
  retryStreaming: () => void;
  isOnline: boolean;
  /** Play a track from the device's own library. */
  playLocalTrack: (track: ScannedTrack) => void;
  /** Play a track from the streaming catalogue. */
  playStreamingTrack: (track: JamendoTrackResult) => void;
};

export function useGenreScreen({
  genre,
}: UseGenreScreenParams): UseGenreScreenResult {
  const allTracks = useMediaStore(s => s.tracks);
  const {isOnline} = useNetworkStatus();
  const {openPlayer} = useResumeAwareLaunch();

  // ── Local: pure zustand-derived (no async) ──
  const localTracks = useMemo<ScannedTrack[]>(
    () =>
      allTracks
        .filter(t => t.genre.toLowerCase() === genre.toLowerCase())
        .sort((a, b) => a.title.localeCompare(b.title)),
    [allTracks, genre],
  );

  // ── Streaming: jamendo by genre ──
  //
  // The catalogue is fetched for BOTH sources, the way it always was:
  // the toggle switches what is SHOWN, and a catalogue that is already
  // in flight when the user switches over is one they do not wait for
  // again.
  const streaming = useApiQuery<JamendoTrackResult[]>({
    queryKey: ['jamendo', 'byGenre', genre, STREAMING_LIMIT],
    queryFn: () => getJamendoTracksByGenre(genre, {limit: STREAMING_LIMIT}),
    staleTime: 60_000,
    retry: JAMENDO_RETRIES,
  });

  const retryStreaming = useCallback(() => {
    void streaming.refetch();
  }, [streaming]);

  const playLocalTrack = useCallback(
    (track: ScannedTrack) => {
      openPlayer({uri: track.uri, title: track.title, type: resolveStreamType('music')});
    },
    [openPlayer],
  );

  const playStreamingTrack = useCallback(
    (track: JamendoTrackResult) => {
      openPlayer({
        uri: track.audioUrl,
        title: track.name,
        type: resolveStreamType('music'),
      });
    },
    [openPlayer],
  );

  return {
    localTracks,
    streamingTracks: streaming.data ?? [],
    streamingLoading: streaming.isFetching,
    streamingFailed: !!streaming.error,
    retryStreaming,
    isOnline,
    playLocalTrack,
    playStreamingTrack,
  };
}