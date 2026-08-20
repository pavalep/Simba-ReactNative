import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './components/BrowseLayout';
import {MoviesDataProvider} from './components/MoviesDataProvider';
import {renderMoviesContent} from './components/MoviesContent';
import {useSectionOptions} from './hooks/useOptions';
import {MOVIES_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig} from './types';

const MOVIES_CONFIG: SectionBrowseConfig = {
  ...MOVIES_SECTION_CONFIG,
  renderContent: renderMoviesContent,
};

/**
 * Movies composition root.
 *
 * Screen-local rendering, API state, list behavior, and visual composition
 * live in sibling modules; this entry point owns only route/config wiring.
 */
export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(MOVIES_CONFIG, params);

  return (
    <MoviesDataProvider sortKey={optionsApi.options.sort}>
      <BrowseLayout
        config={MOVIES_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </MoviesDataProvider>
  );
};
