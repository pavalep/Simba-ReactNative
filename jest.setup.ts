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

import {notifyManager} from '@tanstack/react-query';

notifyManager.setScheduler((cb: () => void) => {
  // Microtask — see the comment above. `Promise.resolve().then`
  // is a portable microtask schedule that doesn't depend on the
  // `queueMicrotask` global being in the TS lib config.
  Promise.resolve().then(cb);
});
