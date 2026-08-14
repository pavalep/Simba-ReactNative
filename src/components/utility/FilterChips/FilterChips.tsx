// ─── FilterChips — shared chip primitive ───────────────────────────────
// v10 Wave 4 (Phase 4.1): the ONE chip row for every section's filter bar.
// Replaces the 5 bespoke implementations — Music genre chips, Radio
// TagChips, Live TV CategoryChips, Archive quick searches, Audiobooks
// genre chips — so every section renders the same pill language.
//
// Visual contract (unified from the 5 sources):
//   • pill radius (radius.pill), consistent padding
//   • ACTIVE   = gold fill + inverse text + gold border   (Music/Audiobooks/
//                Search-filters precedent — the "accent background" state)
//   • INACTIVE = elevated fill + subtle border + secondary text (all 5)
//   • optional leading icon (Archive) and trailing count badge (Radio
//     stations / Live TV channels) on the chip's right edge
//
// Modes:
//   • horizontal (default) — scrolling FlatList (Radio / Live TV / Music)
//   • wrap — flex-wrap flow layout (Audiobooks' 20 genres)
//
// Selection semantics:
//   • singleSelect (default true) — tapping the ACTIVE chip clears the
//     selection: onSelect('') fires; parents treat '' as "no selection".
//   • singleSelect=false — always onSelect(key) (future multi-select).

import React, {useCallback} from 'react';
import {
  FlatList,
  View,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, type SvgIconName} from '../SvgIcon';

export interface FilterChipItem {
  /** Stable identifier — compared against `selectedKey`. */
  key: string;
  label: string;
  /** Optional leading icon (Archive quick searches). */
  icon?: SvgIconName;
  /** Optional trailing count badge (Radio stations, Live TV channels). */
  count?: number;
}

interface FilterChipsProps {
  items: FilterChipItem[];
  /** Active chip key, or null/undefined when nothing is selected. */
  selectedKey?: string | null;
  onSelect: (key: string) => void;
  /** true → tapping the active chip clears it (toggle). Default true. */
  singleSelect?: boolean;
  /** true → wrapping flow layout (Audiobooks genres); false → horizontal scroll. */
  wrap?: boolean;
  /** Outer container style override (per-screen parity). */
  style?: StyleProp<ViewStyle>;
  /** Content container style override (per-screen padding parity). */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const FilterChips: React.FC<FilterChipsProps> = React.memo(
  ({
    items,
    selectedKey = null,
    onSelect,
    singleSelect = true,
    wrap = false,
    style,
    contentContainerStyle,
  }) => {
    const {colors} = useTheme();

    const renderChip = useCallback(
      (item: FilterChipItem) => {
        const active = selectedKey === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.8}
            onPress={() => {
              // Step 7: singleSelect toggle — tapping the active chip clears.
              if (singleSelect && active) {
                onSelect('');
              } else {
                onSelect(item.key);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            accessibilityLabel={item.label}
            style={[
              styles.chip,
              active
                ? {
                    backgroundColor: colors.accent.gold,
                    borderColor: colors.accent.gold,
                  }
                : {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
            ]}>
            {item.icon ? (
              <SvgIcon
                name={item.icon}
                size={14}
                color={active ? colors.text.inverse : colors.accent.gold}
              />
            ) : null}
            <AppText
              variant="caption"
              style={[
                styles.chipText,
                {color: active ? colors.text.inverse : colors.text.secondary},
              ]}>
              {item.label}
            </AppText>
            {item.count != null ? (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: active
                      ? colors.background.primary
                      : colors.accent.goldDim,
                  },
                ]}>
                <AppText
                  variant="caption"
                  style={[
                    styles.countText,
                    {color: colors.accent.gold},
                  ]}>
                  {item.count}
                </AppText>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      },
      [colors, onSelect, selectedKey, singleSelect],
    );

    // Wrap mode: flex-wrap flow (Audiobooks' 20 genres can't virtualize).
    if (wrap) {
      return (
        <View style={[styles.wrapRow, style, contentContainerStyle]}>
          {items.map(renderChip)}
        </View>
      );
    }

    return (
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => item.key}
        renderItem={({item}) => renderChip(item)}
        style={style}
        contentContainerStyle={[styles.horizontalRow, contentContainerStyle]}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={items.length}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    );
  },
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
  horizontalRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
