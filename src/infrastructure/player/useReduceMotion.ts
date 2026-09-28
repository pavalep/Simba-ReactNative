/**
 * V19 W3.6.8 — `useReduceMotion` hook.
 *
 * Wraps React Native's `AccessibilityInfo.isReduceMotionEnabled()`,
 * with a thin React-state layer that re-renders subscribers when
 * the system setting changes.
 *
 * Defaults to `false` (no reduce motion) on platforms that don't
 * expose the API (web preview, lib stub) — the chrome still
 * renders correctly without animation, just with normal fades.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md`
 * Phase 3.6.8 + `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.W3.6.8.
 *
 * WCAG 2.2 reference: this hook is the chrome-side wiring for
 * the WCAG 2.3.3 (Animation from Interactions) criterion for
 * users with `prefers-reduced-motion: reduce` enabled in the OS.
 */

import * as React from 'react';
import {
  AccessibilityInfo,
  type AccessibilityChangeEventName,
} from 'react-native';

export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!cancelled) setReduceMotion(value ?? false);
    }).catch(() => {
      // Bridge not wired (jest / web preview) — keep the default
      // `false` (full-fade chrome).
    });
    const eventName: AccessibilityChangeEventName =
      'reduceMotionChanged';
    const sub = AccessibilityInfo.addEventListener(eventName, next => {
      setReduceMotion(Boolean(next));
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduceMotion;
}
