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
  Dimensions,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_HEIGHT = 52;
const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ToastContent: React.FC<{
  visible: boolean;
  message: string;
  type: ToastType;
  onDismiss: () => void;
}> = ({visible, message, type, onDismiss}) => {
  const {colors} = useTheme();
  const translateY = useRef(new Animated.Value(-TOAST_HEIGHT)).current;
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
          toValue: -TOAST_HEIGHT,
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
  }, [visible, translateY, opacity]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
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

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          transform: [{translateY}],
          opacity,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={message}>
      <View style={styles.textContainer}>
        <AppText
          variant="body2"
          style={styles.messageText}
          numberOfLines={2}>
          {message}
        </AppText>
      </View>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onDismiss}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        accessibilityLabel="Dismiss"
        accessibilityRole="button">
        <AppText style={styles.closeIcon}>✕</AppText>
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
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({message, type, duration});
      setVisible(true);

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        hide();
      }, duration);
    },
    [hide],
  );

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
        onDismiss={hide}
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
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: TOAST_HEIGHT,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  messageText: {
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
