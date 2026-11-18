import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {ShowsDataProvider} from './components/ShowsDataProvider';
import {ShowsContent} from './components/ShowsContent';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {SHOWS_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig} from './types';

/**
 * The config the screen feeds to the shell.
 *
 * It is hoisted to module scope, like the Music, Movies, Podcasts and
 * Audiobooks screens', so the shell and `useSectionOptions` receive ONE
 * stable object.
 */
const SHOWS_CONFIG: SectionBrowseConfig = {
  ...SHOWS_SECTION_CONFIG,
  renderContent: ctx => <ShowsContent ctx={ctx} />,
};

/**
 * Shows composition root.
 *
 * Keep route/config/provider wiring here; list rendering and media state
 * live in ShowsContent so the screen follows the same index-only contract
 * the Music, Movies, Podcasts and Audiobooks screens follow.
 */
export const ShowsScreen: React.FC<RootStackScreenProps<'ShowsScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(SHOWS_CONFIG, params);

  return (
    <ShowsDataProvider>
      <BrowseLayout
        config={SHOWS_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
        // TVMaze cannot answer a search term AND a scope at the same
        // time: `/search/shows` takes a term and nothing else (measured
        // 2026-11-18 — the same ten results with `genre=Comedy` and with
        // `genre=Zzzzznotagenre`), and `/schedule` takes no term at all.
        // So the scope is one thing at a time: a term clears the scope
        // group, and a scope picked while a term is on screen clears the
        // term. The LAST thing the user chose is the one that applies,
        // and the chip strip always says what the source is really
        // answering.
        autoClearFilterOnSearch
        autoClearSearchOnFilter
      />
    </ShowsDataProvider>
  );
};

export default ShowsScreen;
export type {ShowsScreenProps} from './types';
