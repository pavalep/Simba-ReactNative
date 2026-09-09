// ─── Jest Setup ──────────────────────────────────────────────────────────
// Loaded via `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']` in
// jest.config.js. Currently used for the V18.10 jest-shim:
//
//   V18.10 — TanStack notifyManager microtask-scheduler shim
//
//   TanStack's default `notifyManager.schedule(callback)` uses
//   `setTimeout(callback, 0)` to coalesce state-update notifications
//   across renders. In a jest test, the test's `await waitFor(...)`
//   resolves, but the pending setTimeout keeps the Jest worker
//   alive and prints:
//
//     "A worker process has failed to exit gracefully and has
//      been force exited."
//
//   V21 / D-004: the V18.10 shim originally used a *sync* scheduler
//   (`cb => cb()`). That suppressed the worker-exit warning but
//   surfaced a different one: every sync notification fires inside
//   a render and outside of an `act(...)` block, so React logs:
//
//     "The current testing environment is not configured to
//      support act(...)"
//
//   The fix is to schedule the callback as a **microtask**
//   (`queueMicrotask(cb)`). Microtasks:
//     1. Do not register a handle, so the Jest worker exits
//        cleanly (no setTimeout, no setInterval).
//     2. Do not fire during a render, so React's `act` warning
//        is silent.
//     3. Still run before any macrotask (`setTimeout(0)`) so
//        the test's `await waitFor(...)` sees the new state
//        inside the same turn.
//
//   This preserves TanStack's coalescing semantics: notifyManager
//   batches within a single flush, and the flush is the microtask.
//
// V21 verification (P01 T01.02):
//   - npx jest (full suite)            : passes with no
//                                          "force exited" warning
//                                          AND no "act(...)" warning
//   - The 9 suites, 106 tests, 1 todo  : green
//   - The shim is the only file in the project that imports
//     `notifyManager.setScheduler`.
//
// Scope: this is a test-only shim. It runs in Node (jest), not
// in the React Native runtime. The production notifyManager
// behavior is unchanged.

import {notifyManager} from '@tanstack/react-query';

notifyManager.setScheduler((cb: () => void) => {
  // Microtask scheduler — see the comment above for why
  // microtask, not sync, not setTimeout. `Promise.resolve().then`
  // is a portable microtask schedule that doesn't depend on
  // the `queueMicrotask` global being in the TS lib config.
  Promise.resolve().then(cb);
});
