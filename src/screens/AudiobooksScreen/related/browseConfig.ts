// ─── Audiobooks Screen — browse config ─────────────────────────────────
// The single Audiobooks entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx). No central
// SECTION_CONFIGS registry — each screen owns its own entry.
// `renderContent` is bound via spread-override in `index.tsx` to avoid a
// circular import (config → content → screen → config).
//
// WAVE B16 — this file is new.
//
// The Audiobooks screen used to hand-roll its own shell: its own
// `InternalHeader`, its own `SearchBar`, its own `FilterChips` row and
// its own `Placeholder` states. Every other Discover catalogue —
// Music, Movies, Podcasts — is the shared shell, and the copy of the
// shell was the only thing that made them look like one family.
//
// The genre list lives in `constants/audiobookCategories.ts`
// (`LIBRIVOX_GENRES`), which is also what the Home rail's audiobook
// tiles point at. It used to be duplicated as `GENRE_CHIP_ITEMS` inside
// the content component AND as an EMPTY array in the old
// `related/scopeConfig.ts` — two homes for one list, one of them empty.

import {LIBRIVOX_GENRES} from '../../../constants/audiobookCategories';
import type {SectionBrowseConfig} from '../types';

/**
 * The Genre group — SINGLE-select.
 *
 * It has to be single-select: LibriVox's `?genre=` filter takes ONE
 * genre per request (`searchByGenre` in the librivox adapter), so a
 * second genre has nothing to be OR'd with. Holding two genres in the
 * chip strip while the list answered one would be a filter that looks
 * applied and is not — the same defect the Music screen's genre group
 * had, fixed the same way.
 *
 * `collapsedRowLimit: 6` is the sheet's one rule across the browse
 * screens: the sheet shows six chips and a SHOW MORE toggle, so the
 * panel stays a panel instead of running past the screen.
 *
 * The rows carry no icon: the filter sheet draws text pills, and an
 * icon copied into the option model is thrown away by the sheet. Dead
 * data in the model is a lie about the sheet.
 */
function audiobookFilterGroup() {
  return {
    id: 'filter',
    title: 'Genre',
    multiSelect: false,
    collapsedRowLimit: 6,
    options: LIBRIVOX_GENRES.map(genre => ({
      key: genre,
      label: genre,
    })),
  };
}

export const AUDIOBOOKS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'AudiobooksScreen',
  title: 'Audiobooks',
  search: {placeholder: 'Search titles or authors…'},
  options: {
    groups: [audiobookFilterGroup()],
  },
  // Stub — `index.tsx` overrides with the real `renderAudiobooksContent`
  // via spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};
