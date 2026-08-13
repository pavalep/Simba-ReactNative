// ────────────────────────────────────────────────────────
// Simba Player — QueueScreen (Phase 48)
//
// Full-page queue view: Now Playing / Up Next / Previously
// Played sections, drag-to-reorder (PanResponder + Animated,
// no gesture libs), swipe-to-remove, tap-to-jump with
// cross-type player routing, media badges, save-as-playlist.
// ────────────────────────────────────────────────────────

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Animated,
  PanResponder,
  Modal,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {AppButton} from '../../components/core/AppButton/AppButton';
import {AppTextInput} from '../../components/core/AppTextInput/AppTextInput';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BackButton} from '../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {WaveformBars} from '../../components/feedback/WaveformBars/WaveformBars';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useHaptics} from '../../hooks/useHaptics';
import {useQueueScreen} from './useQueueScreen';
import type {QueueScreenProps} from '../../navigation/types';
import type {PlaylistEntry} from '../../store/slices/playerSlice';

// ─── Constants ──────────────────────────────────────────

const ROW_HEIGHT = 52;
const SWIPE_REMOVE_THRESHOLD = 80;
const SWIPE_REMOVE_DISTANCE = 140;

// ─── Helpers ────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Media badge (48.7: mixed queue rendering) ──────────

const MediaBadges: React.FC<{entry: PlaylistEntry}> = React.memo(({entry}) => {
  const {colors} = useTheme();
  const isVideo = entry.mediaType === 'video';
  const source = entry.source;
  if (!isVideo && !source) return null;
  return (
    <View style={styles.badgeRow}>
      {isVideo && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.background.floating,
              borderColor: colors.border.subtle,
            },
          ]}>
          <SvgIcon name="video" size={10} color={colors.text.secondary} />
          <AppText variant="caption" color="secondary" style={styles.badgeText}>
            VIDEO
          </AppText>
        </View>
      )}
      {source && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.background.floating,
              borderColor: colors.border.subtle,
            },
          ]}>
          <AppText
            variant="caption"
            color="tertiary"
            style={styles.badgeText}
            numberOfLines={1}>
            {source}
          </AppText>
        </View>
      )}
    </View>
  );
});

// ─── Now Playing row (48.3: WaveformBars highlight) ─────

const NowPlayingRow: React.FC<{entry: PlaylistEntry; isPlaying: boolean}> =
  React.memo(({entry, isPlaying}) => {
    const {colors} = useTheme();
    return (
      <View
        style={[
          styles.nowRow,
          {
            backgroundColor: colors.accent.goldDim,
            borderColor: colors.accent.gold,
          },
        ]}>
        <View style={styles.waveWrap}>
          <WaveformBars
            isPlaying={isPlaying}
            barCount={5}
            barWidth={3}
            height={16}
            gap={2}
          />
        </View>
        <View style={styles.rowInfo}>
          <AppText
            variant="body2"
            numberOfLines={1}
            style={{color: colors.accent.gold}}>
            {entry.title || 'Untitled'}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {formatDuration(entry.duration)}
          </AppText>
        </View>
        <MediaBadges entry={entry} />
      </View>
    );
  });

// ─── Up Next row: drag handle + swipe-to-remove (48.2) ──

