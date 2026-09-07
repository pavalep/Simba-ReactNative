// ────────────────────────────────────────────────────────
// Simba Player — useQueueScreen Hook (Phase 48)
//
// Full-page queue: Now Playing / Up Next / Previously Played
// sections, origin-run-clamped drag reorder, swipe-to-remove,
// cross-type tap-to-jump, and Save Queue as Playlist.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {playlistActions} from '../../../features/playlists';
import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';
import {useHaptics} from '../../../hooks/useHaptics';
import {logger} from '../../../lib/logger';
import type {PlayerQueueItem} from '@simba-dev/react-native-media-player';

import type {PlaylistItem} from '../../../types/playlist';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import type {RootStackScreenProps} from '../../../navigation/types';
import {usePlayerStore, toPlaylistEntry} from '../../../state';
import {
  resolveStreamType,
  usePlayer,
  usePlayerActivity,
  useQueue,
  useQueueItemsAs,
  usePlaybackHistoryAs,
} from '@simba-dev/react-native-media-player';

interface QueueDisplayRow {
  /**
   * V15 Phase 65: a row may come from the module's zustand queue
   * (PlayerQueueItem) or the consumer's `state.player.playlist`
   * (PlaylistEntry). V16 Phase 70: both are normalized to
   * `PlaylistEntry` at the boundary via `toPlaylistEntry()`, so
   * the rest of this file no longer needs `as unknown as` casts.
   */
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
  const haptics = useHaptics();
  const {openPlayer} = usePlayerActivity();

  const currentTrack = usePlayerStore(state => state.currentFile);
  const playlist = usePlayerStore(state => state.playlist);
  // V15 Phase 65: queue + playbackHistory move to the module's
  // zustand store. The component reads via `useQueueItems()` /
  // `usePlaybackHistory()` and dispatches via the `useQueue()`
  // hook's actions.
  const queue = useQueueItemsAs<PlayerQueueItem<MediaSource, MediaKind, MediaLane>>();
  const playbackHistory = usePlaybackHistoryAs<PlayerQueueItem<MediaSource, MediaKind, MediaLane>>();
  const currentIndex = usePlayerStore(state => state.currentIndex);
  // V14 Phase 62: source of truth for isPlaying moves to the module.
  const {state: playerState} = usePlayer();
  // V15 Phase 65: queue actions now come from the module's
  // zustand store, not from Redux.
  const {
    addToQueue: addToQueueAction,
    prependToQueue: prependToQueueAction,
    removeFromQueueByIndex,
    reorderQueue: reorderQueueAction,
    removeFromQueue: removeFromQueueAction,
  } = useQueue();
  const routeLane = route.params?.from === 'video' ? 'video' : 'audio';
  const activeLane: MediaLane = currentTrack?.mediaType ?? routeLane;

  const upNextRows = useMemo<QueueDisplayRow[]>(() => {
    const queuedRows = queue
      .map((entry: PlayerQueueItem<MediaSource, MediaKind, MediaLane>, rawIndex) => ({
        entry: toPlaylistEntry(entry),
        origin: 'queue' as const,
        rawIndex,
      }))
      .filter(row => row.entry.mediaType === activeLane);
    const playlistRows = playlist
      .map((entry, rawIndex) => ({entry, origin: 'playlist' as const, rawIndex}))
      .filter(row => row.rawIndex > currentIndex && row.entry.mediaType === activeLane);
    return [...queuedRows, ...playlistRows];
  }, [activeLane, currentIndex, playlist, queue]);

  const upNext = useMemo(
    () => upNextRows.map(row => row.entry),
    [upNextRows],
  );
  const queueCount = upNextRows.filter(row => row.origin === 'queue').length;

  const history = useMemo(
    () =>
      playbackHistory
        .filter(entry => entry.mediaType === activeLane)
        .reverse()
        .map(entry => toPlaylistEntry(entry)),
    [activeLane, playbackHistory],
  );

  const hasContent = !!currentTrack || upNext.length > 0 || history.length > 0;

  const handleJumpTo = useCallback(
    (entry: PlaylistEntry) => {
      // V16 Phase 70: dropped the `candidate === entry` reference-equality
      // tautology (always false for distinct objects) and the
      // `as unknown as typeof candidate` cast. Field-wise equality is
      // the real identity check. The wide `candidate` shape lets us
      // compare against both `PlayerQueueItem[]` (module queue) and
      // `PlaylistEntry[]` (consumer playlist) with the same function.
      const sameEntry = (
        candidate: {
          uri: string;
          source?: string;
          type?: string;
          mediaType?: string;
          provider?: string;
          folderId?: string;
        },
      ) =>
        candidate.uri === entry.uri &&
        candidate.source === entry.source &&
        candidate.type === entry.type &&
        candidate.mediaType === entry.mediaType &&
        candidate.provider === entry.provider &&
        candidate.folderId === entry.folderId;
      const playlistIdx = playlist.findIndex(sameEntry);
      const queueIdx = queue.findIndex(sameEntry);

      if (playlistIdx >= 0) {
        usePlayerStore.getState().playFromPlaylist(playlistIdx);
      } else if (queueIdx >= 0) {
        removeFromQueueByIndex(queueIdx);
      } else {
        // History-only item: append to the playlist, then play it.
        usePlayerStore.getState().addToPlaylist(entry);
        usePlayerStore.getState().playFromPlaylist(playlist.length);
      }
      try {
        getMpvPlayerModule().loadFile(entry.uri);
      } catch (e) {
        // V16 Phase 73: mpv bridge may be uninitialised when the user
        // taps a history item before the player has been mounted.
        // log + carry on — the openPlayer() call below opens the
        // activity which re-initialises the bridge.
        logger.warn('[useQueueScreen] mpv loadFile failed for', entry.uri, e);
      }

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
          type: resolveStreamType(entry.type),
        });
      }

    },
    [, openPlayer, playlist, queue, route.params?.from, removeFromQueueByIndex],
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
        reorderQueueAction({fromIndex: source.rawIndex, toIndex: destination.rawIndex});
      } else {
        usePlayerStore.getState().reorderPlaylist({fromIndex: source.rawIndex, toIndex: destination.rawIndex});
      }
      haptics.medium();
    },
    [, haptics, upNextRows, reorderQueueAction],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const row = upNextRows[index];
      if (!row) return;
      if (row.origin === 'queue') {
        removeFromQueueAction(row.rawIndex);
      } else {
        usePlayerStore.getState().removeFromPlaylist(row.rawIndex);
      }
      haptics.light();
    },
    [, haptics, upNextRows, removeFromQueueAction],
  );

  const handlePlayNext = useCallback(
    (entry: PlaylistEntry) => {
      prependToQueueAction(entry);
      haptics.light();
    },
    [haptics, prependToQueueAction],
  );

  const handleAddToQueue = useCallback(
    (entry: PlaylistEntry) => {
      addToQueueAction(entry);
      haptics.light();
    },
    [haptics, addToQueueAction],
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
      playlistActions.importPlaylist({name: trimmed, items, kind});
      haptics.medium();
      return true;
    },
    [activeLane, upNext, haptics],
  );

  return {
    currentTrack,
    upNext,
    queueCount,
    history,
    isPlaying: playerState.isPlaying,
    hasContent,
    handleJumpTo,
    handleReorder,
    handleRemove,
    handlePlayNext,
    handleAddToQueue,
    handleSaveAsPlaylist,
  };
}

import type {PlaylistEntry} from '../../../state';
