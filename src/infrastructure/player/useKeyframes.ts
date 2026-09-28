/**
 * V19 W3.5 Phase 3.5.2 — `useKeyframes` hook (stub for the
 * lib-side keyframe pre-sampler).
 *
 * The TRACKER §"Keyframe pre-sampling (lib-side prerequisite)"
 * says the lib is responsible for sampling 10 evenly-spaced
 * keyframes via mpv `--screenshot` during `preparing`. The chrome
 * consumes the result via this hook.
 *
 * **W3.5.2 status (2026-09-28): STUB.** The lib doesn't yet
 * expose keyframes; this hook returns `{samples: []}`. The
 * ScrubPreview component renders timestamp-only when no
 * samples are available (per the spec §"Never renders a
 * placeholder / loading spinner for missing thumbnail").
 *
 * Once the lib-side keyframe sampling lands, swap the stub
 * for a real subscription. The consumer's surface (a
 * `KeyframeSample[]` of `{positionMs, uri}`) won't change.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.7 + TRACKER Phase 3.5.2.
 */

import {useMemo} from 'react';

export interface KeyframeSample {
  /** Position in milliseconds the sample represents. */
  positionMs: number;
  /**
   * URI to the cached thumbnail image (mpv `--screenshot`
   * output, written to the lib's per-item cache). Empty when
   * the sample has no image yet.
   */
  uri: string;
}

export interface KeyframesState {
  /** Pre-sampled keyframes for the current file (≤ 10 entries). */
  samples: KeyframeSample[];
  /**
   * True while the lib is currently sampling new keyframes
   * (during the next `preparing` cycle). The chrome does NOT
   * render a loading spinner — the spec explicitly forbids it.
   */
  isSampling: boolean;
}

/**
 * Hook that returns the current file's keyframe samples.
 * Today: stub returning an empty list. The lib-side sampler
 * lands in a follow-up bridge update.
 */
export function useKeyframes(): KeyframesState {
  return useMemo<KeyframesState>(
    () => ({samples: [], isSampling: false}),
    [],
  );
}

/**
 * Pure helper: find the keyframe sample closest to a target
 * position. Returns the sample whose `positionMs` is within
 * half a window of the target — useful when the scrub preview
 * needs the nearest snapshot for the current scrub position.
 *
 * `samples` is assumed to be sorted by `positionMs` ascending.
 */
export function findClosestKeyframe(
  samples: ReadonlyArray<KeyframeSample>,
  positionMs: number,
): KeyframeSample | null {
  if (samples.length === 0) return null;
  // Binary search would be nicer, but samples.length <= 10 so a
  // linear scan is fine and keeps the helper dependency-free.
  let best = samples[0];
  let bestDelta = Math.abs(samples[0].positionMs - positionMs);
  for (let i = 1; i < samples.length; i++) {
    const delta = Math.abs(samples[i].positionMs - positionMs);
    if (delta < bestDelta) {
      best = samples[i];
      bestDelta = delta;
    }
  }
  return best;
}
