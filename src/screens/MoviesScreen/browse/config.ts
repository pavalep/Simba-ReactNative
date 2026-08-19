// ─── Movies Screen — browse config ────────────────────────────────────
// The single Movies entry the host screen feeds to its local
// `<BrowseLayout>`. No central SECTION_CONFIGS registry — each screen
// owns its own entry. `renderContent` is bound at module load (the host
// screen imports it).

import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import {renderMoviesContent} from '../renderContent';
import type {SectionBrowseConfig} from './types';

function movieFilterGroup() {
  return {
    id: 'filter',
    title: 'Category',
    multiSelect: true,
    options: MOVIE_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
      key: String(c.id),
      label: c.name,
      icon: c.icon,
    })),
  };
}

export const MOVIES_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'MoviesScreen',
  title: 'Movies',
  search: {placeholder: 'Search movies…'},
  options: {
    groups: [
      movieFilterGroup(),
      {
        id: 'sort',
        title: 'Sort by',
        options: [
          {key: 'recent', label: 'Recently added'},
          {key: 'popular', label: 'Most popular'},
          {key: 'az', label: 'A–Z'},
        ],
      },
      {
        id: 'view',
        title: 'View',
        options: [
          {key: 'grid', label: 'Grid'},
          {key: 'list', label: 'List'},
        ],
      },
    ],
  },
  renderContent: renderMoviesContent,
};