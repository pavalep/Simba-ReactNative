// ─── Bookmarks — composition root ──────────────────────────────────────
//
// The screen is a COMPOSITION ROOT: it builds the browse config, asks
// the shared options hook for the scope, wraps the content in the data
// provider and hands the whole thing to the shared browse shell.
//
// WAVE B16 (Wave B2) — rewritten.
//
// It used to be a one-line re-export of a hand-rolled screen: its own
// `SafeAreaView`, its own `InternalHeader`, its own `SearchBar` and
// its own empty state. It is now the same shell every other browse page
// uses.
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
import {useBookmarks} from '../../features/bookmarks';
import {BookmarksContent} from './components/BookmarksContent';
import {BookmarksDataProvider} from './components/BookmarksDataProvider';
import {BOOKMARKS_SECTION_CONFIG} from './related/browseConfig';
import type {SectionBrowseConfig, BookmarksScreenProps} from './types';
import text from './related/textContent.json';

const BOOKMARKS_CONFIG: SectionBrowseConfig = {
  ...BOOKMARKS_SECTION_CONFIG,
  // The content renderer is bound here (by spread) to break the
  // config → content → screen → config cycle.
  renderContent: ctx => <BookmarksContent ctx={ctx} />,
};

export const BookmarksScreen: React.FC<BookmarksScreenProps> = () => {
  const optionsApi = useSectionOptions(BOOKMARKS_CONFIG);
  // The header's count and its action read the SAME store the list
  // reads — the store owns the bookmarks; nobody keeps a second copy.
  const {allBookmarks, clearAll} = useBookmarks();
  const {confirm: confirmClear, dialog: clearDialog} = useConfirmDialog();

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmClear({
      title: text.dialogs.clearAllTitle,
      message: text.dialogs.clearAllMessage,
      confirmLabel: text.dialogs.clearAllConfirmLabel,
      destructive: true,
    });
    if (confirmed) {
      clearAll();
    }
  }, [clearAll, confirmClear]);

  const headerRightAction = useMemo(
    () =>
      allBookmarks.length > 0
        ? {
            label: text.header.clearAllLabel,
            tone: 'destructive' as const,
            accessibilityLabel: text.header.clearAllA11y,
            onPress: handleClearAll,
          }
        : undefined,
    [allBookmarks.length, handleClearAll],
  );

  // The count is INFORMATION, so it is the header's plain subtitle —
  // never a control. It used to be the right action, and that
  // action's press was `handleClearAll`: a user who tapped "12 saved"
  // because it looked like information was offered a wipe of every
  // bookmark they had (`md/CONTENT_OWNERSHIP.md` §6.3.1).
  const headerSubtitle =
    allBookmarks.length > 0
      ? text.header.countSaved.replace('{count}', String(allBookmarks.length))
      : undefined;

  return (
    <>
      <BookmarksDataProvider>
        <BrowseLayout
          config={BOOKMARKS_CONFIG}
          optionsApi={optionsApi}
          routeParams={{}}
          headerSubtitle={headerSubtitle}
          headerRightAction={headerRightAction}
        />
      </BookmarksDataProvider>
      {clearDialog}
    </>
  );
};

export default BookmarksScreen;

export type {BookmarksScreenProps} from './types';