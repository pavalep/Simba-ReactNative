// ────────────────────────────────────────────────────────
// Simba Player — useQueueScreen Hook (Phase 48)
//
// Full-page queue: Now Playing / Up Next / Previously Played
// sections, drag reorder, swipe-to-remove, tap-to-jump, and
// Save Queue as Playlist.
//
// WAVE B16 (Wave D) — the four queue behaviours, all closed here:
//
//   - B15-Q8 — the explicit queue and the RUN were shown as ONE
//     "Up Next" list, with two different origins and no way to tell
//     them apart. They are two lists now: the queue is what the user
//     asked for, the run's tail is what the album they launched still
//     has left.
//   - B15-Q5 — the jump went straight to the bridge's `loadFile`,
//     which bypassed the launch seam. It goes through the seam now.
//   - B15-Q2 — the lib's `clearQueue` and `shuffleQueue` were never
//     called by anything in the app. They are the Up Next section's
//     actions now.
//   - B15-Q3 — the queue's durable copy lives in
//     `src/infrastructure/player/queuePersistence.ts`.
// ────────────────────────────────────────────────────────

import {useCallback, useMemo} from 'react';
import {playlistActions, playlistKindForItems, CROSS_LANE_QUEUE_REASON} from '../../../features/playlists';
import {useHaptics} from '../../../hooks/useHaptics';
import {useToast} from '../../../components/feedback/Toast';
import type {PlayerQueueItem} from '../../../infrastructure/player';

import type {PlaylistItem} from '../../../types/playlist';
import type {MediaKind, MediaLane, MediaSource} from '../../../types/media';
import {usePlayerStore, toPlaylistEntry, useRecentHistoryStore} from '../../../state';
import {
  usePlayer,
  usePlay,
  isNetworkError,
  isUnsupportedError,
  isExpiredError,
  isBlockedError,
  useQueue,
  useQueueItemsAs,
} from '../../../infrastructure/player';

/**
 * Where a row came from.
 *
 * `queue` is the EXPLICIT queue — what "Play Next" and "Add to Queue"
 * wrote. `playlist` is the RUN's tail — the rest of the album or
 * playlist the user launched. `history` is the app's own "Previously
 * Played".
 */
export type QueueRowOrigin = 'queue' | 'playlist' | 'history';

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
  /** The index in ITS OWN list — the lib's queue, or the run's playlist. */
  rawIndex: number;
}

/**
 * A row plus the key it is rendered under.
 *
 * The key must be unique WITHIN a section, and the same track can be
 * queued TWICE — the queue is a list of tracks, not a set. So the key
 * carries the track's identity and an OCCURRENCE counter: the first
 * copy of a track is `#0`, the second `#1`.
 *
 * Without it two copies of one track collided on a single key and
 * React said so: "Encountered two children with the same key".
 *
 * The counter is deliberate rather than the row's INDEX: an index
 * changes when the queue is reordered, which remounts the row that
 * moved. The occurrence survives a reorder.
 */
export type QueueRow = PlaylistEntry & {rowKey: string};

function queueEntryKey(item: PlaylistEntry): string {
  return [
    item.uri,
    item.source,
    item.type,
    item.mediaType,
    item.provider ?? '',
    item.folderId ?? '',
  ].join('|');
}

/**
 * Give every row of a list a key that is unique within that list.
 *
 * Exported so the screen and its test share ONE owner of the rule:
 * the screen renders it, the test pins it.
 */
export function withRowKeys(rows: PlaylistEntry[]): QueueRow[] {
  const seen = new Map<string, number>();
  return rows.map(row => {
    const base = queueEntryKey(row);
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return {...row, rowKey: `${base}#${occurrence}`};
  });
}

