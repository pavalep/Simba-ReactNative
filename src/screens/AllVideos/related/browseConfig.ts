// ─── All Videos — browse config ────────────────────────────────────────
// The single All Videos entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page used to hand-roll its own shell: its own `SafeAreaView`, its
// own full-bleed gradient, its own `BackButton` and title, its own
// `SearchBar`, and TWO header buttons — one that flipped the view
// between a grid and a list, and one that flipped the sort between two
// orders. The page could not say which order it was in: the icon
// changed, and the icon was the only thing that said anything.
//
// On the shared shell the sort and the view are option-sheet GROUPS —
// the sheet is the app's one home for a single-valued option, and the
// Movies screen's sort group is the precedent — and the page's surface
// is the config's `background`.
//
// The page has NO filter axis: a local video has no genre, no year
// filter and no category the source could answer, so the chip strip
// stays away and reserves no gutter.

import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

export const ALL_VIDEOS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'AllVideosScreen',
  title: text.page.title,
  // The page wore this gradient before it joined the shell, and the
  // shell owns the surface (see `SectionBrowseConfig.background`).
  background: 'gradient',
  search: {placeholder: text.page.searchPlaceholder},
  options: {
    groups: [
      {
        id: 'sort',
        title: text.groups.sort,
        // The default belongs to the config, so the sheet draws it as
        // the applied option without it counting as an active filter.
        defaultKey: 'title',
        options: [
          {key: 'title', label: text.sort.title},
          {key: 'year', label: text.sort.year},
        ],
      },
      {
        id: 'view',
        title: text.groups.view,
        defaultKey: 'grid',
        options: [
          {key: 'grid', label: text.view.grid},
          {key: 'list', label: text.view.list},
        ],
      },
    ],
  },
  // Stub — `index.tsx` overrides with the real content renderer via
  // spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};