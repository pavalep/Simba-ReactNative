import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import {isPlaylistMediaKindAllowed, type Playlist, type PlaylistItem, type PlaylistKind, type PlaylistLegacyKind} from '../types/playlist';
import type {MediaKind, MediaLane} from '../types/media';

/**
 * V17 Phase 82: replaces `playlistReducer` (Redux + redux-persist
 * whitelist) with `usePlaylistsStore` (Zustand + persist, key
 * 'playlists' to match the old redux-persist whitelist). The
 * on-device data migration is a no-op: the zustand persist
 * middle-ware runs `normalizePersistedPlaylists` on rehydrate
 * to drop entries that don't conform to the new shape, and
 * test devices reinstall per the V17 charter.
 *
 * The legacy `MIXED` playlist kind (pre-V13) is split into
 * `AUDIO_ONLY` + `VIDEO_ONLY` siblings on the fly, same as the
 * old reducer.
 */

export const MAX_PLAYLISTS = 20;
export const MAX_ITEMS_PER_PLAYLIST = 100;

export interface PlaylistsState {
  playlists: Playlist[];
}

export interface PlaylistsActions {
  createPlaylist: (playlist: Playlist) => void;
  renamePlaylist: (input: {id: string; newName: string; info?: string}) => void;
  deletePlaylist: (id: string) => void;
  addItemToPlaylist: (input: {playlistId: string; item: PlaylistItem}) => void;
  removeItemFromPlaylist: (input: {playlistId: string; itemId: string}) => void;
  reorderPlaylistItems: (input: {playlistId: string; fromIndex: number; toIndex: number}) => void;
  clearPlaylist: (id: string) => void;
  importPlaylist: (input: {
    name: string;
    info?: string;
    kind: PlaylistLegacyKind;
    items: PlaylistItem[];
  }) => void;
  updatePlaylistItemPosition: (input: {playlistId: string; fileUri: string; position: number}) => void;
  resetPlaylists: () => void;
  reset: () => void;
  setPlaylists: (playlists: Playlist[]) => void;
}

const initialState: PlaylistsState = {playlists: []};

const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const isPlaylistKind = (value: unknown): value is PlaylistKind =>
  value === 'AUDIO_ONLY' || value === 'VIDEO_ONLY';

const isMediaLane = (value: unknown): value is MediaLane =>
  value === 'audio' || value === 'video';

