/**
 * V19 W7.3 — `ModeControl`: the repeat-mode control (chip tier).
 *
 * ## What changed
 *
 * This used to hand-roll a `Pressable` with a **16 px** `repeat` glyph,
 * a text label, `hitSlop={8}`, and an opacity-only press. All four were
 * wrong:
 *
 *   - 16 px is below every legibility floor, and it sat 12 px below the
 *     transport row's 28 px icons directly above it in the same screen.
 *   - `hitSlop={8}` inflated the touch area 8 px past its own bounds on
 *     every side, so this pill and its neighbour in the mode row
 *     overlapped and competed for taps — the "some icons are not
 *     clickable" symptom.
 *   - Opacity-only feedback over a video frame is close to invisible.
 *
 * It now renders through `PlayerControl`'s chip tier, which supplies a
 * 22 px glyph, a real 44 pt pill, a spring press, a haptic, and the
 * accessibility role — so the numbers cannot drift back.
 *
 * ## Why the label stays
 *
 * The label ("Off" / "Repeat one" / "Repeat all") is the reason this is
 * a pill and not a bare icon. The control's whole job is to report
 * which of three mutually-exclusive modes is active; a bare glyph would
 * have to encode that in colour and shape alone, which fails WCAG 1.4.1
 * for anyone who cannot distinguish the gold state, and is genuinely
 * ambiguous for everyone else.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §3.2; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {useTransport, type RepeatMode} from '../../../../infrastructure/player';
import {PlayerControl, CONTROL_ICON_SIZE_COMPACT} from '../PlayerControl/PlayerControl';
import {ModeSheet} from './ModeSheet';

const MODE_LABEL: Record<RepeatMode, string> = {
  off: 'Off',
  one: 'Repeat one',
  all: 'Repeat all',
};

export const ModeControl: React.FC = () => {
  const {state, commands} = useTransport();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const isActive = state.repeatMode !== 'off';
  const label = MODE_LABEL[state.repeatMode];

  return (
    <>
      <PlayerControl
        testID="repeat-mode"
        chip
        icon="repeat"
        iconSize={CONTROL_ICON_SIZE_COMPACT}
        label={label}
        active={isActive}
        onPress={() => setSheetOpen(true)}
        accessibilityRole="switch"
        accessibilityChecked={isActive}
        accessibilityLabel={`Repeat mode: ${label}`}
        accessibilityHint="Opens the repeat-mode picker"
      />

      {/* The sheet is mounted here so the open-state is local: the
          TransportBar embeds this control once and never has to know a
          sheet exists. */}
      <ModeSheet
        visible={sheetOpen}
        currentMode={state.repeatMode}
        onSelect={mode => commands.setRepeatMode(mode)}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
};

export default ModeControl;
