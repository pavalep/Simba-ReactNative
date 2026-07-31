import React, {useCallback, useMemo} from 'react';
import {
  View,
  SectionList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';
import {BottomSheet} from '../BottomSheet/BottomSheet';
import {QueueItem} from './QueueItem';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';

// ── Types ──

export type QueueSheetMode = 'view' | 'multiSelect';

export interface QueueSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Currently playing track */
  currentTrack: PlaylistEntry | null;
  /** Upcoming queue items */
  queue: PlaylistEntry[];
  /** Previously played items */
  playbackHistory: PlaylistEntry[];
  /** Currently selected indices for batch ops */
  selectedQueueIndices: number[];
  /** Whether multi-select mode is active */
  mode: QueueSheetMode;
  /** Called with index into the queue array */
  onSelectQueueItem: (index: number) => void;
  /** Called with index into the playbackHistory array */
  onSelectHistoryItem: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveItem: (index: number) => void;
  /** Enter/exit multi-select mode */
  onEnterMultiSelect: () => void;
  onExitMultiSelect: () => void;
  /** Toggle individual selection */
  onToggleSelection: (index: number) => void;
  /** Batch operations */
  onRemoveSelected: () => void;
  onMoveSelectedToTop: () => void;
  onClearAll: () => void;
  /** "Play Next" — add a specific item after current track. The screen handling this
   *  should call prependToQueue when a history item is selected to play next. */
  onPlayNext: (entry: PlaylistEntry) => void;
  /** "Add to Queue" — add a specific item to end of queue */
  onAddToQueue: (entry: PlaylistEntry) => void;
}

// ── Section type ──

interface QueueSection {
  key: string;
  title: string;
  data: PlaylistEntry[];
  /** Whether items in this section are reorderable */
  reorderable: boolean;
  /** Show items as current-track highlighted */
  isCurrentSection?: boolean;
}

// ── Component ──

