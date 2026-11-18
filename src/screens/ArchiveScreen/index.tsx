import React from 'react';
import type {RootStackScreenProps} from '../../navigation/types';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {ArchiveDataProvider} from './components/ArchiveDataProvider';
import {renderArchiveContent} from './components/ArchiveContent';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {ARCHIVE_SECTION_CONFIG} from './related/browseConfig';
import {archiveScopeFromParam} from './related/scopeConfig';
import type {SectionBrowseConfig} from './types';

/**
 * The config the screen feeds to the shell.
 *
 * It is hoisted to module scope, like the Music, Movies and Audiobooks
 * screens', so the shell and `useSectionOptions` receive ONE stable
 * object.
 */
const ARCHIVE_CONFIG: SectionBrowseConfig = {
  ...ARCHIVE_SECTION_CONFIG,
  renderContent: renderArchiveContent,
};

/**
 * Archive composition root.
 *
 * Keep route/config/provider wiring here; list rendering and media state
 * live in ArchiveContent so the screen follows the same index-only
 * contract the Music, Movies and Podcasts screens follow.
 *
 * The route params carry the seed: `initialTab` seeds the media-scope
 * filter group ('audio' / 'video' are that group's option keys) and
 * `query` seeds the shell's search field — both through the shared
 * hooks, exactly as the other browse screens do it.
 *
 * `autoClearFilterOnSearch` / `autoClearSearchOnFilter` are deliberately
 * OFF here: the archive CAN answer a search term AND a media scope in
 * ONE request — the adapter builds `({term}) AND mediatype:(audio)` (or
 * `mediatype:(movies)`) — so the scope and the term compose, and neither
 * has to cancel the other.
 */
export const ArchiveScreen: React.FC<RootStackScreenProps<'ArchiveScreen'>> = ({
  route,
}) => {
  const params = route.params ?? {};
  const optionsApi = useSectionOptions(ARCHIVE_CONFIG, params);

  return (
    <ArchiveDataProvider
      initialScope={archiveScopeFromParam(params.initialTab)}
      initialSearchTerm={params.query ?? ''}>
      <BrowseLayout
        config={ARCHIVE_CONFIG}
        optionsApi={optionsApi}
        routeParams={params}
      />
    </ArchiveDataProvider>
  );
};
