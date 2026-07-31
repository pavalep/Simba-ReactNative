import React, {useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon, SvgIconName} from '../../../components/utility/SvgIcon';

interface MenuAction {
  label: string;
  icon: SvgIconName;
  onPress: () => void;
}

interface MediaContextMenuProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: MenuAction[];
}

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export const MediaContextMenu: React.FC<MediaContextMenuProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  actions,
}) => {
  const {colors} = useTheme();
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
        />
      </Animated.View>

      {/* Menu panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: colors.background.elevated,
            borderColor: colors.border.subtle,
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
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionRow, {borderBottomColor: colors.border.subtle}]}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                action.onPress();
              }}
              activeOpacity={0.7}>
              <SvgIcon name={action.icon} size={20} color={colors.text.secondary} />
              <AppText variant="body2" color="primary" style={styles.actionLabel}>
                {action.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
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
    paddingBottom: 34, // safe area padding
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
