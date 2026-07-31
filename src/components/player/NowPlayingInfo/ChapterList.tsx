import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

// ─── Types ──────────────────────────────────────────────

export interface Chapter {
  title: string;
  startTime: number; // seconds
  endTime: number;
  /** Optional URI to a thumbnail image for this chapter */
  thumbnail?: string;
}

interface ChapterListProps {
  chapters: Chapter[];
  currentTime: number;
  onSeek: (time: number) => void;
}

// ─── Constants ───────────────────────────────────────────

const ITEM_HEIGHT = 60;

// ─── Helpers ────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  currentTime,
  onSeek,
}) => {
  const {colors} = useTheme();

  if (chapters.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body2" color="tertiary">
          No chapters available
        </AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={chapters}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      getItemLayout={(_data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      windowSize={5}
      maxToRenderPerBatch={10}
      removeClippedSubviews={true}
      renderItem={({item, index}) => {
        const isActive =
          currentTime >= item.startTime && currentTime < item.endTime;
        return (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSeek(item.startTime)}
            style={[
              styles.row,
              {
                backgroundColor: isActive
                  ? colors.accent.goldDim
                  : 'transparent',
                borderColor: colors.border.subtle,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Seek to chapter ${item.title}`}
            accessibilityState={{selected: isActive}}>
            {/* Thumbnail */}
            <View style={[styles.thumb, {backgroundColor: colors.background.elevated}]}>
              {item.thumbnail ? (
                <View style={styles.thumbPlaceholder} />
              ) : (
                <AppText variant="overline" color="tertiary">
                  {index + 1}
                </AppText>
              )}
            </View>

            {/* Info */}
            <View style={styles.info}>
              <AppText
                variant="body2"
                numberOfLines={1}
                style={isActive ? {color: colors.accent.gold} : undefined}>
                {item.title}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {formatTime(item.startTime)} — {formatDuration(item.endTime - item.startTime)}
              </AppText>
            </View>

            {/* Active indicator */}
            {isActive && (
              <View style={[styles.activeDot, {backgroundColor: colors.accent.gold}]} />
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  thumb: {
    width: 56,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
  },
  info: {
    flex: 1,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
});
