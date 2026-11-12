// ────────────────────────────────────────────────────────
// Simba Player — SearchBar Core Component (Phase 53.2)
// Debounced search input with clear.
// Promoted from the Search screen so every screen shares
// one search experience.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN):
//   • the input's TYPEFACE is fixed. It set `fontSize: 15` with no
//     `fontFamily` at all, so the field rendered in the SYSTEM font
//     while every other piece of type in the app is Inter or Cormorant.
//     The family is now `FONT_FAMILY.inter.regular` — and the weight is
//     NOT a `fontWeight` prop, because the house rule is that the weight
//     lives in the family key (a `fontWeight` beside a family is how
//     Android ends up asking for a file that does not ship).
//   • the "Cancel" button is GONE. The prop existed, the component drew
//     it, and NO caller in the app ever passed `onCancel` — so it could
//     never appear. It was a control drawn in a design and missing in
//     the app, which is the exact class of drift this wave is about.
// ────────────────────────────────────────────────────────

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ReturnKeyTypeOptions,
} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../utility/SvgIcon';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  /** 53.2: debounced echo of changes (default 300ms). */
  onDebouncedChange?: (text: string) => void;
  debounceMs?: number;
  /** Extra work on clear (e.g. reset filters); text clears automatically. */
  onClear?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  /** Overrides the placeholder-derived accessibilityLabel (e.g. "Search Movies"). */
  accessibilityLabel?: string;
  autoFocus?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  style?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onDebouncedChange,
  debounceMs = 300,
  onClear,
  onSubmitEditing,
  placeholder = 'Search…',
  accessibilityLabel,
  autoFocus = false,
  returnKeyType = 'search',
  style,
}) => {
  const {colors} = useTheme();
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      onChangeText(text);
      if (onDebouncedChange) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          onDebouncedChange(text);
        }, debounceMs);
      }
    },
    [onChangeText, onDebouncedChange, debounceMs],
  );

  const handleClear = useCallback(() => {
    handleChange('');
    onClear?.();
  }, [handleChange, onClear]);

  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.background.elevated,
            // 2026-11-12 (SEARCH_PAGE_REDESIGN): the focus ring was
            // `accent.gold`, which drew a GOLD OUTLINE around the whole
            // capsule — the loudest thing on the Search page, and the
            // owner's "gold-outlined pill field". The field's own accent
            // is the search glyph, which already turns gold on focus. The
            // border now steps from `border.subtle` to `border.emphasis`
            // (0.06 → 0.12 white): a real focus cue, in the theme's own
            // greys.
            borderColor: focused ? colors.border.emphasis : colors.border.subtle,
          },
        ]}>
        <SvgIcon
          name="search"
          size={18}
          color={focused ? colors.accent.gold : colors.text.tertiary}
        />
        <TextInput
          style={[styles.searchInput, {color: colors.text.primary}]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          autoFocus={autoFocus}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          accessibilityLabel={accessibilityLabel ?? placeholder}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <SvgIcon name="close" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    // The app's own Inter — the field used to render in the SYSTEM font
    // because it set a size and no family at all.
    fontFamily: FONT_FAMILY.inter.regular,
    fontSize: 15,
    paddingVertical: 0,
    marginLeft: spacing.sm,
  },
  clearButton: {
    marginLeft: spacing.xs,
    paddingLeft: spacing.xs,
  },
});
