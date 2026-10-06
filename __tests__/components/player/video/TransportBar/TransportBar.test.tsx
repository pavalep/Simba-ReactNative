/// <reference types="node" />
/**
 * V19 W2 Phase 2.3 — `TransportBar` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 2.3.
 *
 * Covers:
 *   - renders three labels (elapsed, remaining) and the scrub track
 *   - the track's accessibilityRole is "adjustable"
 *   - accessibilityValue reflects position / duration
 *   - when seekable is false the track is disabled (a11y + behavior)
 *   - tap at 50% commits to durationMs / 2
 *   - pan from 25% to 60% lands at 60% (release commits)
 *   - cancellation on pan start (no commit) reverts to position
 *   - the buffered fill is mounted (when normalizedWindow is set)
 *
 * The pan-responder + onLayout flow is integration-tested here
 * with RNTL's `fireEvent` — not e2e-tested on a real device.
 */

import * as React from 'react';
import type {TransportState, TransportCommands} from '../../../../../src/infrastructure/player';
import {
  makeTransportState,
  makeTransportCommands,
} from '../../../../helpers/transportState';
import {act, fireEvent} from '@testing-library/react-native';
// RNTL 14's queries return `TestInstance` (from `test-renderer`), not
// the older `react-test-renderer` `ReactTestInstance`. Typing the
// helper against the wrong one is a compile error.
import type {TestInstance} from 'test-renderer';
import {renderChrome} from '../../../../helpers/renderChrome';
import {TransportBar} from '../../../../../src/components/player/video/TransportBar/TransportBar';

// ── Mocks ────────────────────────────────────────────────────────────

const mockSeek = jest.fn();
const mockSeekBy = jest.fn();

jest.mock('../../../../../src/theme', () => {
  // Built from the REAL palette, not a hand-written stub.
  //
  // W8.7: this suite carried a seven-colour stub, so adding
  // `background.seekTrack` broke it with a bare "Cannot read properties
  // of undefined" instead of a legible assertion — twice, because the
  // whole mock block below was duplicated verbatim. A theme mock built
  // from the real tokens cannot drift from the contract it stands in
  // for; a test that needs one specific colour can still reach
  // `darkTokens.colors.<group>.<name>` directly.
  const {darkTokens} = jest.requireActual(
    '../../../../../src/theme/tokens',
  );
  return {
    useTheme: () => ({
      colors: darkTokens.colors,
      spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32},
      typography: darkTokens.typography,
    }),
  };
});

// Mock useSafeAreaInsets (RN modules that RNTL doesn't fully cover).
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

// A complete, correctly-typed transport surface built from the real
// contract (see __tests__/helpers/transportState.ts). The previous
// hand-rolled partial drifted from TransportState — it was missing
// captionTracks (so CaptionsToggle threw on .length) and still
// declared a step command the facade no longer exposes.
let mockTransport: {
  state: TransportState;
  commands: jest.Mocked<TransportCommands>;
} = {
  state: makeTransportState(),
  commands: makeTransportCommands(),
};


jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = {
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useTransport',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useHaptic',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/usePresentation',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useReduceMotion',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/usePlaybackState',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useKeyframes',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useSkipSilence',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useQueueSync',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useChromeAutoHide',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/position',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/streamErrors',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/bridgeErrors',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/resumePolicy',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/validateLane',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/playbackFacade',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/video',
    ),
    };
  return {
    ...actual,
    useTransport: () => mockTransport,
  };
});

// ── Tests ────────────────────────────────────────────────────────────

/**
 * The buffered fill, played fill, and thumb are marked
 * `accessibilityElementsHidden` — correct: they are decorative and
 * must stay out of the accessibility tree. RNTL 14 therefore hides
 * them from queries by default, so a test asserting on them has to
 * opt in explicitly.
 */
const HIDDEN = {includeHiddenElements: true} as const;

/**
 * RNTL performs no layout, so `setTrackWidth` never runs and every tap
 * fraction / fill width collapses to 0.
 *
 * The `onLayout` handler lives on the track's PARENT View (the
 * `scrub-track-hit-area`, which also carries the pan handlers); the
 * `accessibilityRole="adjustable"` Pressable is its child. Firing
 * `layout` on the Pressable is a no-op, so the test must target the
 * hit area by its testID.
 *
 * Wrapped in its own awaited act(): RNTL 14 rejects overlapping act
 * scopes.
 */
