import React from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
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

  if (!item) return null;

  const progress =
    item.duration > 0
      ? Math.min(100, (item.position / item.duration) * 100)
      : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(item)}
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
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glassOverlay}>
        <View style={[styles.glassBorder, {backgroundColor: 'rgba(255,255,255,0.05)'}]} />
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.badge, {backgroundColor: colors.accent.gold}]}>
            <AppText variant="caption" style={styles.badgeText}>
              {item.mediaType === 'audio' ? 'AUDIO' : 'VIDEO'}
            </AppText>
          </View>
          <View style={[styles.badge, {backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: spacing.xs}]}>
            <AppText variant="caption" style={styles.badgeText}>
              FEATURED
            </AppText>
          </View>
        </View>

        <AppText
          variant="h1"
          style={styles.title}
          numberOfLines={2}>
          {item.title}
        </AppText>

        <View style={styles.playRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress(item)}
            style={[styles.playButton, {backgroundColor: colors.accent.gold}]}>
            <SvgIcon name="play" size={16} color="#000" />
            <AppText variant="body2" style={styles.playText}>Resume Playback</AppText>
          </TouchableOpacity>
          
          {item.duration > 0 && (
            <View style={styles.timeIndicator}>
              <AppText variant="caption" style={styles.timeText}>
                {formatTime(item.position)} / {formatTime(item.duration)}
              </AppText>
            </View>
          )}
        </View>
      </View>

      {/* ── Progress bar at bottom ── */}
      <View style={[styles.progressTrack, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
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
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  title: {
    color: '#fff',
    marginBottom: spacing.md,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 8,
  },
  timeIndicator: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  playText: {
    color: '#000',
    fontWeight: '700',
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
