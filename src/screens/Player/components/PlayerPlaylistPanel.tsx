import React, {useCallback, useMemo, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  PanResponder,
  Animated,
} from 'react-native';
import type {PanResponderGestureState} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface PlaylistEntry {
  fileUri: string;
  title: string;
  duration: number;
}

export interface PlayerPlaylistPanelProps {
  playlist: PlaylistEntry[];
  currentIndex: number;
  onPlayFromPlaylist: (index: number) => void;
  onRemoveFromPlaylist: (index: number) => void;
  onClearPlaylist: () => void;
  onAddToPlaylist: () => void;
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────

export const PlayerPlaylistPanel: React.FC<PlayerPlaylistPanelProps> = ({
  playlist,
  currentIndex,
  onPlayFromPlaylist,
  onRemoveFromPlaylist,
  onClearPlaylist,
  onAddToPlaylist,
  onClose,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 50,
          justifyContent: 'flex-end',
        },
        panel: {
          backgroundColor: colors.background.elevated,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          paddingBottom: spacing.xxl,
          maxHeight: '70%',
        },
        handleRow: {
          alignItems: 'center',
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        handle: {
          width: 16,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border.emphasis,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        headerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        clearBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
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

  // ─── SwipeableRow ────────────────────────────────────────────

  const SwipeableRow: React.FC<{
    children: React.ReactNode;
    onRemove: () => void;
  }> = ({children, onRemove}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const SWIPE_THRESHOLD = 80;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture: PanResponderGestureState) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture: PanResponderGestureState) => {
          translateX.setValue(Math.max(-120, Math.min(0, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture: PanResponderGestureState) => {
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
      <View style={{overflow: 'hidden'}}>
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 100,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <TouchableOpacity
            onPress={handleRemovePress}
            style={{
              backgroundColor: '#CF4444',
              borderRadius: 6,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}>
            <AppText variant="body2" color="primary" style={{fontWeight: '600'}}>
              Remove
            </AppText>
          </TouchableOpacity>
        </View>
        <Animated.View
          style={{transform: [{translateX}]}}
          {...panResponder.panHandlers}>
          {children}
        </Animated.View>
      </View>
    );
  };

  const isEmpty = playlist.length === 0;

  return (
    <SafeAreaView style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.panel}>
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AppText variant="h3" color="primary">
              Playlist
            </AppText>
            {!isEmpty && (
              <AppText variant="caption" color="tertiary">
                {playlist.length} item{playlist.length !== 1 ? 's' : ''}
              </AppText>
            )}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <AppText variant="body1" color="secondary">
              ✕
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Add to Playlist button */}
          <TouchableOpacity style={styles.addBtn} onPress={onAddToPlaylist}>
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
              {/* Playlist entries */}
              {playlist.map((entry, index) => {
                const isCurrent = index === currentIndex;
                return (
                  <SwipeableRow
                    key={`${entry.fileUri}-${index}`}
                    onRemove={() => onRemoveFromPlaylist(index)}>
                    <TouchableOpacity
                      style={styles.entryRow}
                      onPress={() => onPlayFromPlaylist(index)}>
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
                        onPress={() => onRemoveFromPlaylist(index)}>
                        <AppText variant="caption" color="secondary">
                          ✕
                        </AppText>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </SwipeableRow>
                );
              })}

              {/* Clear all button */}
              <TouchableOpacity
                style={styles.clearAllBtn}
                onPress={onClearPlaylist}>
                <AppText variant="body2" color="error">
                  Clear All
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
