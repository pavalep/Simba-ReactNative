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

const SHEET_HEIGHT = Dimensions.get('window').height * 0.70;
const ITEM_HEIGHT = 76;

interface QueueManagementSheetProps {
  visible: boolean;
  onClose: () => void;
  queue: QueueItem[];
  currentIndex: number;
  onSelectItem: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveItem: (index: number) => void;
}

export const QueueManagementSheet: React.FC<QueueManagementSheetProps> = ({
  visible,
  onClose,
  queue,
  currentIndex,
  onSelectItem,
  onMoveUp,
  onMoveDown,
  onRemoveItem,
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
          <View style={[styles.header, {borderBottomColor: colors.border.subtle}]}>
            <View style={styles.headerLeft}>
              <AppText variant="displaySans">Manage Queue</AppText>
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

          {/* Instructions */}
          <AppText variant="caption" color="tertiary" style={styles.instructions}>
            Tap arrows to reorder · Tap X to remove
          </AppText>

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
              const isFirst = index === 0;
              const isLast = index === queue.length - 1;
              const canMoveDown = !isLast && !isCurrent;
              const canMoveUp = !isFirst && !isCurrent;

              return (
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: isCurrent
                        ? colors.accent.goldDim
                        : colors.background.elevated,
                      borderColor: isCurrent
                        ? colors.accent.gold
                        : colors.border.subtle,
                    },
                  ]}>
                  {/* Drag handle area */}
                  <View style={styles.dragHandle}>
                    <SvgIcon
                      name="list"
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </View>

                  {/* Info (tap to play) */}
                  <TouchableOpacity
                    style={styles.info}
                    activeOpacity={0.7}
                    onPress={() => onSelectItem(index)}>
                    <AppText
                      variant="body2"
                      numberOfLines={1}
                      style={isCurrent ? {color: colors.accent.gold} : undefined}>
                      {item.title || 'Untitled'}
                    </AppText>
                    <AppText variant="caption" color="tertiary">
                      {item.mediaType === 'audio' ? 'Audio' : 'Video'}
                    </AppText>
                  </TouchableOpacity>

                  {/* Reorder buttons */}
                  <View style={styles.actions}>
                    <TouchableOpacity
                      disabled={!canMoveUp}
                      activeOpacity={0.6}
                      onPress={() => onMoveUp(index)}
                      style={[
                        styles.actionBtn,
                        {opacity: canMoveUp ? 1 : 0.25},
                      ]}>
                      <SvgIcon name="chevronUp" size={16} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={!canMoveDown}
                      activeOpacity={0.6}
                      onPress={() => onMoveDown(index)}
                      style={[
                        styles.actionBtn,
                        {opacity: canMoveDown ? 1 : 0.25},
                      ]}>
                      <SvgIcon name="chevronDown" size={16} color={colors.text.primary} />
                    </TouchableOpacity>
                    {!isCurrent && (
                      <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => onRemoveItem(index)}
                        style={styles.actionBtn}>
                        <SvgIcon name="close" size={14} color={colors.semantic.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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
    borderBottomWidth: 1,
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
  instructions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  dragHandle: {
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 4,
  },
});
