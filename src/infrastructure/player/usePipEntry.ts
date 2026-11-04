/**
 * V22 W23 (2026-11-03) — `usePipEntry()`: the ONE owner of the app's
 * FOREGROUND Picture-in-Picture entry — the one the user asks for by
 * tapping the PiP button.
 *
 * ## There are two entry paths, and they are not interchangeable
 *
 *  - The **button** path runs in the foreground. React can unmount the
 *    chrome, wait for the frame that drew the chrome-less window, and only
 *    then ask the OS for the window. That is this hook.
 *
 *  - The **HOME** path runs while the Activity is being backgrounded, and
 *    RN freezes TWO things with the Activity — so a React-driven entry
 *    CANNOT work there:
 *
 *      1. FABRIC STOPS APPLYING MOUNT ITEMS.
 *         `FabricUIManager.onHostPause()` removes the `DISPATCH_UI` frame
 *         callback, and mount items are applied only from that callback's
 *         `doFrameGuarded` — so React still RENDERS, but the results
 *         never reach the native view tree.
 *         (`ReactAndroid/src/main/java/com/facebook/react/fabric/
 *         FabricUIManager.java:1250-1253`, `:1567-1574`, `:1617-1624`)
 *
 *      2. THE JS TIMER MANAGER FREEZES, so `requestAnimationFrame` never
 *         fires: it is a zero-delay timer on that same registry.
 *         (`ReactAndroid/src/main/java/com/facebook/react/modules/core/
 *         JavaTimerManager.kt:72-76`, `:290-293`;
 *         `ReactCommon/react/runtime/TimerManager.cpp:360-367`)
 *
 *    The JS runtime keeps running; what stops is the hand-off to the
 *    native views and the frame clock. Measured on emulator-5554 (API 37)
 *    on 2026-11-03: the leave hint reached JS immediately, but the effect
 *    that would have driven the entry ran 5.7 s late and its
 *    `requestAnimationFrame` NEVER fired, so no PiP window opened at all.
 *    That path is the LIBRARY's, and it is native:
 *    `MainActivity.onUserLeaveHint()` hands the Activity to the library,
 *    which hides the chrome with a native `visibility = GONE` and asks the
 *    OS for the window itself.
 *
 * ## What was wrong (the chrome in the PiP window)
 *
 * The user reported that the PiP window showed the app's **full expanded
 * chrome** — the header band with the lock and the bookmark, the scrub row
 * with the elapsed and remaining clocks, and the transport row with the
 * ±10 buttons and the big pause button — scaled down into the small
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
 * surface**: the views were gone (so the taps hit nothing) but the pixels
 * were not (so the old chrome stayed on screen).
 *
 * ## Why that happens
 *
 * **An Activity in Picture-in-Picture is "paused, but rendering"**
 * (source.android.com/docs/core/display/pip) — what stops is the
 * REACT-TO-NATIVE pipeline, in the two places listed above: Fabric stops
 * applying mount items, so a React commit never reaches the native view
 * tree, and the JS timer manager freezes, so no frame is ever scheduled.
 * The window's content is therefore whatever it was at the moment of the
 * transition, and the separate video layer keeps compositing on top of it
 * — which is exactly what was measured: live video under a dead, frozen
 * control bar.
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
 * ## Why this hook does NOT listen for the user leaving
 *
 * It used to. The library raised an `onUserLeaveHint` event from the
 * Activity's `onUserLeaveHint()` and this hook answered it by calling
 * `requestPip()` — which drove the entry from JS.
 *
 * That cannot work, for the reason in the first section: by the time the
 * event is handled the Activity is already pausing, React's scheduler is
 * paused with it, and the animation frame this hook needs never comes.
 * The library now performs that entry itself, natively, and the event is
 * gone — because an event whose only consumer was the path the library
 * took over would be a double-entry footgun: the OS would refuse the
 * second entry, the app would read that refusal as "PiP failed", and the
 * chrome would come back over a live PiP window.
 */

import {useEffect, useRef} from 'react';
import {usePresentationStore} from '../../state/usePresentationStore';
import {useTransport} from './useTransport';

/**
 * The owner of the foreground PiP entry.
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
