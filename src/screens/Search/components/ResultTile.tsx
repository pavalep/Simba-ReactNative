import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {HighlightedText} from './HighlightedText';
import type {SearchResultItem} from '../../../hooks/useSearch';
import {radius} from '../../../theme/tokens';

interface ResultTileProps {
  item: SearchResultItem;
  tileWidth: number;
  query: string;
  onPress: () => void;
}

export const ResultTile: React.FC<ResultTileProps> = ({
  item,
  tileWidth,
  query,
  onPress,
}) => {
  const {colors} = useTheme();

  const percent =
    item.duration && item.duration > 0
      ? Math.round(((item.position ?? 0) / item.duration) * 100)
      : 0;

  return (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.resultTile,
        {
          width: tileWidth,
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
      ]}>
      <View
        style={[
          styles.resultThumb,
          {backgroundColor: colors.accent.goldDim},
        ]}>
        {item.thumbnailPath ? (
          <FastImage
            source={{
              uri:
                'file://' +
                item.thumbnailPath +
                '?t=' +
                encodeURIComponent(item.lastPlayedAt ?? ''),
            }}
            style={styles.resultThumbImg}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <SvgIcon
            name="music"
            size={28}
            color={colors.text.tertiary}
            style={styles.resultThumbPlaceholder}
          />
        )}
        <View
          style={[
            styles.resultProgressTrack,
            {backgroundColor: colors.text.tertiary},
          ]}>
          <View
            style={[
              styles.resultProgressFill,
              {
                width: `${percent}%`,
                backgroundColor: colors.accent.gold,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.resultTitle}>
        <HighlightedText text={item.title} query={query} style={{fontSize: 12}} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  resultTile: {
    borderRadius: radius.sm,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  resultThumb: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  resultThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultThumbPlaceholder: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    opacity: 0.45,
  },
  resultProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  resultProgressFill: {
    height: '100%',
  },
  resultTitle: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
