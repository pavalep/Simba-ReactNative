import {useCallback, useImperativeHandle, useMemo} from 'react';
import type {Ref} from 'react';
import {useStore} from 'react-redux';
import {useAppDispatch, useAppSelector} from '../../store';
import type {AppDispatch, RootState} from '../../store';
import type {MediaKind, MediaLane, MediaSource} from '../../types/media';
import {
  isPlaylistMediaKindAllowed,
  type Playlist,
  type PlaylistItem,
  type PlaylistKind,
} from '../../types/playlist';
import {
  MAX_ITEMS_PER_PLAYLIST,
  MAX_PLAYLISTS,
  addItemToPlaylist as addItemToPlaylistAction,
  clearPlaylist as clearPlaylistAction,
  createPlaylist as createPlaylistAction,
  deletePlaylist as deletePlaylistAction,
  importPlaylist as importPlaylistAction,
  normalizePersistedPlaylists,
  removeItemFromPlaylist as removeItemFromPlaylistAction,
  renamePlaylist as renamePlaylistAction,
  reorderPlaylistItems as reorderPlaylistItemsAction,
  selectAllPlaylists,
  selectPlaylistById,
  updatePlaylistItemPosition as updatePlaylistItemPositionAction,
} from './playlistReducer';

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

export interface PlaylistStoreAccess {
  dispatch: AppDispatch;
  getState: () => RootState;
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
  access: PlaylistStoreAccess,
  input: {name: string; info?: string; kind: PlaylistKind},
): CreatePlaylistResult {
  const playlists = selectAllPlaylists(access.getState());
  if (playlists.length >= MAX_PLAYLISTS) return {status: 'limit-reached', max: MAX_PLAYLISTS};
  const playlist = makePlaylist(input);
  access.dispatch(createPlaylistAction(playlist));
  return {status: 'created', playlist};
}

export function addItemToPlaylist(
  access: PlaylistStoreAccess,
  playlistId: string,
  input: PlaylistItemInput,
): AddPlaylistItemResult {
  const playlist = selectAllPlaylists(access.getState()).find(item => item.id === playlistId);
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
  access.dispatch(addItemToPlaylistAction({playlistId, item}));
  return {status: 'added', playlist: {...playlist, items: [...playlist.items, item]}, item};
}

export function importPlaylist(
  access: PlaylistStoreAccess,
  input: {name: string; info?: string; kind: PlaylistKind; items: PlaylistItemInput[]},
): void {
  access.dispatch(importPlaylistAction({
    name: input.name,
    info: input.info,
    kind: input.kind,
    items: input.items.map(createItem),
  }));
}

export function updatePlaylistItemPosition(
  access: PlaylistStoreAccess,
  playlistId: string,
  fileUri: string,
  position: number,
): void {
  access.dispatch(updatePlaylistItemPositionAction({playlistId, fileUri, position}));
}

export function normalizePlaylistStorage(raw: unknown): Playlist[] {
  return normalizePersistedPlaylists(raw);
}

export function usePlaylists(ref?: Ref<PlaylistController>) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const list = useAppSelector(selectAllPlaylists);

  const getPlaylist = useCallback(
    (playlistId: string) => list.find(item => item.id === playlistId),
    [list],
  );

  const access = useMemo<PlaylistStoreAccess>(() => ({
    dispatch,
    getState: store.getState,
  }), [dispatch, store]);

  const create = useCallback(
    (input: {name: string; info?: string; kind: PlaylistKind}) => createPlaylist(access, input),
    [access],
  );
  const rename = useCallback(
    (playlistId: string, newName: string, info?: string) => dispatch(renamePlaylistAction({id: playlistId, newName, info})),
    [dispatch],
  );
  const remove = useCallback((playlistId: string) => dispatch(deletePlaylistAction(playlistId)), [dispatch]);
  const add = useCallback((playlistId: string, input: PlaylistItemInput) => addItemToPlaylist(access, playlistId, input), [access]);
  const removeItem = useCallback((playlistId: string, itemId: string) => dispatch(removeItemFromPlaylistAction({playlistId, itemId})), [dispatch]);
  const reorder = useCallback((playlistId: string, fromIndex: number, toIndex: number) => dispatch(reorderPlaylistItemsAction({playlistId, fromIndex, toIndex})), [dispatch]);
  const clear = useCallback((playlistId: string) => dispatch(clearPlaylistAction(playlistId)), [dispatch]);
  const importItems = useCallback((input: {name: string; info?: string; kind: PlaylistKind; items: PlaylistItemInput[]}) => importPlaylist(access, input), [access]);
  const updatePosition = useCallback((playlistId: string, fileUri: string, position: number) => updatePlaylistItemPosition(access, playlistId, fileUri, position), [access]);

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

export function usePlaylist(playlistId: string) {
  return useAppSelector(selectPlaylistById(playlistId));
}

export const playlistActions = {
  addItemToPlaylistAction,
  clearPlaylistAction,
  createPlaylistAction,
  deletePlaylistAction,
  importPlaylistAction,
  removeItemFromPlaylistAction,
  renamePlaylistAction,
  reorderPlaylistItemsAction,
  updatePlaylistItemPositionAction,
};

export type {Playlist, PlaylistItem, PlaylistKind, MediaKind, MediaLane, MediaSource};
