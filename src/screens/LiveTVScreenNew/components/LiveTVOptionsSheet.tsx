// ─── Live TV Options Sheet ─────────────────────────────────────────
// Wave 8: bottom sheet for the single "Category" filter on Live TV.
// Mirrors RadioOptionsSheet's shape (single-select row, gold check,
// reset row at the bottom) but with one group only.

import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {BottomSheet} from '../../../components/sheets/BottomSheet/BottomSheet';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import type {IPTVCategory} from '../../../types/api';

interface LiveTVOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  value: {category: string | null};
  onOptionChange: (id: 'category', key: string) => void;
  onReset: () => void;
  tags: {categories: IPTVCategory[]};
  tagsLoaded: boolean;
}

export const LiveTVOptionsSheet: React.FC<LiveTVOptionsSheetProps> =
  React.memo(
    ({
      visible,
      onClose,
      value,
      onOptionChange,
      onReset,
      tags,
      tagsLoaded,
    }) => {
      const {colors} = useTheme();
      const hasActive = !!value.category;

      const renderRow = (
        cat: IPTVCategory,
        checked: boolean,
      ) => (
        <TouchableOpacity
          key={cat.id}
          activeOpacity={0.85}
          onPress={() => onOptionChange('category', cat.name)}
          accessibilityRole="radio"
          accessibilityState={{selected: checked}}
          style={[
            styles.row,
            {borderBottomColor: colors.border.subtle},
          ]}>
          <AppText
            variant="body2"
            color={checked ? 'accent' : 'primary'}>
            {cat.name}
          </AppText>
          {checked ? (
            <SvgIcon
              name="check"
              size={18}
              color={colors.accent.gold}
            />
          ) : null}
        </TouchableOpacity>
      );

      return (
        <BottomSheet
          visible={visible}
          onClose={onClose}
          title="Filter channels"
          snapPoints={['40%', '75%']}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {!tagsLoaded ? (
              <View style={styles.loadingWrap}>
                <ActivityOrb size={28} />
                <AppText
                  variant="caption"
                  color="tertiary"
                  style={styles.loadingText}>
                  Loading categories…
                </AppText>
              </View>
            ) : (
              <View style={styles.group}>
                <AppText
                  variant="caption"
                  color="tertiary"
                  style={styles.groupTitle}>
                  CATEGORY
                </AppText>
                {tags.categories.map(cat =>
                  renderRow(cat, value.category === cat.name),
                )}
              </View>
            )}

            {hasActive ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onReset}
                accessibilityRole="button"
                style={[
                  styles.resetRow,
                  {borderTopColor: colors.border.subtle},
                ]}>
                <SvgIcon
                  name="replay"
                  size={16}
                  color={colors.text.secondary}
                />
                <AppText
                  variant="body2"
                  color="secondary"
                  style={styles.resetText}>
                  Reset
                </AppText>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </BottomSheet>
      );
    },
  );

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  group: {
    paddingTop: spacing.md,
  },
  groupTitle: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  resetText: {
    marginLeft: spacing.xs,
  },
});

// keep `radius` referenced so eslint-import-plugins don't strip it
void radius;
