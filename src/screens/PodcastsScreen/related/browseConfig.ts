// ─── Podcasts Screen — section browse config ──────────────────────────
// The single Podcasts entry the host screen feeds to its local
// `<BrowseLayout>`. No central SECTION_CONFIGS registry — each screen
// owns its own entry.
//
// `renderContent` is left as a no-op stub here — the host screen wires
// the real one (the `<PodcastsContent>` element factory) at mount time
// via a spread override:
//   const config = {...PODCASTS_SECTION_CONFIG, renderContent: fn};
// This breaks what would otherwise be a browseConfig ↔ index.tsx import
// cycle (browseConfig → index → browseConfig) without needing a
// separate renderContent.tsx bridge file.

import type {ReactNode} from 'react';
import {PODCAST_CATEGORIES} from '../../../constants/podcastCategories';
import type {SectionBrowseConfig} from '../types';

function podcastFilterGroup() {
  return {
    id: 'filter',
    title: 'Category',
    options: PODCAST_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
      key: String(c.id),
      label: c.name,
      icon: c.icon,
    })),
  };
}

export const PODCASTS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'PodcastsScreen',
  title: 'Podcasts',
  search: {placeholder: 'Search podcasts…'},
  options: {
    groups: [
      podcastFilterGroup(),
      {
        id: 'sort',
        title: 'Sort by',
        options: [
          {key: 'recent', label: 'Recently added'},
          {key: 'az', label: 'A–Z'},
        ],
      },
    ],
  },
  // Stub — the host screen overrides this with the real
  // `<PodcastsContent>` factory at mount time. Never invoked directly.
  renderContent: (): ReactNode => null,
};