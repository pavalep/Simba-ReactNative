import type {VideoSessionPhase} from '../domain/VideoTypes';

/**
 * v11 T9.3 \u2014 auto-hide trigger contract.
 *
 * The auto-hide timer fires 3 s after the LAST user activity.
 * This module formalises two questions:
 *
 *   1. SHOULD the timer start right now? (the bypass list)
 *   2. DOES this trigger count as one activity or many?
 *      (the high-frequency vs one-shot distinction)
 *
 * Extracted from the host's `useEffect` so the rules are
 * greppable, testable, and don't drift. The host effect
 * just calls `shouldAutoHide({...})` on each render; the
 * trigger list lives here.
 */

/**
 * The 3-second auto-hide window. Per spec 4.10 / W2.11. The
 * host re-runs the auto-hide effect each time the user does
 * something (tap, scrub release, volume/brightness gesture
 * end, sheet dismiss). 3 s after the last such activity the
 * chrome fades.
 */
export const AUTO_HIDE_TIMEOUT_MS = 3000;

/**
 * The set of reasons the auto-hide timer should NOT start
 * (or should pause). Listed as a constant for two reasons:
 *  (a) so a future contributor can grep for "everywhere the
 *      host pauses auto-hide";
 *  (b) so the pure `shouldAutoHide` function in this module
 *      can be unit-tested without a full React render.
 */
export const AUTO_HIDE_BYPASS_REASONS = [
  'noPlayback',       // the host hasn't built a playback yet
  'chromeAlreadyHidden', // don't bother scheduling when it's
                         // already hidden (timer would no-op)
  'notPlaying',       // paused / finished / error / connecting
  'pipMode',           // PiP is a separate surface; chrome is
                       // off by definition
  'sheetOpen',         // the user is interacting with a sheet;
                       // keeping the chrome visible helps them
                       // close it
  'locked',            // the lock mode hides the chrome
                       // entirely; the timer is a no-op
] as const;
export type AutoHideBypassReason = (typeof AUTO_HIDE_BYPASS_REASONS)[number];

export interface AutoHideDecisionInput {
  readonly hasPlayback: boolean;
  readonly chromeAlreadyHidden: boolean;
  readonly phase: VideoSessionPhase;
  readonly isPipLike: boolean;
  readonly sheetOpen: boolean;
  readonly isLocked: boolean;
}

export interface AutoHideDecision {
  readonly shouldHide: boolean;
  readonly reason: AutoHideBypassReason | null;
}

/**
 * Pure function \u2014 does the auto-hide timer make sense to start
 * right now, or is one of the bypass reasons active?
 *
 * The host calls this on every render that touches one of
 * the trigger-list deps. When the answer is `true`, the host
 * schedules the timer; when `false`, the host clears the
 * pending timer (the cleanup function in the useEffect).
 */
export function shouldAutoHide(input: AutoHideDecisionInput): AutoHideDecision {
  if (!input.hasPlayback) {
    return {shouldHide: false, reason: 'noPlayback'};
  }
  if (input.chromeAlreadyHidden) {
    return {shouldHide: false, reason: 'chromeAlreadyHidden'};
  }
  if (input.phase !== 'playing') {
    return {shouldHide: false, reason: 'notPlaying'};
  }
  if (input.isPipLike) {
    return {shouldHide: false, reason: 'pipMode'};
  }
  if (input.sheetOpen) {
    return {shouldHide: false, reason: 'sheetOpen'};
  }
  if (input.isLocked) {
    return {shouldHide: false, reason: 'locked'};
  }
  return {shouldHide: true, reason: null};
}

/**
 * The list of trigger names that the host wires into
 * `setChromeVisible(true)`. The names are stable so that
 * the host's effect can map them to a human-readable
 * diagnostic if needed.
 */
export const AUTO_HIDE_TRIGGERS = [
  'chromeTap',         // user tapped anywhere on the chrome
  'scrubRelease',      // the rail pan gesture's onEnd
  'volumeGestureEnd',  // the volume pan gesture's onEnd
                       // (NOT on each onUpdate \u2014 the spec's
                       //  step 3 error fix: many events per
                       //  gesture must be debounced)
  'brightnessGestureEnd', // same \u2014 brightness pan end
  'sheetDismiss',       // user closed a sheet
  'lockUnlock',         // user tapped the unlock overlay
  'fullscreenToggle',   // user toggled fullscreen
  'resumeSelect',       // user picked Resume on the prompt
] as const;
export type AutoHideTrigger = (typeof AUTO_HIDE_TRIGGERS)[number];

/**
 * v11 T9.3 step 3 error fix: high-frequency triggers (volume
 * pan, brightness pan, scrub drag) fire MANY events per
 * gesture. If we naively call `setChromeVisible(true)` on
 * each event, the auto-hide timer never reaches its 3 s
 * threshold \u2014 the timer keeps resetting every frame.
 *
 * The fix is a debounce: the per-step events are routed to
 * this `isHighFrequencyStep` check. Step events return
 * `true`; the host ignores them. Only the gesture's `onEnd`
 * fires the actual trigger. This is the spec's "one reset
 * per gesture end, not per step" rule.
 */
const HIGH_FREQUENCY_STEP_NAMES: ReadonlySet<string> = new Set([
  'volumePanStep',
  'brightnessPanStep',
  'scrubPanStep',
]);

export function isHighFrequencyStep(triggerName: string): boolean {
  return HIGH_FREQUENCY_STEP_NAMES.has(triggerName);
}
