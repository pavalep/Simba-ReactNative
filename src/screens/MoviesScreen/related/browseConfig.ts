// ─── Movies Screen — browse config ────────────────────────────────────
// The single Movies entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx). No central
// SECTION_CONFIGS registry — each screen owns its own entry.
// `renderContent` is bound via spread-override in `index.tsx` to avoid a
// circular import (config → content → screen → config).

import {MOVIE_CATEGORIES} from '../../../constants/movieCategories';
import type {SectionBrowseConfig} from '../types';

/**
 * The Category group — 20 genres, multi-select (the Internet Archive
 * query ORs the selected categories together).
 *
 * `collapsedRowLimit: 6` is what `constants/movieCategories.ts` has
 * claimed since v10.2b ("the FILTER sheet collapses these behind 'SHOW
 * MORE' so the first six categories stay instantly tappable") — the
 * comment described a behaviour the config never asked for, so all 20
 * chips were expanded and the sheet ran past the screen. The limit is
 * now real: six chips and a SHOW MORE toggle, and the sheet extends to
 * its full detent when the group is expanded.
 *
 * The rows carry no icon: the filter sheet draws text pills, and the
 * genre icons were being copied into the option model and then thrown
 * away by the sheet. Dead data in the model is a lie about the sheet.
 */
function movieFilterGroup() {
  return {
    id: 'filter',
    title: 'Category',
    multiSelect: true,
    collapsedRowLimit: 6,
    options: MOVIE_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
      key: String(c.id),
      label: c.name,
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
        // The Internet Archive's own order is RECENCY — the newest
        // uploads first — and the newest uploads in a subject tag are
        // the long tail of user uploads, not films. Measured on
        // 2026-11-12 against the live endpoint: with the archive's
        // natural order the Documentaries category returned **38
        // television news segments out of its first 40 items** ("… :
        // PRESSTV : October 9, 2025 3:00pm-3:31pm IRST"); with
        // `downloads desc` the same query returns **0** and leads with
        // Ken Burns, The World at War and PBS Nova. The same holds for
        // Comedy (0/40), Western (0/40) and Silent Films (0/40).
        //
        // So the DEFAULT order is "Most popular" — it is the order the
        // archive's own curated collections are browsed in, and it is
        // the order that shows films. `defaultKey` draws that chip as
        // the applied state in the sheet without counting it as an
        // active filter (nothing would change if it were reset).
        defaultKey: 'popular',
        options: [
          {key: 'popular', label: 'Most popular'},
          {key: 'newest', label: 'Recently added'},
          {key: 'az', label: 'A–Z'},
        ],
      },
    ],
  },
  // Stub — `index.tsx` overrides with the real `renderMoviesContent`
  // via spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};