interface DraggableRowProps {
  entry: PlaylistEntry;
  index: number;
  onJumpTo: (entry: PlaylistEntry) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

const DraggableQueueRow: React.FC<DraggableRowProps> = React.memo(
  ({entry, index, onJumpTo, onReorder, onRemove}) => {
    const {colors, spacing: s} = useTheme();
    const {heavy: hapticHeavy, medium: hapticMedium} = useHaptics();
    const [dragging, setDragging] = useState(false);
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const indexRef = useRef(index);
    indexRef.current = index;

    const rowStride = ROW_HEIGHT + s.xs;

    // Horizontal swipe → remove (row claims only when dx dominates, so
    // vertical scrolling of the list is never blocked).
    const swipeResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_, g) =>
            Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
          onPanResponderMove: (_, g) => {
            translateX.setValue(Math.min(0, g.dx));
          },
          onPanResponderRelease: (_, g) => {
            if (g.dx < -SWIPE_REMOVE_THRESHOLD) {
              Animated.timing(translateX, {
                toValue: -SWIPE_REMOVE_DISTANCE,
                duration: 120,
                useNativeDriver: true,
              }).start(() => onRemove(indexRef.current));
            } else {
              Animated.spring(translateX, {
                toValue: 0,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
              }).start();
            }
          },
        }),
      [translateX, onRemove],
    );

    // Vertical drag on the handle → reorder (lift & drop, haptic on drop).
    const dragResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_, g) =>
            Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
          onPanResponderGrant: () => {
            hapticHeavy();
            setDragging(true);
            Animated.spring(scale, {
              toValue: 1.02,
              friction: 8,
              tension: 100,
              useNativeDriver: true,
            }).start();
          },
          onPanResponderMove: (_, g) => {
            translateY.setValue(g.dy);
          },
          onPanResponderRelease: (_, g) => {
            const target = indexRef.current + Math.round(g.dy / rowStride);
            Animated.spring(translateY, {
              toValue: 0,
              friction: 8,
              tension: 100,
              useNativeDriver: true,
            }).start();
            Animated.spring(scale, {
              toValue: 1,
              friction: 8,
              tension: 100,
              useNativeDriver: true,
            }).start();
            setDragging(false);
            if (target !== indexRef.current) {
              hapticMedium();
              onReorder(indexRef.current, target);
            }
          },
          onPanResponderTerminate: () => {
            Animated.spring(translateY, {
              toValue: 0,
              friction: 8,
              tension: 100,
              useNativeDriver: true,
            }).start();
            Animated.spring(scale, {
              toValue: 1,
              friction: 8,
              tension: 100,
              useNativeDriver: true,
            }).start();
            setDragging(false);
          },
        }),
      [translateY, scale, rowStride, hapticHeavy, hapticMedium, onReorder],
    );

    return (
      <Animated.View
        style={[
          styles.rowWrap,
          dragging && styles.rowDragging,
          {
            transform: [{translateX}, {translateY}, {scale}],
            backgroundColor: colors.background.elevated,
            borderColor: colors.border.subtle,
          },
        ]}
        {...swipeResponder.panHandlers}>
        <View
          style={styles.rowInner}
          {...dragResponder.panHandlers}
          accessibilityRole="button"
          accessibilityLabel={`Reorder ${entry.title || 'Untitled'}`}
          accessibilityHint="Drag up or down to change the order in Up Next">
          <View style={styles.dragHandleTouch}>
            <SvgIcon name="list" size={18} color={colors.text.tertiary} />
          </View>
          <TouchableOpacity
            style={styles.rowInfo}
            activeOpacity={0.7}
            onPress={() => onJumpTo(entry)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${entry.title || 'Untitled'}`}>
            <AppText variant="body2" numberOfLines={1}>
              {entry.title || 'Untitled'}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {formatDuration(entry.duration)}
            </AppText>
          </TouchableOpacity>
          <MediaBadges entry={entry} />
          <TouchableOpacity
            onPress={() => onRemove(index)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${entry.title || 'Untitled'} from queue`}>
            <SvgIcon name="close" size={14} color={colors.semantic.error} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  },
);

// ─── Previously Played row ──────────────────────────────

