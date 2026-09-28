/**
 * V19 W3 Phase 3.3 — `PiPToggle` (compact optional control).
 *
 * Renders ONLY when `useTransport().canEnterPip === true`. When
 * the underlying activity can't enter PiP (paused, ended, mid-
 * buffer, or simply not supported on this device), the component
 * returns `null` — no inert button, no zero-width spacer (per the
 * W3 spec §"No inert button when unsupported").
 *
 * The button itself is a compact icon button (Picture-in-Picture
 * glyph already in the icon set). Tap calls `commands.enterPip()`
 * which delegates to the lib's native `enterPip()` method
 * (which starts the PiP window via PlayerActivity).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.3.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {useTransport} from '../../../../infrastructure/player';

export const PiPToggle: React.FC = () => {
  const {state, commands} = useTransport();
  const {colors} = useTheme();

  // Per the spec: render ONLY when canEnterPip is true.
  // No inert button when unsupported (returns null, not opacity:0).
  if (!state.canEnterPip) return null;

  // Defensive: the lib exposes enterPip as a no-arg function. The
  // cast through `unknown` keeps tsc strict without adding a
  // hand-rolled cast at every call site.
  const enterPip = (commands as unknown as {enterPip?: () => void}).enterPip;
  const onPress = enterPip ? enterPip : () => {};

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Enter Picture-in-Picture"
        accessibilityHint="Minimizes the player into a floating window"
        hitSlop={8}
        style={({pressed}) => [
          styles.button,
          pressed ? {opacity: 0.7} : null,
        ]}
      >
        <SvgIcon
          name="pictureInPicture"
          size={20}
          color={colors.text.secondary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
    minWidth: 44,
  },
});

export default PiPToggle;
