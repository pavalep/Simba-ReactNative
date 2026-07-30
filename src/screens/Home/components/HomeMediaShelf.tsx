import React from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
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

interface MediaItem {
  fileUri: string;
  title: string;
  mediaType?: string;
  thumbnailPath?: string;
  position?: number;
  duration?: number;
}

interface HomeMediaShelfProps {
  title: string;
  items: MediaItem[];
  onItemPress: (item: MediaItem) => void;
  onSeeAll?: () => void;
  maxItems?: number;
}

export const HomeMediaShelf: React.FC<HomeMediaShelfProps> = ({
  title,
  items,
  onItemPress,
  onSeeAll,
  maxItems = 8,
}: HomeMediaShelfProps) => {
  const {colors} = useTheme();

  if (items.length === 0) return null;

  const displayItems = items.slice(0, maxItems);

  return (
    <View style={styles.container}>
      {/* ── Section header ── */}
      <View style={styles.header}>
        <AppText variant="h3" color="primary" style={styles.headerTitle}>
          {title}
        </AppText>
        <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn} onPress={onSeeAll}>
          <AppText variant="overline" color="accent" style={styles.seeAllText}>
            VIEW ALL
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ── Horizontal Shelf ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelfContent}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast">
        {displayItems.map(item => {
          const progress = item.duration && item.position ? Math.min(100, (item.position / item.duration) * 100) : 0;
          
          return (
            <TouchableOpacity
              key={item.fileUri}
              activeOpacity={0.85}
              onPress={() => onItemPress(item)}
              style={styles.card}>
              <View style={[styles.thumbnailContainer, {backgroundColor: colors.background.elevated}]}>
                {item.thumbnailPath ? (
                  <FastImage
                    source={{uri: item.thumbnailPath}}
                    style={StyleSheet.absoluteFill}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <SvgIcon
                      name={item.mediaType === 'audio' ? 'music' : 'video'}
                      size={24}
                      color={colors.text.tertiary}
                    />
                  </View>
                )}

                {/* Media type badge */}
                <View style={styles.typeBadge}>
                  <SvgIcon
                    name={item.mediaType === 'audio' ? 'music' : 'video'}
                    size={12}
                    color="#fff"
                  />
                </View>

                {/* Premium Gradient Overlay */}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
                  style={styles.overlayGradient}
                />

                {/* Bottom Semi-Transparent Strip */}
                <View style={styles.bottomStrip}>
                  <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.6)'}]} />
                  <View style={styles.overlayContent}>
                    <AppText variant="bodySmall" numberOfLines={1} style={styles.cardTitleOverlay}>
                      {item.title}
                    </AppText>
                    {item.duration ? (
                      <AppText variant="caption" style={styles.cardTimeOverlay}>
                        {formatTime(item.position || 0)} / {formatTime(item.duration)}
                      </AppText>
                    ) : null}
                  </View>
                </View>

                {/* Progress bar if in progress */}
                {progress > 0 && (
                  <View style={[styles.progressBarTrack, {backgroundColor: 'rgba(255,255,255,0.15)'}]}>
                    <View style={[styles.progressBarFill, {width: `${progress}%`, backgroundColor: colors.accent.gold}]} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const CARD_WIDTH = 160;
const THUMB_HEIGHT = 90; // Precise 16:9

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: radius.lg,
    marginHorizontal: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  seeAllBtn: {
    paddingBottom: 2,
  },
  seeAllText: {
    letterSpacing: 1,
    fontWeight: '700',
  },
  shelfContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: '100%',
    height: THUMB_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  bottomStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  overlayContent: {
    padding: spacing.sm,
    paddingBottom: spacing.xs + 4,
  },
  cardTitleOverlay: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
    marginBottom: 2,
  },
  cardTimeOverlay: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 3,
  },
  progressBarFill: {
    height: '100%',
  },
});
