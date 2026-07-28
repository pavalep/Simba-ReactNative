// ────────────────────────────────────────────────────────
// Simba Player — Base Dialog Component
// ────────────────────────────────────────────────────────
// Phase 14: Professional modal dialog with backdrop,
// title, content, and action buttons.

import React, {useEffect, useRef} from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../../theme';
import {ColorTokens} from '../../../theme/tokens';
import {useHaptics} from '../../../hooks/useHaptics';
import {AppText} from '../AppText/AppText';

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'destructive';
  disabled?: boolean;
}

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  actions?: DialogAction[];
  /** If true, tapping backdrop dismisses dialog */
  dismissable?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  onClose,
  title,
  message,
  children,
  actions,
  dismissable = true,
}) => {
  const {colors, radius: r} = useTheme();
  const haptics = useHaptics();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 260,
          mass: 0.5,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleBackdropPress = () => {
    if (dismissable) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Animated scrim */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.background.overlay,
              opacity: fadeAnim,
            },
          ]}
        />

        {/* Backdrop touchable */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />

        {/* Dialog card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.background.floating,
              borderColor: colors.border.subtle,
              borderRadius: r.lg,
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
              shadowOffset: {width: 0, height: 8},
              shadowOpacity: 0.4,
              shadowRadius: 24,
              elevation: 16,
            },
          ]}>
          {/* Title */}
          <AppText variant="h3" color="primary" style={styles.title}>
            {title}
          </AppText>

          {/* Message */}
          {message && (
            <AppText variant="body2" color="secondary" style={styles.message}>
              {message}
            </AppText>
          )}

          {/* Custom children */}
          {children}

          {/* Action buttons */}
          {actions && actions.length > 0 && (
            <View
              style={[
                styles.actions,
                actions.length === 2 && styles.actionsDouble,
              ]}>
              {actions.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.actionBtn,
                    action.variant !== 'default' && action.variant !== undefined
                      ? getActionStyle(action.variant, colors)
                      : styles.actionBtnDefault,
                    action.disabled && styles.actionDisabled,
                  ]}
                  activeOpacity={0.7}
                  disabled={action.disabled}
                  accessibilityHint={action.label}
                  onPress={() => {
                    if (action.variant === 'destructive') {
                      haptics.heavy();
                    }
                    action.onPress();
                  }}>
                  <AppText
                    variant="button"
                    color={
                      action.variant === 'destructive'
                        ? 'error'
                        : action.variant === 'primary'
                        ? 'primary'
                        : 'accent'
                    }
                    style={action.disabled ? {opacity: 0.4} : undefined}>
                    {action.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function getActionStyle(
  variant: 'default' | 'primary' | 'destructive',
  colors: ColorTokens,
): TextStyle {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.accent.gold,
        borderWidth: 0,
      } as any;
    case 'destructive':
      return {
        backgroundColor: colors.semantic.error + '1F', // ~12% opacity
        borderWidth: 1,
        borderColor: colors.semantic.error + '4D', // ~30% opacity
      } as any;
    default:
      return {};
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 20,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  actionsDouble: {
    justifyContent: 'space-between',
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  actionBtnDefault: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  actionDisabled: {
    opacity: 0.5,
  },
});
