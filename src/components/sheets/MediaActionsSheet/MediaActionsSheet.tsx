import React, {useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, SvgIconName} from '../../utility/SvgIcon';

export interface MediaAction {
  label: string;
  icon: SvgIconName;
  onPress: () => void;
  /** 58.4: destructive actions render in the error color */
  destructive?: boolean;
}

interface MediaActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: MediaAction[];
}

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

/**
 * 58.4/58.5: the ONE bottom-sheet menu used by every media row/tile.
 * Standard rows start with Play Next + Add to Queue (buildQueueActions),
 * then surface-specific actions (Save to Playlist, Download, Remove…).
 * Replaces the per-screen platform-split ActionSheetIOS/Modal menus.
 */
export const MediaActionsSheet: React.FC<MediaActionsSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  actions,
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* Scrim */}
      <Animated.View
        style={[styles.scrim, {backgroundColor: colors.background.scrim, opacity: fadeAnim}]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      </Animated.View>

      {/* Menu panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.background.elevated,
            borderColor: colors.border.subtle,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {/* Divider */}
        <View style={[styles.divider, {backgroundColor: colors.border.subtle}]} />

        {/* Actions */}
        <FlatList
          data={actions}
          keyExtractor={(action, index) => `${action.label}-${index}`}
          renderItem={({item: action}) => (
            <TouchableOpacity
              style={[styles.actionRow, {borderBottomColor: colors.border.subtle}]}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={action.label}>
              <SvgIcon
                name={action.icon}
                size={20}
                color={action.destructive ? colors.semantic.error : colors.text.secondary}
              />
              <AppText
                variant="body2"
                color={action.destructive ? 'error' : 'primary'}
                style={styles.actionLabel}>
                {action.label}
              </AppText>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
          initialNumToRender={actions.length}
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  actions: {
    paddingVertical: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    marginLeft: spacing.sm + 4,
  },
});