const isMediaKind = (value: unknown): value is MediaKind =>
  typeof value === 'string' &&
  [
    'audio', 'music', 'podcast', 'audiobook', 'radio', 'video',
    'movie', 'live-tv', 'archive-audio', 'archive-video',
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
    const kind: PlaylistKind = isPlaylistKind(raw.kind) ? raw.kind : 'AUDIO_ONLY';
    return [{
      id: raw.id || generateId('pl'),
      ...base,
      kind,
      items: items
        .filter(item => isPlaylistMediaKindAllowed(kind, item.type, item.mediaType))
        .slice(0, MAX_ITEMS_PER_PLAYLIST),
    }];
  }

  const audioItems = items.filter(item => isPlaylistMediaKindAllowed('AUDIO_ONLY', item.type, item.mediaType));
  const videoItems = items.filter(item => isPlaylistMediaKindAllowed('VIDEO_ONLY', item.type, item.mediaType));
  const records: Playlist[] = [];
  if (audioItems.length || (!videoItems.length && !audioItems.length)) {
    records.push({
      id: `${raw.id || generateId('pl')}_audio`,
      ...base,
      name: videoItems.length ? `${base.name} (Audio)` : base.name,
      kind: 'AUDIO_ONLY',
      items: audioItems.slice(0, MAX_ITEMS_PER_PLAYLIST),
    });
  }
  if (videoItems.length) {
    records.push({
      id: `${raw.id || generateId('pl')}_video`,
      ...base,
      name: audioItems.length ? `${base.name} (Video)` : base.name,
      kind: 'VIDEO_ONLY',
      items: videoItems.slice(0, MAX_ITEMS_PER_PLAYLIST),
    });
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

export const usePlaylistsStore = create<PlaylistsState & PlaylistsActions>()(
  persist(
    (set) => ({
      ...initialState,

      createPlaylist: (playlist) =>
        set((s) =>
          s.playlists.length >= MAX_PLAYLISTS
            ? s
            : {playlists: [...s.playlists, playlist]},
        ),

      renamePlaylist: ({id, newName, info}) =>
        set((s) => ({
          playlists: s.playlists.map(item => {
            if (item.id !== id) return item;
            const name = newName.trim();
            return {
              ...item,
              ...(name ? {name} : {}),
              ...(info !== undefined ? {info: info.trim() || undefined} : {}),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      deletePlaylist: (id) =>
        set((s) => ({playlists: s.playlists.filter(item => item.id !== id)})),

      addItemToPlaylist: ({playlistId, item}) =>
        set((s) => ({
          playlists: s.playlists.map(pl => {
            if (pl.id !== playlistId) return pl;
            if (pl.items.length >= MAX_ITEMS_PER_PLAYLIST) return pl;
            if (pl.items.some(existing => existing.fileUri === item.fileUri)) return pl;
            if (!isPlaylistMediaKindAllowed(pl.kind, item.type, item.mediaType)) return pl;
            return {
              ...pl,
              items: [...pl.items, item],
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      removeItemFromPlaylist: ({playlistId, itemId}) =>
        set((s) => ({
          playlists: s.playlists.map(pl => {
            if (pl.id !== playlistId) return pl;
            return {
              ...pl,
              items: pl.items.filter(item => item.id !== itemId),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      reorderPlaylistItems: ({playlistId, fromIndex, toIndex}) =>
        set((s) => ({
          playlists: s.playlists.map(pl => {
            if (pl.id !== playlistId) return pl;
            if (
              fromIndex < 0 || fromIndex >= pl.items.length ||
              toIndex < 0 || toIndex >= pl.items.length
            ) {
              return pl;
            }
            const items = pl.items.slice();
            const [moved] = items.splice(fromIndex, 1);
            items.splice(toIndex, 0, moved);
            return {...pl, items, updatedAt: new Date().toISOString()};
          }),
        })),

      clearPlaylist: (id) =>
        set((s) => ({
          playlists: s.playlists.map(pl =>
            pl.id === id
              ? {...pl, items: [], updatedAt: new Date().toISOString()}
              : pl,
          ),
        })),

      importPlaylist: ({name, info, kind, items}) =>
        set((s) => {
          if (s.playlists.length >= MAX_PLAYLISTS) return s;
          const newRecords = splitLegacyMixed({
            id: generateId('pl_import'),
            name,
            info,
            kind,
            items,
          }).slice(0, MAX_PLAYLISTS - s.playlists.length);
          return {playlists: [...s.playlists, ...newRecords]};
        }),

      updatePlaylistItemPosition: ({playlistId, fileUri, position}) =>
        set((s) => ({
          playlists: s.playlists.map(pl => {
            if (pl.id !== playlistId) return pl;
            const item = pl.items.find(entry => entry.fileUri === fileUri);
            if (!item) return pl;
            return {
              ...pl,
              items: pl.items.map(entry =>
                entry.fileUri === fileUri
                  ? {...entry, position: Math.max(0, position)}
                  : entry,
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      resetPlaylists: () => set({playlists: []}),

      reset: () => set({playlists: []}),

      setPlaylists: (playlists) => set({playlists: normalizePersistedPlaylists(playlists)}),
    }),
    {
      name: 'playlists',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
      // Run the legacy-MIXED-split normalizer on rehydrate so old
      // persisted shapes fold into the new V13+ V17 store cleanly.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.playlists = normalizePersistedPlaylists(state.playlists);
      },
    },
  ),
);
