import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import {
  normalizePlaybackEntry,
  type PlaybackEntry,
  type PlaybackEntryInput,
  type PlaybackOrigin,
} from '../types/playback';
import type {MediaKind, MediaLane, MediaSource} from '../types/media';
import type {PlayerQueueItem} from '../infrastructure/player';
import type {PlaylistItem} from '../types/playlist';

/**
 * V17 Phase 83: replaces `playerSlice` (Redux + redux-persist
 * whitelist) with `usePlayerStore` (Zustand + persist, key
 * 'player' to match the whitelist).
 *
 * After V14 Phase 62, this slice is intentionally small: the
 * real playback source of truth is the module's `usePlayer()`
 * (isPlaying, positionMs, durationMs, volume, loopMode, speed,
 * etc.). The consumer-side `usePlayerStore` only tracks what
 * the Queue / Home / NowPlaying UI needs:
 *   - `currentFile` (PlaylistEntry | null) — what's bookmarked
 *     as "current" for the queue UI
 *   - `playlist` (PlaylistEntry[]) — the consumer's local
 *     playlist (NOT the module's queue)
 *   - `currentIndex` (number) — index into `playlist`
 *
 * V16 Phase 70: a `PlaylistEntry` is the consumer's typed view
 * of an item in the player pipeline. The three classification
 * fields are required, and `origin` is consumer-only.
 */

export interface PlaylistEntry
  extends Omit<
    PlayerQueueItem<MediaSource, MediaKind, MediaLane>,
    'source' | 'type' | 'mediaType'
  > {
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  /** V13: the route context retained when the item entered playback. */
  origin?: PlaybackOrigin;
}

/** V16 Phase 70: boundary cast from the module's queue item to
 *  the consumer's typed entry. Identity spread at runtime. */
export function toPlaylistEntry(
  item: PlayerQueueItem<MediaSource, MediaKind, MediaLane>,
): PlaylistEntry {
  return item as PlaylistEntry;
}

export interface QueueItem {
  fileUri: string;
  title: string;
  source: MediaSource;
  type: MediaKind;
  mediaType: MediaLane;
  provider?: string;
  /** Optional stable linked-folder identity for local entries. */
  folderId?: string;
}

export interface PlayerState {
  currentFile: PlaylistEntry | null;
  playlist: PlaylistEntry[];
  currentIndex: number;
}

export interface PlayerActions {
  /** Load a user playlist into the player: sets items, sets
   * currentFile to first track. */
  loadPlaylistToPlayer: (entries: PlaybackEntryInput[]) => void;
  /** Append one or more files to end of playlist */
  addToPlaylist: (input: PlaybackEntryInput | PlaybackEntryInput[]) => void;
  /** Remove a file from playlist by index */
  removeFromPlaylist: (idx: number) => void;
  /** Move item within playlist (reorder) */
  reorderPlaylist: (input: {fromIndex: number; toIndex: number}) => void;
  playFromPlaylist: (index: number) => void;
  /** V15 Phase 66: clear the consumer's local playlist. The
   * module's queue / playback state is not affected — use the
   * module's `usePlayer().commands.clear()` for that. */
  clearPlaylist: () => void;
  reset: () => void;
  setCurrentFile: (file: PlaylistEntry | null) => void;
}

const initialState: PlayerState = {
  currentFile: null,
  playlist: [],
  currentIndex: -1,
};

/**
 * The lane the run is playing in right now.
 *
 * ONE owner, because "which lane is live" is asked in more than one place
 * and more than one answer is more than one chance to be wrong. The
 * handover reads it to decide whether the next item is a lane CHANGE.
 */
export function activeLane(state: PlayerState): MediaLane | undefined {
  return state.currentFile?.mediaType ?? state.playlist[0]?.mediaType;
}

/** Map a persistent playlist (V17: `usePlaylistsStore.playlists`
 *  → `Playlist.items[]`) to player entries. */
