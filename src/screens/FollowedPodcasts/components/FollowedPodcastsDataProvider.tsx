// ─── "My Podcasts" — FollowedPodcastsDataProvider ─────────────────────
// Sits ABOVE the shell so the page's data has ONE owner.
//
// WAVE B16 (Wave B2) — this file is new.
//
// The provider exists for the same reason the Music, Movies, Podcasts,
// Audiobooks and All Audio screens have one: the content component
// must not reach for the navigation prop or the toast, and the page's
// data must have one owner.
//
// This page declares NO search and NO option groups, so there is no
// shell-owned scope to push DOWN into it — the provider's job here is
// narrower than its siblings': it owns the followed list and the two
// actions, and the content reads them.

import React, {useCallback, useContext, useMemo, type ReactNode} from 'react';
import {useFollowedPodcastsScreen} from '../hooks/useFollowedPodcastsScreen';

interface FollowedPodcastsDataContextValue {
  /** The podcasts the user follows. */
  list: ReturnType<typeof useFollowedPodcastsScreen>['list'];
  /** Open a podcast's own page. */
  openPodcast: (podcastId: number) => void;
  /** Unfollow a podcast. */
  unfollowPodcast: (podcastId: number, title: string) => void;
};

const FollowedPodcastsDataContext = React.createContext<FollowedPodcastsDataContextValue | null>(
  null,
);

export function useFollowedPodcastsData(): FollowedPodcastsDataContextValue {
  const ctx = useContext(FollowedPodcastsDataContext);
  if (!ctx) {
    throw new Error(
      'useFollowedPodcastsData must be used inside <FollowedPodcastsDataProvider>.',
    );
  }
  return ctx;
};

export const FollowedPodcastsDataProvider: React.FC<{
  children: ReactNode;
}> = ({children}) => {
  const page = useFollowedPodcastsScreen();

  // The setters are stable identities, so the content's push-down
  // effects do not re-run on every render of the provider.
  const stableOpenPodcast = useCallback((id: number) => page.openPodcast(id), [
    page.openPodcast,
  ]);
  const stableUnfollowPodcast = useCallback(
    (id: number, title: string) => page.unfollowPodcast(id, title),
    [page.unfollowPodcast],
  );

  const value = useMemo<FollowedPodcastsDataContextValue>(
    () => ({
      list: page.list,
      openPodcast: stableOpenPodcast,
      unfollowPodcast: stableUnfollowPodcast,
    }),
    [page.list, stableOpenPodcast, stableUnfollowPodcast],
  );

  return (
    <FollowedPodcastsDataContext.Provider value={value}>
      {children}
    </FollowedPodcastsDataContext.Provider>
  );
};