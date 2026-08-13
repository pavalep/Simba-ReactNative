// ─── Home Bookmarks List ─────────────────────────────────────────
// P55: per-user rail of saved bookmarks. Always renders — when the
// user has no bookmarks, the section header stays and the body shows
// the premium empty-state (gold disc + title + body).
// P58: same header pattern as the other two Your Library rails
// (Recently Played, Followed Podcasts):
//   • title on the left
//   • "See All" + chevron on the right
//   • both the See All link and the chevron only appear once the
//     rail has data — the empty case just shows the title and the
//     empty-state body
//   • rail owns its collapsed/expanded state (no persistence)

import React, {useCallback, useState} from 'react';
import {StyleSheet, TouchableOpacity, View, FlatList} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {EmptyState} from '../../../components/utility/EmptyState/EmptyState';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import type {BookmarkEntry} from '../../../store/slices/sessionSlice';

interface Props {
  items: BookmarkEntry[];
  onPress: (item: BookmarkEntry) => void;
  onRemove: (id: string) => void;
  /** When set AND the rail has data, a "See All" link is rendered
   *  on the right of the header (next to the chevron). */
  onSeeAll?: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

const Header: React.FC<{
  /** Whether to render the "See All" link. The parent (rail) decides
   *  this — typically true when there are more than one item. */
  showSeeAll: boolean;
  onSeeAll?: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}> = ({showSeeAll, onSeeAll, collapsed, onToggleCollapsed}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.header}>
      {/* v8: left cluster (icon + title) so `justifyContent:
          space-between` keeps the icon glued to the title, with
          the actions cluster on the right. */}
      <View style={styles.headerLeft}>
        {/* v7: leading gold-soft circular badge with bookmark
            ribbon glyph, 8 px to the left of the title. */}
        <View
          style={[
            styles.iconBadge,
            {backgroundColor: colors.accent.goldSoft},
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no">
          <SvgIcon name="bookmark" size={18} color={colors.accent.gold} />
        </View>
        <AppText variant="displaySans" color="primary" style={styles.headerTitle}>
          Bookmarks
        </AppText>
      </View>
      <View style={styles.headerActions}>
        {showSeeAll && onSeeAll ? (
          <TouchableOpacity
            onPress={onSeeAll}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="See all bookmarks"
            style={styles.actionBtn}>
            <AppText variant="caption" color="accent">
              See All
            </AppText>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={onToggleCollapsed}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand section' : 'Collapse section'}
          style={styles.chevronBtn}>
          <SvgIcon
            name="chevronDown"
            size={18}
            color={colors.text.tertiary}
            style={collapsed ? styles.chevronUp : styles.chevronDown}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const HomeBookmarksList: React.FC<Props> = ({
  items,
  onPress,
  onRemove,
  onSeeAll,
}) => {
  const {colors} = useTheme();
  // P58: rail owns its own collapse state — no persistence.
  // Default: collapsed when empty, expanded when has data. The user
  // can flip either way with the chevron. State is in-memory only
  // and resets on every mount.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const hasData = items.length > 0;
  const collapsed = userCollapsed ?? !hasData;
  const toggle = useCallback(() => {
    setUserCollapsed(prev => (prev ?? !hasData) ? false : true);
  }, [hasData]);
  const showBody = !collapsed;

  // Extracted renderItem to avoid inlining a long multi-line JSX
  // arrow body inside a JSX prop value (TypeScript's parser can
  // mis-parse `=> (...)` followed by sibling props).
  const renderBookmarkRow = useCallback(
    ({item}: {item: BookmarkEntry}) => (
      <TouchableOpacity
        style={[styles.row, {borderBottomColor: colors.border.subtle}]}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title} at ${formatTime(item.position)}`}>
        <View style={[styles.thumb, {backgroundColor: colors.background.elevated}]}>
          {item.thumbnailPath ? (
            <FastImage source={{uri: item.thumbnailPath}} style={StyleSheet.absoluteFill} resizeMode={FastImage.resizeMode.cover} />
          ) : (
            <SvgIcon name={item.mediaType === 'audio' ? 'music' : 'video'} size={22} color={colors.text.tertiary} />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="body2" color="primary" numberOfLines={1}>{item.title}</AppText>
          <AppText variant="caption" color="secondary">{formatTime(item.position)} · {new Date(item.createdAt).toLocaleDateString()}</AppText>
        </View>
        <TouchableOpacity
          style={styles.remove}
          onPress={() => onRemove(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Remove bookmark for ${item.title}`}>
          <SvgIcon name="close" size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [colors, onPress, onRemove],
  );

  return (
    <View style={styles.container}>
      <Header
        showSeeAll={items.length > 1}
        onSeeAll={onSeeAll}
        collapsed={collapsed}
        onToggleCollapsed={toggle}
      />

      {showBody && items.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="No Bookmarks Yet"
          description="Tap the bookmark icon while playing to save a moment — it'll show up here for one-tap access."
          variant="compact"
        />
      ) : null}

      {showBody && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderBookmarkRow}
          scrollEnabled={false}
          initialNumToRender={items.length}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // P58: no card chrome — matches the other Your Library rails.
    marginBottom: spacing.xxl,
  },
  header: {
    // P58: match the other Your Library rails (Recently Played /
    // Followed Podcasts) — same padding, vertical-center alignment,
    // title left, action + chevron right.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // v8: left cluster wraps icon + title.
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  // v7: 32×32 gold-soft circular badge that sits 8 px to the
  // left of the rail title.
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  // v8: NO fontWeight override. The displaySans typography
  // token now encodes the weight in the family key
  // (FONT_FAMILY.manrope.semibold -> Manrope-SemiBold.ttf
  // deterministically). Tight letterSpacing keeps the title
  // visually attached to the leading icon badge.
  headerTitle: {
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
  },
  chevronBtn: {
    padding: spacing.xs,
  },
  chevronDown: {
    transform: [{rotate: '0deg'}],
  },
  chevronUp: {
    transform: [{rotate: '180deg'}],
  },
  list: {
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  thumb: {
    width: 92,
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    marginHorizontal: spacing.md,
    gap: 4,
  },
  remove: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
