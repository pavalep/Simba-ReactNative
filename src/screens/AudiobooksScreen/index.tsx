import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {AudiobooksDataProvider} from './components/AudiobooksDataProvider';
import {AudiobooksContent} from './components/AudiobooksContent';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {AUDIOBOOKS_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig} from './types';

/**
 * The config the screen feeds to the shell.
 *
 * It is hoisted to module scope, like the Music and Movies screens', so
 * the shell and `useSectionOptions` receive ONE stable object.
 */
const AUDIOBOOKS_CONFIG: SectionBrowseConfig = {
  ...AUDIOBOOKS_SECTION_CONFIG,
  renderContent: ctx => <AudiobooksContent ctx={ctx} />,
};

/**
 * Audiobooks composition root.
 *
 * Keep route/config/provider wiring here; list rendering and media state
 * live in AudiobooksContent so the screen follows the same index-only
 * contract the Music, Movies and Podcasts screens follow.
 */
export const AudiobooksScreen: React.FC<RootStackScreenProps<'AudiobooksScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(AUDIOBOOKS_CONFIG, params);

  return (
    <AudiobooksDataProvider>
      <BrowseLayout
        config={AUDIOBOOKS_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
        // LibriVox cannot answer a search term AND a genre in the same
        // request, so the scope is one or the other and never both: a
        // term clears the genre, and a genre picked while a term is on
        // screen clears the term. The LAST thing the user chose is the
        // one that applies, and the chip strip always says what the
        // source is really answering.
        autoClearFilterOnSearch
        autoClearSearchOnFilter
      />
    </AudiobooksDataProvider>
  );
};
