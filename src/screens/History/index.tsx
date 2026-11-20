// ─── History — composition root ────────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks
// the shared options hook for the scope, wraps the content in the data
// provider and hands the whole thing to the shared browse shell.
//
// WAVE B16 (Wave B2) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: its own
// header, its own `SearchBar` and its own row of four filter chips. It
// is now the same shell every other browse page uses.
//
// THE HEADER'S ACTION IS THE ROOT'S.
//
// "Clear All" lives in the header, and the header is the shell's — so
// the action is built HERE and handed to the shell through its header
// slot. The confirmation rides with it, for the same reason: the
// action is a header action.

import React, {useCallback, useMemo} from 'react';
import {BrowseLayout} from '../_shared/BrowseLayout';
import {useSectionOptions} from '../../hooks/useSectionOptions';
import {useConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../components/feedback/Toast';
import {useRecentHistory} from '../../features/recentHistory';
import {HistoryContent} from './components/HistoryContent';
import {HistoryDataProvider} from './components/HistoryDataProvider';
import {HISTORY_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig, HistoryScreenProps} from './types';
import text from './related/textContent.json';

const HISTORY_CONFIG: SectionBrowseConfig = {
  ...HISTORY_SECTION_CONFIG,
  // The content renderer is bound here (by spread) to break the
  // config → content → screen → config cycle.
  renderContent: ctx => <HistoryContent ctx={ctx} />,
};

export const HistoryScreen: React.FC<HistoryScreenProps> = () => {
  const optionsApi = useSectionOptions(HISTORY_CONFIG);
  // The header's action reads the SAME store the list reads — the store
  // owns the history; nobody keeps a second copy.
  const {list, clearRecent} = useRecentHistory();
  const {confirm, dialog} = useConfirmDialog();
  const toast = useToast();

  const handleClearAll = useCallback(async () => {
    const ok = await confirm({
      title: text.dialogs.clearTitle,
      message: text.dialogs.clearMessage,
      confirmLabel: text.dialogs.clearConfirmLabel,
      destructive: true,
    });
    if (ok) {
      clearRecent();
      toast.show('History cleared');
    }
  }, [clearRecent, confirm, toast]);

  const headerRightAction = useMemo(
    () =>
      list.length > 0
        ? {
            label: text.header.clearAllLabel,
            tone: 'destructive' as const,
            accessibilityLabel: text.header.clearAllA11y,
            onPress: handleClearAll,
          }
        : undefined,
    [handleClearAll, list.length],
  );

  return (
    <>
      <HistoryDataProvider>
        <BrowseLayout
          config={HISTORY_CONFIG}
          optionsApi={optionsApi}
          routeParams={{}}
          headerRightAction={headerRightAction}
        />
      </HistoryDataProvider>
      {dialog}
    </>
  );
};

export default HistoryScreen;

export type {HistoryScreenProps} from './types';