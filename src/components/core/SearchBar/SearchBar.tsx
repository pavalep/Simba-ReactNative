// ────────────────────────────────────────────────────────
// Simba Player — SearchBar Core Component (Phase 53.2)
// Debounced search input with clear + optional cancel.
// Promoted from the Search screen so every screen shares
// one search experience.
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
import {AppText} from '../AppText/AppText';
import {radius, spacing} from '../../../theme/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  /** 53.2: debounced echo of changes (default 300ms). */
  onDebouncedChange?: (text: string) => void;
  debounceMs?: number;
  /** Extra work on clear (e.g. reset filters); text clears automatically. */
  onClear?: () => void;
  /** When provided, a "Cancel" button shows while text is non-empty. */
  onCancel?: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
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
  onCancel,
  onSubmitEditing,
  placeholder = 'Search…',
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
            borderColor: focused ? colors.accent.gold : colors.border.subtle,
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
          accessibilityLabel={placeholder}
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

      {onCancel && value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            handleClear();
            onCancel();
          }}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          accessibilityRole="button"
          accessibilityLabel="Cancel search">
          <AppText variant="body2" color="accent" style={styles.cancelText}>
            Cancel
          </AppText>
        </TouchableOpacity>
      )}
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
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 0,
    marginLeft: spacing.sm,
  },
  clearButton: {
    marginLeft: spacing.xs,
    paddingLeft: spacing.xs,
  },
  cancelText: {
    fontWeight: '600',
  },
});
