// ─── Radio Station Card (v10.1 Wave 7 standalone Radio) ────────────────
// Shared by the browse page and the Favorites page. Ported verbatim from
// the legacy tab-based RadioScreen: 48×48 favicon/headphones thumb, name,
// "country · tags" subtitle, codec badge + bitrate, bookmark glyph,
// 32×32 gold play button, 400 ms long-press.

import React from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import type {RadioStationResult} from '../../../types/api';
import type {LiveFavoriteItem} from '../../../store/slices/liveFavoritesSlice';

// ─── Normalized row ───────────────────────────────────────────────────

export interface StationRow {
  id: string;
  name: string;
  url: string;
  image: string;
  subtitle: string;
  codec?: string;
  bitrate?: number;
}

export function toRow(station: RadioStationResult): StationRow {
  return {
    id: station.stationuuid,
    name: station.name,
    url: station.urlResolved || station.url,
    image: station.favicon || '',
    subtitle: [station.country, station.tags].filter(Boolean).join(' · '),
    codec: station.codec,
    bitrate: station.bitrate,
  };
}

export function favToRow(fav: LiveFavoriteItem): StationRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
    codec: fav.codec,
    bitrate: fav.bitrate,
  };
}

// ─── Card ─────────────────────────────────────────────────────────────

interface RadioStationCardProps {
  row: StationRow;
  isFavorite: boolean;
  onPress: (row: StationRow) => void;
  onLongPress: (row: StationRow) => void;
}

export const RadioStationCard: React.FC<RadioStationCardProps> = React.memo(
  ({row, isFavorite, onPress, onLongPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={row.name}
        style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <SvgIcon name="headphones" size={22} color={colors.accent.gold} />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.name}
          </AppText>
          {row.subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
          {row.codec || row.bitrate ? (
            <View style={styles.metaRow}>
              {row.codec ? (
                <View
                  style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                  <AppText
                    variant="caption"
                    style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                    {row.codec}
                  </AppText>
                </View>
              ) : null}
              {row.bitrate ? (
                <AppText variant="caption" color="tertiary">
                  {row.bitrate} kbps
                </AppText>
              ) : null}
            </View>
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
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {flex: 1, gap: spacing.xs},
  name: {fontWeight: '600'},
  metaRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  metaBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.sm - 2,
  },
  metaBadgeText: {fontSize: 10, fontWeight: '700'},
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
