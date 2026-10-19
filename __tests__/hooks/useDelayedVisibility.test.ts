/**
 * `useDelayedVisibility()` — the buffering indicator's onset delay and
 * minimum visible time.
 *
 * ## Why this needs its own test
 *
 * Two documented rules, and both are invisible to a screenshot:
 *
 *   - **Video.js's buffering indicator**: 500 ms onset delay. A stall
 *     shorter than that is NEVER shown, because a sub-second flicker
 *     reads as a glitch rather than as "the network paused".
 *   - **UX Tigers, "Progress Indicators Ease the Wait"**: once a
 *     progress indicator is on screen it stays up for at least ~0.5 s,
 *     so the user perceives it as an indicator rather than as a flash.
 *
 * The failure this prevents is the exact one the buffering bug had: a
 * spinner that appears and vanishes inside one frame, which the user
 * sees as nothing at all.
 *
 * ## A note on the `act` structure
 *
 * The effect that arms the timer runs at the END of an `act`. So the
 * clock is advanced in a SEPARATE `act` from the re-render that
 * changed the condition. Advancing inside the same `act` measures the
 * delay from the wrong instant — the timer is armed against a clock
 * that has already moved on, and the indicator appears one step late.
 * That is a harness artefact, not hook behaviour, and it is exactly
 * the kind of thing that makes a timing test lie.
 */

import {act, renderHook} from '@testing-library/react-native';
import {useDelayedVisibility} from '../../src/hooks/useDelayedVisibility';

const ONSET_MS = 500;
const MIN_VISIBLE_MS = 500;

describe('useDelayedVisibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show the indicator before the onset delay', async () => {
    const {result} = await renderHook(() => useDelayedVisibility(true));

    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS - 1);
    });
    expect(result.current).toBe(false);
  });

  it('shows the indicator once the onset delay has elapsed', async () => {
    const {result} = await renderHook(() => useDelayedVisibility(true));

    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS);
    });
    expect(result.current).toBe(true);
  });

  it('shows NOTHING when the condition ends inside the onset delay', async () => {
    // The whole point of the onset delay: a stall that resolves in
    // 200 ms must never have put an indicator on screen.
    const {result, rerender} = await renderHook(
      ({active}: {active: boolean}) => useDelayedVisibility(active),
      {initialProps: {active: true}},
    );

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe(false);

    await act(async () => {
      await rerender({active: false});
    });
    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS * 2);
    });

    // The pending onset timer was cancelled, so the indicator never
    // appeared — not even briefly.
    expect(result.current).toBe(false);
  });

  it('keeps the indicator up for the minimum visible time', async () => {
    const {result, rerender} = await renderHook(
      ({active}: {active: boolean}) => useDelayedVisibility(active),
      {initialProps: {active: true}},
    );

    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS);
    });
    expect(result.current).toBe(true);

    // The condition ends 100 ms after the indicator appeared.
    await act(async () => {
      await rerender({active: false});
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    // Still up: 100 ms of a 500 ms minimum is not enough.
    expect(result.current).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(MIN_VISIBLE_MS);
    });
    expect(result.current).toBe(false);
  });

  it('hides immediately when the minimum visible time has already elapsed', async () => {
    const {result, rerender} = await renderHook(
      ({active}: {active: boolean}) => useDelayedVisibility(active),
      {initialProps: {active: true}},
    );

    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS + MIN_VISIBLE_MS);
    });
    expect(result.current).toBe(true);

    await act(async () => {
      await rerender({active: false});
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(result.current).toBe(false);
  });

  it('does not restart the onset delay when the component re-renders', async () => {
    // The timers live in refs and the effect keys on `active` only, so
    // an unrelated re-render cannot push the onset forward forever. If
    // it did, the indicator would never appear at all.
    const {result, rerender} = await renderHook(
      ({active}: {active: boolean}) => useDelayedVisibility(active),
      {initialProps: {active: true}},
    );

    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS - 100);
    });
    await act(async () => {
      await rerender({active: true});
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);
  });

  it('comes back when the condition returns', async () => {
    const {result, rerender} = await renderHook(
      ({active}: {active: boolean}) => useDelayedVisibility(active),
      {initialProps: {active: false}},
    );

    expect(result.current).toBe(false);

    await act(async () => {
      await rerender({active: true});
    });
    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS);
    });
    expect(result.current).toBe(true);

    await act(async () => {
      await rerender({active: false});
    });
    await act(async () => {
      jest.advanceTimersByTime(MIN_VISIBLE_MS);
    });
    expect(result.current).toBe(false);

    await act(async () => {
      await rerender({active: true});
    });
    await act(async () => {
      jest.advanceTimersByTime(ONSET_MS);
    });
    expect(result.current).toBe(true);
  });

  it('honours a custom onset delay', async () => {
    const {result} = await renderHook(() =>
      useDelayedVisibility(true, {onsetDelayMs: 2000, minimumVisibleMs: 500}),
    );

    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });
});
