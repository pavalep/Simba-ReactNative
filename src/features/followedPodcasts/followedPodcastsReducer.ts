import {createSelector, createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {resetAppState} from '../../store/slices/authSlice';

export interface FollowedPodcast {
  id: number;
  title: string;
  author: string;
  /** Cover art URL from the Podcast Index provider, or an empty string. */
  image: string;
  feedUrl: string;
  episodeCount: number;
  followedAt: string;
}

interface FollowedPodcastsState {
  items: FollowedPodcast[];
}

interface FollowedPodcastsStateRoot {
  followedPodcasts: FollowedPodcastsState;
}

const initialState: FollowedPodcastsState = {
  items: [],
};

function normalizeFollowedPodcast(input: FollowedPodcast): FollowedPodcast {
  return {
    id: Number(input.id),
    title: input.title ?? '',
    author: input.author ?? '',
    image: input.image ?? '',
    feedUrl: input.feedUrl ?? '',
    episodeCount: Math.max(0, Number(input.episodeCount) || 0),
    followedAt: input.followedAt || new Date().toISOString(),
  };
}

const followedPodcastsSlice = createSlice({
  name: 'followedPodcasts',
  initialState,
  reducers: {
    addFollowedPodcast(state, action: PayloadAction<FollowedPodcast>) {
      const entry = normalizeFollowedPodcast(action.payload);
      if (state.items.some(item => item.id === entry.id)) return;
      state.items = [entry, ...state.items];
    },
    removeFollowedPodcast(state, action: PayloadAction<number>) {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    setFollowedPodcasts(state, action: PayloadAction<FollowedPodcast[]>) {
      const seen = new Set<number>();
      state.items = action.payload
        .map(normalizeFollowedPodcast)
        .filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
    },
  },
  extraReducers: builder => {
    builder.addCase(resetAppState, state => {
      state.items = [];
    });
  },
});

export const {
  addFollowedPodcast,
  removeFollowedPodcast,
  setFollowedPodcasts,
} = followedPodcastsSlice.actions;

export const selectFollowedPodcasts = (
  state: FollowedPodcastsStateRoot,
): FollowedPodcast[] => state.followedPodcasts.items ?? [];

export const selectFollowedPodcastCount = createSelector(
  [selectFollowedPodcasts],
  items => items.length,
);

export const selectFollowedPodcastIds = createSelector(
  [selectFollowedPodcasts],
  items => items.map(item => item.id),
);

export const selectFollowedPodcastById = createSelector(
  [selectFollowedPodcasts, (_state: FollowedPodcastsStateRoot, id: number) => id],
  (items, id) => items.find(item => item.id === id),
);

export const selectIsPodcastFollowed = createSelector(
  [selectFollowedPodcasts, (_state: FollowedPodcastsStateRoot, id: number) => id],
  (items, id) => items.some(item => item.id === id),
);

export default followedPodcastsSlice.reducer;


