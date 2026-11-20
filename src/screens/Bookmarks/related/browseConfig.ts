// ─── Bookmarks — browse config ─────────────────────────────────────────
// The single Bookmarks entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page used to draw its own `InternalHeader`, its own `SearchBar`
// and its own `SafeAreaView`. The header and the search field are the
// shell's, so the page declares a search and lets the shell draw it.
//
// THE PAGE DECLARES NO OPTION GROUPS.
//
// A bookmark list is not filtered and not sorted by the user — it is
// grouped by file and ordered by position, and that grouping is the
// shared `BookmarkList` component's job, not an option sheet's. So the
// shell draws no chip strip and no filter button, and the sheet has
// nothing to show.
//
// THE HEADER'S DESTRUCTIVE ACTION IS THE PAGE'S OWN.
//
// "Clear All" is a header action, so the shell passes it through its
// header slot. It is a NAMED control in the error colour: the count it
// used to wear was information pretending to be a button, and a user
// who tapped "12 saved" because it looked like information was
// offered a wipe of every bookmark they had
// (`md/CONTENT_OWNERSHIP.md` §6.3.1).

import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

export const BOOKMARKS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'Bookmarks',
  title: text.header.title,
  search: {placeholder: text.search.placeholder},
  // The page painted its own background through its `SafeAreaView`, so
  // the shell's flat surface is what it keeps.
  background: 'flat',
  // Stub — `index.tsx` overrides with the real content renderer via
  // spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};