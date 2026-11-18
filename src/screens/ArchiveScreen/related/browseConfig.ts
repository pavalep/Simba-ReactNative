// ─── Archive Screen — browse config ────────────────────────────────────
// The single Archive entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx). No central
// SECTION_CONFIGS registry — each screen owns its own entry.
// `renderContent` is bound via spread-override in `index.tsx` to avoid a
// circular import (config → content → screen → config).
//
// THE SCOPE IS THE SCREEN'S ONE FILTER GROUP
// ------------------------------------------
// The screen used to hand-roll its whole shell: its own `InternalHeader`,
// its own `SearchBar` and TWO `FilterChips` rows — one of quick-search
// presets, one of the media scope. It is now the shared shell, and the
// media scope is the ONE filter axis the sheet offers.
//
// SINGLE-select, because the scope is not a filter that combines: it
// picks which of the archive's two mediatypes the list answers
// (`mediatype:(audio)` or `mediatype:(movies)`), and two mediatypes at
// once is not a scope — it is two screens. The archive's adapter exposes
// exactly two searches, so the scope IS the choice between them.
//
// `defaultKey: 'audio'` is the scope's default (the screen has always
// opened on audio). The sheet draws it as the applied state, and it does
// NOT count as an active filter — resetting a group that is already at
// its default changes nothing, so the sheet's "RESET FILTERS" footer
// stays away until the user has actually chosen a scope.
//
// The rows carry no icon: the filter sheet draws text pills, and an icon
// copied into the option model is thrown away by the sheet. Dead data in
// the model is a lie about the sheet.

import {ARCHIVE_MEDIA_SCOPES} from './scopeConfig';
import type {SectionBrowseConfig} from '../types';

function archiveScopeGroup() {
  return {
    id: 'filter',
    title: 'Media type',
    multiSelect: false,
    defaultKey: 'audio',
    options: ARCHIVE_MEDIA_SCOPES.map(scope => ({
      key: scope.key,
      label: scope.label,
    })),
  };
}

export const ARCHIVE_SECTION_CONFIG: SectionBrowseConfig = {
  route: 'ArchiveScreen',
  title: 'Internet Archive',
  search: {placeholder: 'Search the archive…'},
  options: {
    groups: [archiveScopeGroup()],
  },
  // Stub — `index.tsx` overrides with the real `renderArchiveContent`
  // via spread to break the config → content → screen → config cycle.
  renderContent: (): null => null,
};
