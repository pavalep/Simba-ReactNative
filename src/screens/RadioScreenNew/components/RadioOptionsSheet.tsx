// ─── Radio Options Sheet (v10.1 Wave 7 standalone Radio) ───────────────
// The FAB's payload: three simultaneous single-select groups — Genre,
// Country, Language — in one BottomSheet, mirroring the shared
// SectionOptionsSheet visual language (gold check on the selected row,
// Reset row when anything is active). Selecting a row keeps the sheet
// open; dismissal is always user-driven (drag / backdrop / close).

import React from 'react';
import {ScrollView, TouchableOpacity, View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {BottomSheet} from '../../../components/sheets/BottomSheet/BottomSheet';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import type {RadioFilterId, RadioFilters} from '../hooks/useRadioBrowser';
import type {RadioBrowseTag} from '../../../services/api/radioBrowserService';

interface RadioOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  value: RadioFilters;
  onOptionChange: (id: RadioFilterId, key: string) => void;
  onReset: () => void;
  /** Genre/Country/Language option lists (fetched once by the hook). */
  tags: {genres: RadioBrowseTag[]; countries: RadioBrowseTag[]; languages: RadioBrowseTag[]};
  tagsLoaded: boolean;
}

const GROUPS: Array<{id: RadioFilterId; title: string}> = [
  {id: 'genre', title: 'Genre'},
  {id: 'country', title: 'Country'},
  {id: 'language', title: 'Language'},
];

export const RadioOptionsSheet: React.FC<RadioOptionsSheetProps> = ({
  visible,
  onClose,
  value,
  onOptionChange,
  onReset,
  tags,
  tagsLoaded,
}) => {
  const {colors} = useTheme();

  const hasActive =
    !!(value.genre || value.country || value.language);

  const listFor = (id: RadioFilterId): RadioBrowseTag[] =>
    id === 'genre'
      ? tags.genres
      : id === 'country'
        ? tags.countries
        : tags.languages;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['40%', '75%']}
      title="Filter stations">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!tagsLoaded ? (
          <View style={styles.loading}>
            <ActivityOrb size={18} />
          </View>
        ) : (
          GROUPS.map(group => {
            const selected = value[group.id];
            return (
              <View key={group.id} style={styles.group}>
                <AppText
                  variant="caption"
                  color="tertiary"
                  style={styles.groupTitle}>
                  {group.title}
                </AppText>
                {listFor(group.id).map(option => {
                  const isSelected = selected === option.name;
                  return (
                    <TouchableOpacity
                      key={option.name}
                      activeOpacity={0.7}
                      accessibilityRole="radio"
                      accessibilityState={{selected: isSelected}}
                      accessibilityLabel={option.name}
                      onPress={() => onOptionChange(group.id, option.name)}
                      style={[
                        styles.row,
                        {borderBottomColor: colors.border.subtle},
                      ]}>
                      <AppText
                        variant="body2"
                        color={isSelected ? 'accent' : 'secondary'}>
                        {option.name}
                      </AppText>
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
          })
        )}
        {hasActive ? (
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset options"
            onPress={onReset}
            style={[styles.resetRow, {borderTopColor: colors.border.subtle}]}>
            <SvgIcon
              name="replay"
              size={16}
              color={colors.text.secondary}
              style={styles.resetIcon}
            />
            <AppText variant="body2" color="secondary">
              Reset
            </AppText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetIcon: {marginRight: spacing.xs},
});
