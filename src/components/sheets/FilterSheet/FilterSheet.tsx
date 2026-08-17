// ─── Filter Sheet (universal) ──────────────────────────────────────────
// v10.1 KISS: ONE bottom sheet for every section's FAB. Pure data-driven:
// the caller passes `groups` (id, title, rows[]) + current `value`
// {[id]:key} + a single `onChange(id, key)` callback.
//
//   • Single-select per group (re-tapping the active row clears it).
//   • Optional Reset row shown only when any group has a non-empty value.
//   • No "view" toggle group — that lives in a different sheet pattern if
//     a section ever needs density/list variants again.
//
// Sections define their own groups inline (Movies: [category, sort],
// Radio: [genre, country, language], Music: [genre, sort], TV: [category]).

import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {BottomSheet} from '../BottomSheet/BottomSheet';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';

export interface FilterSheetRow {
  key: string;            // '' = cleared / default
  label: string;
}

export interface FilterSheetGroup {
  /** Stable id — used as the key in `value`. */
  id: string;
  /** Group heading shown above the rows. */
  title: string;
  rows: FilterSheetRow[];
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  groups: FilterSheetGroup[];
  /** Current selection — a partial record {groupId: rowKey}. */
  value: Record<string, string | undefined>;
  onChange: (groupId: string, key: string) => void;
  /** Optional — when provided, shows a "Reset" row at the bottom if anything is active. */
  onReset?: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = React.memo(
  ({visible, onClose, title = 'Filter', groups, value, onChange, onReset}) => {
    const {colors} = useTheme();
    const hasActive = Object.values(value).some(v => v && v.length > 0);

    console.log('[FilterSheet] render', {visible, title, groupCount: groups.length, hasActive});

    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title={title}
        snapPoints={['40%', '75%']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {groups.map(group => {
            const selectedKey = value[group.id] ?? '';
            return (
              <View key={group.id} style={styles.group}>
                <AppText
                  variant="caption"
                  color="tertiary"
                  style={styles.groupTitle}>
                  {group.title.toUpperCase()}
                </AppText>
                {group.rows.map(row => {
                  const checked = selectedKey === row.key && row.key !== '';
                  return (
                    <TouchableOpacity
                      key={row.key || `${group.id}-empty`}
                      activeOpacity={0.85}
                      onPress={() => onChange(group.id, checked ? '' : row.key)}
                      accessibilityRole="radio"
                      accessibilityState={{selected: checked}}
                      accessibilityLabel={row.label}
                      style={[
                        styles.row,
                        {borderBottomColor: colors.border.subtle},
                      ]}>
                      <AppText
                        variant="body2"
                        color={checked ? 'accent' : 'primary'}>
                        {row.label}
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
                })}
              </View>
            );
          })}

          {onReset && hasActive ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
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
  scroll: {flex: 1},
  scrollContent: {paddingBottom: spacing.xxl},
  group: {marginBottom: spacing.sm},
  groupTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
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
  resetText: {marginLeft: spacing.xs},
});
