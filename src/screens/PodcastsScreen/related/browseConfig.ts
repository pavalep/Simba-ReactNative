// The Podcasts screen owns its browse entry and receives its category
// catalog from Podcast Index through `usePodcastCategories`.
//
// Podcast Index search has no arbitrary sort parameter. The browse surface
// therefore exposes category filtering only and preserves API-returned order
// rather than presenting a misleading local/server sort control.

import type {ReactNode} from 'react';
import {
  type PodcastCategory,
} from '../../../constants/podcastCategories';
import type {SectionBrowseConfig} from '../types';

/**
 * The Category group — the COVER SHELF.
 *
 * Single-select (the Podcast Index's category endpoints take `cat` but
 * no `q`, so one category at a time), drawn as a 4 × 3 grid of the
 * app's own cover plates rather than as a chip rail: the curated set is
 * art-led, and a chip rail turns it back into a strip of words.
 *
 * `defaultKey: 'all'` is what makes the first tile ("All") the applied
 * state — the unfiltered catalogue. It is the group's DEFAULT, not a
 * selection of its own, so it does not raise the sheet's RESET footer
 * and it is what the user lands on when the group is cleared.
 *
 * There is no `collapsedRowLimit`: the shelf shows the whole curated
 * set at once. The API's own 112-category taxonomy is never offered —
 * that is a set of decisions the user should not have to make.
 */
function podcastFilterGroup(categories: PodcastCategory[]) {
  return {
    id: 'filter',
    title: 'Category',
    layout: 'coverGrid' as const,
    clearKey: 'all',
    defaultKey: 'all',
    options: categories.map(category => ({
      key: String(category.id),
      label: category.name,
      icon: category.icon,
      image: category.image,
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
