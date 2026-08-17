// ─── Movie Browser Screen (v10.1 Wave 6) ────────────────────────────────
// Slim shell consumer (spec §5): the shared SectionBrowseLayout owns the
// header, search, FAB and options sheet; MoviesContent owns the card list
// + per-category data. The MoviesDataProvider sits ABOVE the shell so the
// single content stream shares ONE per-scope cache — the legacy
// "switching categories never refetches" behavior.
//
// Wave 9.5: the dedicated MoviesOptionsSheet (curated category list + sort)
// is built but currently disabled — the rendered sheet re-uses the
// generic SectionOptionsSheet (proven on Music) so the FAB opens
// reliably. The dedicated sheet is kept in `components/` for a future
// switch once the render crash is diagnosed.

import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {SectionBrowseLayout} from '../sections/SectionBrowseLayout';
import {getSectionConfig} from '../sections/sectionConfig';
import {MoviesDataProvider} from './MoviesContent';

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  route,
}) => (
  <MoviesDataProvider>
    <SectionBrowseLayout
      config={getSectionConfig('MoviesScreen')}
      routeParams={route.params}
    />
  </MoviesDataProvider>
);
