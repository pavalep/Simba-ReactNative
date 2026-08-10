import React, {useCallback, useState} from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {EmptyState} from '../../../components/utility/EmptyState/EmptyState';

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
  /**
   * P55: when the shelf is empty, show the premium empty-state (gold
   * disc + title + body). Defaults to "Nothing here yet" for the
   * Recently Played rail.
   */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: 'video' | 'music' | 'headphones' | 'bookmark' | 'list' | 'search' | 'play' | 'folder';
  /** Optional CTA inside the empty state. */
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export const HomeMediaShelf: React.FC<HomeMediaShelfProps> = ({
  title,
  items,
  onItemPress,
  onSeeAll,
  maxItems = 8,
  emptyTitle = 'Nothing Played Yet',
  emptyDescription = 'Files you open will appear here — start playing something to see it show up.',
  emptyIcon = 'video',
  emptyActionLabel,
  onEmptyAction,
}: HomeMediaShelfProps) => {
  const {colors} = useTheme();

  // P58: rail owns its own collapse state — no persistence.
  // Default: collapsed when empty, expanded when has data. The user
  // can flip either way with the chevron. State is in-memory only
  // and resets on every mount.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const displayItems = items.slice(0, maxItems);
  const hasData = displayItems.length > 0;
  const collapsed = userCollapsed ?? !hasData;
  const onToggleCollapsed = useCallback(() => {
    setUserCollapsed(prev => (prev ?? !hasData) ? false : true);
  }, [hasData]);
  const showBody = !collapsed;

  return (
    <View style={styles.container}>
      {/* ── Section header — always present, with chevron ── */}
      <View style={styles.header}>
        <AppText variant="h2" color="primary" style={styles.headerTitle}>
          {title}
        </AppText>
        <View style={styles.headerActions}>
          {items.length > 1 && onSeeAll ? (
            <TouchableOpacity activeOpacity={0.7} style={styles.seeAllBtn} onPress={onSeeAll} accessibilityRole="button">
              <AppText variant="caption" color="accent">
                See All
              </AppText>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onToggleCollapsed}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand section' : 'Collapse section'}
            style={styles.chevronBtn}>
            <SvgIcon
              name="chevronDown"
              size={18}
              color={colors.text.tertiary}
              style={collapsed ? styles.chevronUp : styles.chevronDown}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Body: empty state OR data list ── */}
      {showBody && !hasData ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          variant="compact"
        />
      ) : null}

      {showBody && hasData ? (
        <FlatList
          horizontal
          data={displayItems}
          keyExtractor={item => item.fileUri}
          renderItem={({item}) => {
            const progress = item.duration && item.position ? Math.min(100, (item.position / item.duration) * 100) : 0;

            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onItemPress(item)}
                accessibilityRole="button"
                style={[styles.card, {shadowColor: colors.shadow}]}>
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
                  <View style={[styles.typeBadge, {backgroundColor: colors.background.scrim}]}>
                    <SvgIcon
                      name={item.mediaType === 'audio' ? 'music' : 'video'}
                      size={12}
                      color={colors.text.bright}
                    />
                  </View>

                  {/* Premium Gradient Overlay */}
                  <LinearGradient
                    colors={['transparent', colors.background.scrimSoft, colors.background.scrim]}
                    style={styles.overlayGradient}
                  />

                  {/* Bottom Semi-Transparent Strip */}
                  <View style={styles.bottomStrip}>
                    <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.background.scrim}]} />
                    <View style={styles.overlayContent}>
                      <AppText
                        variant="bodySmall"
                        numberOfLines={1}
                        style={[
                          styles.cardTitleOverlay,
                          {
                            color: colors.text.bright,
                            textShadowColor: colors.background.scrimMid,
                          },
                        ]}>
                        {item.title}
                      </AppText>
                      {item.duration ? (
                        <AppText
                          variant="caption"
                          style={[
                            styles.cardTimeOverlay,
                            {
                              color: colors.text.onMediaSoft,
                              textShadowColor: colors.background.scrim,
                            },
                          ]}>
                          {formatTime(item.position || 0)} / {formatTime(item.duration)}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  {/* Progress bar if in progress */}
                  {progress > 0 && (
                    <View style={[styles.progressBarTrack, {backgroundColor: colors.background.highlightStrong}]}>
                      <View style={[styles.progressBarFill, {width: `${progress}%`, backgroundColor: colors.accent.gold}]} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.shelfContent}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + spacing.md}
          decelerationRate="fast"
          initialNumToRender={displayItems.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      ) : null}
    </View>
  );
};

const CARD_WIDTH = 160;
const THUMB_HEIGHT = 90; // Precise 16:9

const styles = StyleSheet.create({
  container: {
    // P58: no card chrome — matches the other Your Library rails
    // (Bookmarks / Followed Podcasts). The horizontal shelf and
    // empty-state body carry their own internal padding.
    marginBottom: spacing.xxl,
  },
  header: {
    // P58: match the other two Your Library rails (Bookmarks /
    // Followed Podcasts) — title left, action + chevron right,
    // vertical-center alignment, same horizontal padding.
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  seeAllBtn: {
    paddingVertical: spacing.xs,
  },
  // P56: chevron toggle lives next to the See All link in the header.
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chevronBtn: {
    padding: spacing.xs,
  },
  chevronDown: {
    transform: [{rotate: '0deg'}],
  },
  chevronUp: {
    transform: [{rotate: '180deg'}],
  },
  shelfContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: spacing.md,
    elevation: 4,
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
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
    marginBottom: 2,
  },
  cardTimeOverlay: {
    fontSize: 10,
    fontWeight: '600',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
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
