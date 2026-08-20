import React, {useCallback, useMemo, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  PanResponder,
  Animated,
} from 'react-native';
import type {PanResponderGestureState} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useTheme} from '../../../../theme';
import {useAccessibility} from '../../../../hooks/useAccessibility';
import {spacing, radius} from '../../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface PlaylistEntry {
  fileUri: string;
  title: string;
  duration: number;
}

export interface VideoPlayerPlaylistPanelProps {
  playlist: PlaylistEntry[];
  currentIndex: number;
  onPlayFromPlaylist: (index: number) => void;
  onRemoveFromPlaylist: (index: number) => void;
  onClearPlaylist: () => void;
  onAddToPlaylist: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── SwipeableRow ────────────────────────────────────────────

const SwipeableRow: React.FC<{
  children: React.ReactNode;
  onRemove: () => void;
}> = ({children, onRemove}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const translateX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 80;

  const swipeStyles = useMemo(
    () =>
      StyleSheet.create({
        overflowHidden: {
          overflow: 'hidden',
        },
        swipeAction: {
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 100,
          justifyContent: 'center',
          alignItems: 'center',
        },
        removeBtn: {
          backgroundColor: colors.semantic.error,
          borderRadius: 6,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        removeLabel: {
          fontWeight: '600',
        },
        animatedRow: {
          transform: [{translateX}],
        },
      }),
    [colors, translateX],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture: PanResponderGestureState) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture: PanResponderGestureState) => {
        translateX.setValue(Math.max(-120, Math.min(0, gesture.dx)));
      },
      onPanResponderRelease: (_, gesture: PanResponderGestureState) => {
        // 59.7: reduced motion — snap with a short timing, no spring bounce
        if (reduceMotionRef.current) {
          Animated.timing(translateX, {
            toValue: gesture.dx < -SWIPE_THRESHOLD ? -100 : 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
          return;
        }
        if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -100,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleRemovePress = useCallback(() => {
    onRemove();
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [onRemove, translateX]);

  return (
    <View style={swipeStyles.overflowHidden}>
      <View style={swipeStyles.swipeAction}>
        <TouchableOpacity
          onPress={handleRemovePress}
          style={swipeStyles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel="Remove from playlist">
          <AppText variant="body2" color="primary" style={swipeStyles.removeLabel}>
            Remove
          </AppText>
        </TouchableOpacity>
      </View>
      <Animated.View style={swipeStyles.animatedRow} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerPlaylistPanel: React.FC<VideoPlayerPlaylistPanelProps> = React.memo(({
  playlist,
  currentIndex,
  onPlayFromPlaylist,
  onRemoveFromPlaylist,
  onClearPlaylist,
  onAddToPlaylist,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingHorizontal: spacing.lg,
        },
        // ── Add button ──
        addBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md,
          marginBottom: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.accent.goldDim,
        },
        addBtnIcon: {
          marginRight: spacing.sm,
        },
        // ── Entry row ──
        entryRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
        },
        entryIndex: {
          width: 24,
          textAlign: 'center',
        },
        entryInfo: {
          flex: 1,
          marginHorizontal: spacing.md,
        },
        entryDuration: {
          marginRight: spacing.sm,
        },
        removeBtn: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        divider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginVertical: spacing.xs,
        },
        // ── Empty state ──
        emptyState: {
          alignItems: 'center',
          paddingVertical: spacing.xxxl,
        },
        // ── Clear all ──
        clearAllBtn: {
          alignItems: 'center',
          paddingVertical: spacing.md,
          marginTop: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.border.subtle,
        },
      }),
    [colors],
  );

  const isEmpty = playlist.length === 0;

  return (
    <ScrollView
      style={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* Add to Playlist button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={onAddToPlaylist}
        accessibilityRole="button">
        <AppText
          variant="body2"
          color="accent"
          style={styles.addBtnIcon}>
          +
        </AppText>
        <AppText variant="body2" color="accent">
          Add to Playlist
        </AppText>
      </TouchableOpacity>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <AppText variant="body2" color="tertiary">
            Playlist is empty
          </AppText>
        </View>
      ) : (
        <>
          {/* 59.1: virtualized playlist entries */}
          <FlatList
            data={playlist}
            keyExtractor={(entry, index) => `${entry.fileUri}-${index}`}
            renderItem={({item: entry, index}) => {
              const isCurrent = index === currentIndex;
              return (
                <SwipeableRow onRemove={() => onRemoveFromPlaylist(index)}>
                  <TouchableOpacity
                    style={styles.entryRow}
                    onPress={() => onPlayFromPlaylist(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${entry.title}`}
                    accessibilityState={{selected: isCurrent}}>
                    <AppText
                      variant="caption"
                      color="tertiary"
                      style={styles.entryIndex}>
                      {index + 1}
                    </AppText>
                    <View style={styles.entryInfo}>
                      <AppText
                        variant="body2"
                        color={isCurrent ? 'accent' : 'primary'}
                        numberOfLines={1}>
                        {entry.title}
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.entryDuration}>
                      {formatDuration(entry.duration)}
                    </AppText>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => onRemoveFromPlaylist(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${entry.title} from playlist`}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <AppText variant="caption" color="secondary">
                        ✕
                      </AppText>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </SwipeableRow>
              );
            }}
            scrollEnabled={false}
            initialNumToRender={playlist.length}
          />

          {/* Clear all button */}
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={onClearPlaylist}
            accessibilityRole="button"
            accessibilityLabel="Clear playlist">
            <AppText variant="body2" color="error">
              Clear All
            </AppText>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
});
