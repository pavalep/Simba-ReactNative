import {createSlice, createSelector, PayloadAction} from '@reduxjs/toolkit';
import {Playlist, PlaylistItem, PlaylistKind} from '../../types/playlist';
import type {RootState} from '../index';

// ─── Helpers ────────────────────────────────────────────────

const generateId = (): string =>
  `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// ─── State ──────────────────────────────────────────────────

interface PlaylistState {
  playlists: Playlist[];
}

const initialState: PlaylistState = {
  playlists: [],
};

// ─── Slice ──────────────────────────────────────────────────

const playlistSlice = createSlice({
  name: 'playlists',
  initialState,
  reducers: {
    createPlaylist: {
      reducer(state, action: PayloadAction<Playlist>) {
        state.playlists.push(action.payload);
      },
      prepare(payload: {name: string; kind: PlaylistKind}) {
        const now = new Date().toISOString();
        return {
          payload: {
            id: generateId(),
            name: payload.name,
            kind: payload.kind,
            items: [],
            createdAt: now,
            updatedAt: now,
          },
        };
      },
    },

    renamePlaylist(
      state,
      action: PayloadAction<{id: string; newName: string}>,
    ) {
      const pl = state.playlists.find(p => p.id === action.payload.id);
      if (pl) {
        pl.name = action.payload.newName;
        pl.updatedAt = new Date().toISOString();
      }
    },

    deletePlaylist(state, action: PayloadAction<string>) {
      state.playlists = state.playlists.filter(
        p => p.id !== action.payload,
      );
    },

    addItemToPlaylist(
      state,
      action: PayloadAction<{playlistId: string; item: PlaylistItem}>,
    ) {
      const pl = state.playlists.find(
        p => p.id === action.payload.playlistId,
      );
      if (pl) {
        pl.items.push(action.payload.item);
        pl.updatedAt = new Date().toISOString();
      }
    },

    removeItemFromPlaylist(
      state,
      action: PayloadAction<{playlistId: string; itemId: string}>,
    ) {
      const pl = state.playlists.find(
        p => p.id === action.payload.playlistId,
      );
      if (pl) {
        pl.items = pl.items.filter(i => i.id !== action.payload.itemId);
        pl.updatedAt = new Date().toISOString();
      }
    },

    reorderPlaylistItems(
      state,
      action: PayloadAction<{
        playlistId: string;
        fromIndex: number;
        toIndex: number;
      }>,
    ) {
      const pl = state.playlists.find(
        p => p.id === action.payload.playlistId,
      );
      if (pl) {
        const {fromIndex, toIndex} = action.payload;
        if (
          fromIndex < 0 ||
          fromIndex >= pl.items.length ||
          toIndex < 0 ||
          toIndex >= pl.items.length
        ) {
          return;
        }
        const [moved] = pl.items.splice(fromIndex, 1);
        pl.items.splice(toIndex, 0, moved);
        pl.updatedAt = new Date().toISOString();
      }
    },

    clearPlaylist(state, action: PayloadAction<string>) {
      const pl = state.playlists.find(p => p.id === action.payload);
      if (pl) {
        pl.items = [];
        pl.updatedAt = new Date().toISOString();
      }
    },
  },
});

// ─── Actions ────────────────────────────────────────────────

export const {
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
  reorderPlaylistItems,
  clearPlaylist,
} = playlistSlice.actions;

// ─── Selectors ──────────────────────────────────────────────

const selectPlaylistsState = (state: RootState) => state.playlists;

export const selectAllPlaylists = createSelector(
  selectPlaylistsState,
  s => s.playlists,
);

export const selectPlaylistById = (id: string) =>
  createSelector(selectAllPlaylists, playlists =>
    playlists.find(p => p.id === id),
  );

export const selectPlaylistsByKind = (kind: PlaylistKind) =>
  createSelector(selectAllPlaylists, playlists =>
    playlists.filter(p => p.kind === kind),
  );

// ─── Reducer ────────────────────────────────────────────────

export default playlistSlice.reducer;
