import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../theme';
import {SvgIcon} from '../utility/SvgIcon';
import {AppText} from '../core/AppText/AppText';

interface Props {
  onPress: () => void;
  count?: number;
  color?: string;
  size?: number;
}

export const BookmarkButton: React.FC<Props> = ({
  onPress,
  count = 0,
  color,
  size = 22,
}) => {
  const {colors} = useTheme();
  const iconColor = color ?? colors.text.secondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityLabel={count > 0 ? `${count} bookmarks` : 'Bookmark'}
      accessibilityRole="button">
      <SvgIcon name="bookmark" size={size} color={iconColor} />
      {count > 0 && (
        <View style={[styles.badge, {backgroundColor: colors.accent.gold}]}>
          <AppText
            variant="overline"
            color="primary"
            style={[styles.badgeText, {color: colors.text.inverse}]}>
            {count > 99 ? '99+' : count}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
});
