// ─── Shows Screen — browse config ───────────────────────────────────────
// The single Shows entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx). No central
// SECTION_CONFIGS registry — each screen owns its own entry.
// `renderContent` is bound via spread-override in `index.tsx` to avoid a
// circular import (config → content → screen → config).
//
// THE SCOPE GROUP
// ---------------
// The screen has ONE filter axis and it is the SCOPE: "All shows" (the
// catalogue) or "Airing today" (TVMaze's schedule for today).
//
// There is no GENRE axis, and that is a measured fact about the source
// rather than an omission:
//
//   • TVMaze's `/shows` takes `page` and NOTHING else. Measured on
//     2026-11-18: `/shows?page=1`, `/shows?page=1&genre=Comedy`,
//     `/shows?page=1&genres=Comedy`, `/shows?page=1&type=Scripted` and
//     `/shows?page=1&q=Downton` all return the IDENTICAL 245 shows —
//     same ids, same order. The `genre` argument the adapter passes is
//     ignored by the API, so the screen's `initialGenre` route param has
//     never filtered anything.
//   • TVMaze has no genre catalogue to offer either: `GET /genres`
//     answers HTTP 404 (measured 2026-11-18). The genres on a show are
//     free-form tags ("Food", "DIY", "Travel", "Medical", …), so there
//     is no fixed list that could be put in a filter sheet.
//
// A filter whose options would have to be INVENTED is a filter that
// cannot act, and a control that cannot act must not occupy space.
//
// THE CATALOGUE'S ORDER IS THE SOURCE'S
// -------------------------------------
// There is no SORT axis, and the reason is the source's own order:
// TVMaze's `/shows` is id-ascending, so page 1 is Downton Abbey and
// Hell's Kitchen — not what anyone would call "popular". The adapter
// used to promise "popular" (`getPopularShows`) and it LIED; the
// function is `getShowsPage` now and the promise is gone with the
// name (B16-J-SHOWS-ORDER).
//
// So the catalogue opens oldest-first, by the source's design. The app
// does not reorder a catalogue the source publishes in one order, and it
// does not call that order "popular".
//
// THE OPTION KEYS ARE THE LEGACY TAB NAMES
// ----------------------------------------
// The route param is `initialTab?: 'search' | 'today' | 'browse'` — the
// screen's v3-v9 tab names, from before it had a grammar. 'browse' and
// 'today' are this group's option keys, so the shared seeding in
// `useSectionOptions` carries them into the group: a deep link asking
// for 'today' opens the Airing today scope, and one asking for 'browse'
// opens the catalogue.
//
// 'search' is NOT an option key: the search scope is the search FIELD
// (a term in the field), not a tab. A deep link that asks for 'search'
// therefore falls back to the default scope, the same way the Radio
// screen drops a tab it cannot honour. Carrying a term into the screen
// needs a `query` route param — see the report's SHARED CHANGE REQUEST.

import type {SectionBrowseConfig} from '../types';

/** The scope group's option keys — and the legacy `initialTab` values. */
 const SHOWS_SCOPE_BROWSE = 'browse';
export const SHOWS_SCOPE_TODAY = 'today';

/**
 * The Show list group — SINGLE-select.
 *
 * It is single-select because the scope IS one thing: the catalogue or
 * today's schedule, never both.
 *
 * `defaultKey: 'browse'` is what makes "All shows" the applied state
 * when the group has no explicit selection — the unfiltered catalogue.
 * It is the group's DEFAULT, not a selection of its own, so it does not
 * raise the sheet's RESET footer and it is what the user lands on when
 * the group is cleared.
 */
function showsScopeGroup() {
  return {
    id: 'scope',
    title: 'Show list',
    multiSelect: false,
    defaultKey: SHOWS_SCOPE_BROWSE,
    options: [
      {key: SHOWS_SCOPE_BROWSE, label: 'All shows'},
      {key: SHOWS_SCOPE_TODAY, label: 'Airing today'},
    ],
  };
}

export const SHOWS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'ShowsScreen',
  title: 'TV Shows',
  search: {placeholder: 'Search shows…'},
  options: {
    groups: [showsScopeGroup()],
  },
  // Stub — `index.tsx` overrides with the real `renderContent`
  // via spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};
