/**
 * V19 W7.3 — `PiPToggle`: the picture-in-picture control (bare tier).
 *
 * ## What changed
 *
 * A **20 px** glyph with `hitSlop={8}` and opacity-only press feedback.
 * 20 px is under the 24 px legibility floor, and the `hitSlop` was
 * inflating the touch area 8 px past its own bounds in every direction,
 * so this control overlapped its neighbour in the mode row and the two
 * competed for taps. It now renders through `PlayerControl`'s bare tier:
 * a real 44 × 44 target with the 24 px glyph centred inside it, no
 * `hitSlop`, spring press, haptic.
 *
 * ## Why it is a bare target and not a chip
 *
 * PiP is an ACTION, not a state. There is nothing to label — the glyph
 * says "picture in picture" as well as any word would — so a pill would
 * be a wider target saying exactly what a square one says. The chip tier
 * is reserved for controls that report a value (repeat mode, captions).
 *
 * ## Why it still returns `null` when PiP is unavailable
 *
 * SPEC invariant I3. `canEnterPip` is derived from real state (playing,
 * not ended, not buffering). When it is false there is no window to
 * enter, so rendering the button would produce a control that looks
 * live and does nothing. Correct absence, not an oversight.
 *
 * ## Entering PiP is a TWO-part transition
 *
 *   1. `commands.enterPip()` — the native PiP window. It ANSWERS whether
 *      the OS accepted the request.
 *   2. `setPipActive(true)`   — the JS chrome must go away too.
 *
 * Doing only (1) leaves the full chrome painted over the PiP window;
 * doing only (2) leaves the activity black behind a floating window.
 * Both halves are in this one handler, so the tap is one honest action.
 *
 * The handler is driven by the ANSWER, not by a guess. It used to call
 * `setPipActive(true)` unconditionally, on the assumption that the request
 * had worked — but the native side used to swallow every refusal (no
 * activity, PiP not permitted, bad `PictureInPictureParams`), so a
 * refused request looked identical to a successful one. The app then
 * suppressed its own chrome for a PiP window that would never exist, and
 * the only thing that could bring the chrome back was the PiP-exit event
 * — which, for a request that never happened, never came.
 *
 * So: the chrome follows the OS's answer. `false` means PiP did not
 * happen, and the chrome stays exactly where it was.
 *
 * W6.0 note: step (2) used to write a `mode` into a process-global
 * zustand store. `App` mounts once per activity React root and both
 * roots ran the effect that owned `mode`, so they overwrote each other
 * forever and the chrome tore down and rebuilt in a loop. `mode` is now
 * derived from the host activity, so the only genuinely global fact
 * left is whether the PiP window is up — which is what `setPipActive`
 * is.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §3.2; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {usePresentation, useTransport} from '../../../../infrastructure/player';
import {PlayerControl} from '../PlayerControl/PlayerControl';

export const PiPToggle: React.FC = () => {
  const {state, commands} = useTransport();
  const {setPipActive} = usePresentation();

  if (!state.canEnterPip) return null;

  const onPress = () => {
    // Native PiP window first, then suppress the JS chrome — but only if
    // the native side says PiP actually happened.
    const accepted = commands.enterPip();
    setPipActive(accepted);
  };

  return (
    <PlayerControl
      testID="pip-toggle"
      icon="pictureInPicture"
      onPress={onPress}
      accessibilityLabel="Enter Picture-in-Picture"
      accessibilityHint="Minimizes the player into a floating window"
    />
  );
};

export default PiPToggle;
