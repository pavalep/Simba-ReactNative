// ─── useFollowedPodcasts (V17) ─────────────────────────────────────
// V17 Phase 79: rewritten to read/write the zustand
// `useFollowedPodcastsStore` directly. The redux
// `followedPodcastsReducer` + selectors are gone.
//
// Public API is preserved: `useFollowedPodcasts()` still returns
// `{list, count, getFollowed, isFollowed, follow, unfollow, toggle}`.
// The legacy `getFollowed(state)` / `isFollowed(state, id)` helpers
// that took a `RootState` parameter are removed (no longer makes
// sense — there's no redux RootState). They were only used
// internally in services; services now call the store directly.

import {useCallback, useImperativeHandle, type ForwardedRef} from 'react';
import {useFollowedPodcastsStore, type FollowedPodcast} from '../../state';

export type {FollowedPodcast};

export interface FollowedPodcastsHandle {
  list: FollowedPodcast[];
  getFollowed: () => FollowedPodcast[];
  isFollowed: (podcastId: number) => boolean;
  follow: (podcast: FollowedPodcast) => void;
  unfollow: (podcastId: number) => void;
  toggle: (podcast: FollowedPodcast) => void;
}

export interface UseFollowedPodcastsResult extends FollowedPodcastsHandle {
  items: FollowedPodcast[];
  count: number;
}

export function useFollowedPodcasts(
  ref?: ForwardedRef<FollowedPodcastsHandle>,
): UseFollowedPodcastsResult {
  const items = useFollowedPodcastsStore(s => s.items);
  const count = items.length;

  const getFollowed = useCallback(() => items, [items]);
  const isFollowed = useCallback(
    (podcastId: number) => Boolean(items.find(item => item.id === podcastId)),
    [items],
  );
  const follow = useCallback((podcast: FollowedPodcast) => {
    useFollowedPodcastsStore.getState().addFollowedPodcast(podcast);
  }, []);
  const unfollow = useCallback((podcastId: number) => {
    useFollowedPodcastsStore.getState().removeFollowedPodcast(podcastId);
  }, []);
  const toggle = useCallback(
    (podcast: FollowedPodcast) => {
      if (isFollowed(podcast.id)) {
        useFollowedPodcastsStore.getState().removeFollowedPodcast(podcast.id);
      } else {
        useFollowedPodcastsStore.getState().addFollowedPodcast(podcast);
      }
    },
    [isFollowed],
  );

  useImperativeHandle(
    ref,
    () => ({list: items, getFollowed, isFollowed, follow, unfollow, toggle}),
    [follow, getFollowed, isFollowed, items, toggle, unfollow],
  );

  return {
    list: items,
    items,
    count,
    getFollowed,
    isFollowed,
    follow,
    unfollow,
    toggle,
  };
}
