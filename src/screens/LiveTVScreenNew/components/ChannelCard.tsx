// ─── Channel Card ────────────────────────────────────────────────
// Wave 8: card visual contract ported from the legacy tab-based
// LiveTVScreen so the new screen looks identical at the row level.
//
//   • 56×56 thumb (logo FastImage, fallback video gold glyph)
//   • name (bodySmall 600) + category·country caption
//   • trailing bookmark glyph (gold if favorite else tertiary)
//   • 32×32 round play button

import React from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import type {IPTVChannelResult} from '../../../types/api';
import type {LiveFavoriteItem} from '../../../store/slices/liveFavoritesSlice';

export interface ChannelRow {
  id: string;
  name: string;
  url: string;
  image: string; // logo
  subtitle: string; // "Sports · US"
}

export function toRow(channel: IPTVChannelResult): ChannelRow {
  return {
    id: channel.id,
    name: channel.name,
    url: channel.url,
    image: channel.logo || '',
    subtitle: [channel.category, channel.country]
      .filter(Boolean)
      .join(' · '),
  };
}

export function favToRow(fav: LiveFavoriteItem): ChannelRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
  };
}

interface ChannelCardProps {
  row: ChannelRow;
  isFavorite: boolean;
  onPress: (row: ChannelRow) => void;
  onLongPress: (row: ChannelRow) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = React.memo(
  ({row, isFavorite, onPress, onLongPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        accessibilityRole="button"
        style={[
          styles.card,
          {backgroundColor: colors.background.elevated},
        ]}>
        <View
          style={[
            styles.thumb,
            {backgroundColor: colors.border.subtle},
          ]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image, priority: FastImage.priority.normal}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <SvgIcon name="video" size={22} color={colors.accent.gold} />
          )}
        </View>

        <View style={styles.info}>
          <AppText
            variant="bodySmall"
            numberOfLines={1}
            style={styles.name}>
            {row.name}
          </AppText>
          {row.subtitle ? (
            <AppText
              variant="caption"
              color="secondary"
              numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>

        <SvgIcon
          name="bookmark"
          size={18}
          color={isFavorite ? colors.accent.gold : colors.text.tertiary}
        />

        <View style={styles.playButton}>
          <SvgIcon name="play" size={16} color={colors.accent.gold} />
        </View>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontWeight: '600',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