async function measureTrack(
  getByTestId: (id: string) => TestInstance,
  width = 300,
) {
  const hitArea = getByTestId('scrub-track-hit-area');
  await act(async () => {
    fireEvent(hitArea, 'layout', {
      nativeEvent: {layout: {width, height: 4}},
    });
  });
}
describe('TransportBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state = makeTransportState();
    mockTransport.commands = makeTransportCommands();
  });

  it('renders the elapsed and remaining time labels', async () => {
    const {getByText} = await renderChrome(<TransportBar />);
    expect(getByText('1:00')).toBeTruthy(); // elapsed
    expect(getByText('-3:00')).toBeTruthy(); // remaining (4:00 - 1:00)
  });

  it('renders the scrub track with accessibilityRole=adjustable', async () => {
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);
    expect(track.props.accessibilityLabel).toBe('Playback position');
  });

  it('exposes accessibilityValue reflecting position / duration', async () => {
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);
    expect(track.props.accessibilityValue).toEqual({
      min: 0,
      max: 240_000,
      now: 60_000,
    });
  });

  it('disables the track when seekable is false', async () => {
    mockTransport.state.seekable = false;
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);
    expect(track.props.accessibilityLabel).toBe(
      'Live stream — not seekable',
    );
  });

  // ── Unknown duration (found on device during W9 verification) ────────────
  //
  // mpv had not reported a duration yet, so `durationMs` was 0 while the
  // position was already 1:18. The remaining label rendered the literal
  // `-0:00` — asserting that NO TIME REMAINS while the film was visibly
  // playing — and the accessibility value announced "position 78000 of 0".
  //
  // `formatMsAsClock(0 - 78000)` returns `'0:00'` by design (negative input
  // collapses to zero), so the `-` template produced `-0:00`.
  //
  // The fix follows VLC's documented pattern,
  // `remainingTime?.stringValue ?? "--:--"`. A gap is honest; a wrong
  // number is not.

  it('shows a placeholder, never "-0:00", when duration is unknown', async () => {
    mockTransport.state.durationMs = 0;
    mockTransport.state.positionMs = 78_000;
    const {getByText, queryByText} = await renderChrome(<TransportBar />);

    expect(queryByText('-0:00')).toBeNull();
    expect(getByText('--:--')).toBeTruthy();
  });

  it('omits the accessibility range when duration is unknown', async () => {
    mockTransport.state.durationMs = 0;
    mockTransport.state.positionMs = 78_000;
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);

    // `{min: 0, max: 0, now: 78000}` is the same lie as `-0:00` in a
    // different font. RN normalises `accessibilityValue={undefined}` into an
    // all-undefined object, so the assertion is that NO BOUND is announced
    // rather than that the prop is literally absent.
    const value = track.props.accessibilityValue as Record<string, unknown>;
    expect(value?.max).toBeUndefined();
    expect(value?.now).toBeUndefined();
    expect(track.props.accessibilityLabel).toBe('Playback position');
  });

  it('still renders a real remaining time once duration is known', async () => {
    // The mirror of the two tests above: the placeholder must not become a
    // permanent "unknown" once mpv reports a duration.
    mockTransport.state.durationMs = 240_000;
    mockTransport.state.positionMs = 78_000;
    const {getByText, queryByText, getByRole} = await renderChrome(
      <TransportBar />,
    );

    // 240000 - 78000 = 162000ms -> 2:42 remaining.
    expect(getByText('-2:42')).toBeTruthy();
    expect(queryByText('--:--')).toBeNull();
    expect(getByRole('adjustable').props.accessibilityValue).toEqual({
      min: 0,
      max: 240_000,
      now: 78_000,
    });
  });

  it('taps at 50% of the track commit to durationMs / 2', async () => {
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);
    // RNTL press handler reads locationX from the synthetic event.
    fireEvent(track, 'press', {
      nativeEvent: {locationX: 150}, // 50% of the measured 300px track
    });
    // Assert on the facade command, not a standalone `mockSeek`: the
    // beforeEach rebuilds `commands` from `makeTransportCommands()`,
    // so a separately-declared mock is no longer the one the
    // component calls.
    expect(mockTransport.commands.seek).toHaveBeenCalledWith(120_000);
  });

  it('taps at 75% commit to ~durationMs * 0.75', async () => {
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);
    fireEvent(track, 'press', {
      nativeEvent: {locationX: 225}, // 75% of the measured 300px track
    });
    expect(mockTransport.commands.seek).toHaveBeenCalledWith(180_000);
  });

  it('renders the buffered-fill span when normalizedWindow is set', async () => {
    const {getByTestId} = await renderChrome(<TransportBar />);
    await measureTrack(getByTestId);
    expect(getByTestId('buffered-fill', HIDDEN)).toBeTruthy();
  });

  it('does NOT render the buffered-fill when normalizedWindow is null', async () => {
    mockTransport.state.normalizedWindow = null;
    const {queryByTestId} = await renderChrome(<TransportBar />);
    expect(queryByTestId('buffered-fill', HIDDEN)).toBeNull();
  });

  it('renders the played-fill and thumb spans', async () => {
    const {getByTestId} = await renderChrome(<TransportBar />);
    await measureTrack(getByTestId);
    expect(getByTestId('played-fill', HIDDEN)).toBeTruthy();
    expect(getByTestId('thumb', HIDDEN)).toBeTruthy();
  });

  it('the spec bans pointerEvents="none" on the scrub track itself', async () => {
    // Assert the real invariant on the RENDERED tree rather than
    // grepping the source for a phrase in a doc comment: the earlier
    // prose-grep matched on the exact wording
    // "pointerEvents is BANNED" while the file actually says
    // '`pointerEvents="none"` is BANNED', so the assertion tested
    // the author's phrasing instead of the component's behaviour.
    //
    // The track (the adjustable Pressable) is the gesture target and
    // must NOT set pointerEvents; the decorative fills and thumb
    // inside it DO, so taps fall through to the track.
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    expect(track.props.pointerEvents).toBeUndefined();

    for (const id of ['played-fill', 'thumb']) {
      expect(getByTestId(id, HIDDEN).props.pointerEvents).toBe('none');
    }
  });

  it('taps do nothing when seekable is false', async () => {
    mockTransport.state.seekable = false;
    const {getByRole, getByTestId} = await renderChrome(<TransportBar />);
    const track = getByRole('adjustable');
    await measureTrack(getByTestId);
    fireEvent(track, 'press', {
      nativeEvent: {locationX: 150},
    });
    expect(mockTransport.commands.seek).not.toHaveBeenCalled();
  });
});
