// ────────────────────────────────────────────────────────
// Simba Player — QueueScreen (Phase 48)
//
// Full-page queue view: Now Playing / Up Next / Previously
// Played sections, drag-to-reorder (PanResponder + Animated,
// no gesture libs), swipe-to-remove, tap-to-jump with
// cross-type player routing, media badges, save-as-playlist.
//
// WAVE B16 (Wave D):
//
//   - B15-Q8 — the explicit queue and the RUN are TWO sections now.
//     They were one "Up Next" list with two different origins and no
//     way to tell them apart.
//
//   - B15-Q2 — the section's own actions: Shuffle and Clear. Both act
//     on the EXPLICIT QUEUE only, and Clear asks first.
//
//   - B15-Q5 — the jump goes through the launch seam (the hook owns
//     that), so "Now Playing" can no longer go stale.
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
import {SafeAreaView} from 'react-native-safe-area-context';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppButton} from '../../../components/core/AppButton/AppButton';
import {AppTextInput} from '../../../components/core/AppTextInput/AppTextInput';
import {useConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../../components/feedback/Toast';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {WaveformBars} from '../../../components/feedback/WaveformBars/WaveformBars';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {useHaptics} from '../../../hooks/useHaptics';
import {
  useQueueScreen,
  withRowKeys,
  type QueueRow,
} from '../hooks/useQueueScreen';
import type {QueueScreenProps} from '../types';

// ─── Constants ──────────────────────────────────────────

const ROW_HEIGHT = 52;
const SWIPE_REMOVE_THRESHOLD = 80;
const SWIPE_REMOVE_DISTANCE = 140;

/**
 * Which list a row belongs to.
 *
 * The two origins are separate sections (B15-Q8), so a row knows which
 * list it is in — and the words it uses ("the queue", "this list") are
 * the ones that match what the user sees.
 */
type RowOrigin = 'queue' | 'playlist';

const ORIGIN_WORDS: Record<RowOrigin, {list: string; order: string}> = {
  queue: {list: 'the queue', order: 'Up Next'},
  playlist: {list: 'this list', order: 'this list'},
};

// ─── Helpers ────────────────────────────────────────────


function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Media badge (48.7: cross-lane queue rendering) ──────────

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
  origin: RowOrigin;
  onJumpTo: (entry: PlaylistEntry, origin: RowOrigin, index: number) => void;
  onReorder: (origin: RowOrigin, from: number, to: number) => void;
  onRemove: (origin: RowOrigin, index: number) => void;
}

