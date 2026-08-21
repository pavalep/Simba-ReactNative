// ────────────────────────────────────────────────────────
// Simba Player — useQueueScreen Hook (Phase 48)
//
// Full-page queue: Now Playing / Up Next / Previously Played
// sections, origin-run-clamped drag reorder, swipe-to-remove,
// cross-type tap-to-jump, and Save Queue as Playlist.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '../../../store';
import {
  addToPlaylist,
  addToQueue,
  playFromPlaylist,
  playFromQueue,
  prependToQueue,
  removeFromPlaylist,
  removeFromQueue,
  reorderPlaylist,
  reorderQueue,
} from '../../../store/slices/playerSlice';
import {playlistActions} from '../../../features/playlists';
import {MpvPlayer} from '../../../native';
import {useHaptics} from '../../../hooks/useHaptics';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';
import type {PlaylistItem} from '../../../types/playlist';
import type {MediaLane} from '../../../types/media';
import type {RootStackScreenProps} from '../../../navigation/types';
import {usePlaybackCommands} from '../../../modules/playback';

interface QueueDisplayRow {
  entry: PlaylistEntry;
  origin: 'queue' | 'playlist';
  rawIndex: number;
}

export interface UseQueueScreenResult {

  /** Currently playing track (Now Playing section) */
  currentTrack: PlaylistEntry | null;
  /** Combined Up Next list: explicit queue first, then remaining playlist */
  upNext: PlaylistEntry[];
  /** How many leading upNext items belong to the explicit queue run */
  queueCount: number;
  /** Previously played, newest first */
  history: PlaylistEntry[];
  isPlaying: boolean;
  hasContent: boolean;
  /** P48.3/48.8: play an entry and open the matching player when needed */
  handleJumpTo: (entry: PlaylistEntry) => void;
  /** P48.2: reorder inside the combined Up Next list (origin-run-clamped) */
  handleReorder: (fromIndex: number, toIndex: number) => void;
  /** P48.2: remove an Up Next item (queue or playlist run) */
  handleRemove: (index: number) => void;
  handlePlayNext: (entry: PlaylistEntry) => void;
  handleAddToQueue: (entry: PlaylistEntry) => void;
  /** P48.5: persist the current Up Next list as a user playlist */
  handleSaveAsPlaylist: (name: string) => boolean;
}

