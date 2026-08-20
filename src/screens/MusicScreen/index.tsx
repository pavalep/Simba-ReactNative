import React, {type ReactNode} from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './components/BrowseLayout';
import {MusicDataProvider} from './components/MusicDataProvider';
import {MusicContent} from './components/MusicContent';
import {useSectionOptions} from './hooks/useOptions';
import {MUSIC_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig, SectionRenderContext} from './types';

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
  const optionsApi = useSectionOptions(MUSIC_SECTION_CONFIG, params);
  const config: SectionBrowseConfig = {
    ...MUSIC_SECTION_CONFIG,
    renderContent: (ctx: SectionRenderContext): ReactNode => (
      <MusicContent ctx={ctx} />
    ),
  };

  return (
    <MusicDataProvider>
      <BrowseLayout
        config={config}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </MusicDataProvider>
  );
};
