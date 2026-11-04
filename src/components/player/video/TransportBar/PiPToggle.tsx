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
 * ## Entering PiP is a TWO-part transition — and the ORDER changed
 *
 *   1. `requestPip()` — hide the chrome and record the request.
 *   2. `usePipEntry()` — once the frame that removed the chrome has
 *      been presented, ask the OS for the window and relay its answer.
 *
 * It used to be the other way round: `commands.enterPip()` first, and
 * `setPipActive(accepted)` after. That order was defensible while the
 * chrome was only a cosmetic problem, and it is a defect now.
 *
 * **React does not redraw in Picture-in-Picture (the Activity is "paused, but rendering", but RN freezes TWO things with the Activity — Fabric stops applying mount items, so a React commit never reaches the native view tree, and the JS timer manager freezes, so `requestAnimationFrame` never fires).** Whatever its
 * window contained at the moment of the transition is what the PiP
 * window keeps showing. So a chrome that is still mounted when the OS
 * is asked is frozen into the PiP window: dead buttons (their views are
 * gone) over a frozen clock (the pixels are stale). That was measured
 * on the emulator on 2026-11-03 — the app's full expanded chrome,
 * scaled down into the small window, exactly as the user reported it.
 *
 * Unmounting the chrome a frame later is far too late: the window was
 * already frozen and never drew again.
 *
 * The OS's answer still governs the outcome, and it is still the only
 * authority on whether the window exists. `usePipEntry()` asks, gets
 * the answer, and a refusal puts the chrome back exactly as it was.
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
  const {state} = useTransport();
  const {requestPip} = usePresentation();

  if (!state.canEnterPip) return null;

  const onPress = () => {
    // Hide the chrome and record the request. The entry itself belongs
    // to `usePipEntry()`, which owns the order — see the note above.
    requestPip();
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
