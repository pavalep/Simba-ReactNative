import {useCallback, useImperativeHandle, useMemo, type Ref} from 'react';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import {normalizeMediaClassification} from '../../types/media';
import {isPlaylistMediaKindAllowed, playlistKindToLane, type Playlist, type PlaylistItem, type PlaylistKind} from '../../types/playlist';
import {
  MAX_ITEMS_PER_PLAYLIST,
  MAX_PLAYLISTS,
  normalizePersistedPlaylists,
  usePlaylistsStore,
} from '../../state';
import type {AddPlaylistItemResult, CreatePlaylistResult} from './types';

export {MAX_PLAYLISTS, MAX_ITEMS_PER_PLAYLIST, normalizePersistedPlaylists};
export {reportBatchAdd} from './batchAddReport';
export type {BatchAddReport} from './batchAddReport';

export type PlaylistItemInput = Omit<PlaylistItem, 'id' | 'addedAt'> & {
  id?: string;
  addedAt?: string;
};

// The result types live in `types.ts` so the feature's own reporting
// helpers can name a status without importing this facade. They are
// re-exported here, so the public API is unchanged.
export type {AddPlaylistItemResult, CreatePlaylistResult};

export interface PlaylistController {
  list: Playlist[];
  getPlaylist: (playlistId: string) => Playlist | undefined;
  createPlaylist: (input: {name: string; info?: string; kind: PlaylistKind}) => CreatePlaylistResult;
  renamePlaylist: (playlistId: string, newName: string, info?: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addItem: (playlistId: string, input: PlaylistItemInput) => AddPlaylistItemResult;
  removeItem: (playlistId: string, itemId: string) => void;
  reorderItems: (playlistId: string, fromIndex: number, toIndex: number) => void;
  clearPlaylist: (playlistId: string) => void;
  importPlaylist: (input: {name: string; info?: string; kind: PlaylistKind; items: PlaylistItemInput[]}) => void;
  updateItemPosition: (playlistId: string, fileUri: string, position: number) => void;
  setPinned: (playlistId: string, pinned: boolean) => void;
}

const createItem = (input: PlaylistItemInput): PlaylistItem => ({
  ...input,
  id: input.id || `pli_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  addedAt: input.addedAt || new Date().toISOString(),
});

const makePlaylist = (input: {name: string; info?: string; kind: PlaylistKind}): Playlist => {
  const now = new Date().toISOString();
  return {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: input.name.trim(),
    ...(input.info?.trim() ? {info: input.info.trim()} : {}),
    kind: input.kind,
    items: [],
    // D-P3: a new playlist starts unpinned. `pinned` is a field default,
    // not a data migration - an existing playlist is unpinned too.
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
};

export function createPlaylist(
  input: {name: string; info?: string; kind: PlaylistKind},
): CreatePlaylistResult {
  const playlists = usePlaylistsStore.getState().playlists;
  if (playlists.length >= MAX_PLAYLISTS) return {status: 'limit-reached', max: MAX_PLAYLISTS};
  const playlist = makePlaylist(input);
  usePlaylistsStore.getState().createPlaylist(playlist);
  return {status: 'created', playlist};
}

export function addItemToPlaylist(
  playlistId: string,
  input: PlaylistItemInput,
): AddPlaylistItemResult {
  const playlist = usePlaylistsStore.getState().playlists.find(item => item.id === playlistId);
  if (!playlist) return {status: 'playlist-not-found'};
  const item = createItem(input);
  const existing = playlist.items.find(entry => entry.fileUri === item.fileUri);
  if (existing) return {status: 'duplicate', playlist, item: existing};
  if (playlist.items.length >= MAX_ITEMS_PER_PLAYLIST) return {status: 'playlist-full', playlist, max: MAX_ITEMS_PER_PLAYLIST};
  // The lane question and the allow-list are ONE rule, not two. A mixed
  // playlist holds both lanes, so its lane question is asked against the
  // playlist's own lane, not against the item's.
  const laneMatches =
    playlist.kind === 'MIXED' ||
    playlistKindToLane(playlist.kind) === item.mediaType;
  if (!laneMatches) {
    return {status: 'lane-mismatch', playlist, item};
  }
  if (!isPlaylistMediaKindAllowed(playlist.kind, item.type, item.mediaType)) {
    return {status: 'unsupported-media-kind', playlist, item};
  }
  usePlaylistsStore.getState().addItemToPlaylist({playlistId, item});
  return {status: 'added', playlist: {...playlist, items: [...playlist.items, item]}, item};
}

export function importPlaylist(
  input: {name: string; info?: string; kind: PlaylistKind; items: PlaylistItemInput[]},
): void {
  usePlaylistsStore.getState().importPlaylist({
    name: input.name,
    info: input.info,
    kind: input.kind,
    items: input.items.map(createItem),
  });
}

/**
 * THE rule for "which of these playlists can take this item".
 *
 * Both add-to-playlist surfaces call this, so they cannot disagree about
 * which playlists an item may go into. The item's kind is classified HERE,
 * not by the caller, because a caller that forgets to pass `type` is
 * silently given the broad 'audio' / 'video' fallback - and that broad
 * fallback is exactly how a radio station ended up in a playlist.
 */
export function compatiblePlaylistsFor(
  item: {type?: MediaKind; mediaType?: MediaLane},
  playlists: Playlist[],
): Playlist[] {
  const classified = normalizeMediaClassification(item);
  return playlists.filter(playlist =>
    isPlaylistMediaKindAllowed(playlist.kind, classified.type, classified.mediaType),
  );
}

/**
 * Pin a playlist, or unpin it. The pinned order is the recency of pinning,
 * so pinning again moves a playlist back to the top.
 */
export function setPlaylistPinned(playlistId: string, pinned: boolean): void {
  usePlaylistsStore.getState().setPlaylistPinned({playlistId, pinned});
}

/**
 * When a playlist was pinned, in milliseconds.
 *
 * D-P3: the PINNED order is the RECENCY OF PINNING, not the playlist's
 * own `updatedAt`. The store stamps `pinnedAt` when the pin goes on and
 * drops it when the pin comes off, so `pinnedAt` is the only stamp that
 * says "how recently the user pinned this".
 *
 * It is deliberately NOT `updatedAt`: a playlist edited yesterday
 * outranks one the user pinned last week, and a section headed
 * "Pinned" that orders by anything other than pinning says something
 * the list does not keep.
 *
 * A pinned record with no stamp falls back to its own `updatedAt`, then
 * to its `createdAt`: the shelf still has to put it somewhere, and the
 * record's own recency is the closest true answer.
 *
 * This is the ONE owner of that rule. Home's shelf and the management
 * page both order their pinned section through it, so the two surfaces
 * cannot drift apart — a rule written out twice is one copy too many.
 */
export function pinnedAtMs(playlist: Playlist): number {
  return new Date(playlist.pinnedAt ?? playlist.updatedAt ?? playlist.createdAt).getTime();
}

export function updatePlaylistItemPosition(
  playlistId: string,
  fileUri: string,
  position: number,
): void {
  usePlaylistsStore.getState().updatePlaylistItemPosition({playlistId, fileUri, position});
}

export function usePlaylists(ref?: Ref<PlaylistController>) {
  const list = usePlaylistsStore(s => s.playlists);

  const getPlaylist = useCallback(
    (playlistId: string) => list.find(item => item.id === playlistId),
    [list],
  );

  const create = useCallback(
    (input: {name: string; info?: string; kind: PlaylistKind}) => createPlaylist(input),
    [],
  );
  const rename = useCallback(
    (playlistId: string, newName: string, info?: string) => {
      usePlaylistsStore.getState().renamePlaylist({id: playlistId, newName, info});
    },
    [],
  );
  const remove = useCallback((playlistId: string) => {
    usePlaylistsStore.getState().deletePlaylist(playlistId);
  }, []);
  const add = useCallback(
    (playlistId: string, input: PlaylistItemInput) => addItemToPlaylist(playlistId, input),
    [],
  );
  const removeItem = useCallback((playlistId: string, itemId: string) => {
    usePlaylistsStore.getState().removeItemFromPlaylist({playlistId, itemId});
  }, []);
  const reorder = useCallback((playlistId: string, fromIndex: number, toIndex: number) => {
    usePlaylistsStore.getState().reorderPlaylistItems({playlistId, fromIndex, toIndex});
  }, []);
  const clear = useCallback((playlistId: string) => {
    usePlaylistsStore.getState().clearPlaylist(playlistId);
  }, []);
  const importItems = useCallback(
    (input: {name: string; info?: string; kind: PlaylistKind; items: PlaylistItemInput[]}) =>
      importPlaylist(input),
    [],
  );
  const updatePosition = useCallback(
    (playlistId: string, fileUri: string, position: number) =>
      updatePlaylistItemPosition(playlistId, fileUri, position),
    [],
  );
  const setPinned = useCallback(
    (playlistId: string, pinned: boolean) => setPlaylistPinned(playlistId, pinned),
    [],
  );

  const controller = useMemo<PlaylistController>(() => ({
    list,
    getPlaylist,
    createPlaylist: create,
    renamePlaylist: rename,
    deletePlaylist: remove,
    addItem: add,
    removeItem,
    reorderItems: reorder,
    clearPlaylist: clear,
    importPlaylist: importItems,
    updateItemPosition: updatePosition,
    setPinned,
  }), [list, getPlaylist, create, rename, remove, add, removeItem, reorder, clear, importItems, updatePosition, setPinned]);

  useImperativeHandle(ref, () => controller, [controller]);

  return {
    ...controller,
    playlists: list,
    maxPlaylists: MAX_PLAYLISTS,
    maxItemsPerPlaylist: MAX_ITEMS_PER_PLAYLIST,
  };
}

export function usePlaylist(playlistId: string): Playlist | undefined {
  const list = usePlaylistsStore(s => s.playlists);
  return useMemo(() => list.find(item => item.id === playlistId), [list, playlistId]);
}

export const playlistActions = {
  addItemToPlaylist: (playlistId: string, item: PlaylistItem) =>
    usePlaylistsStore.getState().addItemToPlaylist({playlistId, item}),
  clearPlaylist: (playlistId: string) =>
    usePlaylistsStore.getState().clearPlaylist(playlistId),
  createPlaylist: (playlist: Playlist) =>
    usePlaylistsStore.getState().createPlaylist(playlist),
  deletePlaylist: (playlistId: string) =>
    usePlaylistsStore.getState().deletePlaylist(playlistId),
  importPlaylist: (input: {
    name: string;
    info?: string;
    kind: PlaylistKind;
    items: PlaylistItem[];
  }) => usePlaylistsStore.getState().importPlaylist({
    name: input.name,
    info: input.info,
    kind: input.kind,
    items: input.items,
  }),
  removeItemFromPlaylist: (playlistId: string, itemId: string) =>
    usePlaylistsStore.getState().removeItemFromPlaylist({playlistId, itemId}),
  renamePlaylist: (id: string, newName: string, info?: string) =>
    usePlaylistsStore.getState().renamePlaylist({id, newName, info}),
  reorderPlaylistItems: (playlistId: string, fromIndex: number, toIndex: number) =>
    usePlaylistsStore.getState().reorderPlaylistItems({playlistId, fromIndex, toIndex}),
  updatePlaylistItemPosition: (playlistId: string, fileUri: string, position: number) =>
    usePlaylistsStore.getState().updatePlaylistItemPosition({playlistId, fileUri, position}),
};

export type {Playlist, PlaylistItem, PlaylistKind, MediaKind, MediaLane, MediaSource};
