import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import {isPlaylistMediaKindAllowed, type Playlist, type PlaylistItem, type PlaylistKind} from '../types/playlist';
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
 * The legacy `MIXED` playlist kind (pre-V13) used to be split into
 * `AUDIO_ONLY` + `VIDEO_ONLY` siblings on the fly, same as the old
 * reducer. It was then made a kind in its own right (V13) and a mixed
 * playlist was preserved WHOLE.
 *
 * ## The mixed kind is gone (2026-11-05)
 *
 * A playlist holds ONE lane. The `MIXED` kind was removed: a list that
 * spans two lanes is a QUEUE, not a playlist, and the mixed kind turned
 * every lane rule into a special case.
 *
 * A record persisted with the old kind is SPLIT when it is read back:
 * the audio items become one playlist and the video items become
 * another, each carrying the name it was given plus its lane, and every
 * item survives. `normalizePlaylistRecord` is the ONE owner of that
 * split, and `LEGACY_MIXED_KIND` is the ONE place in `src/` that still
 * names the old kind - the migration is the only thing that may.
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
  setPlaylistPinned: (input: {playlistId: string; pinned: boolean}) => void;
  clearPlaylist: (id: string) => void;
  importPlaylist: (input: {
    name: string;
    info?: string;
    kind: PlaylistKind;
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

/**
 * The kind a record persisted before the mixed kind was removed carries.
 *
 * This string is NOT part of the domain any more: `PlaylistKind` is
 * `AUDIO_ONLY | VIDEO_ONLY`. It survives here for one reason - to
 * recognise the old records and split them - and this constant is the
 * ONE place in `src/` that is allowed to name it.
 */
const LEGACY_MIXED_KIND = 'MIXED';

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

/**
 * A record as it may be found on disk.
 *
 * `kind` may still be the removed mixed kind - that is what the migration
 * in `normalizePlaylistRecord` exists for.
 */
type PlaylistRecord = Omit<Partial<Playlist>, 'kind' | 'items'> & {
  kind?: PlaylistKind | typeof LEGACY_MIXED_KIND;
  items?: unknown;
};

/** The parts of a record that every playlist it produces keeps. */
interface PlaylistBase {
  id: string;
  name: string;
  info?: string;
  pinned: boolean;
  pinnedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const playlistBase = (raw: PlaylistRecord): PlaylistBase => {
  const pinned = raw.pinned === true;
  const now = new Date().toISOString();
  return {
    id: raw.id || generateId('pl'),
    name: raw.name || 'Playlist',
    ...(raw.info ? {info: raw.info} : {}),
    pinned,
    ...(pinned && raw.pinnedAt ? {pinnedAt: raw.pinnedAt} : {}),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
};

/**
 * ONE record in, ONE OR TWO playlists out.
 *
 * A record whose kind is the removed mixed kind is SPLIT: its audio items
 * become one playlist and its video items become another, each carrying the
 * name it was given plus its lane. Every item survives and the name
 * survives on both halves - which is the point. The earlier splitter threw
 * the name and the id away and told the user nothing.
 *
 * The video half's id is DERIVED from the original id (`<id>-video`), not
 * generated, so the split is the same split on every boot until the
 * normalised state is written back: a generated id would give the user a
 * different video playlist every time they opened the app.
 *
 * A record that only ever held ONE lane folds into the playlist it
 * actually is: the name is kept as it was, with no "(Audio)" or "(Video)"
 * suffix on a list that was never two lists.
 *
 * A record with no items at all folds into an empty audio playlist - the
 * store's default kind - under its own name.
 */
const normalizePlaylistRecord = (raw: PlaylistRecord): Playlist[] => {
  const items = Array.isArray(raw.items)
    ? raw.items.map((item, index) => normalizeItem(item as Partial<PlaylistItem>, index)).filter(Boolean) as PlaylistItem[]
    : [];
  const base = playlistBase(raw);

  if (raw.kind === LEGACY_MIXED_KIND) {
    const audio = items.filter(item => isPlaylistMediaKindAllowed('AUDIO_ONLY', item.type, item.mediaType));
    const video = items.filter(item => isPlaylistMediaKindAllowed('VIDEO_ONLY', item.type, item.mediaType));

    if (audio.length > 0 && video.length > 0) {
      return [
        {
          ...base,
          kind: 'AUDIO_ONLY',
          name: `${base.name} (Audio)`,
          items: audio.slice(0, MAX_ITEMS_PER_PLAYLIST),
        },
        {
          ...base,
          id: `${base.id}-video`,
          kind: 'VIDEO_ONLY',
          name: `${base.name} (Video)`,
          items: video.slice(0, MAX_ITEMS_PER_PLAYLIST),
        },
      ];
    }
    if (video.length > 0) {
      return [{...base, kind: 'VIDEO_ONLY', items: video.slice(0, MAX_ITEMS_PER_PLAYLIST)}];
    }
    if (audio.length > 0) {
      return [{...base, kind: 'AUDIO_ONLY', items: audio.slice(0, MAX_ITEMS_PER_PLAYLIST)}];
    }
    return [{...base, kind: 'AUDIO_ONLY', items: []}];
  }

  const kind: PlaylistKind = isPlaylistKind(raw.kind) ? raw.kind : 'AUDIO_ONLY';
  return [
    {
      ...base,
      kind,
      // A playlist keeps only what belongs to its lane.
      items: items
        .filter(item => isPlaylistMediaKindAllowed(kind, item.type, item.mediaType))
        .slice(0, MAX_ITEMS_PER_PLAYLIST),
    },
  ];
};

export const normalizePersistedPlaylists = (raw: unknown): Playlist[] => {
  if (!Array.isArray(raw)) return [];
  const normalized = raw.flatMap(entry =>
    entry && typeof entry === 'object' ? normalizePlaylistRecord(entry as PlaylistRecord) : [],
  );
  // The cap is a cap on the playlists the user holds. A record that split
  // in two counts as two, so the cap is applied to the RESULT: a split
  // that crosses it is cut the same way any playlist past the cap is cut.
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

      setPlaylistPinned: ({playlistId, pinned}) =>
        set((s) => ({
          playlists: s.playlists.map(pl => {
            if (pl.id !== playlistId) return pl;
            // D-P3: the pinned order is the RECENCY of pinning, so the stamp
            // is written when the pin goes on and cleared when it comes
            // off. Keeping a stale stamp would make an unpinned playlist
            // reappear in the old pinned slot.
            const now = new Date().toISOString();
            return {
              ...pl,
              pinned,
              pinnedAt: pinned ? now : undefined,
              updatedAt: now,
            };
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
          const newRecords = normalizePlaylistRecord({
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
      // Run the normalizer on rehydrate so an old persisted shape folds
      // into the store cleanly - including a record that still carries the
      // removed mixed kind, which is split into its two halves.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.playlists = normalizePersistedPlaylists(state.playlists);
      },
    },
  ),
);
