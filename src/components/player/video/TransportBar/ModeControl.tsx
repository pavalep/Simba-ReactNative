/**
 * V19 W8.7 — `ModeControl`: the repeat control. ONE TAP CYCLES.
 *
 * ## Why there is no popup
 *
 * This used to open a `ModeSheet` popover listing Off / Repeat one /
 * Repeat all. That was a design invention, not a pattern — and the user
 * called it out: *"there is no need for popup, if we click loop icon
 * rotate through each, that is the industry standard"*.
 *
 * Tap-to-cycle is what YouTube, Netflix, Apple TV, Plex and VLC all
 * ship. The reason it wins is not fewer taps in the average case, it is
 * that the control is **unambiguous from the icon alone**. A menu
 * forces the user to open a surface, read a list, and match it against
 * a glyph they already understood. A cycling icon reports its own state
 * in the chrome, permanently, with no navigation at all.
 *
 * ## Why the ORDER is Off → Repeat all → Repeat one
 *
 * That is YouTube's order and it is the order users' fingers already
 * know. It also puts the two "repeat" states adjacent, so the cycle
 * reads as a progression rather than as three unrelated settings.
 */
import * as React from 'react';
import {useTransport, type RepeatMode} from '../../../../infrastructure/player';
import {PlayerControl} from '../PlayerControl/PlayerControl';

/**
 * The cycle, in order. This array is the single source of truth for
 * "what comes next" — the tests assert against it rather than against a
 * hardcoded successor, so re-ordering the cycle cannot silently break
 * the contract.
 */
export const REPEAT_CYCLE: readonly RepeatMode[] = ['off', 'all', 'one'] as const;

export const MODE_LABEL: Record<RepeatMode, string> = {
  off: 'Off',
  one: 'Repeat one',
  all: 'Repeat all',
};

/**
 * The next mode in the cycle. Unknown modes fall back to `'off'`
 * (i.e. wrap to the start) rather than throwing or returning `null` —
 * a control that can be handed a value it was not written for must
 * still land somewhere legal.
 */
export function nextRepeatMode(current: RepeatMode): RepeatMode {
  const index = REPEAT_CYCLE.indexOf(current);
  if (index < 0) return REPEAT_CYCLE[0];
  return REPEAT_CYCLE[(index + 1) % REPEAT_CYCLE.length];
}

export const ModeControl: React.FC = () => {
  const {state, commands} = useTransport();

  const mode = state.repeatMode;
  const label = MODE_LABEL[mode];
  const isActive = mode !== 'off';

  // One press, one whole cycle step. There is no "hold for more" and no
  // secondary menu: a three-state setting does not need one, and a
  // long-press gesture nobody discovers is not a control.
  const onPress = React.useCallback(() => {
    commands.setRepeatMode(nextRepeatMode(mode));
  }, [commands, mode]);

  return (
    <PlayerControl
      testID="repeat-mode"
      // The glyph CARRIES the state, which is the whole point of
      // deleting the popup: `repeat` = loop the queue, `repeatOne` =
      // loop this file, both shown plain while off. So the current mode
      // is legible at a glance from the icon itself, with no surface to
      // open and no dependence on the gold tint (WCAG 1.4.1).
      icon={mode === 'one' ? 'repeatOne' : 'repeat'}
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityChecked={isActive}
      accessibilityLabel={`Repeat mode: ${label}`}
      accessibilityHint="Switches between repeat off, repeat all and repeat one"
      // Engaged turns the glyph gold — the same "small state accent" use
      // of the brand colour that W8.7 kept it for after removing the
      // saturated CTA fill. It is a SECOND channel, never the only one:
      // the glyph swap and the a11y switch state both carry the mode
      // without it (WCAG 1.4.1).
      active={isActive}
    />
  );
};

export default ModeControl;