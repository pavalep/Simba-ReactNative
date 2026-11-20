// ─── "My Podcasts" — browse config ────────────────────────────────────
// The single "My Podcasts" entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page used to hand-roll its own shell: a `ScreenContainer` with an
// `InternalHeader` inside it, its own list and its own empty state.
// It is now the same shell every other browse page uses.
//
// THE PAGE DECLARES NO SEARCH AND NO OPTIONS.
//
// That is a decision, not an omission. Apple Podcasts' "Following" and
// Pocket Casts' list of followed podcasts are both plain lists with no
// search field, and the page never had one — so the shell draws none,
// and with no option groups it draws no chip strip and no filter button
// either. The page's only control is the row's own Unfollow, which is
// content, not chrome.

import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

export const FOLLOWED_PODCASTS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'FollowedPodcasts',
  title: text.page.title,
  // The page painted its own background through `ScreenContainer`, so
  // the shell's flat surface is what it keeps.
  background: 'flat',
  // Stub — `index.tsx` overrides with the real content renderer via
  // spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};