import React, {useRef, useCallback} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
  PanResponder,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../core/AppText/AppText';
import {SvgIcon} from '../utility/SvgIcon';
import type {Bookmark} from '../../store/slices/bookmarkSlice';

const SWIPE_THRESHOLD = 70;
const DELETE_WIDTH = 80;

interface Props {
  item: Bookmark;
  onPress: (item: Bookmark) => void;
  onDelete: (id: string) => void;
  /** V6 4.3.1: optional rename handler — surfaced via long-press */
  onRename?: (id: string, currentLabel: string) => void;
  animatedStyle?: any;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${secs}`;
}

function formatRelativeDate(iso: string): string {
  const now = Date.now();
  const date = new Date(iso).getTime();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export const BookmarkItem: React.FC<Props> = ({
  item,
  onPress,
  onDelete,
  onRename,
  animatedStyle,
}) => {
  const {colors} = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        const offset = isOpen.current ? -DELETE_WIDTH + gs.dx : gs.dx;
        if (offset < 0) {
          translateX.setValue(Math.max(-DELETE_WIDTH - 10, offset));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (isOpen.current) {
          if (gs.dx > SWIPE_THRESHOLD / 2) {
            closeSwipe();
          } else {
            Animated.spring(translateX, {
              toValue: -DELETE_WIDTH,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        } else {
          if (gs.dx < -SWIPE_THRESHOLD) {
            Animated.spring(translateX, {
              toValue: -DELETE_WIDTH,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
            isOpen.current = true;
          } else {
            closeSwipe();
          }
        }
      },
      onPanResponderTerminate: () => closeSwipe(),
    }),
  ).current;

  const handleDeletePress = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      isOpen.current = false;
      onDelete(item.id);
    });
  }, [translateX, item.id, onDelete]);

  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.swipeContainer}>
        {/* Delete action behind */}
        <TouchableOpacity
          style={[styles.deleteAction, {backgroundColor: colors.semantic.error}]}
          onPress={handleDeletePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Delete bookmark for ${item.title}`}>
          <SvgIcon name="bookmark" size={20} color={colors.text.bright} />
          <AppText variant="overline" style={{color: colors.text.bright, marginTop: spacing.xs}}>
            Delete
          </AppText>
        </TouchableOpacity>

        {/* Main content — slides to reveal delete */}
        <Animated.View
          style={[{transform: [{translateX}]}]}
          {...panResponder.panHandlers}>
          <TouchableOpacity
            style={[styles.row, {borderBottomColor: colors.border.subtle}]}
            onPress={() => onPress(item)}
            onLongPress={onRename ? () => onRename(item.id, item.label) : undefined}
            delayLongPress={400}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Play ${item.title} at ${formatTime(item.position)}`}
            accessibilityHint={onRename ? 'Long-press to rename' : undefined}>
            {/* Thumbnail art when available, else gold bookmark icon (P34.6) */}
            {item.thumbnailPath ? (
              <View style={[styles.iconContainer, styles.thumbWrap]}>
                <FastImage
                  source={{uri: item.thumbnailPath}}
                  style={styles.thumbImage}
                  resizeMode={FastImage.resizeMode.cover}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: colors.background.elevated},
                ]}>
                <SvgIcon
                  name="bookmark"
                  size={22}
                  color={colors.accent.gold}
                />
              </View>
            )}

            {/* Info */}
            <View style={styles.info}>
              <AppText variant="body2" color="primary" numberOfLines={1}>
                {item.title}
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={1}>
                {formatTime(item.position)} · {formatRelativeDate(item.createdAt)}
                {item.label ? ` · "${item.label}"` : ''}
                {item.source ? ` · ${item.source}` : ''}
              </AppText>
            </View>

            {/* Chevron hint */}
            <SvgIcon
              name="chevronRight"
              size={16}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrap: {
    overflow: 'hidden',
  },
  thumbImage: {
    width: 44,
    height: 44,
  },
  info: {
    flex: 1,
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
});
