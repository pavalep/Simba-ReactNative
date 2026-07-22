import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage, {Source as FastImageSource} from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface MediaTileProps {
  title: string;
  subtitle?: string;
  thumbnail?: FastImageSource;
  size?: number;
  onPress?: () => void;
}

export const MediaTile: React.FC<MediaTileProps> = React.memo(({
  title,
  subtitle,
  thumbnail,
  size = 140,
  onPress,
}: MediaTileProps) => {
  const {colors} = useTheme();

  const tile = (
    <View style={{width: size}}>
      <View
        style={[
          styles.thumb,
          {
            width: size,
            height: size,
            backgroundColor: colors.border.subtle,
            borderRadius: radius.sm,
          },
        ]}>
        {thumbnail ? (
          <FastImage
            source={{...thumbnail, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable}}
            style={[styles.image, {borderRadius: radius.sm}]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {backgroundColor: colors.accent.goldDim},
            ]}
          />
        )}
      </View>
      <AppText
        variant="caption"
        color="primary"
        numberOfLines={1}
        style={{marginTop: spacing.xs}}>
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
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    borderRadius: radius.sm,
  },
});
