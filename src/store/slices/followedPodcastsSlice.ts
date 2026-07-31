// ─── Followed Podcasts Slice ─────────────────────────────────
// Phase 35.5: follow/favorite podcasts. Persisted via the
// redux-persist whitelist (see store/persistConfig.ts).

import {createSlice, createSelector, PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../index';

export interface FollowedPodcast {
  id: number;
  title: string;
  author: string;
  /** Cover art URL (Podcast Index image) or empty string. */
  image: string;
  feedUrl: string;
  episodeCount: number;
  followedAt: string; // ISO date string
}

interface FollowedPodcastsState {
  items: FollowedPodcast[];
}

const initialState: FollowedPodcastsState = {
  items: [],
};

const followedPodcastsSlice = createSlice({
  name: 'followedPodcasts',
  initialState,
  reducers: {
    addFollowedPodcast(state, action: PayloadAction<FollowedPodcast>) {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) return;
      state.items = [action.payload, ...state.items];
    },
    removeFollowedPodcast(state, action: PayloadAction<number>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    setFollowedPodcasts(state, action: PayloadAction<FollowedPodcast[]>) {
      state.items = action.payload;
    },
  },
});

export const {addFollowedPodcast, removeFollowedPodcast, setFollowedPodcasts} =
  followedPodcastsSlice.actions;

export const selectFollowedPodcasts = (state: RootState): FollowedPodcast[] =>
  state.followedPodcasts.items ?? [];

export const selectIsPodcastFollowed = createSelector(
  [selectFollowedPodcasts, (_state: RootState, id: number) => id],
  (items, id) => items.some(i => i.id === id),
);

export default followedPodcastsSlice.reducer;
