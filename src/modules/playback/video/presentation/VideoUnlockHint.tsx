import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';

/**
 * v11 T9.1 \u2014 transient "Controls unlocked" hint.
 *
 * When the user taps the floating unlock overlay (T9.1), the
 * chrome re-shows AND this 2 s auto-clear hint fires in the
 * status-pill area. The hint fades in (180 ms native-driver)
 * and fades out (180 ms) before unmounting. A short fade
 * avoids the visual pop that a hard show/hide would cause
 * during the 2 s window.
 */
export interface VideoUnlockHintProps {
  /** When `true`, the hint is visible and animates in. */
  readonly visible: boolean;
}

export function VideoUnlockHint({visible}: VideoUnlockHintProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [opacity, visible]);

  if (!visible) return null;
  return (
    <Animated.View
      testID="videoUnlockHint"
      pointerEvents="none"
      style={[styles.host, {opacity}]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {strings.controlsUnlockedHint}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: cinemaColors.background.scrimStrong,
    borderWidth: 1,
    borderColor: cinemaColors.accent.goldDim,
  },
  text: {
    color: cinemaColors.text.bright,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter.regular,
    letterSpacing: 0.2,
  },
});
