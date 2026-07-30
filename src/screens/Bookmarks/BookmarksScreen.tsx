import React, {useCallback} from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BookmarkList} from '../../components/bookmark/BookmarkList';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {useConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {useBookmarksScreen} from './useBookmarksScreen';
import textContent from './textContent';

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

  const {styles: headerStyles} = useAnimatedEntrance(3, {
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

      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          {borderBottomColor: colors.border.subtle},
          headerStyles[0],
        ]}>
        <View style={styles.headerLeft}>
          <SvgIcon name="bookmark" size={24} color={colors.accent.gold} />
          <AppText variant="h2" color="primary" style={{marginLeft: spacing.sm}}>
            Bookmarks
          </AppText>
        </View>
        {allBookmarks.length > 0 && (
          <AppText
            variant="caption"
            color="secondary"
            onPress={handleClearAll}
            style={styles.clearBtn}>
            {bookmarkCount} saved
          </AppText>
        )}
      </Animated.View>

      {/* ── Search ── */}
      {allBookmarks.length > 0 && (
        <Animated.View
          style={[
            styles.searchContainer,
            headerStyles[1],
          ]}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.background.floating,
                borderColor: colors.border.subtle,
              },
            ]}>
            <SvgIcon name="search" size={18} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, {color: colors.text.primary}]}
              placeholder="Search bookmarks..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search bookmarks"
            />
          </View>
        </Animated.View>
      )}

      {/* ── Content ── */}
      {allBookmarks.length === 0 ? (
        <Animated.View
          style={[styles.emptyWrapper, headerStyles[2]]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 40,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
