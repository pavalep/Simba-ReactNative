// ─── Jest Setup ──────────────────────────────────────────────────────────
// Loaded via `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']` in
// jest.config.js.
//
// ─── V21 W3 P13 / D-004: notifyManager microtask-scheduler shim ──────────
// (W2 P01 — kept; W3 P13 T13.01 sync shim was tried and reverted —
// see the comment in the file for why.)
//
// TanStack Query's `notifyManager.schedule(callback)` defaults to
// `setTimeout(callback, 0)` to coalesce state-update notifications
// across renders. In a jest test, the pending setTimeout keeps the
// worker alive and prints:
//
//   "A worker process has failed to exit gracefully and has been
//    force exited."
//
// The shim replaces the default with a **microtask** scheduler
// (`Promise.resolve().then(cb)`). Microtasks:
//   1. Do not register a handle with the Node event loop, so the
//      worker exits cleanly (no setTimeout, no setInterval).
//   2. Still run before any macrotask, so the test's
//      `await waitFor(...)` sees the new state in the same turn.
//
// The trade-off: a microtask-fired state update reaches React
// AFTER the test's `act()` block has returned, which prints the
// "An update to X inside a test was not wrapped in act(...)"
// warning. This is D-004 / T13.01 — currently accepted as a
// cosmetic issue; the proper fix is to mock `notifyManager` so the
// state update fires synchronously inside the test's act() block.
// The sync scheduler was tried (see T13.01 commit message) but
// triggered a different warning ("The current testing environment
// is not configured to support act(...)") that the
// `IS_REACT_ACT_ENVIRONMENT` flag (already set by the
// `@react-native/jest-preset`) could not silence — confirming the
// flag-visibility issue noted in D-004.
//
// Production behavior is unchanged: this shim is only loaded in
// `setupFilesAfterEnv`, which jest runs in the test VM context, not
// in the React Native runtime.

import {notifyManager, timeoutManager} from '@tanstack/react-query';

notifyManager.setScheduler((cb: () => void) => {
  // Microtask — see the comment above. `Promise.resolve().then`
  // is a portable microtask schedule that doesn't depend on the
  // `queueMicrotask` global being in the TS lib config.
  Promise.resolve().then(cb);
});

// ─── V22 W22 (2026-11-02): TanStack's TIMERS must not hold the worker ───
//
// The shim above fixed TanStack's NOTIFICATION timer. It did not touch the
// OTHER timers TanStack arms, and one of them is armed by every mutation.
//
// `Removable.scheduleGc()` (query-core) does exactly this:
//
//   timeoutManager.setTimeout(() => this.optionalRemove(), this.gcTime)
//
// A MUTATION's `gcTime` defaults to **five minutes** (`3e5`) — the queries
// in this app's tests already ask for `gcTime: 0`, but a mutation never
// got the same treatment — so the gc timer is a real, five-minute, REF'd
// Node timer. TanStack never clears it (the mutation cache is never
// cleared), and a ref'd timer holds the event loop open.
//
// That is the whole of the "A worker process has failed to exit gracefully
// and has been force exited" warning. Jest closes the worker's IPC channel
// when the run is over and expects the process to fall out of the event
// loop on its own; a five-minute timer is still sitting in it.
//
// The fix is `unref()`. An unref'd timer does NOT keep the event loop
// alive, but it still FIRES whenever the loop is running for any other
// reason — which, during a test, is always (the test's own awaits, the
// runner's IPC channel). So the timer still does its job; it just stops
// being the reason the worker cannot leave.
//
// This is the ONE owner of "TanStack's timers must not hold the jest worker
// open". It is a fact about the TEST ENVIRONMENT, not about one suite, so
// it belongs here — next to the `notifyManager` shim that already owns the
// same fact for notifications.
//
// The `unref` guard is checked at runtime rather than assumed: the DOM
// lib's `setTimeout` returns a number with no `unref`, and a suite running
// under fake timers has none either. In both cases the call is skipped and
// the timer behaves exactly as it did before.

/** A timer handle that Node can `unref()`. */
type UnreffableTimer = {unref?: () => void};

const withoutEventLoopHold = <T>(timer: T): T => {
  const handle = timer as unknown as UnreffableTimer;
  if (handle && typeof handle.unref === 'function') {
    handle.unref();
  }
  return timer;
};

timeoutManager.setTimeoutProvider({
  setTimeout: (callback, delay) =>
    withoutEventLoopHold(setTimeout(callback, delay)),
  clearTimeout: id => {
    if (id !== undefined) {
      clearTimeout(id as ReturnType<typeof setTimeout>);
    }
  },
  setInterval: (callback, delay) =>
    withoutEventLoopHold(setInterval(callback, delay)),
  clearInterval: id => {
    if (id !== undefined) {
      clearInterval(id as ReturnType<typeof setInterval>);
    }
  },
});
