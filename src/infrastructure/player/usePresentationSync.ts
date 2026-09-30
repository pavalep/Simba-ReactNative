/**
 * V19 W6.0 — the presentation sync: the single owner of the
 * mini ⇄ expanded transition.
 *
 * ## Why this file exists
 *
 * Before W6.0 the presentation mode was driven by *navigation*: the
 * `NowPlaying` route's mount effect called `setMode('expanded')` and
 * its unmount called `setMode('mini')`. That was never wired — no
 * call site in the app ever navigates to `NowPlaying` (the only entry
 * point is the `simba://now-playing` deep link), so the mode sat at
 * its `'mini'` default forever. The V19 chrome therefore never
 * mounted, and every primitive built in W1–W5 (TransportBar,
 * PiPToggle, CaptionsToggle, ModeControl, More, NextUpOverlay) was
 * unreachable at runtime.
 *
 * The mode is a function of *where the media is*, not of a screen
 * transition. Playback lives in `PlayerActivity` (every play path
 * resolves to `bridge.openPlayer`, which starts that activity), so
 * "this React tree is hosted by the player activity" IS the signal
 * that there is a video to put chrome on.
 *
 * ## Why the lib exposes a dedicated hook
 *
 * The obvious candidate was `useLaunchParams()`, and it is the wrong
 * tool three times over: the native launch params are a ONE-SHOT queue
 * (the first React consumer drains it, so a chrome component asking
 * this question would steal the payload from the default player UI),
 * `getLaunchParams()` is async (the answer lands one render late, so a
 * mount gate built on it flashes its own absence for a frame), and
 * "are there launch params?" is not the same question as "is there a
 * player surface under me?". Lib 1.7.0 added
 * `useIsPlayerActivity()` to answer the second question directly —
 * synchronously, idempotently, and without consuming anything.
 *
 * ## Invariants
 *
 * - `'pip'` is owned by the PiP flow (W6.1), never by this hook. PiP
 *   enters and exits on native events, and a session-activity change
 *   must not clobber it mid-transition.
 * - The hook only ever writes the two *idle* modes. It is not a
 *   general "presentation controller".
 */

import {useEffect} from 'react';
import {useIsPlayerActivity} from './playbackFacade';
import {usePresentationStore} from '../../state/usePresentationStore';

export function usePresentationSync(): void {
  const isPlayerActivity = useIsPlayerActivity();
  const mode = usePresentationStore((s) => s.mode);
  const setMode = usePresentationStore((s) => s.setMode);

  useEffect(() => {
    // PiP owns the mode until it exits. Touching it here would fight
    // the PiP enter/exit reconciliation in `usePipSync` (W6.1).
    if (mode === 'pip') return;

    const target = isPlayerActivity ? 'expanded' : 'mini';
    if (target !== mode) setMode(target);
  }, [isPlayerActivity, mode, setMode]);
}
