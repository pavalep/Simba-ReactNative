/// <reference types="node" />
/**
 * TanStack's timers must not hold the jest worker open.
 *
 * ## The symptom this pins
 *
 * A full jest run prints:
 *
 *   "A worker process has failed to exit gracefully and has been force
 *    exited."
 *
 * The suite is green and the exit code is 0 — it is a TEARDOWN symptom, not
 * a failure. Jest closes the worker's IPC channel when the run is over and
 * expects the process to fall out of the event loop on its own. Anything
 * still ref'd in that loop stops it, and jest force-exits the worker.
 *
 * ## What was actually holding it
 *
 * `Removable.scheduleGc()` (query-core) arms
 * `timeoutManager.setTimeout(() => this.optionalRemove(), this.gcTime)`.
 * A **mutation's** `gcTime` defaults to **five minutes** (`3e5`) — the
 * queries in this app's tests already ask for `gcTime: 0`, but a mutation
 * never got the same treatment — and the mutation cache is never cleared,
 * so TanStack never cancels that timer. A five-minute REF'd timer was
 * keeping the worker alive.
 *
 * It was invisible to every earlier measurement because a LONE test file
 * runs **in band** (jest's own rule), so the worker is the main process
 * and there is nothing to force-exit. The warning needs at least two
 * suites in a worker.
 *
 * ## The fix
 *
 * `jest.setup.ts` installs a timeout provider whose timers are `unref()`'d.
 * An unref'd timer does not keep the event loop alive, but it still fires
 * whenever the loop is running for any other reason — which, during a
 * test, is always.
 *
 * These tests pin the CONTRACT ("a timer TanStack schedules in this
 * environment does not hold the event loop open"), so removing the
 * provider fails here rather than coming back as a warning nobody can
 * reproduce.
 */

import React from 'react';
import {act, renderHook, waitFor} from '@testing-library/react-native';
import {
  QueryClient,
  QueryClientProvider,
  timeoutManager,
} from '@tanstack/react-query';
import {useApiMutation} from '../../src/hooks/useApiQuery';

/**
 * Node's timer handle, and the two questions this file asks of it:
 * `hasRef()` — is it holding the event loop open? — and `unref()`, the
 * call that answers "no".
 */
type NodeTimer = {hasRef?: () => boolean; unref?: () => void};

/** TanStack's default MUTATION `gcTime`: five minutes, in milliseconds. */
const DEFAULT_MUTATION_GC_MS = 300_000;

describe('the jest environment — TanStack timers do not hold the worker open', () => {
  it("a timeout TanStack schedules is NOT ref'd", () => {
    const id = timeoutManager.setTimeout(() => {}, 60_000);
    const timer = id as unknown as NodeTimer;

    expect(typeof timer.hasRef).toBe('function');
    expect(timer.hasRef!()).toBe(false);

    timeoutManager.clearTimeout(id);
  });

  it("an interval TanStack schedules is NOT ref'd", () => {
    const id = timeoutManager.setInterval(() => {}, 60_000);
    const timer = id as unknown as NodeTimer;

    expect(typeof timer.hasRef).toBe('function');
    expect(timer.hasRef!()).toBe(false);

    timeoutManager.clearInterval(id);
  });

  it("the gc timer a MUTATION arms is NOT ref'd — this is the leak", async () => {
    // Spy on the global timer so the timer TanStack arms can be found by
    // its DELAY: the mutation's gc timer is the only one armed at the
    // default five-minute `gcTime`. Everything else in this test (the
    // runner's own timers, `waitFor`'s polling) is short-lived and
    // legitimately ref'd.
    const spy = jest.spyOn(global, 'setTimeout');

    try {
      const client = new QueryClient({
        defaultOptions: {
          queries: {retry: false, gcTime: 0},
          // No `gcTime` on the mutations — deliberately, so this test
          // exercises the DEFAULT that caused the leak.
          mutations: {retry: false},
        },
      });
      const wrapper = ({children}: {children: React.ReactNode}) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );

      const {result} = await renderHook(
        () => useApiMutation({mutationFn: async () => 'ok'}),
        {wrapper},
      );

      await act(async () => {
        result.current.mutate();
      });
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const gcTimers = spy.mock.calls
        .map((call, index) => ({
          delay: call[1],
          timer: spy.mock.results[index]?.value as NodeTimer,
        }))
        .filter(
          entry =>
            entry.delay === DEFAULT_MUTATION_GC_MS &&
            typeof entry.timer?.hasRef === 'function',
        );

      // The timer WAS armed — otherwise this test would pass vacuously.
      expect(gcTimers.length).toBeGreaterThan(0);

      // ...and it does not hold the event loop open.
      gcTimers.forEach(entry => {
        expect(entry.timer.hasRef!()).toBe(false);
      });
    } finally {
      spy.mockRestore();
    }
  });
});
