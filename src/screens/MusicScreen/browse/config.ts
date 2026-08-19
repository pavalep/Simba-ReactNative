// ─── Music Screen — browse config ─────────────────────────────────────
// The single Music entry the host screen feeds to its local
// `<BrowseLayout>`. No central SECTION_CONFIGS registry — each screen
// owns its own entry. `renderContent` is bound at module load (the host
// screen imports it).

import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import {renderMusicContent} from '../renderContent';
import type {SectionBrowseConfig} from './types';

function musicFilterGroup() {
  return {
    id: 'filter',
    title: 'Genre',
    multiSelect: true,
    options: MUSIC_CATEGORIES.filter(g => g.id !== 'all').map(g => ({
      key: String(g.id),
      label: g.name,
      icon: g.icon,
    })),
  };
}

export const MUSIC_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'MusicScreen',
  title: 'Music',
  search: {placeholder: 'Search music…'},
  options: {
    groups: [
      musicFilterGroup(),
      {
        id: 'sort',
        title: 'Sort by',
        options: [
          {key: 'popular', label: 'Popular'},
          {key: 'new', label: 'New releases'},
          {key: 'az', label: 'A–Z'},
        ],
      },
    ],
  },
  renderContent: renderMusicContent,
};