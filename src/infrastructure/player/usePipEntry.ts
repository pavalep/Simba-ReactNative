/**
 * V22 W23 (2026-11-03) — `usePipEntry()`: the ONE owner of "the app asks
 * the OS for a Picture-in-Picture window".
 *
 * ## What was wrong
 *
 * The user reported that the PiP window showed the app's **full expanded
 * chrome** — the header band with the lock and the bookmark, the scrub
 * row with the elapsed and remaining clocks, and the transport row with
 * the ±10 buttons and the big pause button — scaled down into the small
 * window, and called it "not professional looking at all".
 *
 * It was reproduced on the emulator on 2026-11-03, and the interesting
 * part is what the measurements said:
 *
 *  - `pipActive` was `true`, `mode` was `'pip'`, `isExpanded` was
 *    `false` — the React state was CORRECT.
 *  - The chrome was still PAINTED in the PiP window.
 *  - Tapping the big pause button inside the PiP window did **not** pause
 *    playback.
 *  - The clock froze at `51:09` while the real position was `54:15`.
 *
 * Dead buttons and a frozen clock are the signature of a **stale
 * surface**: the views were gone (so the taps hit nothing) but the
 * pixels were not (so the old chrome stayed on screen).
 *
 * ## Why that happens
 *
 * **An Activity in Picture-in-Picture is "paused, but rendering"**
 * (source.android.com/docs/core/display/pip) — what stops is REACT. RN
 * pauses the React scheduler when the Activity is paused, so a React
 * commit cannot land and no frame is produced. The window's content is
 * therefore whatever it was at the moment of the transition, and the
 * separate video layer keeps compositing on top of it — which is exactly
 * what was measured: live video under a dead, frozen control bar.
 *
 * So the order is the whole contract:
 *
 *   1. the chrome is UNMOUNTED, and
 *   2. the frame that drew it without the chrome is PRESENTED, and
 *   3. only THEN does anything ask the OS for the window.
 *
 * The old code asked for the window FIRST
 * (`commands.enterPip()` then `setPipActive(accepted)`), so the chrome
 * was still mounted at the moment the OS froze the window. The chrome
 * was unmounted a frame later — far too late, because the window was
 * already frozen and never drew again.
 *
 * ## Why a separate request, and not just `pipActive`
 *
 * `pipActive` and "a PiP window has been asked for" are two different
 * facts, and the app needs both:
 *
 *  - `pipActive` decides whether the chrome is mounted. It must be
 *    `true` BEFORE the transition, or the chrome is in the frozen
 *    window.
 *  - the request is what tells this hook to go and ask the OS. It is
 *    cleared when the OS answers, so a refusal can put the chrome back.
 *
 * `requestPip()` writes BOTH in one store update, so there is no frame
 * in which the app has asked for PiP but the chrome is still up.
 *
 * ## Why one animation frame
 *
 * The commit that unmounts the chrome and the draw that shows the
 * chrome-less window are two different frames. The OS's first draw into
 * the PiP surface happens on a frame of its own, but the app cannot
 * know which — so it waits for one frame of its own to be sure the
 * chrome-less one has been presented. One frame is the minimum that
 * makes the guarantee real; two would only add latency the user can see.
 *
 * ## Why the entry lives here and not in the button
 *
 * The button cannot own it. The system can start a PiP window on its
 * own — the platform's auto-enter switch, or a consumer that wants the
 * window when the user leaves the app — and every one of those paths
 * has the same requirement: the chrome must be gone before the OS is
 * asked. One owner, one order, every path.
 */

import {useEffect, useRef} from 'react';
import {subscribePlayerEvent} from '@simba-dev/react-native-media-player';
import {usePresentationStore} from '../../state/usePresentationStore';
import {useTransport} from './useTransport';

/**
 * The owner of the PiP entry.
 *
 * Mount it ONCE, for the whole app session, next to `usePipBridge()` —
 * the same rule applies: a listener that reconciles a state must not be
 * mounted inside a subtree that the state unmounts, and the chrome is
 * exactly the subtree that `pipActive` unmounts.
 */
export function usePipEntry(): void {
  const {commands} = useTransport();
  const pipEntryRequested = usePresentationStore(s => s.pipEntryRequested);
  const resolvePipEntry = usePresentationStore(s => s.resolvePipEntry);

  // `useTransport()` builds a new `commands` object on every render, so
  // the effect below must not depend on its identity — otherwise a
  // re-render would restart the frame wait and the entry would never
  // happen. A ref is the same trick `usePipBridge` uses for its
  // handlers.
  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const resolveRef = useRef(resolvePipEntry);
  resolveRef.current = resolvePipEntry;
  const requestPipRef = useRef(usePresentationStore.getState().requestPip);
  requestPipRef.current = usePresentationStore.getState().requestPip;

  // The user is leaving the app — home, recents, app switcher.
  //
  // The library tells us WHEN (its `onUserLeaveHint` event, raised from
  // the Activity's `onUserLeaveHint()`), because the platform's own
  // auto-enter switch cannot: it makes the SYSTEM transition the Activity
  // with the chrome still mounted, and an Activity in PiP does not
  // redraw — so the chrome would be frozen into the PiP window as a dead,
  // stale layer. That was measured on the emulator on 2026-11-03.
  //
  // The entry below then happens in the only order that works: the chrome
  // is unmounted, the frame that drew it goes by, and only then is the OS
  // asked for the window.
  useEffect(() => {
    const unsubscribe = subscribePlayerEvent('onUserLeaveHint', () => {
      requestPipRef.current();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!pipEntryRequested) return undefined;

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      // The OS's own answer is the only authority on whether the window
      // exists. `false` means it refused, and `resolvePipEntry(false)`
      // puts the chrome back exactly as it was.
      const entered = commandsRef.current.enterPip();
      resolveRef.current(entered);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pipEntryRequested]);
}
