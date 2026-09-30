/**
 * V19 W3 Phase 3.3 — `PiPToggle` (compact optional control).
 *
 * Renders ONLY when `useTransport().state.canEnterPip === true`. When
 * the underlying activity can't enter PiP (paused, ended, mid-
 * buffer, or simply not supported on this device), the component
 * returns `null` — no inert button, no zero-width spacer (per the
 * W3 spec §"No inert button when unsupported").
 *
 * The button itself is a compact icon button (Picture-in-Picture
 * glyph already in the icon set). Tap calls `commands.enterPip()`
 * which delegates to the lib's native `enterPip()` (which starts
 * the PiP window via PlayerActivity).
 *
 * **W5 reaudit fix.** This previously read
 * `(commands as unknown as {enterPip?: () => void}).enterPip` and
 * fell back to `() => {}` when that read `undefined` — which it
 * always did, because `TransportCommands` had no `enterPip`. The
 * button therefore RENDERED (visibility is gated on the
 * `canEnterPip` state flag, not on the command existing) and did
 * absolutely nothing on tap. `enterPip` / `exitPip` are now real
 * members of `TransportCommands`, so this calls them directly with
 * no cast and no no-op fallback.
 *
 * Entering PiP is a TWO-part transition, not one call:
 *   1. `commands.enterPip()` — the native PiP window.
 *   2. `setPipActive(true)`   — the JS-side chrome must go away too
 *      (`SimbaPlayerContent` renders nothing in `pip` mode). Doing
 *      only (1) leaves the full chrome painted over the PiP window.
 *
 * W6.0: step 2 used to be `setMode('pip')`, writing a `mode` into a
 * process-global zustand store. `App` is mounted once per activity
 * React root, and both roots ran the sync effect that owned `mode`,
 * so they fought over it (`expanded ⇄ mini`, forever) and the chrome
 * was torn down and rebuilt in a loop. `mode` is now derived from
 * the host activity, so the only genuinely global fact left is
 * whether the PiP window is up — which is what `setPipActive` is.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.3 + TRACKER Phase 3.3.
 */

import * as React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {
  usePresentation,
  useTransport,
} from '../../../../infrastructure/player';

export const PiPToggle: React.FC = () => {
  const {state, commands} = useTransport();
  const {setPipActive} = usePresentation();
  const {colors} = useTheme();

  // Per the spec: render ONLY when canEnterPip is true.
  // No inert button when unsupported (returns null, not opacity:0).
  if (!state.canEnterPip) return null;

  const onPress = () => {
    // Native PiP window first, then suppress the JS chrome.
    commands.enterPip();
    setPipActive(true);
  };

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
