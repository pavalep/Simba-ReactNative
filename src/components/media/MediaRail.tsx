/**
 * MediaRail — a titled, collapsible horizontal rail of cards.
 *
 * ## Why this exists
 *
 * "Recently Played" and "Bookmarks" each implemented their own header,
 * their own collapse toggle, their own empty state and their own
 * horizontal `FlatList` configuration. Two copies of a section header
 * are two places for the spacing to drift, and it had: the Bookmarks
 * header used different padding and a different icon badge from the
 * one directly above it on the same screen.
 *
 * `maxItems` is deliberately REQUIRED rather than defaulted. It had a
 * default of 8 while the store it was fed from capped at 10 — so the
 * rail silently showed 8 of 10, and the "max 10" that the data layer
 * was honouring was invisible on screen. A required prop makes the
 * caller state its own limit, and makes a mismatch a type error
 * instead of a quiet truncation.
 *
 * `renderItem` is a render prop rather than an item type: the two
 * shelves carry different records (history entries vs bookmarks) and
 * want different subtitles. Sharing the frame, not the data, is what
 * keeps them from sharing a type that has to grow `?` for everything.
 */

import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {AppText} from '../core/AppText/AppText';
import {SvgIcon} from '../utility/SvgIcon';
import {EmptyState} from '../utility/EmptyState/EmptyState';
import type {SvgIconName} from '../utility/SvgIcon';

export interface MediaRailProps<T> {
  title: string;
  /** Header badge glyph. Decorative — the title is the label. */
  icon: SvgIconName;
  items: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
  /**
   * How many cards this rail may show. Required on purpose — see the
   * file docstring for the silent-truncation bug this replaces.
   */
  maxItems: number;
  onSeeAll?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: SvgIconName;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function MediaRail<T>({
  title,
  icon,
  items,
  keyExtractor,
  renderItem,
  maxItems,
  onSeeAll,
  emptyTitle = 'Nothing Here Yet',
  emptyDescription = 'Items will appear here once you have some.',
  emptyIcon = 'video',
  emptyActionLabel,
  onEmptyAction,
}: MediaRailProps<T>): React.ReactElement {
  const {colors} = useTheme();

  // Collapsed when empty, expanded when it has data, until the user
  // says otherwise. In-memory only — no persistence, so the rail never
  // comes back collapsed for a reason the user cannot see.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const displayItems = items.slice(0, maxItems);
  const hasData = displayItems.length > 0;
  const collapsed = userCollapsed ?? !hasData;
  const onToggleCollapsed = useCallback(() => {
    setUserCollapsed(prev => (prev ?? !hasData ? false : true));
  }, [hasData]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.iconBadge, {backgroundColor: colors.accent.goldSoft}]}
            accessibilityElementsHidden
            importantForAccessibility="no">
            <SvgIcon name={icon} size={18} color={colors.accent.gold} />
          </View>
          <AppText variant="displaySans" color="primary" style={styles.headerTitle}>
            {title}
          </AppText>
        </View>
        <View style={styles.headerActions}>
          {items.length > 1 && onSeeAll ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onSeeAll}
              accessibilityRole="button"
              accessibilityLabel={`See all ${title}`}
              style={styles.seeAllBtn}>
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
              style={collapsed ? styles.chevronUp : undefined}
            />
          </TouchableOpacity>
        </View>
      </View>

      {!collapsed && !hasData ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          variant="compact"
        />
      ) : null}

      {!collapsed && hasData ? (
        <FlatList
          horizontal
          data={displayItems as T[]}
          keyExtractor={keyExtractor}
          renderItem={({item, index}) => renderItem(item, index)}
          contentContainerStyle={styles.shelfContent}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_PITCH}
          decelerationRate="fast"
          initialNumToRender={displayItems.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      ) : null}
    </View>
  );
}

// Card width + the gap after it, which is what the rail actually snaps
// to. Deriving it here is why the two shelves scroll at the same rate:
// the old lists each hard-coded their own and one of them snapped to a
// pitch its cards did not have.
const CARD_PITCH = 160 + spacing.md;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  seeAllBtn: {
    paddingVertical: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chevronBtn: {
    padding: spacing.xs,
  },
  chevronUp: {
    transform: [{rotate: '180deg'}],
  },
  shelfContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
});
