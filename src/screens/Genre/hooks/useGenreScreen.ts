// ────────────────────────────────────────────────────────
// Simba Player — useGenreScreen Hook (Phase 20 / P41)
// P41.1/41.2/41.3: full genre browse — local library,
// Jamendo streaming catalog, mood collections (real tag
// queries), and live radio stations for the genre.
// ────────────────────────────────────────────────────────

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useAppSelector} from '../../../store';
import {selectAllTracks} from '../../../store/slices/mediaSlice';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import type {RootStackParamList} from '../../../navigation/types';
import type {JamendoTrackResult, RadioStationResult} from '../../../types/api';
import {getJamendoTracksByGenre} from '../../../services/api/jamendoService';
import {getStationsByGenre} from '../../../services/api/radioBrowserService';
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
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'GenreScreen'>>();
  const {genre, initialTab} = route.params;

  const allTracks = useAppSelector(selectAllTracks);

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
  const [streamingTracks, setStreamingTracks] = useState<JamendoTrackResult[]>(
    [],
  );
  const [streamingLoading, setStreamingLoading] = useState(true);
  const [streamingFailed, setStreamingFailed] = useState(false);
  const [streamingAttempt, setStreamingAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStreamingLoading(true);
    setStreamingFailed(false);
    getJamendoTracksByGenre(genre, {limit: STREAMING_LIMIT})
      .then(list => {
        if (!cancelled) setStreamingTracks(list);
      })
      .catch(() => {
        if (!cancelled) setStreamingFailed(true);
      })
      .finally(() => {
        if (!cancelled) setStreamingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [genre, streamingAttempt]);

  const retryStreaming = useCallback(
    () => setStreamingAttempt(n => n + 1),
    [],
  );

  // P41.3: mood collections — merged real genre/tag queries, no hardcoded
  // track lists. Each mood's tags are fetched and deduped by track id.
  const [selectedMoodId, setSelectedMoodId] = useState<string>(
    MOOD_COLLECTIONS[0]?.id ?? '',
  );
  const [moodTracks, setMoodTracks] = useState<JamendoTrackResult[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  const selectedMood = useMemo(
    () => MOOD_COLLECTIONS.find(m => m.id === selectedMoodId) ?? null,
    [selectedMoodId],
  );

  useEffect(() => {
    if (!selectedMood) return;
    let cancelled = false;
    setMoodLoading(true);
    Promise.allSettled(
      selectedMood.tags.map(tag =>
        getJamendoTracksByGenre(tag, {limit: MOOD_TAG_LIMIT}),
      ),
    )
      .then(results => {
        if (cancelled) return;
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
        setMoodTracks(merged);
      })
      .finally(() => {
        if (!cancelled) setMoodLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMood]);

  const selectMood = useCallback((id: string) => setSelectedMoodId(id), []);

  // P41.4: live radio stations for this genre (keeps RadioScreen's
  // genre browsing reachable from the genre detail hub).
  const [radioStations, setRadioStations] = useState<RadioStationResult[]>([]);
  const [radioLoading, setRadioLoading] = useState(true);
  const [radioFailed, setRadioFailed] = useState(false);
  const [radioAttempt, setRadioAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRadioLoading(true);
    setRadioFailed(false);
    getStationsByGenre(genre, {limit: STREAMING_LIMIT})
      .then(list => {
        if (!cancelled) setRadioStations(list);
      })
      .catch(() => {
        if (!cancelled) setRadioFailed(true);
      })
      .finally(() => {
        if (!cancelled) setRadioLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [genre, radioAttempt]);

  const retryRadio = useCallback(() => setRadioAttempt(n => n + 1), []);

  const handlePlayTrack = useCallback(
    (uri: string, title: string) => {
      navigation.navigate('AudioPlayer', {fileUri: uri, fileTitle: title});
    },
    [navigation],
  );

  const handlePlayStreaming = useCallback(
    (track: JamendoTrackResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: track.audioUrl,
        fileTitle: track.name,
        artworkUri: track.imageUrl || undefined,
        source: 'jamendo',
      });
    },
    [navigation],
  );

  const handlePlayStation = useCallback(
    (station: RadioStationResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: station.urlResolved || station.url,
        fileTitle: station.name,
        artworkUri: station.favicon || undefined,
        source: 'radio',
      });
    },
    [navigation],
  );

  return {
    genre,
    tab,
    setTab,
    localTracks,
    streamingTracks,
    streamingLoading,
    streamingFailed,
    retryStreaming,
    moods: MOOD_COLLECTIONS,
    selectedMoodId,
    selectMood,
    moodTracks,
    moodLoading,
    radioStations,
    radioLoading,
    radioFailed,
    retryRadio,
    handlePlayTrack,
    handlePlayStreaming,
    handlePlayStation,
  };
}
