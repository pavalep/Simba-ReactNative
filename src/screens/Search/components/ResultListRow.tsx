import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {HighlightedText} from './HighlightedText';
import type {SearchResultItem} from '../../../hooks/useSearch';
import {radius} from '../../../theme/tokens';

interface ResultListRowProps {
  item: SearchResultItem;
  query: string;
  onPress: () => void;
}

export const ResultListRow: React.FC<ResultListRowProps> = ({
  item,
  query,
  onPress,
}) => {
  const {colors} = useTheme();

  let iconName: React.ComponentProps<typeof SvgIcon>['name'] = 'folder';
  if (item.group === 'artists') iconName = 'headphones';
  else if (item.group === 'albums') iconName = 'folder';
  else if (item.group === 'playlists') iconName = 'listMusic';
  else if (item.group === 'folders') iconName = 'folderFill';

  return (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.listResultRow,
        {
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
      ]}>
      <SvgIcon
        name={iconName}
        size={20}
        color={colors.text.secondary}
        style={styles.listIcon}
      />
      <View style={styles.listTextContainer}>
        <HighlightedText text={item.title} query={query} />
        {item.subtitle ? (
          <HighlightedText text={item.subtitle} query={query} variant="subtitle" />
        ) : null}
      </View>
      <SvgIcon
        name="chevronRight"
        size={16}
        color={colors.text.tertiary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  listResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    gap: 10,
    marginBottom: 8,
  },
  listIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    opacity: 0.5,
  },
  listTextContainer: {
    flex: 1,
  },
});
