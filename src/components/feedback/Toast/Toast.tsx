import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  /** Short label, e.g. "Retry" or "Undo" */
  label: string;
  /** Called when the action is tapped. Toast is auto-dismissed after. */
  onPress: () => void;
}

export interface ToastOptions {
  /** How long the toast stays on screen, in ms. Default 3000. */
  duration?: number;
  /** Optional tappable action shown next to the close button. */
  action?: ToastAction;
}

interface ToastMessage {
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  show: (
    message: string,
    type?: ToastType,
    options?: number | ToastOptions,
  ) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_HEIGHT = 52;
const TOAST_HEIGHT_WITH_ACTION = 60;

const ToastContent: React.FC<{
  visible: boolean;
  message: string;
  type: ToastType;
  action?: ToastAction;
  onDismiss: () => void;
  onActionPress: () => void;
}> = ({visible, message, type, action, onDismiss, onActionPress}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = insets.top;
  const height = action ? TOAST_HEIGHT_WITH_ACTION : TOAST_HEIGHT;
  // [FIX-TOAST-POSITION] Toast slides up from below the screen
  // (bottom-anchored). Initial translateY is positive (hidden below),
  // target is 0 (visible at the bottom inset).
  const translateY = useRef(new Animated.Value(TOAST_HEIGHT_WITH_ACTION + insets.bottom + spacing.md)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: TOAST_HEIGHT_WITH_ACTION + insets.bottom + spacing.md,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity, insets.bottom]);

  // Cleanup timer on unmount
  useEffect(() => {
    const ref = timerRef;
    return () => {
      if (ref.current) {
        clearTimeout(ref.current);
      }
    };
  }, []);

  if (!visible && !message) return null;

  const bgColor =
    type === 'success'
      ? colors.semantic.success
      : type === 'error'
        ? colors.semantic.error
        : type === 'warning'
          ? colors.semantic.warning
          : colors.accent.gold;

  // [FIX-TOAST-POSITION] Pin to bottom (Material/iOS bottom-sheet style)
  // instead of the very top, so the toast never covers the screen header,
  // search bar, or content the user is trying to read. We still respect
  // the bottom safe-area inset so it doesn't sit under the gesture bar
  // on devices with one.
  const bottomInset = insets.bottom;
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          bottom: bottomInset + spacing.md,
          height,
          transform: [{translateY: -translateY}],
          opacity,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={action ? `${message}. ${action.label}.` : message}>
      <View style={styles.textContainer}>
        <AppText
          variant="body2"
          color="primary"
          numberOfLines={action ? 1 : 2}>
          {message}
        </AppText>
      </View>
      {action && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onActionPress}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          accessibilityRole="button"
          accessibilityLabel={action.label}>
          <AppText variant="button" color="primary" style={styles.actionLabel}>
            {action.label}
          </AppText>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onDismiss}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        accessibilityLabel="Dismiss"
        accessibilityRole="button">
        <AppText style={styles.closeIcon} color="primary">✕</AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setVisible(false);
    // Clear message after dismiss animation
    setTimeout(() => setToast(null), 250);
  }, []);

  const show = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      options?: number | ToastOptions,
    ) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Back-compat: if a number is passed in the 3rd slot, treat it as
      // the duration (matches the old `show(msg, type, duration)` API).
      const opts: ToastOptions | undefined =
        typeof options === 'number' ? {duration: options} : options;
      const duration = opts?.duration ?? 3000;
      const action = opts?.action;

      setToast({message, type, duration, action});
      setVisible(true);

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [hide],
  );

  // Wrap action taps: invoke callback, then dismiss.
  const handleActionPress = useCallback(() => {
    if (toast?.action) {
      toast.action.onPress();
    }
    hide();
  }, [toast, hide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const contextValue = useMemo(() => ({show, hide}), [show, hide]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContent
        visible={visible}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'info'}
        action={toast?.action}
        onDismiss={hide}
        onActionPress={handleActionPress}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 9999,
    elevation: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
  },
  actionLabel: {
    // v8: explicit Inter Bold via family key. No fontWeight
    // field — encoding the weight in the family name means
    // Android deterministically picks Inter-Bold.ttf instead
    // of fake-bolding from Bold -> extra-bold.
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
});
