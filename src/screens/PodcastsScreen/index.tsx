import React, {useMemo} from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './components/BrowseLayout';
import {
  createPodcastsContentRenderer,
  PodcastsDataProvider,
} from './components/PodcastsContent';
import {usePodcastCategories} from './hooks/usePodcastCategories';
import {useSectionOptions} from './hooks/useOptions';
import {createPodcastsSectionConfig} from './related/browseConfig';
import type {SectionBrowseConfig} from './types';

/**
 * Podcasts composition root.
 *
 * The screen resolves the authoritative Podcast Index category catalog and
 * passes one stable category model into both the browse options and content
 * renderer. List behavior and API state live in sibling modules.
 */
export const PodcastsScreen: React.FC<RootStackScreenProps<'PodcastsScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const {categories} = usePodcastCategories();
  const config = useMemo<SectionBrowseConfig>(() => {
    const baseConfig = createPodcastsSectionConfig(categories);
    return {
      ...baseConfig,
      renderContent: createPodcastsContentRenderer(categories),
    };
  }, [categories]);
  const optionsApi = useSectionOptions(config, params);

  return (
    <PodcastsDataProvider>
      <BrowseLayout
        config={config}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </PodcastsDataProvider>
  );
};

export {PodcastsContent} from './components/PodcastsContent';
export type {SectionBrowseConfig};