export interface UseQueueScreenResult {
  /** Currently playing track (Now Playing section) */
  currentTrack: PlaylistEntry | null;
  /**
   * The EXPLICIT queue — the tracks the user asked to play next.
   *
   * Its own section (B15-Q8). The queue is the user's own list: what
   * "Play Next" and "Add to Queue" wrote.
   */
  queueRows: PlaylistEntry[];
  /**
   * The RUN's tail — the rest of what is playing.
   *
   * Its own section (B15-Q8). The run has no name anywhere in the app
   * (`PlayerState` carries no playlist title), so the section is
   * labelled neutrally and the screen never invents one.
   */
  runRows: PlaylistEntry[];
  /**
   * Everything that plays next: the explicit queue first, then the
   * run's tail.
   *
   * That order is the PLAYBACK order — the transport's next button
   * plays the queue's head before the run's tail — so this list and
   * the engine agree.
   */
  upNext: PlaylistEntry[];
  /** Previously played, newest first */
  history: PlaylistEntry[];
  isPlaying: boolean;
  hasContent: boolean;
  /**
   * P48.3/48.8: play an entry and open the matching player when needed
   *
   * `index` is the row's index WITHIN ITS OWN SECTION, which is what
   * makes the jump exact: the same track can sit in the queue AND in
   * the run, and an identity lookup would pick the wrong one.
   */
  handleJumpTo: (entry: PlaylistEntry, origin: QueueRowOrigin, index: number) => void;
  /** P48.2: reorder inside one section (the queue, or the run's tail) */
  handleReorder: (origin: 'queue' | 'playlist', fromIndex: number, toIndex: number) => void;
  /** P48.2: remove a row from one section (the queue, or the run's tail) */
  handleRemove: (origin: 'queue' | 'playlist', index: number) => void;
  handlePlayNext: (entry: PlaylistEntry) => void;
  handleAddToQueue: (entry: PlaylistEntry) => void;
  /**
   * Clear the EXPLICIT queue (the lib's `clearQueue`).
   *
   * The run is NOT touched: "clear the queue" means the tracks the
   * user queued, not the album they are listening to.
   */
  handleClearQueue: () => void;
  /** Shuffle the EXPLICIT queue (the lib's `shuffleQueue`). */
  handleShuffleQueue: () => void;
  /** Shuffling one track is not shuffling. */
  canShuffleQueue: boolean;
  /**
   * Why the queue cannot be saved as a playlist, or null when it can.
   *
   * A playlist holds ONE lane. A queue that crosses lanes is not a
   * playlist, and it is not saved as half of one either: the reason is on
   * screen and nothing is dropped behind the user's back.
   */
  saveAsPlaylistBlockReason: string | null;
  /** P48.5: persist the current Up Next list as a user playlist */
  handleSaveAsPlaylist: (name: string) => boolean;
}

