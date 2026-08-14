// ─── Movie Browser Screen (v10 Wave 5) ─────────────────────────────────
// Slim shell consumer (spec §5): the shared SectionBrowseLayout owns the
// header, search, tab bar, FAB and options sheet; MoviesContent owns the
// card grid + per-category data. The MoviesDataProvider sits ABOVE the
// shell so every lazily-mounted tab scene shares ONE per-scope cache —
// the legacy "toggle tabs never refetches" behavior.
//
// The old duplicated header/search/tab/viewpager code was deleted here
// (tracker Phase 5.1 step 6) — the shell owns all of it now. Route params
// (categoryId preset, query pre-fill) are consumed by the shell.

import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {SectionBrowseLayout} from '../sections/SectionBrowseLayout';
import {getSectionConfig} from '../sections/sectionConfig';
import {MoviesDataProvider} from './MoviesContent';

export const MoviesScreen: React.FC<RootStackScreenProps<'MoviesScreen'>> = ({
  route,
}) => (
  <MoviesDataProvider initialCategoryId={route.params?.categoryId}>
    <SectionBrowseLayout
      config={getSectionConfig('MoviesScreen')}
      routeParams={route.params}
    />
  </MoviesDataProvider>
);
