// The Podcasts screen owns its browse entry and receives its category
// catalog from Podcast Index through `usePodcastCategories`.
//
// Podcast Index search has no arbitrary sort parameter. The browse surface
// therefore exposes category filtering only and preserves API-returned order
// rather than presenting a misleading local/server sort control.

import type {ReactNode} from 'react';
import {
  PODCAST_CATEGORIES,
  type PodcastCategory,
} from '../../../constants/podcastCategories';
import type {SectionBrowseConfig} from '../types';

function podcastFilterGroup(categories: PodcastCategory[]) {
  return {
    id: 'filter',
    title: 'Category',
    options: categories
      .filter(category => category.id !== 'all')
      .map(category => ({
        key: String(category.id),
        label: category.name,
        icon: category.icon,
      })),
  };
}

export function createPodcastsSectionConfig(
  categories: PodcastCategory[],
): SectionBrowseConfig {
  return {
    route: 'PodcastsScreen',
    title: 'Podcasts',
    search: {placeholder: 'Search podcasts…'},
    options: {
      groups: [podcastFilterGroup(categories)],
    },
    // The host screen supplies the real content renderer to break the
    // browseConfig ↔ index.tsx import cycle.
    renderContent: (): ReactNode => null,
  };
}

export const PODCASTS_SECTION_CONFIG = createPodcastsSectionConfig(PODCAST_CATEGORIES);
