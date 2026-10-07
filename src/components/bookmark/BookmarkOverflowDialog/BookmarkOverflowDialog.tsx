/**
 * BookmarkOverflowDialog — "your bookmark list is full; choose one to
 * give up".
 *
 * ## Why the user chooses, rather than the app
 *
 * The 20-slot cap is a storage bound, not a ranking. The app used to
 * resolve a full list by silently evicting the OLDEST bookmark, which
 * is a guess: the oldest is not the least-valued, and a user who has
 * deliberately marked a scene in an old film is exactly the person the
 * guess is wrong about. Silent eviction also loses data with no
 * undo — there is nothing to recover to.
 *
 * Every reference player that bounds a collection does it the same way
 * once it needs the user's help: Netflix's My List stops accepting and
 * tells you to remove items first; Plex's playlist edit mode is an
 * explicit pick; Android's own storage managers present the set and let
 * the user choose. Here the whole set is twenty rows, so the honest UI
 * is to show the twenty rows.
 *
 * ## Why a Dialog and not a chip sheet
 *
 * `OptionSheetDialog` wraps its options into a flex-wrap row of chips,
 * which reads well for four or five choices. Twenty chips of
 * "0:17 · Namus Kanla Yazılır" in a wrapping row is unreadable, and a
 * bottom sheet would put a native drag gesture inside a control the
 * user only opens once. A plain scrollable list inside the existing
 * `Dialog` is the boring, correct shape.
 */

import React from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {Dialog} from '../../core/Dialog/Dialog';
import {formatDuration} from '../../../utils/timeAgo';
import type {Bookmark} from '../../../state';

export interface BookmarkOverflowDialogProps {
  visible: boolean;
  /** The bookmarks the user may choose to remove, newest first. */
  bookmarks: readonly Bookmark[];
  /** Title of the media the new bookmark belongs to, for the message. */
  pendingTitle?: string;
  onRemove: (id: string) => void;
  /** Dismissed without choosing. Nothing is written. */
  onCancel: () => void;
}

export const BookmarkOverflowDialog: React.FC<BookmarkOverflowDialogProps> = ({
  visible,
  bookmarks,
  pendingTitle,
  onRemove,
  onCancel,
}) => {
  const {colors} = useTheme();

  // Built here rather than inline in the prop: a template literal with a
  // nested interpolation inside a JSX expression container is exactly
  // the shape TypeScript's JSX parser mis-reads.
  const message = pendingTitle
    ? `All ${bookmarks.length} slots are in use. Choose one to replace with your bookmark in "${pendingTitle}".`
    : `All ${bookmarks.length} slots are in use. Choose one to replace with the bookmark you just made.`;

  return (
    <Dialog
      visible={visible}
      onClose={onCancel}
      title="Bookmark list is full"
      message={message}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        // Twenty rows will not fit a small screen. Without a bounded
        // height the Dialog would grow past the window and the top rows
        // would be unreachable.
        showsVerticalScrollIndicator
        nestedScrollEnabled>
        {bookmarks.map(bookmark => (
          <TouchableOpacity
            key={bookmark.id}
            style={[styles.row, {borderBottomColor: colors.border.subtle}]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Remove bookmark for ${bookmark.title} at ${formatDuration(
              bookmark.position,
            )}`}
            accessibilityHint="Replaces this bookmark with the one you just made"
            onPress={() => onRemove(bookmark.id)}>
            <View style={styles.rowText}>
              <AppText variant="body2" color="primary" numberOfLines={1}>
                {bookmark.title}
              </AppText>
              <AppText variant="caption" color="secondary">
                {formatDuration(bookmark.position)} ·{' '}
                {new Date(bookmark.createdAt).toLocaleDateString()}
              </AppText>
            </View>
            <AppText variant="caption" color="error">
              Remove
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
  },
});
