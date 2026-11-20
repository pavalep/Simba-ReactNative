// ─── Downloads — browse config ─────────────────────────────────────────
// The single Downloads entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B2) — this file is new.
//
// The page used to hand-roll its own shell: its own `SafeAreaView`, its
// own full-bleed gradient, its own warm glow, its own `BackButton` and
// two-line header. The header and the surface are the shell's now.
//
// THE PAGE DECLARES NO SEARCH AND NO OPTION GROUPS.
//
// The auto-delete POLICY is not an option group: it does not change
// what the page SHOWS, it changes what the app KEEPS. The sheet is for
// a scope the list answers; the policy is a setting the page reports.
// So the policy chips stay in the content, where they were, and the
// shell draws no chip strip and no filter button.

import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

export const DOWNLOADS_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'Downloads',
  title: text.page.title,
  // The page wore this gradient before it joined the shell, and the
  // shell owns the surface (see `SectionBrowseConfig.background`).
  background: 'gradient',
  // Stub — `index.tsx` overrides with the real content renderer via
  // spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};