// ────────────────────────────────────────────────────────
// Simba Player — useQueueScreen Hook (Phase 48)
//
// Full-page queue: Now Playing / Up Next / Previously Played
// sections, origin-run-clamped drag reorder, swipe-to-remove,
// cross-type tap-to-jump, and Save Queue as Playlist.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAppSelector, useAppDispatch} from '../../store';
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
} from '../../store/slices/playerSlice';
import {importPlaylist} from '../../store/slices/playlistSlice';
import {MpvPlayer} from '../../native';
import {useHaptics} from '../../hooks/useHaptics';
import type {PlaylistEntry} from '../../store/slices/playerSlice';
import type {PlaylistItem} from '../../types/playlist';
import type {RootStackScreenProps} from '../../navigation/types';

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

  const currentTrack = useAppSelector(state => state.player.currentFile);
  const playlist = useAppSelector(state => state.player.playlist);
  const queue = useAppSelector(state => state.player.queue);
  const playbackHistory = useAppSelector(state => state.player.playbackHistory);
  const currentIndex = useAppSelector(state => state.player.currentIndex);
  const playbackState = useAppSelector(state => state.player.playbackState);

  const queueCount = queue.length;

  // Up Next = explicit queue first, then everything after the current track.
  const upNext = useMemo(
    () => [...queue, ...playlist.slice(currentIndex + 1)],
    [queue, playlist, currentIndex],
  );

  const history = useMemo(() => [...playbackHistory].reverse(), [playbackHistory]);

  const hasContent = !!currentTrack || upNext.length > 0 || history.length > 0;

  const handleJumpTo = useCallback(
    (entry: PlaylistEntry) => {
      const playlistIdx = playlist.findIndex(e => e.uri === entry.uri);
      const queueIdx = queue.findIndex(e => e.uri === entry.uri);
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
      // Cross-type jump: open the matching player unless we're already
      // inside it (the mounted player reacts to mpv's onFileLoaded event).
      const target = entry.mediaType === 'video' ? 'VideoPlayer' : 'AudioPlayer';
      const from = route.params?.from ?? 'mini';
      const sameContext =
        (target === 'AudioPlayer' && from === 'audio') ||
        (target === 'VideoPlayer' && from === 'video');
      if (!sameContext) {
        navigation.navigate(target, {fileUri: entry.uri, fileTitle: entry.title});
      }
    },
    [dispatch, playlist, queue, route.params?.from, navigation],
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= upNext.length) return;
      const target = Math.max(0, Math.min(upNext.length - 1, toIndex));
      if (fromIndex < queueCount) {
        // Queue run: clamp inside the queue so items keep their origin.
        const clamped = Math.max(0, Math.min(queueCount - 1, target));
        if (clamped === fromIndex) return;
        dispatch(reorderQueue({fromIndex, toIndex: clamped}));
      } else {
        // Playlist run: map back to playlist indices (after the current track).
        const plFrom = currentIndex + 1 + (fromIndex - queueCount);
        const clamped = Math.max(queueCount, Math.min(upNext.length - 1, target));
        const plTo = currentIndex + 1 + (clamped - queueCount);
        if (plTo === plFrom) return;
        dispatch(reorderPlaylist({fromIndex: plFrom, toIndex: plTo}));
      }
      haptics.medium();
    },
    [upNext.length, queueCount, currentIndex, dispatch, haptics],
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (index < queueCount) {
        dispatch(removeFromQueue(index));
      } else {
        dispatch(removeFromPlaylist(currentIndex + 1 + (index - queueCount)));
      }
      haptics.light();
    },
    [queueCount, currentIndex, dispatch, haptics],
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
        mediaType: entry.mediaType,
        addedAt: now,
      }));
      const kind = items.some(i => i.mediaType === 'video') ? 'MIXED' : 'AUDIO_ONLY';
      dispatch(importPlaylist({name: trimmed, items, kind}));
      haptics.medium();
      return true;
    },
    [upNext, dispatch, haptics],
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
