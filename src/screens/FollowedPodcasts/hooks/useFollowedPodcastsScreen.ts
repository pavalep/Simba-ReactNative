// ─── "My Podcasts" — data hook ─────────────────────────────────────────
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page's data is the followed list itself, and its two actions are
// opening a podcast and unfollowing one. The screen used to reach for
// the navigation PROP to open a podcast and kept the haptics and the
// toast inline in the row handler; the hook owns all three now, so the
// content component is a rendering choice and nothing else.

import {useCallback} from 'react';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {navigate} from '../../../navigation/navigationHelper';
import {useFollowedPodcasts} from '../../../features/followedPodcasts';

export interface UseFollowedPodcastsScreenResult {
  /** The podcasts the user follows. */
  list: ReturnType<typeof useFollowedPodcasts>['list'];
  /** Open a podcast's own page. */
  openPodcast: (podcastId: number) => void;
  /** Unfollow a podcast — the page's whole reason to exist. */
  unfollowPodcast: (podcastId: number, title: string) => void;
};

export function useFollowedPodcastsScreen(): UseFollowedPodcastsScreenResult {
  const {list, unfollow} = useFollowedPodcasts();
  const toast = useToast();
  const haptics = useHaptics();

  const openPodcast = useCallback((podcastId: number) => {
    navigate('PodcastDetail', {podcastId});
  }, []);

  // The unfollow does the THREE things `PodcastDetailScreen` does —
  // remove it, tick the haptic, say so in a toast — so following a
  // podcast and unfollowing it feel the same wherever the user does it.
  const unfollowPodcast = useCallback(
    (podcastId: number, title: string) => {
      unfollow(podcastId);
      haptics.light();
      toast.show(`Unfollowed "${title}"`, 'info');
    },
    [haptics, toast, unfollow],
  );

  return {list, openPodcast, unfollowPodcast};
}