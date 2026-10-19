/**
 * `useDelayedVisibility()` — delay an indicator's ONSET, and hold it
 * on screen for a minimum time once it is there.
 *
 * ## Why
 *
 * A buffering spinner that flickers is worse than no spinner at all.
 * Two well-documented rules say so, and this hook implements both:
 *
 *   - **Video.js's buffering indicator**: 500 ms onset delay, and an
 *     IMMEDIATE hide. A stall shorter than the delay is never shown,
 *     because a sub-second flicker reads as a glitch, not as "the
 *     network paused for a moment".
 *   - **UX Tigers, "Progress Indicators Ease the Wait"**: once a
 *     progress indicator is on screen it should stay up for at least
 *     ~0.5 s, so the user actually perceives it as an indicator
 *     rather than as a flash.
 *
 * The two rules together mean a spinner that appears stays long enough
 * to read, and one that would have been a flash never appears.
 *
 * ## The shape of the transition
 *
 * ```
 *   active ──── true ─────────────────────────────►
 *             │  (wait onsetDelayMs)              │
 *             └──► visible ────────────────────────┘
 *                       │  (wait until minimumVisibleMs has elapsed)
 *   active ──── false ─┴─────────────────────────► hidden
 * ```
 *
 * A stall that ENDS inside the onset delay shows nothing at all: the
 * timer is cancelled, and the indicator never existed.
 *
 * A stall that ends inside the minimum-visible window keeps the
 * indicator up until the window closes — the indicator was shown, so
 * it is not yanked away mid-glance.
 *
 * ## Why the timers live in refs
 *
 * The effect keys on `active` only. If the timers were state, a
 * re-render for any other reason would restart the onset delay and the
 * indicator would never appear at all (the delay would keep being
 * pushed forward by unrelated renders). The refs hold the pending
 * timer and the moment the indicator became visible, and the effect
 * reads them.
 *
 * `Date.now()` is used rather than a counter so the minimum-visible
 * window is measured in wall-clock time — the thing the user actually
 * perceives — and so it survives a re-render that resets a counter.
 */

import {useCallback, useEffect, useRef, useState} from 'react';

export interface DelayedVisibilityOptions {
  /**
   * How long the condition must hold before the indicator appears.
   * Default 500 ms (Video.js's buffering-indicator onset delay).
   */
  onsetDelayMs?: number;
  /**
   * How long the indicator stays up once it has appeared.
   * Default 500 ms (UX Tigers' minimum visible time).
   */
  minimumVisibleMs?: number;
}

/**
 * Returns `true` while the indicator should be on screen.
 *
 * @param active the raw condition — "is the player stalled right now"
 * @param options the two thresholds; see `DelayedVisibilityOptions`
 */
export function useDelayedVisibility(
  active: boolean,
  options: DelayedVisibilityOptions = {},
): boolean {
  const {onsetDelayMs = 500, minimumVisibleMs = 500} = options;

  const [visible, setVisible] = useState(false);

  // Mirrors `visible` so the effect can read the CURRENT value without
  // having to list it as a dependency (which would restart the timers
  // on every visibility change).
  const visibleRef = useRef(false);
  // When the indicator became visible — the origin of the
  // minimum-visible window.
  const shownAtRef = useRef(0);
  // The pending timer, if any.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyVisibility = useCallback((next: boolean) => {
    visibleRef.current = next;
    setVisible(next);
  }, []);

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (active) {
      if (visibleRef.current) {
        // Already on screen. A pending hide is cancelled, so the
        // indicator survives the stall that ended and the next one
        // beginning without a gap.
        clearPendingTimer();
        return;
      }
      // Not visible yet. Any pending hide is stale (the indicator was
      // already hidden), and the onset delay starts now.
      clearPendingTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        shownAtRef.current = Date.now();
        applyVisibility(true);
      }, onsetDelayMs);
      return;
    }

    // The condition ended.
    if (!visibleRef.current) {
      // Never shown (or already hidden) — cancel a pending onset so a
      // stall that ended inside the delay shows nothing.
      clearPendingTimer();
      return;
    }
    const elapsed = Date.now() - shownAtRef.current;
    const remaining = minimumVisibleMs - elapsed;
    if (remaining <= 0) {
      clearPendingTimer();
      applyVisibility(false);
      return;
    }
    // Shown, but not for long enough yet — hold it until the window
    // closes.
    clearPendingTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      applyVisibility(false);
    }, remaining);
  }, [active, onsetDelayMs, minimumVisibleMs, applyVisibility, clearPendingTimer]);

  // Unmount cleanup: a pending timer must not fire into a dead tree.
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  return visible;
}
