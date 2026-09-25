/// <reference types="node" />
/**
 * V19 W2 Phase 2.1 — `useTransport()` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 2.1.
 *
 * The hook is a facade over `usePlayerProgress()` + `usePlayer()`.
 * The lib already covers those hooks' contract; these tests focus
 * on the V19 derivations (`isPlaying`, `isEnded`, `normalizedWindow`,
 * `canEnterPip`) and the pure helpers (`formatMsAsClock`,
 * `clampPosition`).
 *
 * The hook itself is tested via renderHook from RNTL. The
 * `usePlayer` / `usePlayerProgress` re-exports from the lib are
 * mocked so we can inject deterministic progress + spy on the
 * commands object.
 */

import {renderHook, act} from '@testing-library/react-native';
import {
  useTransport,
  formatMsAsClock,
  clampPosition,
} from '../../../src/infrastructure/player';

// ── Mocks ────────────────────────────────────────────────────────────

const mockProgress = {
  positionMs: 0,
  durationMs: 0,
  isBuffering: false,
  isSeeking: false,
  seekable: true,
  cacheFill: 0,
  cacheRanges: [] as Array<{start: number; end: number}>,
};
const mockCommands = {
  seek: jest.fn(),
  seekBy: jest.fn(),
  togglePlayPause: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
};

jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayerProgress: () => mockProgress,
  usePlayer: () => ({commands: mockCommands, state: {}}),
}));

// ── Tests for derivations ────────────────────────────────────────────

describe('useTransport — derivations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProgress.positionMs = 0;
    mockProgress.durationMs = 0;
    mockProgress.isBuffering = false;
    mockProgress.isSeeking = false;
    mockProgress.seekable = true;
    mockProgress.cacheFill = 0;
    mockProgress.cacheRanges = [];
  });

  it('exposes the full TransportState shape', async () => {
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state).toEqual(
      expect.objectContaining({
        positionMs: expect.any(Number),
        durationMs: expect.any(Number),
        isPlaying: expect.any(Boolean),
        isBuffering: expect.any(Boolean),
        isSeeking: expect.any(Boolean),
        isEnded: expect.any(Boolean),
        bufferedRanges: expect.any(Array),
        normalizedWindow: expect.anything(), // null or object
        seekable: expect.any(Boolean),
        canEnterPip: expect.any(Boolean),
      }),
    );
    expect(result.current.commands).toEqual(
      expect.objectContaining({
        seek: expect.any(Function),
        seekBy: expect.any(Function),
        step: expect.any(Function),
        togglePlayPause: expect.any(Function),
        play: expect.any(Function),
        pause: expect.any(Function),
      }),
    );
  });

  it('isEnded is true when positionMs is within the end epsilon of durationMs', async () => {
    mockProgress.positionMs = 599_900;
    mockProgress.durationMs = 600_000;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.isEnded).toBe(true);
  });

  it('isEnded is false when there is no duration', async () => {
    mockProgress.positionMs = 0;
    mockProgress.durationMs = 0;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.isEnded).toBe(false);
  });

  it('isPlaying is false when isBuffering or isSeeking or isEnded', async () => {
    mockProgress.positionMs = 30_000;
    mockProgress.durationMs = 300_000;
    mockProgress.isBuffering = true;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.isPlaying).toBe(false);

    mockProgress.isBuffering = false;
    mockProgress.isSeeking = true;
    const {result: r2} = await renderHook(() => useTransport());
    expect(r2.current.state.isPlaying).toBe(false);

    mockProgress.positionMs = 299_900;
    mockProgress.durationMs = 300_000;
    const {result: r3} = await renderHook(() => useTransport());
    expect(r3.current.state.isEnded).toBe(true);
    expect(r3.current.state.isPlaying).toBe(false);
  });

  it('normalizedWindow is null when there are no buffered ranges', async () => {
    mockProgress.cacheFill = 0;
    mockProgress.cacheRanges = [];
    mockProgress.positionMs = 30_000;
    mockProgress.durationMs = 300_000;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.normalizedWindow).toBeNull();
  });

  it('normalizedWindow picks the range containing the playhead', async () => {
    mockProgress.durationMs = 300_000;
    mockProgress.cacheRanges = [
      {start: 0, end: 60_000},
      {start: 90_000, end: 200_000},
    ];
    mockProgress.positionMs = 100_000;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.normalizedWindow).toEqual({
      startMs: 90_000,
      endMs: 200_000,
    });
  });

  it('normalizedWindow tolerates 1s slop on the lower bound', async () => {
    // playhead at 0; range starts at 1500ms — within tolerance.
    mockProgress.durationMs = 300_000;
    mockProgress.cacheRanges = [{start: 1500, end: 60_000}];
    mockProgress.positionMs = 0;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.normalizedWindow).toEqual({
      startMs: 1500,
      endMs: 60_000,
    });
  });

  it('normalizedWindow is null when the playhead is in a gap', async () => {
    mockProgress.durationMs = 300_000;
    mockProgress.cacheRanges = [
      {start: 0, end: 60_000},
      {start: 90_000, end: 200_000},
    ];
    mockProgress.positionMs = 75_000; // between the two ranges
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.normalizedWindow).toBeNull();
  });

  it('falls back to a single contiguous range from cacheFill percent when cacheRanges is empty', async () => {
    mockProgress.durationMs = 300_000;
    mockProgress.cacheFill = 25; // 25% → 0..75s
    mockProgress.cacheRanges = [];
    mockProgress.positionMs = 30_000;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.bufferedRanges).toEqual([
      {startMs: 0, endMs: 75_000},
    ]);
    expect(result.current.state.normalizedWindow).toEqual({
      startMs: 0,
      endMs: 75_000,
    });
  });

  it('canEnterPip is true only when playing, not ended, not buffering', async () => {
    mockProgress.durationMs = 300_000;
    mockProgress.positionMs = 30_000;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.canEnterPip).toBe(true);

    mockProgress.isBuffering = true;
    const {result: r2} = await renderHook(() => useTransport());
    expect(r2.current.state.canEnterPip).toBe(false);

    mockProgress.isBuffering = false;
    mockProgress.positionMs = 299_900; // ended
    const {result: r3} = await renderHook(() => useTransport());
    expect(r3.current.state.canEnterPip).toBe(false);
  });
});

