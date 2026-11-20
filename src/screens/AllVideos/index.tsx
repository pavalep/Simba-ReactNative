// ─── All Videos — composition root ─────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks
// the shared options hook for the scope, wraps the content in the data
// provider and hands the whole thing to the shared browse shell.
//
// WAVE B16 (Wave B2) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: its own
// `SafeAreaView`, its own full-bleed gradient, its own `BackButton` and
// title, its own `SearchBar`, and two header buttons that flipped the
// sort and the view with no way to say which order was in force. It is
// now the same shell every other browse page uses.

import React from 'react';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {AllVideosContent} from './components/AllVideosContent';
import {AllVideosDataProvider} from './components/AllVideosDataProvider';
import {ALL_VIDEOS_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig, AllVideosScreenProps} from './types';

const ALL_VIDEOS_CONFIG: SectionBrowseConfig = {
  ...ALL_VIDEOS_SECTION_CONFIG,
  // The content renderer is bound here (by spread) to break the
  // config → content → screen → config cycle.
  renderContent: ctx => <AllVideosContent ctx={ctx} />,
};

export const AllVideosScreen: React.FC<AllVideosScreenProps> = () => {
  const optionsApi = useSectionOptions(ALL_VIDEOS_CONFIG);

  return (
    <AllVideosDataProvider>
      <BrowseLayout
        config={ALL_VIDEOS_CONFIG}
        optionsApi={optionsApi}
        routeParams={{}}
      />
    </AllVideosDataProvider>
  );
};

export default AllVideosScreen;

export type {AllVideosScreenProps} from './types';