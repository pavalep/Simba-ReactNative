import {useCallback, useImperativeHandle, useMemo, type Ref} from 'react';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import {isPlaylistMediaKindAllowed, type Playlist, type PlaylistItem, type PlaylistKind} from '../../types/playlist';
import {
  MAX_ITEMS_PER_PLAYLIST,
  MAX_PLAYLISTS,
  normalizePersistedPlaylists,
  usePlaylistsStore,
} from '../../state';

export {MAX_PLAYLISTS, MAX_ITEMS_PER_PLAYLIST, normalizePersistedPlaylists};

export type PlaylistItemInput = Omit<PlaylistItem, 'id' | 'addedAt'> & {
  id?: string;
  addedAt?: string;
};

export type CreatePlaylistResult =
  | {status: 'created'; playlist: Playlist}
  | {status: 'limit-reached'; max: number};

export type AddPlaylistItemResult =
  | {status: 'added'; playlist: Playlist; item: PlaylistItem}
  | {status: 'playlist-not-found'}
  | {status: 'duplicate'; playlist: Playlist; item: PlaylistItem}
  | {status: 'playlist-full'; playlist: Playlist; max: number}
  | {status: 'lane-mismatch'; playlist: Playlist; item: PlaylistItem}
  | {status: 'unsupported-media-kind'; playlist: Playlist; item: PlaylistItem};

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
  if (playlist.kind !== (item.mediaType === 'audio' ? 'AUDIO_ONLY' : 'VIDEO_ONLY')) {
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
  }), [list, getPlaylist, create, rename, remove, add, removeItem, reorder, clear, importItems, updatePosition]);

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
    kind: 'MIXED' | PlaylistKind;
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
