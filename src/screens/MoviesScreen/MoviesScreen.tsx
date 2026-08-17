// ─── Movie Browser Screen (v10.1 Wave 6 — FAB-only) ────────────────────
// Slim shell consumer (spec §5): the shared SectionBrowseLayout owns the
// header, search, FAB and options sheet; MoviesContent owns the card grid
// + per-category data. The MoviesDataProvider sits ABOVE the shell so the
// single content stream shares ONE per-scope cache — the legacy "switching
// categories never refetches" behavior.
//
// The old header/search/tab/viewpager code was deleted here (tracker
// Phase 5.1 step 6 / Wave 6 de-tab) — the shell owns all of it now. Route
// params (`categoryId` preset, query pre-fill) are consumed by the shell,
// which seeds the FILTER group + chip from them.

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
