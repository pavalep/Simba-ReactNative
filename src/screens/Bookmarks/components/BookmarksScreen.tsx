import React, {useCallback} from 'react';
import {
  StyleSheet,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {BookmarkList} from '../../../components/bookmark/BookmarkList';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {useConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {useBookmarksScreen} from '../hooks/useBookmarksScreen';
import textContent from '../related/textContent';

export const BookmarksScreen: React.FC = () => {
  const {colors} = useTheme();
  const {
    allBookmarks,
    bookmarkCount,
    searchQuery,
    setSearchQuery,
    filteredBookmarks,
    handlePress,
    removeBookmark,
    clearAllBookmarks,
  } = useBookmarksScreen();

  const {confirm: confirmDelete, dialog: deleteDialog} = useConfirmDialog();
  const {confirm: confirmClear, dialog: clearDialog} = useConfirmDialog();

  // Only animate the body sections; the header is a stable InternalHeader
  // with the canonical chevron back arrow that must always be visible
  // (no fade-in race that could hide the back affordance).
  //   index 0 → search bar
  //   index 1 → empty state / bookmark list
  const {styles: headerStyles} = useAnimatedEntrance(2, {
    staggerDelay: 60,
    direction: 'fade',
    duration: 300,
  });

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await confirmDelete({
        title: 'Remove Bookmark',
        message: 'Remove this bookmark?',
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (confirmed) {
        removeBookmark(id);
      }
    },
    [confirmDelete, removeBookmark],
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmClear({
      title: textContent.clearAllTitle,
      message: textContent.clearAllMsg,
      confirmLabel: 'Clear All',
      destructive: true,
    });
    if (confirmed) {
      clearAllBookmarks();
    }
  }, [confirmClear, clearAllBookmarks]);

  return (
    <SafeAreaView
      style={[styles.root, {backgroundColor: colors.background.primary}]}
      edges={['top']}>
      {deleteDialog}
      {clearDialog}

      {/* ── Header (canonical InternalHeader — chevron + title + right action) ── */}
      <InternalHeader
        title="Bookmarks"
        rightAction={
          allBookmarks.length > 0
            ? {label: `${bookmarkCount} saved`, onPress: handleClearAll}
            : undefined
        }
      />

      {/* ── Search ── */}
      {allBookmarks.length > 0 && (
        <Animated.View
          style={[
            styles.searchContainer,
            headerStyles[0],
          ]}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search bookmarks..."
          />
        </Animated.View>
      )}

      {/* ── Content ── */}
      {allBookmarks.length === 0 ? (
        <Animated.View
          style={[styles.emptyWrapper, headerStyles[1]]}>
          <EmptyState
            icon="bookmark"
            title="No Bookmarks Yet"
            description="Save your position in any video or audio file to create bookmarks. They will appear here."
          />
        </Animated.View>
      ) : (
        <BookmarkList
          bookmarks={filteredBookmarks}
          onPress={handlePress}
          onDelete={handleDelete}
          grouped={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
