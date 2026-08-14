// ─── v10: Unified Section Browse — SectionOptionsSheet ───────────────────
// Wave 3 (Phase 3.2). The FAB's payload (spec §3.3): wraps the shared
// BottomSheet and renders the section's OptionGroups — extra filters,
// sort order, view density — in one discoverable panel.
//
// Contract: this is a CONTROLLED component. `value` (the same record the
// shell threads into SectionRenderContext.options) and `onOptionChange`
// come from the shell — so quick FilterChips (Wave 4) and the sheet share
// ONE source of truth (Phase 3.2 step 5). Selecting a row calls
// onOptionChange and KEEPS the sheet open; dismissal is always user-driven
// (drag, backdrop, close, Android back — all handled by the shared sheet).
//
// Selected-state language (Phase 3.2 step 3): accent-gold label + gold
// check mark, mirroring the Library sort picker's gold radio.

import React from 'react';
import {ScrollView, TouchableOpacity, View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {BottomSheet} from '../../../components/sheets/BottomSheet/BottomSheet';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import type {IconName} from '../../../components/utility/SvgIcon';
import type {OptionGroup, SectionOptionGroupId} from '../sectionConfig';

export interface SectionOptionsSheetProps {
  /** Modal visibility — owned by the shell (FAB press / dismissal). */
  visible: boolean;
  /** Dismiss callback — drag, backdrop, close, Android back. */
  onClose: () => void;
  /** Sheet title — config.title (e.g. "Movies"). */
  title: string;
  /** The section's option groups (config.options.groups). */
  groups: OptionGroup[];
  /** Current selections — same record as SectionRenderContext.options. */
  value: Partial<Record<SectionOptionGroupId, string>>;
  /** Applies a selection; the sheet stays open until the user dismisses. */
  onOptionChange: (groupId: SectionOptionGroupId, key: string) => void;
}

export const SectionOptionsSheet: React.FC<SectionOptionsSheetProps> = ({
  visible,
  onClose,
  title,
  groups,
  value,
  onOptionChange,
}) => {
  const {colors} = useTheme();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['40%', '75%']}
      title={title}>
      {/* ScrollView wrapper = the snap-point clipping fix (Phase 3.2 step 8):
          long option lists scroll inside the 40%/75% sheet instead of
          being cut off by the fixed content box. */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {groups.map(group => {
          const selected = value[group.id];
          return (
            <View key={group.id} style={styles.group}>
              <AppText
                variant="caption"
                color="tertiary"
                style={styles.groupTitle}>
                {group.title}
              </AppText>
              {group.options.map(option => {
                const isSelected = selected === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{selected: isSelected}}
                    accessibilityLabel={option.label}
                    onPress={() => onOptionChange(group.id, option.key)}
                    style={[
                      styles.row,
                      {borderBottomColor: colors.border.subtle},
                    ]}>
                    <View style={styles.rowLeft}>
                      {option.icon ? (
                        <SvgIcon
                          name={option.icon as IconName}
                          size={18}
                          color={
                            isSelected
                              ? colors.accent.gold
                              : colors.text.secondary
                          }
                          style={styles.rowIcon}
                        />
                      ) : null}
                      <AppText
                        variant="body2"
                        color={isSelected ? 'accent' : 'secondary'}>
                        {option.label}
                      </AppText>
                    </View>
                    {isSelected ? (
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
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  group: {
    marginBottom: spacing.sm,
  },
  groupTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: spacing.sm,
  },
});
