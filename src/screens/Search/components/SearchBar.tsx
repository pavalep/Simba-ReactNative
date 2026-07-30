import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {radius} from '../../../theme/tokens';

interface SearchBarProps {
  searchText: string;
  onChangeText: (text: string) => void;
  onSubmitEditing: () => void;
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchText,
  onChangeText,
  onSubmitEditing,
  onClear,
}) => {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.searchBar,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
      ]}>
      <SvgIcon
        name="search"
        size={20}
        color={colors.text.secondary}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.searchInput, {color: colors.text.primary}]}
        placeholder="Search tracks, artists, albums, folders…"
        placeholderTextColor={colors.text.tertiary}
        autoFocus
        value={searchText}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
      />
      {searchText.length > 0 && (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          style={styles.clearButton}
          accessibilityLabel="Clear search"
          accessibilityRole="button">
          <SvgIcon name="close" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
    ...Platform.select({android: {marginTop: 8}}),
  },
  searchIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    opacity: 0.6,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    paddingLeft: 4,
  },
});
