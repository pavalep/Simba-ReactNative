// ─── CategoryCard ───────────────────────────────────────────────
//
// V2: THE POSTER IS THE CARD.
//
// V1 laid the title and the description over the poster on a dark
// scrim, and the description was one long line that ran past the card
// and was cut off by the next card. V2 puts both UNDER the poster, and
// breaks the description the way the app's own `numberOfLines={2}`
// breaks it.
//
// The poster keeps the app's 140 : 160 shape, scaled to the page's
// 160 dp rail pitch, and the app's own 40 dp icon disc sits in its
// top-left corner.
//
// One card, one grammar: the media card, the playlist tile, the
// podcast tile and this one all put their artwork whole and their text
// underneath. Apple Music, Spotify, Plex, Jellyfin and the Apple TV
// app all draw their rails this way.

import React from 'react';
import {
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {SvgIcon} from '../SvgIcon';
import {AppText} from '../../core/AppText/AppText';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {RAIL_CARD_WIDTH} from '../../media/railMetrics';

/** The rail pitch — every card on the page is 160 dp wide. */
const CARD_WIDTH = RAIL_CARD_WIDTH;
/** The app's 140 : 160 poster shape, scaled to the rail pitch. */
const POSTER_HEIGHT = Math.round((CARD_WIDTH * 160) / 140);

export interface CategoryCardProps {
  name: string;
  description: string;
  icon: string;
  onPress: () => void;
  /** Optional local cover image. When set, the poster renders full-bleed. */
  image?: ImageSourcePropType;
  /** Optional override for the touchable's accessibility label. */
  accessibilityLabel?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(
  ({
    name,
    description,
    icon,
    onPress,
    image,
    accessibilityLabel,
  }) => {
    const {colors} = useTheme();
    const hasImage = !!image;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name}
        style={styles.card}>
        <View style={styles.posterArea}>
          {hasImage ? (
            <>
              <Image
                source={image}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              {/* The icon disc, on the poster's top-left corner. */}
              <View style={styles.iconCircle}>
                <SvgIcon
                  name={icon as never}
                  size={22}
                  color={colors.accent.gold}
                />
              </View>
            </>
          ) : (
            /* No cover — the app falls back to a gold-tinted poster with
               the glyph in the middle. */
            <View
              style={[styles.posterFallback, {backgroundColor: colors.accent.goldSoft}]}>
              <SvgIcon
                name={icon as never}
                size={44}
                color={colors.accent.gold}
              />
            </View>
          )}
        </View>

        {/* The text is UNDER the poster, on the page's own background —
            always legible, and the poster is never covered. */}
        <View style={styles.textArea}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.title}>
            {name}
          </AppText>
          <AppText
            variant="caption"
            color="secondary"
            numberOfLines={2}
            style={styles.description}>
            {description}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  posterArea: {
    width: '100%',
    height: POSTER_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden', // clip the image to the rounded poster
  },
  posterFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  textArea: {
    marginTop: 10,
  },
  title: {
    // Inter SemiBold 14/20 — the `bodySmall` metrics with the semibold
    // family. The weight lives in the FAMILY key (the app's
    // weight-intent rule), so there is no `fontWeight` here.
    fontFamily: FONT_FAMILY.inter.semibold,
  },
  description: {
    marginTop: 2,
  },
});
