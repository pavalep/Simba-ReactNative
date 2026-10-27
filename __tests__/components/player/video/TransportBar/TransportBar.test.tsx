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
 *   - the buffered islands are mounted (one span per island)
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
import {PanResponder} from 'react-native';
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
 * The testIDs in a rendered tree, in DOCUMENT ORDER.
 *
 * The buffered-vs-played rule is a PAINT ORDER rule: the opaque played
 * fill has to be painted after the buffered islands so that it covers
 * the part of the buffer that lies BEHIND the playhead — which is what
 * ExoPlayer does by clipping its buffered rect to the playhead. An
 * order assertion needs the document order, which a `getByTestId`
 * lookup cannot give.
 */
function testIdOrder(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  const record = node as {props?: {testID?: string}; children?: unknown[]};
  if (record.props?.testID) out.push(record.props.testID);
  if (Array.isArray(record.children)) {
    for (const child of record.children) testIdOrder(child, out);
  }
  return out;
}

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

  it('renders a buffered-fill span per buffered island', async () => {
    const {getByTestId, getAllByTestId} = await renderChrome(<TransportBar />);
    await measureTrack(getByTestId);
    expect(getAllByTestId(/^buffered-fill-\d+$/, HIDDEN)).toHaveLength(1);
    expect(getByTestId('buffered-fill-0', HIDDEN)).toBeTruthy();
  });

  it('does NOT render a buffered-fill when there are no segments', async () => {
    mockTransport.state.bufferedSegments = [];
    const {queryByTestId} = await renderChrome(<TransportBar />);
    expect(queryByTestId('buffered-fill-0', HIDDEN)).toBeNull();
  });

  it('paints the buffered islands UNDER the opaque played fill', async () => {
    // This z-order IS the "played vs buffered" rule.
    //
    // ExoPlayer clips its buffered rect to `scrubberBar.right` — the
    // buffered colour is only ever painted AHEAD of the playhead.
    // YouTube and Plex get the same result by painting the played fill
    // OVER the buffered element; Shaka paints the played colour there.
    //
    // SIMBA gets it from the paint order: the played fill covers
    // 0 → playhead, so a buffered island BEHIND the playhead is hidden
    // and one AHEAD of it is visible. If the order ever flips, the rail
    // starts showing a back-cached band that no shipping player shows.
    const {getByTestId, toJSON} = await renderChrome(<TransportBar />);
    await measureTrack(getByTestId);
    const order = testIdOrder(toJSON());
    expect(order).toContain('buffered-fill-0');
    expect(order.indexOf('played-fill')).toBeGreaterThan(
      order.indexOf('buffered-fill-0'),
    );
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

  // ── W24 (register item 46 / tracker B-006): the seek CONFIRMATION ──
  //
  // The engine's new position reaches JS on ONE carrier — mpv's
  // `time-pos`, observed natively and coalesced to 4 Hz. So after a tap
  // the new position is not available for a tick plus the seek latency,
  // and the clock has to hold the seek target across that gap.
  //
  // It used to hold it for a FIXED 600 ms and then drop back to
  // whatever the engine had reported — so for a seek slower than 600 ms
  // the clock went BACKWARDS to the old position and then jumped forward
  // again when the tick finally arrived. These pin the shape that
  // replaced it: the preview is held until the engine CONFIRMS the
  // seek, and the timer is only a bound on a seek that never lands.
  describe('seek confirmation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('holds the seek target until the engine reports the new position', async () => {
      const {getByRole, getByTestId, getByText, queryByText, rerender} =
        await renderChrome(<TransportBar />);
      const track = getByRole('adjustable');
      await measureTrack(getByTestId);

      // The engine is at 1:00 of a 4:00 track. A tap at 50% asks for
      // 2:00, and the engine has NOT reported it yet.
      expect(getByText('1:00')).toBeTruthy();
      await fireEvent(track, 'press', {nativeEvent: {locationX: 150}});
      expect(getByText('2:00')).toBeTruthy();

      // The old window: 600 ms after the tap the preview was dropped
      // REGARDLESS of whether the engine had confirmed. The clock must
      // not fall back to the engine's stale 1:00.
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      expect(getByText('2:00')).toBeTruthy();
      expect(queryByText('1:00')).toBeNull();

      // The engine confirms and keeps playing from there.
      mockTransport.state = makeTransportState({positionMs: 120_000});
      await rerender(<TransportBar />);
      expect(getByText('2:00')).toBeTruthy();

      // The preview was RELEASED: the clock follows the engine again,
      // so it advances to 2:01. A preview still pinned at 2:00 would
      // show the engine's new position as nothing at all.
      mockTransport.state = makeTransportState({positionMs: 121_000});
      await rerender(<TransportBar />);
      expect(getByText('2:01')).toBeTruthy();
    });

    it('re-arms the confirmation when a second tap lands inside the first', async () => {
      const {getByRole, getByTestId, getByText, queryByText} =
        await renderChrome(<TransportBar />);
      const track = getByRole('adjustable');
      await measureTrack(getByTestId);
      mockTransport.state = makeTransportState({positionMs: 0});

      // First tap: 75% of 4:00 is 3:00.
      await fireEvent(track, 'press', {nativeEvent: {locationX: 225}});
      expect(getByText('3:00')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Second tap: 25% is 1:00. The first tap's bound is still armed.
      await fireEvent(track, 'press', {nativeEvent: {locationX: 75}});
      expect(getByText('1:00')).toBeTruthy();

      // The FIRST tap's bound would fire 1000 ms after that tap, which
      // is 700 ms from here. It has to have been re-armed by the second
      // tap, so the second tap's target is still showing and the clock
      // has not fallen back to the engine's position. Without the
      // re-arm the first tap's timer clears the second tap's preview
      // and the clock snaps back to 0:00.
      await act(async () => {
        jest.advanceTimersByTime(800);
      });
      expect(getByText('1:00')).toBeTruthy();
      expect(queryByText('0:00')).toBeNull();
    });

    it('hands the clock back to the engine when the bound expires', async () => {
      const {getByRole, getByTestId, getByText} = await renderChrome(
        <TransportBar />,
      );
      const track = getByRole('adjustable');
      await measureTrack(getByTestId);
      mockTransport.state = makeTransportState({positionMs: 0});

      await fireEvent(track, 'press', {nativeEvent: {locationX: 150}});
      expect(getByText('2:00')).toBeTruthy();

      // The seek never confirmed — refused, or the media ended. The
      // bound releases the preview and the clock goes back to the
      // engine's position, which is the truth: a refused seek leaves
      // the player where it was.
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(getByText('0:00')).toBeTruthy();
    });

    it('clears the pending bound when the bar unmounts', async () => {
      const setSpy = jest.spyOn(global, 'setTimeout');
      const clearSpy = jest.spyOn(global, 'clearTimeout');
      try {
        const {getByRole, getByTestId, unmount} = await renderChrome(
          <TransportBar />,
        );
        const track = getByRole('adjustable');
        await measureTrack(getByTestId);

        await fireEvent(track, 'press', {nativeEvent: {locationX: 150}});

        // The bound armed by the commit is the one with the fallback
        // delay; find it so the assertion can name the exact handle.
        let armIndex = -1;
        setSpy.mock.calls.forEach((call, index) => {
          if (call[1] === 1000) armIndex = index;
        });
        expect(armIndex).toBeGreaterThan(-1);
        const armed = setSpy.mock.results[armIndex].value;

        clearSpy.mockClear();
        // RNTL 14's `unmount` is async — the cleanup effects (and the
        // `clearTimeout` they own) run inside it.
        await unmount();
        expect(clearSpy).toHaveBeenCalledWith(armed);
      } finally {
        setSpy.mockRestore();
        clearSpy.mockRestore();
      }
    });

    it('holds the drag target until the engine confirms it too', async () => {
      // The PanResponder is built once and can only be driven through
      // the config the factory receives — the same trick the scrub
      // suite uses, for the same reason: RN's real responder reads
      // `gestureState.touchHistory`, which does not exist under jest.
      type ResponderConfig = {
        onPanResponderGrant?: (e: unknown) => void;
        onPanResponderMove?: (e: unknown) => void;
        onPanResponderRelease?: (e: unknown) => void;
      };
      const configs: ResponderConfig[] = [];
      const original = PanResponder.create;
      (PanResponder as {create: unknown}).create = (config: ResponderConfig) => {
        configs.push(config);
        return {panHandlers: {}};
      };

      try {
        const {getByTestId, getByText, queryByText} = await renderChrome(
          <TransportBar />,
        );
        await measureTrack(getByTestId);
        mockTransport.state = makeTransportState({positionMs: 0});

        const config = configs[0];
        await act(async () => {
          config.onPanResponderGrant?.({nativeEvent: {locationX: 75}});
          config.onPanResponderMove?.({nativeEvent: {locationX: 225}});
          config.onPanResponderRelease?.({nativeEvent: {locationX: 225}});
        });

        // The drag target is 75% of 4:00 — 3:00 — and the engine is
        // still at 0:00.
        expect(getByText('3:00')).toBeTruthy();

        // The old code cleared the preview the instant the drag
        // released, so the clock fell straight back to 0:00.
        await act(async () => {
          jest.advanceTimersByTime(600);
        });
        expect(getByText('3:00')).toBeTruthy();
        expect(queryByText('0:00')).toBeNull();
      } finally {
        (PanResponder as {create: unknown}).create = original;
      }
    });

    it('lets a new drag supersede a pending confirmation', async () => {
      type ResponderConfig = {
        onPanResponderGrant?: (e: unknown) => void;
        onPanResponderMove?: (e: unknown) => void;
        onPanResponderRelease?: (e: unknown) => void;
      };
      const configs: ResponderConfig[] = [];
      const original = PanResponder.create;
      (PanResponder as {create: unknown}).create = (config: ResponderConfig) => {
        configs.push(config);
        return {panHandlers: {}};
      };

      try {
        const {getByRole, getByTestId, getByText, rerender} = await renderChrome(
          <TransportBar />,
        );
        const track = getByRole('adjustable');
        await measureTrack(getByTestId);

        // A tap arms a confirmation for 2:00.
        await fireEvent(track, 'press', {nativeEvent: {locationX: 150}});
        expect(getByText('2:00')).toBeTruthy();

        // The user grabs the bar and drags to 3:00. The finger is now
        // the authority, so the pending confirmation must not be able
        // to clear the drag's preview.
        const config = configs[0];
        await act(async () => {
          config.onPanResponderGrant?.({nativeEvent: {locationX: 75}});
          config.onPanResponderMove?.({nativeEvent: {locationX: 225}});
        });
        expect(getByText('3:00')).toBeTruthy();

        // The engine confirms the OLD target (2:00) mid-drag. The drag
        // preview has to survive it.
        mockTransport.state = makeTransportState({positionMs: 120_000});
        await rerender(<TransportBar />);
        expect(getByText('3:00')).toBeTruthy();
      } finally {
        (PanResponder as {create: unknown}).create = original;
      }
    });
  });
});
