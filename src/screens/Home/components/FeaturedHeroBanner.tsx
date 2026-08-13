import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import type {ColorTokens} from '../../../theme/tokens';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';

// ── Helpers ──

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CIRCLE_SIZE = 72;
const STROKE_WIDTH = 4;
const CIRCLE_RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

interface FeaturedItem {
  title: string;
  fileUri: string;
  position: number;
  duration: number;
  mediaType?: string;
  thumbnailPath?: string;
}

interface FeaturedHeroBannerProps {
  item: FeaturedItem | null;
  onPress: (item: FeaturedItem) => void;
}

export const FeaturedHeroBanner: React.FC<FeaturedHeroBannerProps> = ({
  item,
  onPress,
}) => {
  const {colors, shadows} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!item) return null;

  const progress =
    item.duration > 0
      ? Math.min(1, item.position / item.duration)
      : 0;
  const progressOffset = CIRCLE_CIRCUMFERENCE * (1 - progress); // eslint-disable-line @typescript-eslint/no-unused-vars

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      style={[
        styles.card,
        shadows.md,
        {
          backgroundColor: colors.background.elevated,
        },
      ]}>
      {/* ── Background Thumbnail ── */}
      {item.thumbnailPath ? (
        <FastImage
          source={{uri: item.thumbnailPath}}
          style={StyleSheet.absoluteFill}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.background.elevated, alignItems: 'center', justifyContent: 'center'}]}>
          <SvgIcon name="lion" size={64} color={colors.accent.goldDim} style={{opacity: 0.2}} />
        </View>
      )}

      {/* ── Overlays ── */}
      <LinearGradient
        colors={[
          colors.background.scrimFaint,
          colors.background.scrimDim,
          colors.background.scrimOpaque,
        ]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glassOverlay}>
        <View style={[styles.glassBorder, {backgroundColor: colors.background.highlightDim}]} />
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.badge, {backgroundColor: colors.accent.gold}]}>
            <AppText variant="caption" style={styles.badgeText}>
              {item.mediaType === 'audio' ? 'AUDIO' : 'VIDEO'}
            </AppText>
          </View>
          <View style={[styles.badge, {backgroundColor: colors.background.highlightStrong, marginLeft: spacing.xs}]}>
            <AppText variant="caption" style={styles.badgeText}>
              CONTINUE
            </AppText>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.textBlock}>
            <AppText
              variant="h1"
              style={styles.title}
              numberOfLines={2}>
              {item.title}
            </AppText>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPress(item)}
              accessibilityRole="button"
              style={[styles.playButton, {backgroundColor: colors.accent.gold}]}>
              <SvgIcon name="play" size={16} color={colors.text.inverse} />
              <AppText variant="body2" style={styles.playText}>Resume</AppText>
            </TouchableOpacity>
          </View>

          {/* ── Circular Progress Ring ── */}
          <View style={styles.progressRingContainer}>
            <View style={[styles.progressRingBg, {borderColor: colors.background.highlightStrong}]}>
              <SvgIcon name="play" size={24} color={colors.text.bright} />
            </View>
            <View style={[styles.progressRingTrack, {borderColor: colors.accent.gold}]} />
            {item.duration > 0 && (
              <View style={styles.progressTimeContainer}>
                <AppText variant="caption" style={styles.progressTime}>
                  {formatTime(item.position)} / {formatTime(item.duration)}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Progress bar at bottom ── */}
      <View style={[styles.progressTrack, {backgroundColor: colors.background.highlightStrong}]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: colors.accent.gold,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - spacing.md * 2,
    alignSelf: 'center',
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 1,
  },
  glassBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  topRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    // v8: explicit Inter Bold via family key. See
    // Toast.tsx actionLabel comment.
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 10,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    color: colors.text.bright,
    marginBottom: spacing.md,
    textShadowColor: colors.background.scrim,
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 8,
  },
  playText: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  progressRingBg: {
    width: CIRCLE_SIZE - STROKE_WIDTH,
    height: CIRCLE_SIZE - STROKE_WIDTH,
    borderRadius: (CIRCLE_SIZE - STROKE_WIDTH) / 2,
    borderWidth: STROKE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingTrack: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{rotateZ: '-90deg'}],
  },
  progressTimeContainer: {
    position: 'absolute',
    bottom: -18,
  },
  progressTime: {
    color: colors.text.onMediaMuted,
    fontSize: 9,
    fontWeight: '600',
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
  },
  });
