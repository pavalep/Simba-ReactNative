// ─── Channel Card ────────────────────────────────────────────────
// Wave 8: card visual contract ported from the legacy tab-based
// LiveTVScreen so the new screen looks identical at the row level.
//
//   • 56×56 thumb (the logo image, with the app's own tile until it
//     decodes)
//   • name (bodySmall on the Semibold family) + category·country caption
//   • a trailing HEART when the channel is a favourite
//   • 32×32 round play button
//
// The trailing BOOKMARK glyph is gone: it showed the FAVOURITE state with
// another feature's icon, while the app's own favourite language is a
// heart. The state is now announced too — the row's accessible name used
// to be the channel name and nothing else, so a screen-reader user could
// not tell a favourite channel from an ordinary one.

import React, {useMemo} from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import type {IPTVChannelResult} from '../../../types/api';
import type {ColorTokens} from '../../../theme/tokens';
import type {LiveFavoriteItem} from '../../../state';

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
    image: channel.image || '',
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
    const styles = useMemo(() => createChannelCardStyles(colors), [colors]);

    // The thumb's tile — what the user sees while the logo is on the
    // wire, and what stays if it never arrives.
    const thumbTile = (
      <View style={styles.thumbTile} testID="livetv-artwork-placeholder">
        <SvgIcon name="video" size={22} color={colors.accent.gold} />
      </View>
    );

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={
          isFavorite ? `${row.name}, favorite` : row.name
        }
        accessibilityHint="Long press for more actions"
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
            <MediaImage
              source={row.image}
              style={styles.thumb}
              resizeMode="contain"
              placeholder={thumbTile}
              testID="livetv-artwork-placeholder"
            />
          ) : (
            thumbTile
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

        {isFavorite ? (
          <SvgIcon name="heart" size={16} color={colors.accent.gold} />
        ) : null}

        <View style={styles.playButton}>
          <SvgIcon name="play" size={16} color={colors.accent.gold} />
        </View>
      </TouchableOpacity>
    );
  },
);

const createChannelCardStyles = (colors: ColorTokens) =>
  StyleSheet.create({
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
    thumbTile: {
      // The artwork's plate — the SAME vocabulary as the podcast row's,
      // the music row's and the radio row's: a gold-dim plate with the
      // glyph on it.
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent.goldDim,
    },
    info: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      // The weight lives in the FAMILY key, not a `fontWeight` prop:
      // `fontWeight: '600'` on the family `Inter` asks Android for
      // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops
      // the suffix below weight 700), so the SemiBold face was
      // unreachable and the channel name was drawn in Inter REGULAR.
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    playButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
