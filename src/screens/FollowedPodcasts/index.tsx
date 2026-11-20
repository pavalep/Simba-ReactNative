// ─── "My Podcasts" — composition root ──────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks
// the shared options hook for the scope, wraps the content in the data
// provider and hands the whole thing to the shared browse shell.
//
// WAVE B16 (Wave B2) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: a
// `ScreenContainer` with an `InternalHeader` inside it, its own list
// and its own empty state. It is now the same shell every other browse
// page uses.

import React from 'react';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {FollowedPodcastsContent} from './components/FollowedPodcastsContent';
import {FollowedPodcastsDataProvider} from './components/FollowedPodcastsDataProvider';
import {FOLLOWED_PODCASTS_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig, FollowedPodcastsScreenProps} from './types';

const FOLLOWED_PODCASTS_CONFIG: SectionBrowseConfig = {
  ...FOLLOWED_PODCASTS_SECTION_CONFIG,
  // The content renderer is bound here (by spread) to break the
  // config → content → screen → config cycle.
  renderContent: ctx => <FollowedPodcastsContent ctx={ctx} />,
};

export const FollowedPodcastsScreen: React.FC<FollowedPodcastsScreenProps> = () => {
  // The page declares no option groups, so the options model is empty —
  // the shell draws no chip strip and no filter button, and the sheet
  // has nothing to show.
  const optionsApi = useSectionOptions(FOLLOWED_PODCASTS_CONFIG);

  return (
    <FollowedPodcastsDataProvider>
      <BrowseLayout
        config={FOLLOWED_PODCASTS_CONFIG}
        optionsApi={optionsApi}
        routeParams={{}}
      />
    </FollowedPodcastsDataProvider>
  );
};

export default FollowedPodcastsScreen;

export type {FollowedPodcastsScreenProps} from './types';