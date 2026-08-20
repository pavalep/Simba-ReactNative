import {createSelector, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {REHYDRATE} from 'redux-persist';
import type {RootState} from '../../store';
import {resetAppState} from '../../store/slices/authSlice';
import {
  isPlaylistMediaKindAllowed,
  type Playlist,
  type PlaylistItem,
  type PlaylistKind,
  type PlaylistLegacyKind,
} from '../../types/playlist';
import type {MediaKind, MediaLane} from '../../types/media';

export const MAX_PLAYLISTS = 20;
export const MAX_ITEMS_PER_PLAYLIST = 100;
export const PLAYLIST_STATE_KEY = 'playlists' as const;

export interface PlaylistState {
  playlists: Playlist[];
}

export interface CreatePlaylistPayload {
  name: string;
  kind: PlaylistKind;
  info?: string;
}

export interface ImportPlaylistPayload {
  name: string;
  info?: string;
  kind: PlaylistLegacyKind;
  items: PlaylistItem[];
}

export interface PlaylistAddDecision {
  status:
    | 'added'
    | 'duplicate'
    | 'playlist-not-found'
    | 'playlist-full'
    | 'lane-mismatch'
    | 'unsupported-media-kind';
  playlist?: Playlist;
  item?: PlaylistItem;
}

const initialState: PlaylistState = {playlists: []};

const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const isPlaylistKind = (value: unknown): value is PlaylistKind =>
  value === 'AUDIO_ONLY' || value === 'VIDEO_ONLY';

const isMediaLane = (value: unknown): value is MediaLane =>
  value === 'audio' || value === 'video';

const isMediaKind = (value: unknown): value is MediaKind =>
  typeof value === 'string' &&
  [
    'audio',
    'music',
    'podcast',
    'audiobook',
    'radio',
    'video',
    'movie',
    'live-tv',
    'archive-audio',
    'archive-video',
  ].includes(value);

const normalizeItem = (raw: Partial<PlaylistItem>, index: number): PlaylistItem | null => {
  if (!raw.fileUri || !raw.title) return null;
  const mediaType = isMediaLane(raw.mediaType) ? raw.mediaType : undefined;
  const type = isMediaKind(raw.type) ? raw.type : mediaType === 'video' ? 'video' : 'audio';
  const lane = mediaType ?? (type === 'video' || type === 'movie' || type === 'live-tv' || type === 'archive-video' ? 'video' : 'audio');
  return {
    id: raw.id || generateId(`pli_${index}`),
    fileUri: raw.fileUri,
    title: raw.title,
    duration: typeof raw.duration === 'number' ? raw.duration : 0,
    ...(raw.artist ? {artist: raw.artist} : {}),
    ...(raw.album ? {album: raw.album} : {}),
    ...(raw.thumbnailPath ? {thumbnailPath: raw.thumbnailPath} : {}),
    addedAt: raw.addedAt || new Date().toISOString(),
    source: raw.source === 'api' ? 'api' : 'local',
    type,
    mediaType: lane,
    ...(raw.provider ? {provider: raw.provider} : {}),
    ...(raw.folderId ? {folderId: raw.folderId} : {}),
  };
};

type LegacyPlaylistRecord = Omit<Partial<Playlist>, 'kind'> & {kind?: PlaylistLegacyKind};

const splitLegacyMixed = (raw: LegacyPlaylistRecord): Playlist[] => {
  const items = Array.isArray(raw.items)
    ? raw.items.map((item, index) => normalizeItem(item, index)).filter(Boolean) as PlaylistItem[]
    : [];
  const base = {
    name: raw.name || 'Playlist',
    info: raw.info,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };

  if (raw.kind !== 'MIXED') {
    return [{
      id: raw.id || generateId('pl'),
      ...base,
      kind: isPlaylistKind(raw.kind) ? raw.kind : 'AUDIO_ONLY',
      items: items.filter(item => isPlaylistMediaKindAllowed(isPlaylistKind(raw.kind) ? raw.kind : 'AUDIO_ONLY', item.type, item.mediaType)).slice(0, MAX_ITEMS_PER_PLAYLIST),
    }];
  }

  const audioItems = items.filter(item => isPlaylistMediaKindAllowed('AUDIO_ONLY', item.type, item.mediaType));
  const videoItems = items.filter(item => isPlaylistMediaKindAllowed('VIDEO_ONLY', item.type, item.mediaType));
  const records: Playlist[] = [];
  if (audioItems.length || (!videoItems.length && !audioItems.length)) {
    records.push({id: `${raw.id || generateId('pl')}_audio`, ...base, name: videoItems.length ? `${base.name} (Audio)` : base.name, kind: 'AUDIO_ONLY', items: audioItems.slice(0, MAX_ITEMS_PER_PLAYLIST)});
  }
  if (videoItems.length) {
    records.push({id: `${raw.id || generateId('pl')}_video`, ...base, name: audioItems.length ? `${base.name} (Video)` : base.name, kind: 'VIDEO_ONLY', items: videoItems.slice(0, MAX_ITEMS_PER_PLAYLIST)});
  }
  return records;
};

export const normalizePersistedPlaylists = (raw: unknown): Playlist[] => {
  if (!Array.isArray(raw)) return [];
  const normalized = raw.flatMap(entry =>
    entry && typeof entry === 'object' ? splitLegacyMixed(entry as LegacyPlaylistRecord) : [],
  );
  return normalized.slice(0, MAX_PLAYLISTS);
};

const playlistSlice = createSlice({
  name: PLAYLIST_STATE_KEY,
  initialState,
  reducers: {
    createPlaylist(state, action: PayloadAction<Playlist>) {
      if (state.playlists.length >= MAX_PLAYLISTS) return;
      state.playlists.push(action.payload);
    },
    renamePlaylist(state, action: PayloadAction<{id: string; newName: string; info?: string}>) {
      const playlist = state.playlists.find(item => item.id === action.payload.id);
      if (!playlist) return;
      const name = action.payload.newName.trim();
      if (name) playlist.name = name;
      if (action.payload.info !== undefined) playlist.info = action.payload.info.trim() || undefined;
      playlist.updatedAt = new Date().toISOString();
    },
    deletePlaylist(state, action: PayloadAction<string>) {
      state.playlists = state.playlists.filter(item => item.id !== action.payload);
    },
    addItemToPlaylist(state, action: PayloadAction<{playlistId: string; item: PlaylistItem}>) {
      const playlist = state.playlists.find(item => item.id === action.payload.playlistId);
      if (!playlist || playlist.items.length >= MAX_ITEMS_PER_PLAYLIST) return;
      const item = action.payload.item;
      if (playlist.items.some(existing => existing.fileUri === item.fileUri)) return;
      if (!isPlaylistMediaKindAllowed(playlist.kind, item.type, item.mediaType)) return;
      playlist.items.push(item);
      playlist.updatedAt = new Date().toISOString();
    },
    removeItemFromPlaylist(state, action: PayloadAction<{playlistId: string; itemId: string}>) {
      const playlist = state.playlists.find(item => item.id === action.payload.playlistId);
      if (!playlist) return;
      playlist.items = playlist.items.filter(item => item.id !== action.payload.itemId);
      playlist.updatedAt = new Date().toISOString();
    },
    reorderPlaylistItems(state, action: PayloadAction<{playlistId: string; fromIndex: number; toIndex: number}>) {
      const playlist = state.playlists.find(item => item.id === action.payload.playlistId);
      if (!playlist) return;
      const {fromIndex, toIndex} = action.payload;
      if (fromIndex < 0 || fromIndex >= playlist.items.length || toIndex < 0 || toIndex >= playlist.items.length) return;
      const [moved] = playlist.items.splice(fromIndex, 1);
      playlist.items.splice(toIndex, 0, moved);
      playlist.updatedAt = new Date().toISOString();
    },
    clearPlaylist(state, action: PayloadAction<string>) {
      const playlist = state.playlists.find(item => item.id === action.payload);
      if (!playlist) return;
      playlist.items = [];
      playlist.updatedAt = new Date().toISOString();
    },
    importPlaylist(state, action: PayloadAction<ImportPlaylistPayload>) {
      if (state.playlists.length >= MAX_PLAYLISTS) return;
      state.playlists.push(...splitLegacyMixed({
        id: generateId('pl_import'),
        name: action.payload.name,
        info: action.payload.info,
        kind: action.payload.kind,
        items: action.payload.items,
      }).slice(0, MAX_PLAYLISTS - state.playlists.length));
    },
    updatePlaylistItemPosition(state, action: PayloadAction<{playlistId: string; fileUri: string; position: number}>) {
      const playlist = state.playlists.find(item => item.id === action.payload.playlistId);
      const item = playlist?.items.find(entry => entry.fileUri === action.payload.fileUri);
      if (!playlist || !item) return;
      item.position = Math.max(0, action.payload.position);
      playlist.updatedAt = new Date().toISOString();
    },
    resetPlaylists(state) {
      state.playlists = [];
    },
  },
  extraReducers: builder => {
    builder.addCase(resetAppState, state => {
      state.playlists = [];
    });
    builder.addMatcher(
      action => action.type === REHYDRATE,
      (state, action: {payload?: {playlists?: unknown}}) => {
        if (action.payload?.playlists !== undefined) {
          state.playlists = normalizePersistedPlaylists(action.payload.playlists);
        }
      },
    );
  },
});

export const {
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
  reorderPlaylistItems,
  clearPlaylist,
  importPlaylist,
  updatePlaylistItemPosition,
  resetPlaylists,
} = playlistSlice.actions;

const selectPlaylistsState = (state: RootState): PlaylistState => state.playlists;

export const selectAllPlaylists = createSelector(selectPlaylistsState, state => state.playlists);
export const selectPlaylistById = (id: string) => createSelector(selectAllPlaylists, items => items.find(item => item.id === id));
export const selectPlaylistsByKind = (kind: PlaylistKind) => createSelector(selectAllPlaylists, items => items.filter(item => item.kind === kind));

export default playlistSlice.reducer;
