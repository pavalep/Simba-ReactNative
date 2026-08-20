import {useCallback, useImperativeHandle, type ForwardedRef} from 'react';
import {useAppDispatch, useAppSelector, type AppDispatch} from '../../store';
import {
  addFollowedPodcast,
  removeFollowedPodcast,
  selectFollowedPodcastCount,
  selectFollowedPodcastById,
  selectFollowedPodcasts,
  selectIsPodcastFollowed,
  type FollowedPodcast,
} from './followedPodcastsReducer';

export type {FollowedPodcast} from './followedPodcastsReducer';
export {
  selectFollowedPodcasts,
  selectFollowedPodcastCount,
  selectFollowedPodcastIds,
  selectFollowedPodcastById,
  selectIsPodcastFollowed,
} from './followedPodcastsReducer';

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
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectFollowedPodcasts);
  const count = useAppSelector(selectFollowedPodcastCount);

  const getFollowed = useCallback(() => items, [items]);
  const isFollowed = useCallback(
    (podcastId: number) => Boolean(items.find(item => item.id === podcastId)),
    [items],
  );
  const follow = useCallback(
    (podcast: FollowedPodcast) => dispatch(addFollowedPodcast(podcast)),
    [dispatch],
  );
  const unfollow = useCallback(
    (podcastId: number) => dispatch(removeFollowedPodcast(podcastId)),
    [dispatch],
  );
  const toggle = useCallback(
    (podcast: FollowedPodcast) => {
      if (isFollowed(podcast.id)) {
        dispatch(removeFollowedPodcast(podcast.id));
      } else {
        dispatch(addFollowedPodcast(podcast));
      }
    },
    [dispatch, isFollowed],
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

export function getFollowed(
  dispatch: AppDispatch,
  state: Parameters<typeof selectFollowedPodcasts>[0],
): FollowedPodcast[] {
  return selectFollowedPodcasts(state);
}

export function isFollowed(
  state: Parameters<typeof selectIsPodcastFollowed>[0],
  podcastId: number,
): boolean {
  return selectIsPodcastFollowed(state, podcastId);
}

export function follow(dispatch: AppDispatch, podcast: FollowedPodcast): void {
  dispatch(addFollowedPodcast(podcast));
}

export function unfollow(dispatch: AppDispatch, podcastId: number): void {
  dispatch(removeFollowedPodcast(podcastId));
}

export function toggleFollow(
  dispatch: AppDispatch,
  state: Parameters<typeof selectFollowedPodcastById>[0],
  podcast: FollowedPodcast,
): void {
  if (selectFollowedPodcastById(state, podcast.id)) {
    unfollow(dispatch, podcast.id);
  } else {
    follow(dispatch, podcast);
  }
}
