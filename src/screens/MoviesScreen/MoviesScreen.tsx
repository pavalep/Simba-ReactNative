// ─── Movie Browser Screen (v10.1 Wave 6) ────────────────────────────────
// Composition root (spec §5): this screen OWNS the section options state
// (`useSectionOptions`) and hands it to BOTH neighbors —
//
//   • the data provider ABOVE the shell gets the active sort key, so
//     changing "sort by" in the FAB sheet re-fetches page 1 in the new
//     server-side order (IA owns ordering, pagination just appends);
//   • the shell (`SectionBrowseLayout`) gets the full `optionsApi` and
//     only renders it (sheet / FAB badge / chips).
//
// One source of truth, unidirectional flow: screen owns → provider +
// shell read. This is the reference pattern other sections follow.
//
// The MoviesDataProvider sits ABOVE the shell so the single content
// stream shares ONE per-scope cache — the legacy "switching categories
// never refetches" behavior.

import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './browse/BrowseLayout';
import {useSectionOptions} from './browse/hooks/useOptions';
import {MOVIES_SECTION_CONFIG} from './browse/config';
import {MoviesDataProvider} from './MoviesContent';

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(MOVIES_SECTION_CONFIG, params);
  return (
    <MoviesDataProvider sortKey={optionsApi.options.sort}>
      <BrowseLayout
        config={MOVIES_SECTION_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </MoviesDataProvider>
  );
};