const DraggableQueueRow: React.FC<DraggableRowProps> = React.memo(
  ({entry, index, origin, onJumpTo, onReorder, onRemove}) => {
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
              }).start(() => onRemove(origin, indexRef.current));
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
      [translateX, onRemove, origin],
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
              onReorder(origin, indexRef.current, target);
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
      [translateY, scale, rowStride, hapticHeavy, hapticMedium, onReorder, origin],
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
          accessibilityHint={`Drag up or down to change the order in ${ORIGIN_WORDS[origin].order}`}>
          <View style={styles.dragHandleTouch}>
            <SvgIcon name="list" size={18} color={colors.text.tertiary} />
          </View>
          <TouchableOpacity
            style={styles.rowInfo}
            activeOpacity={0.7}
            onPress={() => onJumpTo(entry, origin, index)}
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
            onPress={() => onRemove(origin, index)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${entry.title || 'Untitled'} from ${ORIGIN_WORDS[origin].list}`}>
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
  index: number;
  onJumpTo: (entry: PlaylistEntry, origin: 'history', index: number) => void;
  onPlayNext: (entry: PlaylistEntry) => void;
  onAddToQueue: (entry: PlaylistEntry) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = React.memo(
  ({entry, index, onJumpTo, onPlayNext, onAddToQueue}) => {
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
          onPress={() => onJumpTo(entry, 'history', index)}
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
  data: QueueRow[];
};

export const QueueScreen: React.FC<QueueScreenProps> = ({navigation}) => {
  const {colors} = useTheme();
  const bottomChromeInset = useBottomChromeInset();
  const toast = useToast();
  const {confirm, dialog} = useConfirmDialog();
  const {
    currentTrack,
    queueRows,
    runRows,
    upNext,
    history,
    isPlaying,
    hasContent,
    handleJumpTo,
    handleReorder,
    handleRemove,
    handlePlayNext,
    handleAddToQueue,
    handleClearQueue,
    handleShuffleQueue,
    canShuffleQueue,
    handleSaveAsPlaylist,
    saveAsPlaylistBlockReason,
  } = useQueueScreen();

  const [saveVisible, setSaveVisible] = useState(false);
  const [saveName, setSaveName] = useState('');

  /**
   * The two lists are two sections (B15-Q8).
   *
   * "Up Next" is the EXPLICIT queue — the tracks the user queued. "Next
   * in this list" is the RUN's tail — the rest of the album or playlist
   * they launched.
   *
   * The run has NO name anywhere in the app (`PlayerState` carries no
   * playlist title), so the second heading is deliberately neutral: it
   * says what the rows ARE without inventing a name for the list.
   */
  const sections = useMemo<QueueSection[]>(() => {
    const result: QueueSection[] = [];
    if (currentTrack) {
      result.push({
        key: 'now',
        title: 'Now Playing',
        data: withRowKeys([currentTrack]),
      });
    }
    if (queueRows.length > 0) {
      result.push({
        key: 'upnext',
        title: `Up Next (${queueRows.length})`,
        data: withRowKeys(queueRows),
      });
    }
    if (runRows.length > 0) {
      result.push({
        key: 'run',
        title: `Next in this list (${runRows.length})`,
        data: withRowKeys(runRows),
      });
    }
    if (history.length > 0) {
      result.push({
        key: 'history',
        title: `Previously Played (${history.length})`,
        data: withRowKeys(history),
      });
    }
    return result;
  }, [currentTrack, queueRows, runRows, history]);

  /**
   * "Clear queue" is destructive, so it asks first.
   *
   * It clears the EXPLICIT queue only — the album the user is listening
   * to keeps playing, and the run's tail is untouched. The reason is on
   * screen before the action happens, not after.
   */
  const onClearQueue = useCallback(async () => {
    const ok = await confirm({
      title: 'Clear the queue?',
      message:
        'The tracks you queued will be removed. What is playing keeps playing.',
      confirmLabel: 'Clear',
      destructive: true,
    });
    if (!ok) return;
    handleClearQueue();
    toast.show('Queue cleared');
  }, [confirm, handleClearQueue, toast]);

  const renderSectionHeader = useCallback(
    ({section}: {section: QueueSection}) => (
      <View style={styles.sectionHeader}>
        <AppText variant="caption" color="tertiary" style={styles.sectionTitle}>
          {section.title}
        </AppText>
        {section.key === 'upnext' && (
          <View style={styles.sectionActions}>
            {canShuffleQueue && (
              <TouchableOpacity
                onPress={handleShuffleQueue}
                style={styles.sectionAction}
                accessibilityRole="button"
                accessibilityLabel="Shuffle the queued tracks">
                <AppText variant="caption" color="secondary">
                  Shuffle
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClearQueue}
              style={styles.sectionAction}
              accessibilityRole="button"
              accessibilityLabel="Clear the queued tracks">
              <AppText variant="caption" color="error">
                Clear
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [canShuffleQueue, handleShuffleQueue, onClearQueue],
  );

  const renderItem = useCallback(
    ({item, index, section}: {item: QueueRow; index: number; section: QueueSection}) => {
      if (section.key === 'now') {
        return <NowPlayingRow entry={item} isPlaying={isPlaying} />;
      }
      if (section.key === 'upnext') {
        return (
          <DraggableQueueRow
            entry={item}
            index={index}
            origin="queue"
            onJumpTo={handleJumpTo}
            onReorder={handleReorder}
            onRemove={handleRemove}
          />
        );
      }
      if (section.key === 'run') {
        return (
          <DraggableQueueRow
            entry={item}
            index={index}
            origin="playlist"
            onJumpTo={handleJumpTo}
            onReorder={handleReorder}
            onRemove={handleRemove}
          />
        );
      }
      return (
        <HistoryRow
          entry={item}
          index={index}
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
        keyExtractor={item => item.rowKey}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={hasContent ? null : listEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset},
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
            <AppText
              variant="caption"
              color={saveAsPlaylistBlockReason ? 'error' : 'tertiary'}
              style={styles.modalHint}>
              {saveAsPlaylistBlockReason
                ? saveAsPlaylistBlockReason
                : `${upNext.length} ${
                    upNext.length === 1 ? 'track' : 'tracks'
                  } will be saved to your library`}
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
                disabled={!saveName.trim() || !!saveAsPlaylistBlockReason}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── "Clear queue" confirmation ── */}
      {dialog}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    // 600 lives in the family key ('Inter' + 600 opens the 400 Regular).
    fontFamily: FONT_FAMILY.inter.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionAction: {
    // The 44 dp floor (B13-6): a text action is still a touch target.
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    // 600 lives in the family key ('Inter' + 600 opens the 400 Regular).
    fontFamily: FONT_FAMILY.inter.semibold,
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
    // 600 lives in the family key ('Inter' + 600 opens the 400 Regular).
    fontFamily: FONT_FAMILY.inter.semibold,
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

import type {PlaylistEntry} from '../../../state';
