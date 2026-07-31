import React, {useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  BackHandler,
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {BottomSheetBackdrop} from './BottomSheetBackdrop';
import {useBottomSheet, type UseBottomSheetOptions} from '../../../hooks/useBottomSheet';
import {KeyboardAwareView} from '../../core/KeyboardAwareView/KeyboardAwareView';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface BottomSheetProps<T = any> {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Called to close the sheet */
  onClose: () => void;
  /** Snap points: e.g. ['25%', '50%', '75%', '100%'] */
  snapPoints?: string[];
  /** Initial snap index (default: 0) */
  initialSnap?: number;
  /** Called when snap index changes */
  onSnapChange?: (index: number) => void;
  /** Sheet title (optional) — string or custom React element */
  title?: string | React.ReactNode;
  /** Whether backdrop is dismissable (default: true) */
  dismissable?: boolean;
  /** Children to render inside the sheet */
  children: React.ReactNode;
  /** Optional data payload (typed via generic) */
  data?: T;
}

/**
 * Universal BottomSheet component.
 *
 * Provides a drag-to-dismiss, multi-snap-point bottom sheet using React Native's
 * built-in Animated API + PanResponder. Fully typed via generic `T` for content data.
 *
 * Usage:
 * ```tsx
 * <BottomSheet<MyDataType>
 *   visible={visible}
 *   onClose={handleClose}
 *   snapPoints={['25%', '50%', '75%']}
 *   data={myData}
 * >
 *   <MyContent />
 * </BottomSheet>
 * ```
 */
export function BottomSheet<T = any>({
  visible,
  onClose,
  snapPoints = ['50%'],
  initialSnap = 0,
  onSnapChange,
  dismissable = true,
  title,
  children,
}: BottomSheetProps<T>) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const prevVisibleRef = useRef(visible);

  // ── Hook ──
  const {
    animatedTranslateY,
    panResponder,
    snapToIndex,
    closeSheet,
    keyboardHeight,
  } = useBottomSheet({
    snapPoints,
    initialSnap,
    onClose,
    onSnapChange,
  } as UseBottomSheetOptions);

  // ── React to visibility changes ──
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      snapToIndex(initialSnap);
    } else if (!visible && prevVisibleRef.current) {
      // Sheet hidden externally — reset
    }
    prevVisibleRef.current = visible;
  }, [visible, initialSnap, snapToIndex]);

  // ── Android back button dismiss + focus trap (28.5) ──
  useEffect(() => {
    if (!visible) return;
    const onBack = () => {
      closeSheet();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [visible, closeSheet]);

  // ── Focus trap: when the sheet opens, focus the first focusable element
  //    (the close button) so screen readers start inside the sheet ──
  const closeBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  useEffect(() => {
    if (visible) {
      // Small delay to let the Modal mount
      const id: ReturnType<typeof setTimeout> = setTimeout(() => closeBtnRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [visible]);

  // ── Handle dismiss from backdrop ──
  const handleBackdropPress = useCallback(() => {
    if (dismissable) closeSheet();
  }, [dismissable, closeSheet]);

  // ── Sheet container translateY animation ──
  const sheetTranslateY = animatedTranslateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [0, SCREEN_HEIGHT],
    extrapolate: 'clamp',
  });

  // Bottom of sheet = screenHeight - snapOffset → with keyboard offset
  const keyboardAdjust =
    keyboardHeight > 0 ? keyboardHeight : 0;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
      hardwareAccelerated>
      <View style={styles.container}>
        {/* ── Backdrop ── */}
        <BottomSheetBackdrop
          animatedTranslateY={animatedTranslateY}
          dismissable={dismissable}
          onPress={handleBackdropPress}
        />

        {/* ── Sheet ── */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
              transform: [{translateY: sheetTranslateY}],
              paddingBottom: insets.bottom + spacing.md + keyboardAdjust,
            },
          ]}>
          <KeyboardAwareView style={styles.inner}>
            {/* ── Drag Handle Bar (6.5) ── */}
            <View
              {...panResponder.panHandlers}
              style={styles.handleBar}>
              <View
                style={[
                  styles.handle,
                  {backgroundColor: colors.text.tertiary},
                ]}
              />
            </View>

            {/* ── Header (title + close button) ── */}
            {title && (
              <View style={[styles.header, {borderBottomColor: colors.border.subtle}]}>
                {typeof title === 'string' ? (
                  <Text style={[styles.headerTitle, {color: colors.text.primary}]}>
                    {title}
                  </Text>
                ) : (
                  <View style={{flex: 1}}>{title}</View>
                )}
                <TouchableOpacity
                  ref={closeBtnRef}
                  style={styles.closeBtn}
                  onPress={closeSheet}
                  accessibilityLabel="Close panel"
                  accessibilityRole="button">
                  <Text style={[styles.closeBtnText, {color: colors.text.secondary}]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Content ── */}
            <View style={styles.content}>{children}</View>
          </KeyboardAwareView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: SCREEN_HEIGHT * 0.95,
  },
  inner: {
    flex: 1,
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
});
