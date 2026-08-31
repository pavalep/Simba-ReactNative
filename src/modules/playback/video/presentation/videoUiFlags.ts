import Config from 'react-native-config';

/**
 * v11 T7.3 — feature flags for the video UI.
 *
 * Each flag is a build-time override read from the .env
 * (react-native-config). The default in code is the
 * "shipped" behavior; the env override exists for two
 * reasons:
 *   1. diagnostic on TextureView-storming devices (some
 *      Android 9/10 emulators + a handful of low-end
 *      Huawei/Honor devices mount two mpv surfaces per
 *      mini<->full transition and the layout work outruns
 *      the 280 ms shell animation — the env override
 *      pins the build to "mini = static poster only").
 *   2. future A/B by toggling a single env var without
 *      a code change.
 *
 * The pattern matches `src/constants/env.ts`: an
 * `import Config from 'react-native-config'` followed by a
 * `readBoolEnv(key, default)` helper that parses the
 * common truthy / falsy strings ("true" / "false" / "1" /
 * "0" / "on" / "off", case-insensitive). Unknown values
 * fall through to the default — the flag never throws.
 */

function readBoolEnv(name: string, fallback: boolean): boolean {
  const raw = (Config as unknown as Record<string, string | undefined>)[name];
  if (raw === undefined || raw === null) return fallback;
  const lowered = raw.trim().toLowerCase();
  if (lowered === 'true' || lowered === '1' || lowered === 'on') return true;
  if (lowered === 'false' || lowered === '0' || lowered === 'off') return false;
  return fallback;
}

export const VIDEO_UI_FLAGS = {
  /**
   * When `true` (default), the mini player's 96×54 frame slot
   * renders the live mpv surface in addition to the
   * entry-image / gold-placeholder fallback chain. When
   * `false`, the slot only ever shows the poster chain —
   * the live surface is reserved for the full player (this
   * is the pre-T7.2 mini behavior). Useful on devices
   * where mounting two surfaces (mini + full) per
   * transition stalls the 280 ms shell animation.
   *
   * Override at build time:
   *   SIMBA_VIDEO_MINI_LIVE_SURFACE=false
   */
  miniLiveSurface: readBoolEnv('SIMBA_VIDEO_MINI_LIVE_SURFACE', true),
  /**
   * v11 T7.3: the auto-degrade threshold. If the host
   * records more than this many surface size changes within
   * a single transition window (see TRANSITION_DURATION_MS),
   * a diagnostic warning is logged suggesting the user flip
   * `miniLiveSurface` to false. Default 4 — empirically
   * observed on Pixel 4 + Android 10 emulator.
   */
  surfaceChangeWarnThreshold: 4,
} as const;

export type VideoUiFlag = keyof typeof VIDEO_UI_FLAGS;

/**
 * v11 T7.3 — surface-change counter for the auto-degrade
 * hook. Pure helper, no React. `reset()` starts a new
 * transition window; `record(now)` returns the running count
 * (1-based) within the current window, opening a new window
 * automatically when the previous one expires.
 *
 * The window is intentionally short (TRANSITION_DURATION_MS,
 * 280 ms by default). A texture-view-storm device that
 * re-lays more than 4 times within a single mini<->full
 * flip is misbehaving at the native level; the diagnostic
 * is a one-shot log + a recommendation to flip the flag.
 * The flag is never auto-toggled — the decision is the
 * user's / a future PR's.
 */
export interface SurfaceChangeCounter {
  reset(now?: number): void;
  record(now?: number): number;
  count(): number;
}

export function createSurfaceChangeCounter(
  windowMs: number,
  now: () => number = () => Date.now(),
): SurfaceChangeCounter {
  // Start the window in the far past so the first `record()`
  // always opens a fresh window (without needing a separate
  // "initialized" boolean \u2014 the first call checks
  // `now - (-windowMs - 1) > windowMs` which is trivially
  // true).
  let windowStart = -windowMs - 1;
  let current = 0;
  return {
    reset(timestamp = now()) {
      windowStart = timestamp;
      current = 0;
    },
    record(timestamp = now()) {
      if (timestamp - windowStart > windowMs) {
        windowStart = timestamp;
        current = 0;
      }
      current += 1;
      return current;
    },
    count() {
      return current;
    },
  };
}
