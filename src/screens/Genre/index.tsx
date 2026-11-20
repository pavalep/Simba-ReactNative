// ─── Genre — composition root ──────────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, wraps
// the content in the data provider and hands the whole thing to the
// shared browse shell.
//
// WAVE B16 (Wave B2) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: its own
// `SafeAreaView`, its own full-bleed gradient, its own `BackButton` and
// title, and a `ScrollView` with a list nested inside it. It is now the
// same shell every other browse page uses.

import React, {useMemo} from 'react';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {GenreContent} from './components/GenreContent';
import {GenreDataProvider} from './components/GenreDataProvider';
import {createGenreSectionConfig} from './related/browseConfig';
import type {SectionBrowseConfig, GenreScreenProps} from './types';

export const GenreScreen: React.FC<GenreScreenProps> = ({route}) => {
  const params = route.params ?? {};
  const genre = params.genre ?? '';
  // The route's `initialTab` opens the page on one of its two sources.
  const initialSource: 'local' | 'streaming' =
    params.initialTab === 'streaming' ? 'streaming' : 'local';

  // The config is a FACTORY — the header's title IS the genre.
  const config = useMemo<SectionBrowseConfig>(
    () => ({
      ...createGenreSectionConfig(genre),
      // The content renderer is bound here (by spread) to break the
      // config → content → screen → config cycle.
      renderContent: ctx => <GenreContent ctx={ctx} />,
    }),
    [genre],
  );

  const optionsApi = useSectionOptions(config, params);

  return (
    <GenreDataProvider genre={genre} initialSource={initialSource}>
      <BrowseLayout config={config} optionsApi={optionsApi} routeParams={params} />
    </GenreDataProvider>
  );
};

export default GenreScreen;

export type {GenreScreenProps} from './types';