export function useQueueScreen(): UseQueueScreenResult {
  const navigation =
    useNavigation<RootStackScreenProps<'Queue'>['navigation']>();
  const route = useRoute<RootStackScreenProps<'Queue'>['route']>();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const {openPlayer} = usePlaybackCommands();

  const currentTrack = useAppSelector(state => state.player.currentFile);
  const playlist = useAppSelector(state => state.player.playlist);
  const queue = useAppSelector(state => state.player.queue);
  const playbackHistory = useAppSelector(state => state.player.playbackHistory);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const playbackState = useAppSelector(state => state.player.playbackState);
  const routeLane = route.params?.from === 'video' ? 'video' : 'audio';
  const activeLane: MediaLane = currentTrack?.mediaType ?? routeLane;

  const upNextRows = useMemo<QueueDisplayRow[]>(() => {
    const queuedRows = queue
      .map((entry, rawIndex) => ({entry, origin: 'queue' as const, rawIndex}))
      .filter(row => row.entry.mediaType === activeLane);
    const playlistRows = playlist
      .map((entry, rawIndex) => ({entry, origin: 'playlist' as const, rawIndex}))
      .filter(row => row.rawIndex > currentIndex && row.entry.mediaType === activeLane);
    return [...queuedRows, ...playlistRows];
  }, [activeLane, currentIndex, playlist, queue]);

  const upNext = useMemo(() => upNextRows.map(row => row.entry), [upNextRows]);
  const queueCount = upNextRows.filter(row => row.origin === 'queue').length;

  const history = useMemo(
    () => playbackHistory.filter(entry => entry.mediaType === activeLane).reverse(),
    [activeLane, playbackHistory],
  );

  const hasContent = !!currentTrack || upNext.length > 0 || history.length > 0;

  const handleJumpTo = useCallback(
    (entry: PlaylistEntry) => {
      const sameEntry = (candidate: PlaylistEntry) =>
        candidate === entry ||
        (candidate.uri === entry.uri &&
          candidate.source === entry.source &&
          candidate.type === entry.type &&
          candidate.mediaType === entry.mediaType &&
          candidate.provider === entry.provider &&
          candidate.folderId === entry.folderId);
      const playlistIdx = playlist.findIndex(sameEntry);
      const queueIdx = queue.findIndex(sameEntry);

      if (playlistIdx >= 0) {
        dispatch(playFromPlaylist(playlistIdx));
      } else if (queueIdx >= 0) {
        dispatch(playFromQueue(queueIdx));
      } else {
        // History-only item: append to the playlist, then play it.
        dispatch(addToPlaylist(entry));
        dispatch(playFromPlaylist(playlist.length));
      }
      try {
        MpvPlayer.loadFile(entry.uri);
      } catch {}

      // Open the matching player unless we are already inside that lane.
      // Forward the complete classification so resume, badges, and local-folder
      // identity survive a queue jump.
      const from = route.params?.from ?? 'mini';
      const sameContext =
        (entry.mediaType === 'audio' && from === 'audio') ||
        (entry.mediaType === 'video' && from === 'video');
      if (!sameContext) {
        openPlayer({
          uri: entry.uri,
          title: entry.title,
          duration: entry.duration,
          source: entry.source,
          type: entry.type,
          mediaType: entry.mediaType,
          provider: entry.provider,
          folderId: entry.folderId,
        });
      }

    },
    [dispatch, openPlayer, playlist, queue, route.params?.from],
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const source = upNextRows[fromIndex];
      if (!source) return;
      const boundedTarget = Math.max(0, Math.min(upNextRows.length - 1, toIndex));
      const sameOriginRows = upNextRows.filter(row => row.origin === source.origin);
      const sourcePosition = sameOriginRows.findIndex(row => row.rawIndex === source.rawIndex);
      if (sourcePosition < 0) return;

      const targetRow = upNextRows[boundedTarget];
      const targetPosition = targetRow?.origin === source.origin
        ? sameOriginRows.findIndex(row => row.rawIndex === targetRow.rawIndex)
        : boundedTarget < fromIndex
          ? 0
          : sameOriginRows.length - 1;
      const destination = sameOriginRows[Math.max(0, Math.min(sameOriginRows.length - 1, targetPosition))];
      if (!destination || destination.rawIndex === source.rawIndex) return;

      if (source.origin === 'queue') {
        dispatch(reorderQueue({fromIndex: source.rawIndex, toIndex: destination.rawIndex}));
      } else {
        dispatch(reorderPlaylist({fromIndex: source.rawIndex, toIndex: destination.rawIndex}));
      }
      haptics.medium();
    },
    [dispatch, haptics, upNextRows],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const row = upNextRows[index];
      if (!row) return;
      if (row.origin === 'queue') {
        dispatch(removeFromQueue(row.rawIndex));
      } else {
        dispatch(removeFromPlaylist(row.rawIndex));
      }
      haptics.light();
    },
    [dispatch, haptics, upNextRows],
  );

  const handlePlayNext = useCallback(
    (entry: PlaylistEntry) => {
      dispatch(prependToQueue(entry));
      haptics.light();
    },
    [dispatch, haptics],
  );

  const handleAddToQueue = useCallback(
    (entry: PlaylistEntry) => {
      dispatch(addToQueue(entry));
      haptics.light();
    },
    [dispatch, haptics],
  );

  const handleSaveAsPlaylist = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || upNext.length === 0) return false;
      const now = new Date().toISOString();
      const items: PlaylistItem[] = upNext.map((entry, i) => ({
        id: `q_${Date.now()}_${i}`,
        fileUri: entry.uri,
        title: entry.title,
        duration: entry.duration,
        source: entry.source,
        type: entry.type,
        mediaType: entry.mediaType,
        ...(entry.provider ? {provider: entry.provider} : {}),
        ...(entry.folderId ? {folderId: entry.folderId} : {}),
        addedAt: now,
      }));
      const kind = activeLane === 'video' ? 'VIDEO_ONLY' : 'AUDIO_ONLY';
      dispatch(playlistActions.importPlaylistAction({name: trimmed, items, kind}));
      haptics.medium();
      return true;
    },
    [activeLane, upNext, dispatch, haptics],
  );

  return {
    currentTrack,
    upNext,
    queueCount,
    history,
    isPlaying: playbackState === 'playing',
    hasContent,
    handleJumpTo,
    handleReorder,
    handleRemove,
    handlePlayNext,
    handleAddToQueue,
    handleSaveAsPlaylist,
  };
}
