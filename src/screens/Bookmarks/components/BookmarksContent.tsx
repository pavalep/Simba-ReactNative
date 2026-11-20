// ─── Bookmarks — Browse Content ────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B2) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header and the search field. This component owns
// the list, the list's empty state, and the ROW's remove action —
// including the confirmation, because the remove is a ROW action and
// the row belongs to the content.

import React, {useCallback, useEffect, useMemo} from 'react';
import {View} from 'react-native';
import {BookmarkList} from '../../../components/bookmark/BookmarkList';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {useConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {createBookmarksScreenStyles} from '../styles';
import {useBookmarksData} from './BookmarksDataProvider';
import type {SectionRenderContext} from '../types';
import type {Bookmark} from '../../../features/bookmarks';
import text from '../related/textContent.json';

export const BookmarksContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const styles = useMemo(() => createBookmarksScreenStyles(), []);
  const {allBookmarks, filteredBookmarks, handlePress, removeBookmark, setSearchQuery} =
    useBookmarksData();
  const {confirm: confirmDelete, dialog: deleteDialog} = useConfirmDialog();

  // The shell's search field owns the term; the provider owns the
  // scope it scopes.
  useEffect(() => {
    setSearchQuery(ctx.query);
  }, [ctx.query, setSearchQuery]);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await confirmDelete({
        title: text.dialogs.removeTitle,
        message: text.dialogs.removeMessage,
        confirmLabel: text.dialogs.removeConfirmLabel,
        destructive: true,
      });
      if (confirmed) {
        removeBookmark(id);
      }
    },
    [confirmDelete, removeBookmark],
  );

  const onPress = useCallback((item: Bookmark) => handlePress(item), [handlePress]);

  return (
    <View style={styles.sectionRoot}>
      {deleteDialog}
      {allBookmarks.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            icon="bookmark"
            title={text.empty.title}
            description={text.empty.description}
          />
        </View>
      ) : (
        <BookmarkList
          bookmarks={filteredBookmarks}
          onPress={onPress}
          onDelete={handleDelete}
          grouped={true}
        />
      )}
    </View>
  );
};