// ── Tests for commands ───────────────────────────────────────────────

describe('useTransport — commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProgress.durationMs = 600_000; // 10 minutes
    mockProgress.positionMs = 60_000;
  });

  it('seek() clamps the position to [0, durationMs]', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.seek(1_000_000); // past end
    });
    expect(mockCommands.seek).toHaveBeenCalledWith(600_000);

    await act(async () => {
      result.current.commands.seek(-5_000); // negative
    });
    expect(mockCommands.seek).toHaveBeenCalledWith(0);
  });

  it('seekBy() delegates to the lib command', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.seekBy(15_000);
    });
    expect(mockCommands.seekBy).toHaveBeenCalledWith(15_000);
    await act(async () => {
      result.current.commands.seekBy(-15_000);
    });
    expect(mockCommands.seekBy).toHaveBeenCalledWith(-15_000);
  });

  it('step() delegates to the lib seekBy (15s skip buttons)', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.step(15_000);
    });
    expect(mockCommands.seekBy).toHaveBeenCalledWith(15_000);
  });

  it('togglePlayPause / play / pause pass through to the lib', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.togglePlayPause();
    });
    await act(async () => {
      result.current.commands.play();
    });
    await act(async () => {
      result.current.commands.pause();
    });
    expect(mockCommands.togglePlayPause).toHaveBeenCalledTimes(1);
    expect(mockCommands.play).toHaveBeenCalledTimes(1);
    expect(mockCommands.pause).toHaveBeenCalledTimes(1);
  });
});

// ── Tests for formatMsAsClock ────────────────────────────────────────

describe('formatMsAsClock', () => {
  it('formats sub-hour durations as M:SS', () => {
    expect(formatMsAsClock(0)).toBe('0:00');
    expect(formatMsAsClock(1_000)).toBe('0:01');
    expect(formatMsAsClock(83_000)).toBe('1:23');
    expect(formatMsAsClock(599_000)).toBe('9:59');
  });

  it('formats hour+ durations as H:MM:SS', () => {
    expect(formatMsAsClock(3_600_000)).toBe('1:00:00');
    expect(formatMsAsClock(3_725_000)).toBe('1:02:05');
  });

  it('collapses invalid values to 0:00', () => {
    expect(formatMsAsClock(NaN)).toBe('0:00');
    expect(formatMsAsClock(-1)).toBe('0:00');
    expect(formatMsAsClock(Infinity)).toBe('0:00');
  });

  it('floors sub-second remainders', () => {
    expect(formatMsAsClock(1_999)).toBe('0:01'); // 1.999s → 1s
  });
});

// ── Tests for clampPosition ──────────────────────────────────────────

describe('clampPosition', () => {
  it('clamps to [0, durationMs]', () => {
    expect(clampPosition(50_000, 300_000)).toBe(50_000);
    expect(clampPosition(-1_000, 300_000)).toBe(0);
    expect(clampPosition(500_000, 300_000)).toBe(300_000);
  });

  it('returns 0 for invalid input or zero duration', () => {
    expect(clampPosition(NaN, 300_000)).toBe(0);
    expect(clampPosition(50_000, 0)).toBe(0);
  });

  it('clamps Infinity to durationMs', () => {
    // Number.isFinite(Infinity) === false, but the duration check
    // path catches it. Verify the documented behavior.
    expect(clampPosition(Infinity, 300_000)).toBe(300_000);
  });
});
