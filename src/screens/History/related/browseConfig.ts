// ─── History — browse config ───────────────────────────────────────────
// The single History entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page used to hand-roll its own shell: its own header, its own
// `SearchBar`, and a row of four filter chips.
//
// THE MEDIA-TYPE FILTER IS A FILTER AXIS NOW.
//
// "All / Video / Audio / Streaming" is a scope the list answers, so
// it belongs to the option model — the chip strip carries what is
// applied and the sheet holds the options. It used to be a row of
// chips that sat under the search field and were always visible; the
// chip strip is the app's one place for that, and it shows the
// applied scope instead of offering the whole list twice.
//
// The group's DEFAULT is `all`, and a default is not an explicit
// selection — so nothing is in the chip strip until the user picks
// one, and the sheet draws "All" as the applied option.

import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

export const HISTORY_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'History',
  title: text.page.title,
  search: {placeholder: text.page.searchPlaceholder},
  // The page painted its own background through its root `View`, so
  // the shell's flat surface is what it keeps.
  background: 'flat',
  options: {
    groups: [
      {
        id: 'filter',
        title: text.groups.type,
        // The scope is ONE kind of media, so it is single-select.
        multiSelect: false,
        defaultKey: 'all',
        options: [
          {key: 'all', label: text.filters.all},
          {key: 'video', label: text.filters.video},
          {key: 'audio', label: text.filters.audio},
          {key: 'streaming', label: text.filters.streaming},
        ],
      },
    ],
  },
  // Stub — `index.tsx` overrides with the real content renderer via
  // spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};