export function playlistItemsToEntries(items: PlaylistItem[]): PlaylistEntry[] {
  return items.map(item => ({
    uri: item.fileUri,
    title: item.title,
    duration: item.duration,
    source: item.source,
    type: item.type,
    mediaType: item.mediaType,
    ...(item.provider ? {provider: item.provider} : {}),
  }));
}

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set) => ({
      ...initialState,

      // The run holds EVERY lane.
      //
      // This used to narrow the run to the first entry's lane, and to drop
      // anything added in another lane — silently. The narrowing made a
      // mixed run impossible to even SEE: the items were in the store and
      // no surface listed them, so the run looked like it had lost them.
      //
      // The lane rule still exists, and it lives where it belongs: the
      // PLAYLIST STORE refuses an item a single-lane playlist may not
      // hold (`isPlaylistMediaKindAllowed`), so a mixed run can only be
      // built from a MIXED playlist or assembled by the user on purpose.
      // What crosses the lane boundary at runtime is the handover's job,
      // and the handover has ONE owner — `useLaneHandover` in
      // `src/infrastructure/player/useResumeAwareLaunch.ts`.
      loadPlaylistToPlayer: (entries) => {
        const normalized = entries.map(normalizePlaybackEntry);
        set({
          playlist: normalized,
          currentIndex: normalized.length > 0 ? 0 : -1,
          currentFile: normalized.length > 0 ? normalized[0] : null,
        });
      },

      // The run holds every lane here too. This used to drop an item in
      // another lane without a word: the user tapped "add", nothing
      // appeared, and nothing said why. A silent refusal is a lie about
      // what the app does.
      addToPlaylist: (input) =>
        set((s) => {
          const incoming = (
            Array.isArray(input) ? input : [input]
          ).map(normalizePlaybackEntry);
          const playlist = [...s.playlist, ...incoming];
          const currentIndex = s.currentIndex === -1 && playlist.length > 0
            ? 0
            : s.currentIndex;
          return {playlist, currentIndex};
        }),

      removeFromPlaylist: (idx) =>
        set((s) => {
          if (idx < 0 || idx >= s.playlist.length) return s;
          const playlist = s.playlist.slice();
          playlist.splice(idx, 1);
          if (playlist.length === 0) {
            return {playlist, currentIndex: -1, currentFile: null};
          }
          if (idx < s.currentIndex) {
            return {playlist, currentIndex: s.currentIndex - 1};
          }
          if (idx === s.currentIndex) {
            const currentIndex = Math.min(s.currentIndex, playlist.length - 1);
            return {playlist, currentIndex, currentFile: playlist[currentIndex] || null};
          }
          return {playlist};
        }),

      reorderPlaylist: ({fromIndex, toIndex}) =>
        set((s) => {
          if (fromIndex === toIndex) return s;
          if (fromIndex < 0 || fromIndex >= s.playlist.length) return s;
          if (toIndex < 0 || toIndex >= s.playlist.length) return s;
          const playlist = s.playlist.slice();
          const [moved] = playlist.splice(fromIndex, 1);
          playlist.splice(toIndex, 0, moved);
          let currentIndex = s.currentIndex;
          if (s.currentIndex === fromIndex) {
            currentIndex = toIndex;
          } else if (fromIndex < s.currentIndex && toIndex >= s.currentIndex) {
            currentIndex = s.currentIndex - 1;
          } else if (fromIndex > s.currentIndex && toIndex <= s.currentIndex) {
            currentIndex = s.currentIndex + 1;
          }
          return {playlist, currentIndex};
        }),

      playFromPlaylist: (index) =>
        set((s) => {
          if (index < 0 || index >= s.playlist.length) return s;
          return {currentIndex: index, currentFile: s.playlist[index]};
        }),

      clearPlaylist: () => set({playlist: [], currentIndex: -1, currentFile: null}),

      reset: () => set({...initialState}),

      setCurrentFile: (currentFile) => set({currentFile}),
    }),
    {
      name: 'player',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);