export const QueueSheet: React.FC<QueueSheetProps> = ({
  visible,
  onClose,
  currentTrack,
  queue,
  playbackHistory,
  selectedQueueIndices,
  mode,
  onSelectHistoryItem,
  onMoveUp,
  onMoveDown,
  onRemoveItem,
  onEnterMultiSelect,
  onExitMultiSelect,
  onToggleSelection,
  onRemoveSelected,
  onMoveSelectedToTop,
  onClearAll,
  onPlayNext,
  onAddToQueue,
}) => {
  const {colors} = useTheme();
  useSafeAreaInsets();

  // Local multi-select tracking: we toggle selectedQueueIndices in the parent via
  // onToggleSelection. This sheet displays the state.

  // Build sections for SectionList
  const sections = useMemo<QueueSection[]>(() => {
    const result: QueueSection[] = [];

    // ── Now Playing section ──
    if (currentTrack) {
      result.push({
        key: 'now-playing',
        title: 'Now Playing',
        data: [currentTrack],
        reorderable: false,
        isCurrentSection: true,
      });
    }

    // ── Up Next section ──
    if (queue.length > 0) {
      result.push({
        key: 'up-next',
        title: `Up Next (${queue.length})`,
        data: queue,
        reorderable: true,
      });
    }

    // ── Previously Played section (23.9) ──
    if (playbackHistory.length > 0) {
      result.push({
        key: 'previously-played',
        title: `Previously Played (${playbackHistory.length})`,
        data: playbackHistory,
        reorderable: false,
      });
    }

    return result;
  }, [currentTrack, queue, playbackHistory]);

  const queueItemCount = queue.length;
  const selectedCount = selectedQueueIndices.length;

  // Handle section list render
  const renderSectionHeader = useCallback(
    ({section}: {section: QueueSection}) => (
      <View style={styles.sectionHeader}>
        <AppText variant="caption" color="tertiary" style={{fontWeight: '600'}}>
          {section.title}
        </AppText>
        {/* Show "Play Next" / "Add to Queue" buttons for history section items */}
        {section.key === 'previously-played' && playbackHistory.length > 0 && (
          <View style={{flexDirection: 'row', gap: 8}}>
            {/* Buttons per-item are handled in renderItem, but global header actions could go here */}
          </View>
        )}
      </View>
    ),
    [playbackHistory],
  );

  const renderItem = useCallback(
    ({item, index, section}: {item: PlaylistEntry; index: number; section: QueueSection}) => {
      
      const isSelected = section.key === 'up-next' && selectedQueueIndices.includes(index);
      const rowIndex = index;

      // In the "Now Playing" section with a single item, pass showNowPlayingBadge
      if (section.key === 'now-playing') {
        return (
          <QueueItem
            item={item}
            index={0}
            isCurrent={true}
            isMultiSelect={false}
            isSelected={false}
            onSelect={() => {}}
            onLongPress={() => {}}
            onRemove={() => {}}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            isFirst={true}
            isLast={true}
            showNowPlayingBadge={true}
          />
        );
      }

      if (section.key === 'up-next') {
        return (
          <QueueItem
            item={item}
            index={rowIndex}
            isCurrent={false}
            isMultiSelect={mode === 'multiSelect'}
            isSelected={isSelected}
            onSelect={onToggleSelection}
            onLongPress={onEnterMultiSelect}
            onRemove={onRemoveItem}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            isFirst={rowIndex === 0}
            isLast={rowIndex === queueItemCount - 1}
          />
        );
      }

      // "Previously Played" section
      if (section.key === 'previously-played') {
        return (
          <View
            style={[
              styles.historyRow,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
            ]}>
            {/* Tap to play this item */}
            <TouchableOpacity
              style={styles.historyInfo}
              activeOpacity={0.7}
              onPress={() => onSelectHistoryItem(rowIndex)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.title || 'Untitled'}`}>
              <AppText variant="body2" numberOfLines={1}>
                {item.title || 'Untitled'}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {formatDuration(item.duration)}
              </AppText>
            </TouchableOpacity>

            {/* Action buttons for history item */}
            <View style={styles.historyActions}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onPlayNext(item)}
                style={styles.historyActionBtn}
                accessibilityRole="button"
                accessibilityLabel={`Play "${item.title || 'Untitled'}" next`}>
                <AppText
                  variant="caption"
                  style={{color: colors.accent.gold, fontWeight: '600'}}>
                  Play Next
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onAddToQueue(item)}
                style={styles.historyActionBtn}
                accessibilityRole="button"
                accessibilityLabel={`Add "${item.title || 'Untitled'}" to queue`}>
                <SvgIcon name="listMusic" size={16} color={colors.accent.gold} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return null;
    },
    [
      mode,
      selectedQueueIndices,
      queueItemCount,
      colors,
      onToggleSelection,
      onEnterMultiSelect,
      onRemoveItem,
      onMoveUp,
      onMoveDown,
      onSelectHistoryItem,
      onPlayNext,
      onAddToQueue,
    ],
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <SvgIcon name="listMusic" size={40} color={colors.text.tertiary} />
        <AppText variant="body1" color="tertiary" style={{marginTop: spacing.sm, textAlign: 'center'}}>
          Queue is empty
        </AppText>
        <AppText variant="caption" color="tertiary" style={{textAlign: 'center'}}>
          Songs you add to the queue will appear here
        </AppText>
      </View>
    ),
    [colors],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Queue"
      snapPoints={['45%', '75%', '90%']}
      initialSnap={1}>
      <View style={styles.container}>
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.uri}-${index}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={listEmptyComponent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />

        {/* ── Bottom Action Bar ── */}
        {mode === 'multiSelect' && selectedCount > 0 ? (
          <View style={[styles.batchBar, {backgroundColor: colors.background.elevated, borderTopColor: colors.border.subtle}]}>
            <AppText variant="caption" color="tertiary">
              {selectedCount} selected
            </AppText>
            <View style={styles.batchActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onRemoveSelected}
                style={[styles.batchBtn, {backgroundColor: colors.semantic.error}]}
                accessibilityRole="button"
                accessibilityLabel="Remove selected items">
                <AppText variant="caption" style={{color: '#FFF', fontWeight: '600'}}>
                  Remove
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onMoveSelectedToTop}
                style={[styles.batchBtn, {backgroundColor: colors.accent.goldDim}]}
                accessibilityRole="button"
                accessibilityLabel="Move selected items to top">
                <AppText variant="caption" style={{color: colors.accent.gold, fontWeight: '600'}}>
                  Move to Top
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClearAll}
                style={[styles.batchBtn, {backgroundColor: colors.background.primary}]}
                accessibilityRole="button"
                accessibilityLabel="Clear all queue items">
                <AppText variant="caption" color="tertiary" style={{fontWeight: '600'}}>
                  Clear All
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onExitMultiSelect}
                style={styles.batchBtn}
                accessibilityRole="button"
                accessibilityLabel="Done selecting">
                <AppText variant="caption" color="secondary" style={{fontWeight: '600'}}>
                  Done
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        ) : mode === 'multiSelect' && selectedCount === 0 ? (
          <View style={[styles.batchBar, {backgroundColor: colors.background.elevated, borderTopColor: colors.border.subtle}]}>
            <AppText variant="caption" color="tertiary">
              Select items to batch operate
            </AppText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onExitMultiSelect}
              accessibilityRole="button"
              accessibilityLabel="Cancel selection">
              <AppText variant="caption" color="secondary" style={{fontWeight: '600'}}>
                Cancel
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          queue.length > 0 && (
            <View style={[styles.bottomBar, {borderTopColor: colors.border.subtle}]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClearAll}
                style={[styles.clearBtn, {borderColor: colors.border.subtle}]}>
                <AppText variant="caption" color="tertiary">
                  Clear Queue
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onEnterMultiSelect}
                style={[styles.selectBtn, {borderColor: colors.accent.gold}]}>
                <AppText variant="caption" style={{color: colors.accent.gold, fontWeight: '600'}}>
                  Select
                </AppText>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    </BottomSheet>
  );
};

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  // ── History row ──
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  historyInfo: {
    flex: 1,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyActionBtn: {
    padding: 12,
  },

  // ── Bottom bars ──
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  selectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
