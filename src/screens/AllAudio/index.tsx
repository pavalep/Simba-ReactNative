// ─── All Audio — composition root ───────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks
// the shared options hook for the scope, wraps the content in the data
// provider and hands the whole thing to the shared browse shell.
//
// WAVE B16 (Wave B) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: its own
// header, its own search field, its own view and sort buttons, its own
// gradient and its own list. It is now the same shell every other
// browse page uses.

import React, {useMemo} from 'react';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {useMediaAudioTracks} from '../../state';
import {AllAudioContent} from './components/AllAudioContent';
import {AllAudioDataProvider} from './components/AllAudioDataProvider';
import {createAllAudioSectionConfig} from './related/browseConfig';
import type {AllAudioScreenProps, SectionBrowseConfig} from './types';

export const AllAudioScreen: React.FC<AllAudioScreenProps> = ({route}) => {
  const params = route.params ?? {};
  // The route's params — `sort` and `filter` — are what the Artist
  // screen and the Library send. The option model seeds them (the sort
  // into the sort group, the filter into the artist group), so the
  // page opens in the scope its caller asked for.
  const seedArtist = params.filter;
  const seedSort = params.sort;
  // The device's scanned audio tracks — the artist axis is derived from
  // them, and they are the list the page shows.
  const tracks = useMediaAudioTracks();

  const config = useMemo<SectionBrowseConfig>(
    () => ({
      ...createAllAudioSectionConfig(tracks, seedArtist),
      // The content renderer is bound here (by spread) to break the
      // config → content → screen → config cycle.
      renderContent: ctx => <AllAudioContent ctx={ctx} />,
    }),
    [tracks, seedArtist],
  );

  const optionsApi = useSectionOptions(config, params);

  return (
    <AllAudioDataProvider initialArtist={seedArtist} initialSort={seedSort}>
      <BrowseLayout
        config={config}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </AllAudioDataProvider>
  );
};

export default AllAudioScreen;
