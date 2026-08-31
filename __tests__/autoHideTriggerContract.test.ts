/**
 * v11 T9.3 \u2014 auto-hide trigger contract.
 *
 * Coverage:
 *   T9.3: shouldAutoHide returns `true` (timer fires) only when
 *         all six conditions are met: playback exists, chrome
 *         is currently visible, phase is 'playing', not in
 *         PiP, no sheet open, not locked.
 *   T9.3: each bypass reason is reported with a stable string
 *         (greppable) so future contributors can find every
 *         place the host pauses auto-hide.
 *   T9.3: AUTO_HIDE_TIMEOUT_MS is 3000 (per spec 4.10).
 *   T9.3: AUTO_HIDE_TRIGGERS lists every chrome trigger the
 *         host wires up; AUTO_HIDE_BYPASS_REASONS lists every
 *         reason the timer pauses.
 *   T9.3 (step 3 error fix): isHighFrequencyStep returns true
 *         for volume / brightness / scrub pan STEP events so
 *         the host can drop them at the trigger boundary (the
 *         gesture's `onEnd` is the actual trigger).
 */
import {
  AUTO_HIDE_BYPASS_REASONS,
  AUTO_HIDE_TIMEOUT_MS,
  AUTO_HIDE_TRIGGERS,
  isHighFrequencyStep,
  shouldAutoHide,
  type AutoHideBypassReason,
  type AutoHideTrigger,
} from '../src/modules/playback/video/presentation/autoHideTriggerContract';

describe('AUTO_HIDE_TIMEOUT_MS \u2014 T9.3', () => {
  test('is 3000 ms per spec 4.10', () => {
    expect(AUTO_HIDE_TIMEOUT_MS).toBe(3000);
  });
});

describe('AUTO_HIDE_BYPASS_REASONS \u2014 T9.3 contract surface', () => {
  test('lists every reason the host pauses auto-hide', () => {
    expect(AUTO_HIDE_BYPASS_REASONS).toEqual([
      'noPlayback',
      'chromeAlreadyHidden',
      'notPlaying',
      'pipMode',
      'sheetOpen',
      'locked',
    ]);
  });

  test('is a non-empty readonly array of unique strings', () => {
    expect(AUTO_HIDE_BYPASS_REASONS.length).toBeGreaterThan(0);
    const set = new Set<string>(AUTO_HIDE_BYPASS_REASONS);
    expect(set.size).toBe(AUTO_HIDE_BYPASS_REASONS.length);
  });
});

describe('AUTO_HIDE_TRIGGERS \u2014 T9.3 trigger list', () => {
  test('includes every chrome trigger the host wires up', () => {
    // These are the triggers the host SHOULD be calling. If a
    // future wave adds a new trigger it MUST be appended here
    // (the test fails as a reminder to update the contract).
    expect(AUTO_HIDE_TRIGGERS).toEqual([
      'chromeTap',
      'scrubRelease',
      'volumeGestureEnd',
      'brightnessGestureEnd',
      'sheetDismiss',
      'lockUnlock',
      'fullscreenToggle',
      'resumeSelect',
    ]);
  });
});

