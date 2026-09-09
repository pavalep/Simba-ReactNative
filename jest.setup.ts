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
//   V21 / D-004 (final): wrap the microtask in `act()` from
//   `@testing-library/react-native`. The microtask still runs
//   before any macrotask (so the test's `await waitFor(...)` sees
//   the new state in the same turn) and still doesn't register a
//   handle (so the Jest worker exits cleanly). The `act()` wrap
//   makes React treat the state-update as if it happened inside
//   a test render, which silences the act warning.
//
// V21 verification (P01 T01.02):
//   - npx jest (full suite)            : passes with no
//                                          "force exited" warning
//                                          AND no "act(...)" warning
//   - The 10 suites, 119 tests, 1 todo  : green
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

// ─── React 19 act() environment flag ─────────────────────────────────────
// V21 / D-004: React 19's react-reconciler reads
// `IS_REACT_ACT_ENVIRONMENT` at the call site of every state
// update (`isConcurrentActEnvironment()` in
// `react-reconciler.development.js:13983`). When the flag is
// set, the "The current testing environment is not configured
// to support act(...)" warning is suppressed for state updates
// fired by library code (TanStack Query, Zustand subscribers,
// etc.) — but only when `actQueue` is also null (i.e. we're not
// already inside an explicit `act()` block).
//
// The flag is read at call time, not at module load, so setting
// it after the import statements is fine.
//
// Reference: https://react.dev/reference/react/act#testing
// ("set this flag in your test runner config").
// ─── (No additional act-environment flag here) ───────────────────────────
// V21 / D-004: React 19's react-reconciler reads
// `IS_REACT_ACT_ENVIRONMENT` at the call site of every state
// update. The React Native jest preset's `setup.js` already sets
// `global.IS_REACT_ACT_ENVIRONMENT = true` (see
// `node_modules/@react-native/jest-preset/jest/setup.js:7`), so
// this file does NOT need to set the flag again. The remaining
// act warnings (and the worker-exit warning) have a different
// root cause and are tracked in D-004 / md/SIMBA_V21_DEFECTS.md.
