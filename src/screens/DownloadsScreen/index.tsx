// ─── Downloads — composition root ──────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, wraps
// the content in the data provider and hands the whole thing to the
// shared browse shell.
//
// WAVE B16 (Wave B2) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: its own
// `SafeAreaView`, its own full-bleed gradient, its own warm glow, its
// own `BackButton` and its own two-line header. It is now the same
// shell every other browse page uses.
//
// THE BACK BUTTON GOES TO THE LIBRARY.
//
// The page is reached from the Library, so the header's back action
// names that destination outright rather than relying on the history
// stack — a cold deep link has no history to go back to, and the
// button's accessible name says where it goes.

import React, {useMemo} from 'react';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {navigate} from '../../navigation/navigationHelper';
import {useDownloadsStore} from '../../state';
import {DownloadsContent} from './components/DownloadsContent';
import {DownloadsDataProvider} from './components/DownloadsDataProvider';
import {DOWNLOADS_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig, DownloadsScreenProps} from './types';
import text from './related/textContent.json';

const DOWNLOADS_CONFIG: SectionBrowseConfig = {
  ...DOWNLOADS_SECTION_CONFIG,
  // The content renderer is bound here (by spread) to break the
  // config → content → screen → config cycle.
  renderContent: ctx => <DownloadsContent ctx={ctx} />,
};

export const DownloadsScreen: React.FC<DownloadsScreenProps> = () => {
  const optionsApi = useSectionOptions(DOWNLOADS_CONFIG);
  // The header's count reads the STORE, which owns the records — the
  // same store the list reads. Nobody keeps a second copy.
  const recordCount = useDownloadsStore(s => s.records.length);

  const headerSubtitle = useMemo(
    () =>
      recordCount > 0
        ? (recordCount === 1
            ? text.page.itemsCaption
            : text.page.itemsCaptionPlural
          ).replace('{count}', String(recordCount))
        : text.page.offlineCaption,
    [recordCount],
  );

  const headerLeftAction = useMemo(
    () => ({
      onPress: () => navigate('Library'),
      accessibilityLabel: text.page.backA11y,
    }),
    [],
  );

  return (
    <DownloadsDataProvider>
      <BrowseLayout
        config={DOWNLOADS_CONFIG}
        optionsApi={optionsApi}
        routeParams={{}}
        headerSubtitle={headerSubtitle}
        headerLeftAction={headerLeftAction}
      />
    </DownloadsDataProvider>
  );
};

export default DownloadsScreen;

export type {DownloadsScreenProps} from './types';