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
import {SectionBrowseLayout} from '../sections/SectionBrowseLayout';
import {getSectionConfig} from '../sections/sectionConfig';
import {useSectionOptions} from '../sections/hooks/useSectionOptions';
import {MoviesDataProvider} from './MoviesContent';

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  route,
}) => {
  const config = getSectionConfig('MoviesScreen');
  const optionsApi = useSectionOptions(config, route.params);
  return (
    <MoviesDataProvider sortKey={optionsApi.options.sort}>
      <SectionBrowseLayout
        config={config}
        optionsApi={optionsApi}
        routeParams={route.params}
      />
    </MoviesDataProvider>
  );
};
