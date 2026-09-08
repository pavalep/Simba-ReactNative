// ────────────────────────────────────────────────────────
// Simba Player — useGenreScreen Hook (Phase 20 / P41)
// P41.1/41.2/41.3: full genre browse — local library,
// Jamendo streaming catalog, mood collections (real tag
// queries), and live radio stations for the genre.
// ────────────────────────────────────────────────────────
//
// V18.3.3: migrated 3 separate useState/useEffect blocks
// (streaming, moods, radio) to 3 useApiQuery calls. The
// radioBrowserService is not V18-migrated yet (Wave 4), so
// it stays imported from the legacy file.

import {useCallback, useMemo, useState} from 'react';
import {useRoute, RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../../navigation/types';
import type {JamendoTrackResult, RadioStationResult} from '../../../types/api';
import { resolveStreamType, usePlayerActivity } from '@simba-dev/react-native-media-player';
import {useApiQuery} from '../../../hooks/useApiQuery';
import {getJamendoTracksByGenre} from '../../../services/api/jamendoAdapter';
import {getStationsByGenre} from '../../../services/api/radioBrowserService';
import {useMediaStore, type ScannedTrack} from '../../../state';
import {
  MOOD_COLLECTIONS,
  type MoodCollection,
} from '../../../constants/moodCollections';

export type GenreBrowseTab = 'local' | 'streaming' | 'moods' | 'radio';

const STREAMING_LIMIT = 30;
const MOOD_TAG_LIMIT = 8;

export interface UseGenreScreenResult {
  genre: string;
  tab: GenreBrowseTab;
  setTab: (tab: GenreBrowseTab) => void;
  localTracks: ScannedTrack[];
  streamingTracks: JamendoTrackResult[];
  streamingLoading: boolean;
  streamingFailed: boolean;
  retryStreaming: () => void;
  moods: MoodCollection[];
  selectedMoodId: string;
  selectMood: (id: string) => void;
  moodTracks: JamendoTrackResult[];
  moodLoading: boolean;
  radioStations: RadioStationResult[];
  radioLoading: boolean;
  radioFailed: boolean;
  retryRadio: () => void;
  handlePlayTrack: (uri: string, title: string) => void;
  handlePlayStreaming: (track: JamendoTrackResult) => void;
  handlePlayStation: (station: RadioStationResult) => void;
}

export function useGenreScreen(): UseGenreScreenResult {
  const {openPlayer} = usePlayerActivity();
  const route = useRoute<RouteProp<RootStackParamList, 'GenreScreen'>>();
  const {genre, initialTab} = route.params;

  const allTracks = useMediaStore(s => s.tracks);

  // P41.1: browse tabs — library / streaming / moods / radio
  const [tab, setTab] = useState<GenreBrowseTab>(initialTab ?? 'local');

  const localTracks = useMemo(
    () =>
      allTracks
        .filter(t => t.genre.toLowerCase() === genre.toLowerCase())
        .sort((a, b) => a.title.localeCompare(b.title)),
    [allTracks, genre],
  );

  // P41.2: streaming catalog for this genre (real Jamendo genre query)
  const streaming = useApiQuery<JamendoTrackResult[]>({
    queryKey: ['jamendo', 'byGenre', genre, STREAMING_LIMIT],
    queryFn: () =>
      getJamendoTracksByGenre(genre, {limit: STREAMING_LIMIT}),
    staleTime: 60_000,
  });

  // P41.3: mood collections — merged real genre/tag queries, no
  // hardcoded track lists. Each mood's tags are fetched in parallel
  // inside the queryFn and deduped by track id. The queryKey includes
  // the mood id so switching moods re-fetches.
  const [selectedMoodId, setSelectedMoodId] = useState<string>(
    MOOD_COLLECTIONS[0]?.id ?? '',
  );
  const selectedMood = useMemo(
    () => MOOD_COLLECTIONS.find(m => m.id === selectedMoodId) ?? null,
    [selectedMoodId],
  );

  const moods = useApiQuery<JamendoTrackResult[]>({
    queryKey: ['jamendo', 'mood', selectedMoodId, selectedMood?.tags.join('|') ?? ''],
    queryFn: async () => {
      if (!selectedMood) return [];
      const results = await Promise.allSettled(
        selectedMood.tags.map(tag =>
          getJamendoTracksByGenre(tag, {limit: MOOD_TAG_LIMIT}),
        ),
      );
      const seen = new Set<number>();
      const merged: JamendoTrackResult[] = [];
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        for (const t of r.value) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            merged.push(t);
          }
        }
      }
      return merged;
    },
    enabled: !!selectedMood,
    staleTime: 60_000,
  });

  const selectMood = useCallback((id: string) => setSelectedMoodId(id), []);

  // P41.4: live radio stations for this genre
  const radio = useApiQuery<RadioStationResult[]>({
    queryKey: ['radioBrowser', 'byGenre', genre, STREAMING_LIMIT],
    queryFn: () =>
      getStationsByGenre(genre, {limit: STREAMING_LIMIT}),
    staleTime: 60_000,
  });

  const handlePlayTrack = useCallback(
    (uri: string, title: string) => {
      openPlayer({
        uri,
        title,
        type: resolveStreamType('music'),
      });
    },
    [openPlayer],
  );

  const handlePlayStreaming = useCallback(
    (track: JamendoTrackResult) => {
      openPlayer({
        uri: track.audioUrl,
        title: track.name,
        type: resolveStreamType('music'),
      });
    },
    [openPlayer],
  );

  const handlePlayStation = useCallback(
    (station: RadioStationResult) => {
      openPlayer({
        uri: station.urlResolved || station.url,
        title: station.name,
        type: resolveStreamType('radio'),
      });
    },
    [openPlayer],
  );

  return {
    genre,
    tab,
    setTab,
    localTracks,
    streamingTracks: streaming.data ?? [],
    streamingLoading: streaming.isFetching,
    streamingFailed: !!streaming.error,
    retryStreaming: () => {
      void streaming.refetch();
    },
    moods: MOOD_COLLECTIONS,
    selectedMoodId,
    selectMood,
    moodTracks: moods.data ?? [],
    moodLoading: moods.isFetching,
    radioStations: radio.data ?? [],
    radioLoading: radio.isFetching,
    radioFailed: !!radio.error,
    retryRadio: () => {
      void radio.refetch();
    },
    handlePlayTrack,
    handlePlayStreaming,
    handlePlayStation,
  };
}