describe('shouldAutoHide \u2014 T9.3 pure decision function', () => {
  // The happy path: every input is in the "auto-hide OK" state.
  // The function should return shouldHide=true, reason=null.
  test('returns true with reason=null when all conditions are met', () => {
    const decision = shouldAutoHide({
      hasPlayback: true,
      chromeAlreadyHidden: false,
      phase: 'playing',
      isPipLike: false,
      sheetOpen: false,
      isLocked: false,
    });
    expect(decision.shouldHide).toBe(true);
    expect(decision.reason).toBeNull();
  });

  test('returns false with reason=noPlayback when playback is null', () => {
    const decision = shouldAutoHide({
      hasPlayback: false,
      chromeAlreadyHidden: false,
      phase: 'playing',
      isPipLike: false,
      sheetOpen: false,
      isLocked: false,
    });
    expect(decision.shouldHide).toBe(false);
    expect(decision.reason).toBe<AutoHideBypassReason>('noPlayback');
  });

  test('returns false with reason=chromeAlreadyHidden when chrome is hidden', () => {
    const decision = shouldAutoHide({
      hasPlayback: true,
      chromeAlreadyHidden: true,
      phase: 'playing',
      isPipLike: false,
      sheetOpen: false,
      isLocked: false,
    });
    expect(decision.shouldHide).toBe(false);
    expect(decision.reason).toBe<AutoHideBypassReason>('chromeAlreadyHidden');
  });

  test.each([
    ['paused'],
    ['finished'],
    ['error'],
    ['connecting'],
    ['idle'],
    ['preparing'],
    ['first-frame'],
    ['ready'],
  ] as const)('returns false with reason=notPlaying for phase=%s', phase => {
    const decision = shouldAutoHide({
      hasPlayback: true,
      chromeAlreadyHidden: false,
      phase,
      isPipLike: false,
      sheetOpen: false,
      isLocked: false,
    });
    expect(decision.shouldHide).toBe(false);
    expect(decision.reason).toBe<AutoHideBypassReason>('notPlaying');
  });

  test('returns false with reason=pipMode when in PiP', () => {
    const decision = shouldAutoHide({
      hasPlayback: true,
      chromeAlreadyHidden: false,
      phase: 'playing',
      isPipLike: true,
      sheetOpen: false,
      isLocked: false,
    });
    expect(decision.shouldHide).toBe(false);
    expect(decision.reason).toBe<AutoHideBypassReason>('pipMode');
  });

  test('returns false with reason=sheetOpen when a sheet is open', () => {
    const decision = shouldAutoHide({
      hasPlayback: true,
      chromeAlreadyHidden: false,
      phase: 'playing',
      isPipLike: false,
      sheetOpen: true,
      isLocked: false,
    });
    expect(decision.shouldHide).toBe(false);
    expect(decision.reason).toBe<AutoHideBypassReason>('sheetOpen');
  });

  test('returns false with reason=locked when the player is locked', () => {
    const decision = shouldAutoHide({
      hasPlayback: true,
      chromeAlreadyHidden: false,
      phase: 'playing',
      isPipLike: false,
      sheetOpen: false,
      isLocked: true,
    });
    expect(decision.shouldHide).toBe(false);
    expect(decision.reason).toBe<AutoHideBypassReason>('locked');
  });

  test('bypass reasons are checked in priority order (noPlayback first)', () => {
    // Both noPlayback AND notPlaying are true. The first
    // check wins \u2014 the function returns noPlayback, not
    // notPlaying. This locks the priority order so future
    // contributors don't accidentally reorder the gates.
    const decision = shouldAutoHide({
      hasPlayback: false,
      chromeAlreadyHidden: false,
      phase: 'paused',
      isPipLike: false,
      sheetOpen: false,
      isLocked: false,
    });
    expect(decision.reason).toBe<AutoHideBypassReason>('noPlayback');
  });
});

describe('isHighFrequencyStep \u2014 T9.3 step 3 error fix (debounce)', () => {
  test('returns true for volume/brightness/scrub pan STEP events', () => {
    expect(isHighFrequencyStep('volumePanStep')).toBe(true);
    expect(isHighFrequencyStep('brightnessPanStep')).toBe(true);
    expect(isHighFrequencyStep('scrubPanStep')).toBe(true);
  });

  test('returns false for one-shot trigger names', () => {
    // These are the gesture's onEnd + other discrete events.
    // The host fires them exactly once per user action.
    AUTO_HIDE_TRIGGERS.forEach((trigger: AutoHideTrigger) => {
      expect(isHighFrequencyStep(trigger)).toBe(false);
    });
  });

  test('returns false for unknown names (defensive: don\u2019t drop unrecognised triggers)', () => {
    expect(isHighFrequencyStep('unknownTrigger')).toBe(false);
    expect(isHighFrequencyStep('')).toBe(false);
  });
});
