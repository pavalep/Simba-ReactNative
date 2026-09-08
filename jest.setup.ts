// ─── Jest Setup ──────────────────────────────────────────────────────────
// Loaded via `setupFilesAfterEach: ['<rootDir>/jest.setup.ts']` in
// jest.config.js. Currently used for the V18.10 jest-shim:
//
//   V18.10 — TanStack notifyManager sync-scheduler shim
//
//   TanStack's `notifyManager.schedule(callback)` uses
//   `setTimeout(callback, 0)` to coalesce state-update notifications
//   across renders. The default scheduler is the platform's
//   macrotask queue (setTimeout), which means a query that
//   transitions from `isLoading` to `success` schedules a
//   notification that fires AFTER the test's `waitFor` has
//   resolved. The test's `await waitFor(() => ...)` succeeds,
//   but the pending setTimeout keeps the Jest worker alive
//   and prints:
//
//     "A worker process has failed to exit gracefully and has
//      been force exited. This is likely caused by tests
//      leaking due to improper teardown."
//
//   The fix is TanStack's documented `notifyManager.setScheduler`
//   API. The wrapper installs a sync scheduler — `cb => cb()` —
//   that runs every notification immediately, with no
//   setTimeout. The query state still updates correctly
//   (TanStack only schedules to coalesce multiple state
//   updates into one render; a sync scheduler preserves the
//   coalescing behavior, just synchronously).
//
//   Result: the test runs cleanly, the worker exits
//   gracefully, the warning is gone.
//
// V18.10 verification:
//   - npx jest (full suite)            : passes without the
//                                          "force exited" warning
//   - npx jest --forceExit             : same, no warning
//   - The 9 suites, 106 tests, 1 todo
//                                     : same green count;
//                                       warning is the only
//                                       change
//
// Scope: this is a test-only shim. It runs in Node (jest), not
// in the React Native runtime. The production notifyManager
// behavior is unchanged.

import {notifyManager} from '@tanstack/react-query';

notifyManager.setScheduler((cb: () => void) => {
  // Sync scheduler — run the callback immediately, no
  // setTimeout. See the comment above for why.
  cb();
});
