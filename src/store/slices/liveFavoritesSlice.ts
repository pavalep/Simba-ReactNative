// ─── Live Favorites Slice ───────────────────────────────────
// Phase 36.3/36.5: persisted favorites for radio stations and
// live TV channels. Persisted via the redux-persist whitelist
// (see store/persistConfig.ts).

import {createSlice, createSelector, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../index';

export interface LiveFavoriteItem {
  kind: 'radio' | 'tv';
  /** stationuuid (radio) or channel id (tv) */
  id: string;
  name: string;
  /** Playable stream URL */
  url: string;
  /** favicon (radio) or logo (tv) URL — may be empty */
  image: string;
  /** One-line context, e.g. "Germany · pop" or "News · US" */
  subtitle: string;
  codec?: string;
  bitrate?: number;
  addedAt: string; // ISO date string
}

interface LiveFavoritesState {
  items: LiveFavoriteItem[];
}

const initialState: LiveFavoritesState = {
  items: [],
};

const liveFavoritesSlice = createSlice({
  name: 'liveFavorites',
  initialState,
  reducers: {
    addLiveFavorite(state, action: PayloadAction<LiveFavoriteItem>) {
      const exists = state.items.find(
        i => i.kind === action.payload.kind && i.id === action.payload.id,
      );
      if (exists) return;
      state.items = [action.payload, ...state.items];
    },
    removeLiveFavorite(
      state,
      action: PayloadAction<{kind: 'radio' | 'tv'; id: string}>,
    ) {
      state.items = state.items.filter(
        i =>
          !(i.kind === action.payload.kind && i.id === action.payload.id),
      );
    },
    setLiveFavorites(state, action: PayloadAction<LiveFavoriteItem[]>) {
      state.items = action.payload;
    },
  },
});

export const {addLiveFavorite, removeLiveFavorite, setLiveFavorites} =
  liveFavoritesSlice.actions;

export const selectLiveFavorites = (state: RootState): LiveFavoriteItem[] =>
  state.liveFavorites.items ?? [];

export const selectLiveFavoritesByKind = createSelector(
  [selectLiveFavorites, (_state: RootState, kind: 'radio' | 'tv') => kind],
  (items, kind) => items.filter(i => i.kind === kind),
);

export const selectIsLiveFavorite = createSelector(
  [
    selectLiveFavorites,
    (_state: RootState, kind: 'radio' | 'tv') => kind,
    (_state: RootState, _kind: 'radio' | 'tv', id: string) => id,
  ],
  (items, kind, id) => items.some(i => i.kind === kind && i.id === id),
);

export default liveFavoritesSlice.reducer;
