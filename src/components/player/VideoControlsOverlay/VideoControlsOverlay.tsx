import React, {useEffect, useRef, useCallback} from 'react';
import {View, Animated, StyleSheet} from 'react-native';

interface VideoControlsOverlayProps {
  /** Whether controls are currently visible */
  visible: boolean;
  /** Called to toggle visibility (used by auto-hide timer) */
  onToggle: () => void;
  /** Auto-hide duration in ms (default: 3000) */
  autoHideDuration?: number;
  /** Bottom inset for safe area */
  bottomInset?: number;
  /** The control content (seek bar, transport, menus) */
  children: React.ReactNode;
}

/**
 * Glassmorphic overlay for video player controls.
 *
 * Provides:
 * - Frosted dark background (rgba(0,0,0,0.65))
 * - Fade-in / fade-out animation driven by `visible`
 * - Auto-hide after `autoHideDuration` ms of inactivity
 * - Interaction resets the auto-hide timer
 *
 * Tapping on the video surface to show/hide controls is handled by the
 * parent's GestureLayer — this component only manages the overlay appearance
 * and auto-hide timer.
 */
const VideoControlsOverlay: React.FC<VideoControlsOverlayProps> = ({
  visible,
  onToggle,
  autoHideDuration = 3000,
  bottomInset = 0,
  children,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fade animation ──
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // ── Schedule / clear auto-hide ──
  const scheduleAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    if (visible) {
      autoHideTimer.current = setTimeout(() => {
        onToggle();
      }, autoHideDuration);
    }
  }, [visible, autoHideDuration, onToggle]);

  useEffect(() => {
    scheduleAutoHide();
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [visible, scheduleAutoHide]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {paddingBottom: bottomInset, opacity: fadeAnim},
      ]}>
      {/* Frosted glass background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.glassBg} />
      </View>

      {/* Controls content — interaction resets auto-hide */}
      <View
        onStartShouldSetResponder={() => true}
        onResponderRelease={scheduleAutoHide}>
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  glassBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
});

export default VideoControlsOverlay;
