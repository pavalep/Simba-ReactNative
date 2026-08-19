// ─── Music Browser Screen (v10.1 Wave 6 — FAB-only) ─────────────────────
// Slim shell consumer (spec §5): the shared SectionBrowseLayout owns the
// header, search, FAB and options sheet; MusicContent owns the track list
// + per-genre data. The MusicDataProvider sits ABOVE the shell so the
// single content stream shares ONE per-scope cache — the legacy "switching
// genres never refetches" behavior.
//
// The old header/search/tab/viewpager code was deleted here (tracker
// Wave 6 de-tab) — the shell owns all of it now. Route params (`genre`
// preset, query pre-fill) are consumed by the shell, which seeds the
// FILTER group + chip from them.

import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from './browse/BrowseLayout';
import {useSectionOptions} from './browse/hooks/useOptions';
import {MUSIC_SECTION_CONFIG} from './browse/config';
import {MusicDataProvider} from './MusicContent';

export const MusicScreen: React.FC<RootStackScreenProps<'MusicScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(MUSIC_SECTION_CONFIG, params);
  return (
    <MusicDataProvider>
      <BrowseLayout
        config={MUSIC_SECTION_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </MusicDataProvider>
  );
};
