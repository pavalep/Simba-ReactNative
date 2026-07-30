// ────────────────────────────────────────────────────────
// Simba Player — SongBookmarks Component (Phase 18)
// Inline bookmark list + add via BookmarkSheet
// ────────────────────────────────────────────────────────

import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BookmarkSheet} from '../../../components/bookmark/BookmarkSheet';
import {spacing, radius} from '../../../theme/tokens';
import type {Bookmark} from '../../../store/slices/bookmarkSlice';

interface SongBookmarksProps {
  fileUri: string;
  fileTitle: string;
  duration: number;
  bookmarks: Bookmark[];
  count: number;
  sheetVisible: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onSave: (label: string) => void;
  onDelete: (id: string) => void;
  onJumpTo: (position: number) => void;
  formatDuration: (sec: number) => string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export const SongBookmarks: React.FC<SongBookmarksProps> = ({
  fileUri,
  fileTitle,
  duration,
  bookmarks,
  count,
  sheetVisible,
  onOpenSheet,
  onCloseSheet,
  onSave,
  onDelete,
  onJumpTo,
  formatDuration,
}) => {
  const {colors} = useTheme();

  // Entry point: bookmark for saving uses position=0 (user sets it when navigating)
  const currentPosition = 0;

  return (
    <View style={styles.section}>
      {/* Section header with add button */}
      <View style={styles.header}>
        <AppText variant="h3" color="secondary" style={styles.sectionTitle}>
          Bookmarks {count > 0 ? `(${count})` : ''}
        </AppText>
        <TouchableOpacity
          style={[styles.addBtn, {backgroundColor: colors.accent.gold}]}
          onPress={onOpenSheet}
          activeOpacity={0.8}>
          <SvgIcon name="bookmark" size={16} color={colors.background.primary} />
        </TouchableOpacity>
      </View>

      {/* Bookmark list */}
      {bookmarks.length === 0 ? (
        <View style={[styles.emptyCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
          <SvgIcon name="bookmark" size={24} color={colors.text.tertiary} />
          <AppText variant="body2" color="tertiary" style={styles.emptyText}>
            No bookmarks yet
          </AppText>
        </View>
      ) : (
        <View style={[styles.listCard, {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle}]}>
          {bookmarks.map((bm, idx) => (
            <TouchableOpacity
              key={bm.id}
              style={[
                styles.bookmarkRow,
                idx < bookmarks.length - 1 && {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle},
              ]}
              onPress={() => onJumpTo(bm.position)}
              activeOpacity={0.7}>
              <View style={styles.bookmarkLeft}>
                <SvgIcon name="bookmark" size={14} color={colors.accent.gold} />
                <View style={styles.bookmarkInfo}>
                  <AppText variant="body2" color="primary" numberOfLines={1}>
                    {bm.label || `Position ${formatDuration(bm.position)}`}
                  </AppText>
                  <View style={styles.bookmarkMeta}>
                    <AppText variant="caption" color="tertiary">
                      {formatDuration(bm.position)}
                    </AppText>
                    {bm.createdAt && (
                      <AppText variant="caption" color="tertiary">
                         · {formatDate(bm.createdAt)}
                      </AppText>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => onDelete(bm.id)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <SvgIcon name="close" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* BookmarkSheet for adding */}
      <BookmarkSheet
        visible={sheetVisible}
        onClose={onCloseSheet}
        currentPosition={currentPosition}
        duration={duration}
        fileUri={fileUri}
        fileTitle={fileTitle}
        mediaType="audio"
        bookmarks={bookmarks}
        onSave={onSave}
        onDelete={onDelete}
        onJumpTo={onJumpTo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    marginTop: 4,
  },
  listCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bookmarkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
});