interface HistoryRowProps {
  entry: PlaylistEntry;
  onJumpTo: (entry: PlaylistEntry) => void;
  onPlayNext: (entry: PlaylistEntry) => void;
  onAddToQueue: (entry: PlaylistEntry) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = React.memo(
  ({entry, onJumpTo, onPlayNext, onAddToQueue}) => {
    const {colors} = useTheme();
    return (
      <View
        style={[
          styles.rowWrap,
          {
            backgroundColor: colors.background.elevated,
            borderColor: colors.border.subtle,
          },
        ]}>
        <TouchableOpacity
          style={styles.rowInfo}
          activeOpacity={0.7}
          onPress={() => onJumpTo(entry)}
          accessibilityRole="button"
          accessibilityLabel={`Play ${entry.title || 'Untitled'}`}>
          <AppText variant="body2" numberOfLines={1}>
            {entry.title || 'Untitled'}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {formatDuration(entry.duration)}
          </AppText>
        </TouchableOpacity>
        <MediaBadges entry={entry} />
        <View style={styles.historyActions}>
          <TouchableOpacity
            onPress={() => onPlayNext(entry)}
            style={styles.historyActionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Play ${entry.title || 'Untitled'} next`}>
            <AppText
              variant="caption"
              style={[styles.playNextText, {color: colors.accent.gold}]}>
              Play Next
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onAddToQueue(entry)}
            style={styles.historyActionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Add ${entry.title || 'Untitled'} to queue`}>
            <SvgIcon name="listMusic" size={16} color={colors.accent.gold} />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────

type QueueSection = {
  key: string;
  title: string;
  data: PlaylistEntry[];
};

export const QueueScreen: React.FC<QueueScreenProps> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    currentTrack,
    upNext,
    history,
    isPlaying,
    hasContent,
    handleJumpTo,
    handleReorder,
    handleRemove,
    handlePlayNext,
    handleAddToQueue,
    handleSaveAsPlaylist,
  } = useQueueScreen();

  const [saveVisible, setSaveVisible] = useState(false);
  const [saveName, setSaveName] = useState('');

  const sections = useMemo<QueueSection[]>(() => {
    const result: QueueSection[] = [];
    if (currentTrack) {
      result.push({key: 'now', title: 'Now Playing', data: [currentTrack]});
    }
    if (upNext.length > 0) {
      result.push({key: 'upnext', title: `Up Next (${upNext.length})`, data: upNext});
    }
    if (history.length > 0) {
      result.push({
        key: 'history',
        title: `Previously Played (${history.length})`,
        data: history,
      });
    }
    return result;
  }, [currentTrack, upNext, history]);

  const renderSectionHeader = useCallback(
    ({section}: {section: QueueSection}) => (
      <View style={styles.sectionHeader}>
        <AppText variant="caption" color="tertiary" style={styles.sectionTitle}>
          {section.title}
        </AppText>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({item, index, section}: {item: PlaylistEntry; index: number; section: QueueSection}) => {
      if (section.key === 'now') {
        return <NowPlayingRow entry={item} isPlaying={isPlaying} />;
      }
      if (section.key === 'upnext') {
        return (
          <DraggableQueueRow
            entry={item}
            index={index}
            onJumpTo={handleJumpTo}
            onReorder={handleReorder}
            onRemove={handleRemove}
          />
        );
      }
      return (
        <HistoryRow
          entry={item}
          onJumpTo={handleJumpTo}
          onPlayNext={handlePlayNext}
          onAddToQueue={handleAddToQueue}
        />
      );
    },
    [isPlaying, handleJumpTo, handleReorder, handleRemove, handlePlayNext, handleAddToQueue],
  );

  const listEmptyComponent = useMemo(
    () => (
      <EmptyState
        icon="listMusic"
        title="Nothing in the queue"
        description="Play something and add tracks to your queue — they will show up here."
        actionLabel="Go back"
        onAction={() => navigation.goBack()}
      />
    ),
    [navigation],
  );

  const submitSave = useCallback(() => {
    if (handleSaveAsPlaylist(saveName)) {
      setSaveVisible(false);
      setSaveName('');
    }
  }, [handleSaveAsPlaylist, saveName]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header (48.1) ── */}
      <View style={styles.header}>
        <BackButton />
        <AppText
          variant="displaySans"
          color="primary"
          style={styles.headerTitle}
          numberOfLines={1}>
          Queue
        </AppText>
        <TouchableOpacity
          style={[styles.saveBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => setSaveVisible(true)}
          activeOpacity={0.7}
          disabled={upNext.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Save queue as playlist"
          accessibilityHint={`${upNext.length} tracks will be saved`}>
          <SvgIcon
            name="bookmark"
            size={18}
            color={upNext.length > 0 ? colors.accent.gold : colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Sections (48.4) ── */}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.uri}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={hasContent ? null : listEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: insets.bottom + 40},
        ]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        windowSize={5}
        maxToRenderPerBatch={10}
      />

      {/* ── Save-as-playlist dialog (48.5) ── */}
      <Modal
        visible={saveVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveVisible(false)}>
        <View style={[styles.modalOverlay, {backgroundColor: colors.background.scrim}]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
            ]}>
            <AppText variant="h3" color="primary">
              Save Queue as Playlist
            </AppText>
            <AppText variant="caption" color="tertiary" style={styles.modalHint}>
              {upNext.length} {upNext.length === 1 ? 'track' : 'tracks'} will be
              saved to your library
            </AppText>
            <AppTextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder="My queue"
              label="Playlist name"
              autoFocus
              maxLength={60}
              onSubmitEditing={submitSave}
            />
            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="text"
                onPress={() => setSaveVisible(false)}
                style={styles.modalBtn}
              />
              <AppButton
                title="Save"
                onPress={submitSave}
                disabled={!saveName.trim()}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing.md,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  rowDragging: {
    zIndex: 10,
    elevation: 8,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandleTouch: {
    padding: 8,
    marginRight: spacing.xs,
  },
  rowInfo: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  removeBtn: {
    padding: 8,
    marginLeft: spacing.xs,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  waveWrap: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: spacing.xs,
  },
  historyActionBtn: {
    padding: 8,
  },
  playNextText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
