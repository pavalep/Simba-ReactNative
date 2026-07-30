import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import type {QueueItem} from '../../../store/slices/playerSlice';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.65;
const ITEM_HEIGHT = 76;

interface PlaylistPreviewSheetProps {
  visible: boolean;
  onClose: () => void;
  queue: QueueItem[];
  currentIndex: number;
  onSelectItem: (index: number) => void;
}

export const PlaylistPreviewSheet: React.FC<PlaylistPreviewSheetProps> = ({
  visible,
  onClose,
  queue,
  currentIndex,
  onSelectItem,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}>
          {/* Handle */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, {backgroundColor: colors.text.tertiary}]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AppText variant="h3">Up Next</AppText>
              <AppText variant="caption" color="tertiary">
                {queue.length} items
              </AppText>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityLabel="Close"
              accessibilityRole="button">
              <AppText style={styles.closeIcon} color="secondary">✕</AppText>
            </TouchableOpacity>
          </View>

          {/* Queue list */}
          <FlatList
            data={queue}
            keyExtractor={(item, i) => `${item.fileUri}-${i}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index})}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
            renderItem={({item, index}) => {
              const isCurrent = index === currentIndex;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onSelectItem(index)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isCurrent
                        ? colors.accent.goldDim
                        : 'transparent',
                      borderColor: colors.border.subtle,
                    },
                  ]}>
                  {/* Index badge */}
                  <View style={[styles.indexBadge, {backgroundColor: colors.background.elevated}]}>
                    <AppText
                      variant="caption"
                      color={isCurrent ? 'accent' : 'tertiary'}>
                      {index + 1}
                    </AppText>
                  </View>

                  {/* Info */}
                  <View style={styles.info}>
                    <AppText
                      variant="body2"
                      numberOfLines={1}
                      style={isCurrent ? {color: colors.accent.gold} : undefined}>
                      {item.title || 'Untitled'}
                    </AppText>
                    <AppText variant="caption" color="tertiary">
                      {item.mediaType === 'audio' ? 'Audio' : 'Video'}
                    </AppText>
                  </View>

                  {/* Playing indicator */}
                  {isCurrent && (
                    <SvgIcon name="volume" size={18} color={colors.accent.gold} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
});
