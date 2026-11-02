/**
 * V22 W22 (2026-11-02) — the UI half of the close verb.
 *
 * ## Why this file exists
 *
 * `useClosePlayback()` lives in `src/infrastructure/player/` because that is
 * the only directory allowed to import the player module
 * (`scripts/check-import-boundaries.js`, PLAYER rule). It used to raise the
 * toast itself, which meant an infrastructure module reached up into a
 * component-layer context — and `useToast()` THROWS outside a
 * `ToastProvider`. So the hook could not be used outside the app's own
 * shell, and every test of the close verb had to mock the toast just to
 * get past it.
 *
 * The fix inverts the dependency rather than working around it:
 *
 *   • `useClosePlayback()` (infrastructure) REPORTS — it returns a
 *     `ClosePlaybackOutcome`, and knows nothing about messages.
 *   • `useClosePlaybackWithToast()` (this file, components) DISPLAYS — it
 *     turns a failed outcome into a toast.
 *
 * ## The rule this pins
 *
 * A module under `src/infrastructure/` may not import a UI context. The UI
 * layer owns every user-visible message. The teardown still has exactly one
 * owner — only the *showing* of the failure moved up a layer, to the layer
 * that knows how to show something.
 *
 * ## Why the toast lives here and not at each call site
 *
 * Four call sites close playback: the video player's options sheet, the
 * video title overlay's back control, the dock's X and the audio player's
 * X. If each of them raised the toast, a call site could forget — and a
 * forgotten toast is a silent failure, which is the exact shape of defect
 * this app keeps hitting. One wrapper, four call sites, no forgetting.
 */

import {useCallback} from 'react';
import {useClosePlayback} from '../../infrastructure/player/useClosePlayback';
import {useToast} from '../feedback/Toast';

/**
 * Close playback, and tell the user if it failed.
 *
 * Returns a callback with the SAME shape the call sites already used
 * (`() => void`), so nothing downstream has to learn a new contract: the
 * outcome is handled here, once.
 */
export function useClosePlaybackWithToast(): () => void {
  const toast = useToast();
  const closePlayback = useClosePlayback();

  return useCallback(() => {
    const outcome = closePlayback();
    if (!outcome.ok) {
      toast.show(outcome.message, 'error');
    }
  }, [closePlayback, toast]);
}
