import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

/**
 * V17 Phase 79: replaces `followedPodcastsReducer` (Redux) with
 * `useFollowedPodcastsStore` (Zustand + persist). State shape +
 * action semantics + persist key (`'followedPodcasts'`) are
 * preserved. The `normalizeFollowedPodcast` helper moves into
 * the store as a private function.
 */

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

export interface FollowedPodcastsState {
  items: FollowedPodcast[];
}

export interface FollowedPodcastsActions {
  addFollowedPodcast: (item: FollowedPodcast) => void;
  removeFollowedPodcast: (id: number) => void;
  setFollowedPodcasts: (items: FollowedPodcast[]) => void;
  reset: () => void;
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

export const useFollowedPodcastsStore = create<FollowedPodcastsState & FollowedPodcastsActions>()(
  persist(
    (set) => ({
      ...initialState,
      addFollowedPodcast: (item) =>
        set((s) => {
          const entry = normalizeFollowedPodcast(item);
          if (s.items.some((it) => it.id === entry.id)) return s;
          return {items: [entry, ...s.items]};
        }),
      removeFollowedPodcast: (id) =>
        set((s) => ({items: s.items.filter((it) => it.id !== id)})),
      setFollowedPodcasts: (items) =>
        set(() => {
          const seen = new Set<number>();
          const next = items
            .map(normalizeFollowedPodcast)
            .filter((it) => {
              if (seen.has(it.id)) return false;
              seen.add(it.id);
              return true;
            });
          return {items: next};
        }),
      reset: () => set({...initialState}),
    }),
    {
      name: 'followedPodcasts',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);
