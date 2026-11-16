import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {MusicDataProvider} from './components/MusicDataProvider';
import {MusicContent} from './components/MusicContent';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {MUSIC_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig} from './types';

/**
 * The config the screen feeds to the shell.
 *
 * It is hoisted to module scope, like the Movies screen's, so the shell
 * and `useSectionOptions` receive ONE stable object. It used to be
 * rebuilt on every render — a new object and a new `renderContent`
 * closure each time — and the copy given to `useSectionOptions` was a
 * different object from the one given to the shell.
 */
const MUSIC_CONFIG: SectionBrowseConfig = {
  ...MUSIC_SECTION_CONFIG,
  renderContent: ctx => <MusicContent ctx={ctx} />,
};

/**
 * Music composition root.
 *
 * Keep route/config/provider wiring here; list rendering and media state live
 * in MusicContent so the screen follows the v11 index-only contract.
 */
export const MusicScreen: React.FC<RootStackScreenProps<'MusicScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(MUSIC_CONFIG, params);

  return (
    <MusicDataProvider>
      <BrowseLayout
        config={MUSIC_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </MusicDataProvider>
  );
};
