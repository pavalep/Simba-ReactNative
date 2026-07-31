import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';
import {QueueDragHandle} from './QueueDragHandle';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';

export interface QueueItemProps {
  item: PlaylistEntry;
  index: number;
  isCurrent: boolean;
  isMultiSelect: boolean;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onLongPress: (index: number) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  /** Show "Now Playing" badge — only for the current track in "Now Playing" section */
  showNowPlayingBadge?: boolean;
}

/**
 * Single queue item row used in QueueSheet.
 * Supports:
 *  - Gold highlight + "Now Playing" badge for current track (23.2)
 *  - Drag-reorder handle (23.3)
 *  - Multi-select checkboxes (23.4)
 *  - Up/down/remove actions
 */
export const QueueItem: React.FC<QueueItemProps> = ({
  item,
  index,
  isCurrent,
  isMultiSelect,
  isSelected,
  onSelect,
  onLongPress,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  showNowPlayingBadge,
}) => {
  const {colors} = useTheme();
  const canMoveUp = !isFirst && !isCurrent;
  const canMoveDown = !isLast && !isCurrent;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isCurrent
            ? colors.accent.goldDim
            : colors.background.elevated,
          borderColor: isCurrent ? colors.accent.gold : colors.border.subtle,
        },
      ]}>
      {/* ── Drag Handle (23.3) ── */}
      <QueueDragHandle color={colors.text.tertiary} />

      {/* ── Multi-select checkbox (23.4) ── */}
      {isMultiSelect && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelect(index)}
          style={styles.checkboxTouch}
          accessibilityRole="checkbox"
          accessibilityLabel={`Select ${item.title || 'track'}`}
          accessibilityState={{checked: isSelected}}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isSelected ? colors.accent.gold : colors.text.tertiary,
                backgroundColor: isSelected ? colors.accent.gold : 'transparent',
              },
            ]}>
            {isSelected && (
              <SvgIcon name="close" size={10} color={colors.text.inverse} />
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* ── Tap to select / play ── */}
      <TouchableOpacity
        style={styles.info}
        activeOpacity={0.7}
        onPress={() => onSelect(index)}
        onLongPress={() => onLongPress(index)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title || 'track'}`}
        accessibilityState={{selected: isCurrent}}>
        <View style={styles.titleRow}>
          <AppText
            variant="body2"
            numberOfLines={1}
            style={isCurrent ? {color: colors.accent.gold} : undefined}>
            {item.title || 'Untitled'}
          </AppText>

          {/* ── "Now Playing" badge (23.2) ── */}
          {showNowPlayingBadge && isCurrent && (
            <View style={[styles.nowPlayingBadge, {backgroundColor: colors.accent.gold}]}>
              <AppText
                variant="caption"
                style={{color: colors.text.inverse, fontSize: 9, fontWeight: '700'}}>
                NOW PLAYING
              </AppText>
            </View>
          )}
        </View>
        <AppText variant="caption" color="tertiary">
          {formatDuration(item.duration)}
        </AppText>
      </TouchableOpacity>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        {!isMultiSelect && (
          <>
            <TouchableOpacity
              disabled={!canMoveUp}
              activeOpacity={0.6}
              onPress={() => onMoveUp(index)}
              style={[styles.actionBtn, {opacity: canMoveUp ? 1 : 0.25}]}
              accessibilityRole="button"
              accessibilityLabel={`Move ${item.title || 'track'} up`}>
              <SvgIcon name="chevronUp" size={16} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!canMoveDown}
              activeOpacity={0.6}
              onPress={() => onMoveDown(index)}
              style={[styles.actionBtn, {opacity: canMoveDown ? 1 : 0.25}]}
              accessibilityRole="button"
              accessibilityLabel={`Move ${item.title || 'track'} down`}>
              <SvgIcon name="chevronDown" size={16} color={colors.text.primary} />
            </TouchableOpacity>
          </>
        )}
        {!isCurrent && (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => onRemove(index)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title || 'track'} from queue`}
            hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
            <SvgIcon name="close" size={14} color={colors.semantic.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  checkboxTouch: {
    marginRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nowPlayingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  actionBtn: {
    padding: 4,
  },
});