export function useQueueScreen(): UseQueueScreenResult {
  const haptics = useHaptics();
  // W7 P28: typed `play()` for jumping to a history entry from a
  // different media context. Returns Result<PlaybackId, StreamError>.
  const play = usePlay();
  const toast = useToast();

  const currentTrack = usePlayerStore(state => state.currentFile);
  const playlist = usePlayerStore(state => state.playlist);
  // V15 Phase 65: queue + playbackHistory move to the module's
  // zustand store. The component reads via `useQueueItems()` /
  // `usePlaybackHistory()` and dispatches via the `useQueue()`
  // hook's actions.
  const queue = useQueueItemsAs<PlayerQueueItem<MediaSource, MediaKind, MediaLane>>();
  /**
   * "Previously Played" is the APP'S history, not the lib's.
   *
   * It used to read the lib's `playbackHistory` — a store whose
   * `addToPlaybackHistory` is called from NOTHING, in the app or in the
   * lib (the lib's own tests are its only writer). So the section was
   * permanently empty: the Queue screen promised "Previously Played"
   * and never showed a row.
   *
   * The app's own `recentHistoryStore` is the real history: the
   * checkpoint writer (`usePlaybackCheckpointSync`) upserts into it on
   * every playback checkpoint, newest first, capped at
   * `MAX_RECENT_HISTORY_ENTRIES` (10).
   *
   * The order needs no reversing: the old code reversed the lib's
   * APPEND-only array, while this store PREPENDS, so both arrive
   * newest-first.
   *
   * The lib's `addToPlaybackHistory` is therefore deliberately NOT
   * called (B15-Q2). The app has ONE history owner — this store — and
   * a second history that nothing reads is a second copy of a fact, not
   * a feature.
   */
  const recentHistory = useRecentHistoryStore(state => state.entries);
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
    clearQueue: clearQueueAction,
    shuffleQueue: shuffleQueueAction,
  } = useQueue();

  // ── The two origins, kept apart (B15-Q8) ──────────────────────────
  //
  // The explicit queue and the RUN are two different lists with two
  // different origins, and they were rendered as ONE "Up Next" list —
  // so a user could not tell the tracks they had queued from the rest
  // of the album they were listening to. They are two lists now.
  //
  // The run is NOT filtered by lane.
  //
  // It used to be: the screen showed only the active lane's items, so a
  // run that crossed lanes showed the half the user could not play and
  // hid the half they could. The lane rule belongs to the PLAYLIST STORE
  // (`isPlaylistMediaKindAllowed`), which refuses an item a single-lane
  // playlist may not hold; at runtime the boundary is crossed by the
  // handover, and the handover has ONE owner — `useLaneHandover` in
  // `src/infrastructure/player/useResumeAwareLaunch.ts`.
  const queueRowsMeta = useMemo<QueueDisplayRow[]>(
    () =>
      queue.map(
        (entry: PlayerQueueItem<MediaSource, MediaKind, MediaLane>, rawIndex) => ({
          entry: toPlaylistEntry(entry),
          origin: 'queue' as const,
          rawIndex,
        }),
      ),
    [queue],
  );
  const runRowsMeta = useMemo<QueueDisplayRow[]>(
    () =>
      playlist
        .map((entry, rawIndex) => ({entry, origin: 'playlist' as const, rawIndex}))
        .filter(row => row.rawIndex > currentIndex),
    [currentIndex, playlist],
  );

  const queueRows = useMemo(() => queueRowsMeta.map(row => row.entry), [queueRowsMeta]);
  const runRows = useMemo(() => runRowsMeta.map(row => row.entry), [runRowsMeta]);
  // The PLAYBACK order: the queue's head, then the run's tail. This is
  // the order the transport's next button uses, so the list and the
  // engine agree.
  const upNext = useMemo(() => [...queueRows, ...runRows], [queueRows, runRows]);

  // The history is not filtered by lane either — the same reason.
  //
  // A history entry is a `RecentHistoryEntry`; the screen's rows are
  // `PlaylistEntry`, so the classification is carried across field by
  // field. The duration is SECONDS in both — the history store's unit
  // and the queue's.
  const history = useMemo<PlaylistEntry[]>(
    () =>
      recentHistory.map(entry => ({
        uri: entry.fileUri,
        title: entry.title,
        duration: entry.duration,
        source: entry.source,
        type: entry.type,
        mediaType: entry.mediaType,
        ...(entry.provider ? {provider: entry.provider} : {}),
        ...(entry.folderId ? {folderId: entry.folderId} : {}),
      })),
    [recentHistory],
  );

  const hasContent = !!currentTrack || upNext.length > 0 || history.length > 0;

  const handleJumpTo = useCallback(
    (entry: PlaylistEntry, origin: QueueRowOrigin, index: number) => {
      // ── The bookkeeping, first ──
      //
      // The run and the queue are moved BEFORE the launch, because the
      // launch writes the now-playing session and the run's own sync
      // ("a launch from outside the run starts a new run") reads the
      // run at that moment.
      if (origin === 'playlist') {
        // A row of the run's tail: move the run to it.
        const raw = runRowsMeta[index]?.rawIndex ?? -1;
        if (raw >= 0) {
          usePlayerStore.getState().playFromPlaylist(raw);
        }
      } else if (origin === 'queue') {
        // A queued track that plays NOW is not "up next" any more.
        removeFromQueueByIndex(index);
      } else {
        // History-only item: append to the run, then play it.
        usePlayerStore.getState().addToPlaylist(entry);
        usePlayerStore.getState().playFromPlaylist(
          usePlayerStore.getState().playlist.length - 1,
        );
      }

      // ── The launch, through the seam (B15-Q5) ──
      //
      // This used to be:
      //
      //   getMpvPlayerModule().loadFile(entry.uri);
      //   if (the lane differs) play({...});
      //
      // — a raw bridge call that bypassed the launch seam. Three things
      // were wrong with it, and each one was a symptom of the same
      // mistake:
      //
      //   1. The session was never written, so the "Now Playing" row
      //      could keep showing the PREVIOUS track — the queue screen
      //      said one thing and the player did another.
      //   2. The resume position was never resolved, because the seam
      //      is what resolves it.
      //   3. For AUDIO the bridge's `loadFile` loads into the mpv handle
      //      the VIDEO surface owns; the audio lane plays through the
      //      media service, which only the seam's launch reaches. So an
      //      audio jump in the same lane never actually played.
      //
      // It goes through the seam now, always, and the lane no longer
      // decides anything: the seam resolves the lane from the kind.
      //
      // `expand: false` because the user is reading a queue. The media
      // starts and the session is written, but the player does NOT take
      // over the screen the queue is on — Plex and YouTube Music both
      // keep the queue on screen when an item in it is tapped.
      void play({
        uri: entry.uri,
        title: entry.title,
        // The LANE, so `resolveStreamType` gets the stream type the
        // bridge needs.
        mediaType: entry.mediaType,
        // The KIND as well, so the session records what this IS and
        // not merely which stream type it plays through.
        mediaKind: entry.type,
        mediaLane: entry.mediaType,
        expand: false,
      }).then(r => {
        if (r.ok) return;
        if (isNetworkError(r.error)) {
          toast.show('No connection. Will jump when online.', 'warning');
        } else if (isUnsupportedError(r.error)) {
          toast.show('This file format is not supported by the player.', 'error');
        } else if (isExpiredError(r.error)) {
          toast.show('Sign in expired. Please sign in again.', 'warning');
        } else if (isBlockedError(r.error)) {
          toast.show('This content is not available in your region.', 'error');
        } else {
          toast.show('Could not jump to that entry.', 'error');
        }
      });
    },
    [play, removeFromQueueByIndex, runRowsMeta, toast],
  );

  const handleReorder = useCallback(
    (origin: 'queue' | 'playlist', fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      if (origin === 'queue') {
        // The queue's own indices ARE its section indices.
        const bounded = Math.max(0, Math.min(queueRowsMeta.length - 1, toIndex));
        if (bounded === fromIndex) return;
        reorderQueueAction({fromIndex, toIndex: bounded});
      } else {
        // The run's tail is a WINDOW onto the run, so the section index
        // has to be resolved back to the run's own index.
        const from = runRowsMeta[fromIndex];
        const to =
          runRowsMeta[Math.max(0, Math.min(runRowsMeta.length - 1, toIndex))];
        if (!from || !to || from.rawIndex === to.rawIndex) return;
        usePlayerStore.getState().reorderPlaylist({
          fromIndex: from.rawIndex,
          toIndex: to.rawIndex,
        });
      }
      haptics.medium();
    },
    [haptics, queueRowsMeta, reorderQueueAction, runRowsMeta],
  );

  const handleRemove = useCallback(
    (origin: 'queue' | 'playlist', index: number) => {
      if (origin === 'queue') {
        removeFromQueueAction(index);
      } else {
        const raw = runRowsMeta[index]?.rawIndex ?? -1;
        if (raw < 0) return;
        usePlayerStore.getState().removeFromPlaylist(raw);
      }
      haptics.light();
    },
    [haptics, removeFromQueueAction, runRowsMeta],
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

  // ── The queue's own actions (B15-Q2) ──────────────────────────────
  //
  // `clearQueue` and `shuffleQueue` existed in the library and NOTHING
  // in the app ever called them. They are the Up Next section's actions
  // now — both of them are nameable in YouTube Music, Apple Music and
  // Plex, and both act on the EXPLICIT QUEUE only: the run is the album
  // the user is listening to, and "clear the queue" does not mean
  // "forget the album".
  const handleClearQueue = useCallback(() => {
    clearQueueAction();
    haptics.medium();
  }, [clearQueueAction, haptics]);

  const handleShuffleQueue = useCallback(() => {
    shuffleQueueAction();
    haptics.medium();
  }, [haptics, shuffleQueueAction]);

  const canShuffleQueue = queueRowsMeta.length > 1;

  /**
   * Why the queue cannot be saved as a playlist, or null when it can.
   *
   * A playlist holds ONE lane. A queue that crosses lanes is not a
   * playlist, and it is not saved as half of one either: the reason is on
   * screen and nothing is dropped behind the user's back.
   */
  const saveAsPlaylistBlockReason = useMemo(() => {
    // Nothing to save is not a block: the save action is not offered.
    if (upNext.length === 0) return null;
    return playlistKindForItems(upNext) ? null : CROSS_LANE_QUEUE_REASON;
  }, [upNext]);

  const handleSaveAsPlaylist = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || upNext.length === 0) return false;
      // A playlist holds ONE lane. The kind follows the ITEMS, not the
      // screen.
      const kind = playlistKindForItems(upNext);
      if (!kind) {
        // Refused. The reason is on screen (`saveAsPlaylistBlockReason`),
        // so this is never a silent no-op.
        return false;
      }
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
      playlistActions.importPlaylist({name: trimmed, items, kind});
      haptics.medium();
      return true;
    },
    [upNext, haptics],
  );

  return {
    currentTrack,
    queueRows,
    runRows,
    upNext,
    history,
    isPlaying: playerState.isPlaying,
    hasContent,
    handleJumpTo,
    handleReorder,
    handleRemove,
    handlePlayNext,
    handleAddToQueue,
    handleClearQueue,
    handleShuffleQueue,
    canShuffleQueue,
    handleSaveAsPlaylist,
    saveAsPlaylistBlockReason,
  };
}

import type {PlaylistEntry} from '../../../state';
