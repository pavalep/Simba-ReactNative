import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage, {Source as FastImageSource} from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, IconName} from '../../utility/SvgIcon';

interface MediaTileProps {
  title: string;
  subtitle?: string;
  thumbnail?: FastImageSource;
  /** P41.6: icon fallback shown when no thumbnail is provided. */
  icon?: IconName;
  /** P41.6: square (default) or 16:9 wide shelf card. */
  variant?: 'square' | 'wide';
  /** P41.6: gold ring for the active tile (e.g. mood rails). */
  selected?: boolean;
  size?: number;
  onPress?: () => void;
}

export const MediaTile: React.FC<MediaTileProps> = React.memo(({
  title,
  subtitle,
  thumbnail,
  icon = 'music',
  variant = 'square',
  selected = false,
  size = 140,
  onPress,
}: MediaTileProps) => {
  const {colors} = useTheme();
  const thumbHeight = variant === 'wide' ? Math.round((size * 9) / 16) : size;

  const tile = (
    <View style={{width: size}}>
      <View
        style={[
          styles.thumb,
          {
            width: size,
            height: thumbHeight,
            backgroundColor: colors.border.subtle,
            borderRadius: radius.sm,
          },
          selected
            ? [styles.selectedRing, {borderColor: colors.accent.gold}]
            : null,
        ]}>
        {thumbnail ? (
          <FastImage
            source={{
              ...thumbnail,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={[styles.image, {borderRadius: radius.sm}]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <SvgIcon
              name={icon}
              size={Math.round(size * 0.28)}
              color={colors.accent.gold}
            />
          </View>
        )}
      </View>
      <AppText
        variant="caption"
        color="primary"
        numberOfLines={1}
        style={styles.title}>
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="caption" color="tertiary" numberOfLines={1}>
          {subtitle}
        </AppText>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}>
        {tile}
      </TouchableOpacity>
    );
  }
  return tile;
});

const styles = StyleSheet.create({
  thumb: {
    overflow: 'hidden',
  },
  selectedRing: {
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.xs,
  },
});
