// ─── Genre — browse config ─────────────────────────────────────────────
// The Genre entry the host screen feeds to the shared `<BrowseLayout>`
// (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B2) — this file is new.
//
// The config is a FACTORY, because the page's TITLE is the genre the
// route asked for — `GenreScreen: {genre, initialTab?}` — and the
// title is the header's. A static config would put one genre's name
// in every genre's header.
//
// THE PAGE DECLARES NO SEARCH AND NO OPTION GROUPS.
//
// The page's own control is the SOURCE toggle — "My Library" or
// "Streaming" — and that is not a filter of one source: it is the
// choice BETWEEN two sources, each with its own catalogue and its own
// failures. The option sheet is for a single-valued option of ONE
// list; a toggle that swaps the whole list is the content's own
// control, and it stays in the content.

import type {SectionBrowseConfig} from '../types';

/**
 * The page's config.
 *
 * `genre` is the route's `genre` param — the name the page is about.
 */
export function createGenreSectionConfig(genre: string): SectionBrowseConfig {
  return {
    route: 'GenreScreen',
    // The header says which genre the page is about — the genre NAME,
    // not the word "Genre".
    title: genre,
    // The page wore this gradient before it joined the shell, and the
    // shell owns the surface (see `SectionBrowseConfig.background`).
    background: 'gradient',
    // Stub — `index.tsx` overrides with the real content renderer via
    // spread to break the config → content → screen → config cycle.
    renderContent: (): null => null,
  };
};