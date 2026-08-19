// ─── Podcasts Browser Screen (v10.2 — Movies replication) ───────────────
// Slim shell consumer (v10.2 spec §3): the shared SectionBrowseLayout owns
// the header, search, FAB and options sheet; PodcastsContent owns the
// PodcastRow list + per-category data. The PodcastsDataProvider sits ABOVE
// the shell so the single content stream shares ONE per-scope cache — the
// legacy "switching categories never refetches" behavior.
//
// The old header/search/tab-view code was deleted here (tracker Phase
// 10.2) — the shell owns all of it now. Route params (`categoryId` preset,
// query pre-fill) are consumed by the shell, which seeds the FILTER group
// + chip from them.

import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {SectionBrowseLayout} from '../sections/SectionBrowseLayout';
import {getSectionConfig} from '../sections/sectionConfig';
import {useSectionOptions} from '../sections/hooks/useSectionOptions';
import {PodcastsDataProvider} from './PodcastsContent';

export const PodcastsScreen: React.FC<RootStackScreenProps<'PodcastsScreen'>> =
  ({route}) => {
    const config = getSectionConfig('PodcastsScreen');
    const optionsApi = useSectionOptions(config, route.params);
    return (
      <PodcastsDataProvider>
        <SectionBrowseLayout
          config={config}
          optionsApi={optionsApi}
          routeParams={route.params}
        />
      </PodcastsDataProvider>
    );
  };
