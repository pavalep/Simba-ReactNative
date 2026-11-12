// ─── Music Screen — browse config ───────────────────────────────────
// The single Music entry the host screen feeds to its local
// `<BrowseLayout>`. No central SECTION_CONFIGS registry — each screen
// owns its own entry. `renderContent` is bound via spread-override in
// `index.tsx` to avoid a circular import (config → content → screen →
// config).

import {MUSIC_CATEGORIES} from '../../../constants/musicCategories';
import type {SectionBrowseConfig} from '../types';

/**
 * The Genre group — multi-select (the selected genres OR together).
 *
 * `collapsedRowLimit: 6` is the sheet's one rule across the three
 * browse screens: the sheet shows six chips and a SHOW MORE toggle, so
 * the panel stays a panel instead of running past the screen.
 *
 * The rows carry no icon: the filter sheet draws text pills, and the
 * genre icons were being copied into the option model and then thrown
 * away by the sheet.
 */
function musicFilterGroup() {
  return {
    id: 'filter',
    title: 'Genre',
    multiSelect: true,
    collapsedRowLimit: 6,
    options: MUSIC_CATEGORIES.filter(g => g.id !== 'all').map(g => ({
      key: String(g.id),
      label: g.name,
    })),
  };
}

export const MUSIC_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'MusicScreen',
  title: 'Music',
  search: {placeholder: 'Search music…'},
  options: {
    groups: [musicFilterGroup()],
  },
  // Stub — `index.tsx` overrides with the real `renderMusicContent`
  // via spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};
