import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';

interface ContinueWatchingHeroProps {
  item: {
    title: string;
    fileUri: string;
    position: number;
    duration: number;
    mediaType: string;
    thumbnailPath?: string;
  };
  onPress: (item: any) => void;
}

export const ContinueWatchingHero: React.FC<ContinueWatchingHeroProps> = ({
  item,
  onPress,
}) => {
  const {colors, shadows} = useTheme();
  const progress = item.duration > 0 ? item.position / item.duration : 0;
  const progressPct = Math.round(progress * 100);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={[
        styles.card,
        shadows.sm,
        {backgroundColor: colors.background.elevated},
      ]}>
      {/* ── Left: Info ── */}
      <View style={styles.infoSection}>
        <AppText variant="h3" numberOfLines={1} style={styles.title}>
          {item.title}
        </AppText>

        <AppText variant="bodySmall" color="secondary" style={styles.resumeText}>
          Continue watching — Resume at {formatTime(item.position)}
        </AppText>

        {/* Thin gold progress bar */}
        <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, progressPct)}%`,
                backgroundColor: colors.accent.gold,
              },
            ]}
          />
        </View>
      </View>

      {/* ── Right: Circular progress indicator ── */}
      <View style={styles.circleSection}>
        <View style={[styles.circleOuter, {borderColor: colors.border.subtle}]}>
          <View
            style={[
              styles.circleProgress,
              {
                borderColor: colors.accent.gold,
                borderWidth: 3,
              },
            ]}
          />
          <View style={styles.circleInner}>
            <AppText variant="caption" color="accent">
              {progressPct}%
            </AppText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoSection: {
    flex: 1,
    marginRight: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  resumeText: {
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  circleSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgress: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  circleInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
  },
});
