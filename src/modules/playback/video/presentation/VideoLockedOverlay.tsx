import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';
import {VideoIcon} from './VideoIcon';

/**
 * v11 T9.1 \u2014 Floating unlock overlay.
 *
 * When the player is locked, the top/bottom bars + centre
 * action all hide. The user can't tap anything except the
 * unlock affordance. This overlay is a single 44\u00d744 button
 * on the LEFT EDGE, vertically centered. Tapping it fires
 * `onUnlock`, the host's lock handler, which reveals the
 * chrome for 3 s and shows a transient "Controls unlocked"
 * hint per the spec.
 *
 * The button has a 12 px scrimStrong pill so it reads as a
 * distinct surface against any video content. The icon is
 * the unlock glyph (closed-padlock with the latch open) so
 * the affordance matches the top-bar lock icon's inverse
 * state.
 */
export interface VideoLockedOverlayProps {
  readonly onUnlock: () => void;
  readonly testID?: string;
}

export function VideoLockedOverlay({
  onUnlock,
  testID,
}: VideoLockedOverlayProps) {
  return (
    <View
      pointerEvents="box-none"
      style={styles.host}
      testID={testID}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.unlockControls}
        onPress={onUnlock}
        style={({pressed}) => [
          styles.button,
          pressed && styles.pressed,
        ]}
      >
        <VideoIcon
          name="unlock"
          size={20}
          color={cinemaColors.text.bright}
        />
        <Text style={styles.label} numberOfLines={1}>
          {strings.unlockControls}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 56,
    // FIX (v11 hotfix): must sit above the frame tap target
    // (zIndex 1) or the unlock button is untappable while locked.
    zIndex: 4,
    // Center the button vertically inside the host column.
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: 44,
    height: 88,
    borderRadius: 22,
    backgroundColor: cinemaColors.background.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    // Subtle gold edge so the user notices the affordance
    // even on bright content (the unlock button is the
    // ONLY tappable surface while locked).
    borderWidth: 1,
    borderColor: cinemaColors.accent.goldDim,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: cinemaColors.text.bright,
    fontSize: 9,
    lineHeight: 11,
    fontFamily: FONT_FAMILY.inter.bold,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.4,
  },
});
