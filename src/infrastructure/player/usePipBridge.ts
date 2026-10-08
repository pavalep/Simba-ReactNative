/**
 * V19 W6.1 — `usePipBridge()`: the single owner of Picture-in-Picture
 * reconciliation.
 *
 * The lib already emits the four PiP events a PiP window needs
 * (`onPipModeChanged`, `onPipPlayPause`, `onPipExpand`, `onPipClose`)
 * and exposes them through `subscribePlayerEvent`. Nothing in the app
 * subscribed to any of them, which is why W6.1 was listed as
 * "unreconciled": the chrome only knew about PiP when the user pressed
 * our own button, so every PiP the SYSTEM started left the JS side
 * believing the player was still fullscreen.
 *
 * The concrete failure this fixes: swipe the PiP window away (or hit
 * the system Back / Home on it). Android destroys the PiP window and
 * restores the fullscreen activity, but only the native side learns
 * about it. The JS `pipActive` flag stayed `true`, so
 * `presentation.mode` stayed `'pip'` and `VideoPlayer` kept
 * returning `null` — a black activity with no chrome and no way back
 * except killing the app.
 *
 * ## Two sources of truth, one reconciliation
 *
 * `pipActive` is set optimistically by our own button and by
 * `VideoPlayerRef.enterPip`, and authoritatively by `onPipModeChanged`.
 * Both write the same flag with the same meaning, so they converge:
 * the button is instant feedback, the event is the truth. No tie-break
 * needed, and the event arriving second is a no-op.
 *
 * ## Why the refs
 *
 * `commands`, `state` and `setPipActive` are all new identities on most
 * renders, so a naive `useEffect(..., [commands, state.isPlaying,
 * setPipActive])` would unsubscribe and resubscribe four listeners on
 * every render — and a `play/pause` press landing in that gap would be
 * dropped. Every value the handlers need is therefore read through a ref
 * that is refreshed during render, which lets the effect depend on
 * nothing at all: mount once, unmount once, and let the handlers see
 * whatever is current when a native event finally arrives.
 */

import {useEffect, useRef} from 'react';
import {subscribePlayerEvent} from '@simba-dev/react-native-media-player';
import {usePresentation} from './usePresentation';
import {useTransport} from './useTransport';

/**
 * Subscribe to the native PiP events and keep the app in step with
 * them. Mount ONCE, in the chrome compositor. Fire-and-forget: it owns
 * no state of its own, it only reconciles `pipActive` and routes the PiP
 * window's own transport buttons.
 */
export function usePipBridge(): void {
  const {state, commands} = useTransport();
  const {setPipActive} = usePresentation();

  // Handlers read these so the subscription never needs to be rebuilt.
  const isPlayingRef = useRef(state.isPlaying);
  isPlayingRef.current = state.isPlaying;

  const setPipActiveRef = useRef(setPipActive);
  setPipActiveRef.current = setPipActive;

  const playRef = useRef(commands.play);
  playRef.current = commands.play;
  const pauseRef = useRef(commands.pause);
  pauseRef.current = commands.pause;
  const exitPipRef = useRef(commands.exitPip);
  exitPipRef.current = commands.exitPip;
  const closeRef = useRef(commands.close);
  closeRef.current = commands.close;

  useEffect(() => {
    const unsubscribes = [
      // ── The reconciliation that matters ──
      // Authoritative. Fires for PiP we started AND for PiP the system
      // started, and fires again when the window is dismissed — which
      // is the only way the JS side can learn that the player is
      // fullscreen again.
      subscribePlayerEvent('onPipModeChanged', ({isInPip}) => {
        setPipActiveRef.current(isInPip);
      }),

      // ── The PiP window's own transport buttons ──
      // These are Android's `RemoteCommand` equivalents. Without them
      // the PiP window shows non-functional controls.
      subscribePlayerEvent('onPipPlayPause', () => {
        if (isPlayingRef.current) {
          pauseRef.current();
        } else {
          playRef.current();
        }
      }),

      // "Expand" means "take me back to the fullscreen player", which is
      // the native transition plus clearing the flag. `onPipModeChanged`
      // would also clear it, but doing it here makes the handler
      // idempotent on its own.
      subscribePlayerEvent('onPipExpand', () => {
        exitPipRef.current();
        setPipActiveRef.current(false);
      }),

      // "Close" means "stop playback entirely", not "hide the controls".
      subscribePlayerEvent('onPipClose', () => {
        closeRef.current();
        setPipActiveRef.current(false);
      }),
    ];

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
    // Mount-once by design: every handler input is read through a ref,
    // so no dependency here can ever change. See the module docstring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return undefined;
}
