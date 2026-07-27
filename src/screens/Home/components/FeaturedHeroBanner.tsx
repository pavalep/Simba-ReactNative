import React from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface FeaturedHeroBannerProps {
  item: {
    title: string;
    fileUri: string;
    position: number;
    duration: number;
    mediaType: string;
    thumbnailPath?: string;
  } | null;
  onPress: (item: any) => void;
}

export const FeaturedHeroBanner: React.FC<FeaturedHeroBannerProps> = ({
  item,
  onPress,
}) => {
  const {colors, shadows} = useTheme();

  if (!item) return null;

  const progress =
    item.duration > 0
      ? Math.min(100, (item.position / item.duration) * 100)
      : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={[
        styles.card,
        shadows.sm,
        {
          backgroundColor: colors.background.primary,
        },
      ]}>
      {/* ── Glass overlay ── */}
      <View
        style={[
          styles.glassOverlay,
          {
            backgroundColor: colors.background.glass,
            borderTopColor: colors.border.emphasis,
          },
        ]}
      />

      {/* ── Media type badge (top-right) ── */}
      <View
        style={[
          styles.badge,
          {borderColor: colors.accent.gold},
        ]}>
        <AppText variant="caption" color="accent">
          {item.mediaType === 'audio' ? 'Audio' : 'Video'}
        </AppText>
      </View>

      {/* ── Title at bottom ── */}
      <View style={styles.bottomContent}>
        <AppText
          variant="h2"
          style={[
            styles.title,
            {
              textShadowColor: colors.text.primary + '80',
            },
          ]}
          numberOfLines={2}>
          {item.title}
        </AppText>
      </View>

      {/* ── Progress bar at bottom ── */}
      <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: colors.accent.gold,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - spacing.md * 2,
    alignSelf: 'center',
    height: 200,
    borderRadius: radius.lg, // 16px — consistent sheet radius for hero
    overflow: 'hidden',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  bottomContent: {
    position: 'absolute',
    bottom: spacing.md + 8,
    left: spacing.md,
    right: spacing.md,
  },
  title: {
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
