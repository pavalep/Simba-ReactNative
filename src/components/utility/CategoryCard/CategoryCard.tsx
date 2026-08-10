// ─── CategoryCard ───────────────────────────────────────────────
// P53: Single source of truth for the "All + content cards" tiles used
// in every Home-page shelf. Every card is 140px wide.
//
// Two visual modes:
//   • With `image` (P53+): the local cover renders full-bleed at the
//     back, with a dark linear gradient overlay (opaque at the bottom,
//     transparent at the top) so the title and description at the
//     bottom stay readable. The icon switches to a translucent dark
//     disc with a white glyph — like a small vinyl/poster badge.
//   • Without `image`: falls back to the original plain tile with the
//     gold icon disc.

import React from 'react';
import {
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {SvgIcon} from '../SvgIcon';
import {AppText} from '../../core/AppText/AppText';

export interface CategoryCardProps {
  name: string;
  description: string;
  icon: string;
  onPress: () => void;
  /** Optional local cover image. When set, the card renders the
   *  image as a full-bleed background with a dark gradient overlay. */
  image?: ImageSourcePropType;
  /** Optional override for the touchable's accessibility label. */
  accessibilityLabel?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(
  ({name, description, icon, onPress, image, accessibilityLabel}) => {
    const {colors} = useTheme();
    const hasImage = !!image;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name}
        style={[
          styles.card,
          {backgroundColor: hasImage ? 'transparent' : colors.background.elevated},
        ]}>
        {hasImage ? (
          <>
            <Image
              source={image}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : null}

        <View
          style={[
            styles.iconCircle,
            hasImage
              ? {backgroundColor: 'rgba(0,0,0,0.45)'}
              : {backgroundColor: colors.accent.goldDim},
          ]}>
          <SvgIcon
            name={icon as never}
            size={22}
            color={hasImage ? '#ffffff' : colors.accent.gold}
          />
        </View>

        <AppText
          variant="bodySmall"
          numberOfLines={1}
          style={[
            styles.title,
            {color: hasImage ? '#ffffff' : colors.text.primary},
          ]}>
          {name}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={2}
          style={[
            styles.description,
            {color: hasImage ? 'rgba(255,255,255,0.78)' : colors.text.tertiary},
          ]}>
          {description}
        </AppText>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 160, // fixed so the image has a consistent 7:8 portrait aspect
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden', // clip the image + gradient to the rounded card
    justifyContent: 'flex-end', // text + icon sit at the bottom of the image
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
  },
  title: {
    fontWeight: '700',
    lineHeight: 18,
  },
  description: {
    lineHeight: 14,
    opacity: 0.9,
  },
});
