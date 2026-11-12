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

/**
 * The Category group — single-select (the Podcast Index's category
 * endpoints take `cat` but no `q`, so one category at a time).
 *
 * `collapsedRowLimit: 6` is the sheet's one rule across the three
 * browse screens: the sheet shows six chips and a SHOW MORE toggle, so
 * the panel stays a panel instead of running past the screen.
 *
 * The rows carry no icon: the filter sheet draws text pills, and the
 * category icons were being copied into the option model and then
 * thrown away by the sheet.
 */
function podcastFilterGroup(categories: PodcastCategory[]) {
  return {
    id: 'filter',
    title: 'Category',
    collapsedRowLimit: 6,
    options: categories
      .filter(category => category.id !== 'all')
      .map(category => ({
        key: String(category.id),
        label: category.name,
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
