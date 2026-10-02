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
  setSpeed: jest.fn(),
  setVolume: jest.fn(),
  setScreenBrightness: jest.fn(),
  getScreenBrightness: jest.fn(() => 0.75),
  setProperty: jest.fn(),
  setLoopMode: jest.fn(),
  setTrack: jest.fn(),
  selectTrack: jest.fn(),
  next: jest.fn(),
  previous: jest.fn(),
  setAudioFilter: jest.fn(),
  setVideoFilter: jest.fn(),
  setShuffle: jest.fn(),
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
        seekable: expect.any(Boolean),
        canEnterPip: expect.any(Boolean),
        canGoPrev: expect.any(Boolean),
        canGoNext: expect.any(Boolean),
        speed: expect.any(Number),
        volume: expect.any(Number),
        isMuted: expect.any(Boolean),
        repeatMode: expect.any(String),
        captionTracks: expect.any(Array),
        // `normalizedWindow` is null until a buffered range contains the
        // playhead, and `currentUri`/`nextTrack` are null before a
        // playlist is attached. `expect.anything()` would be wrong here:
        // it rejects `null` as well as `undefined`, so assert the real
        // defaults instead.
        normalizedWindow: null,
        currentUri: null,
        nextTrack: null,
        activeCaptionTrackId: null,
      }),
    );
    expect(result.current.commands).toEqual(
      expect.objectContaining({
        seek: expect.any(Function),
        seekBy: expect.any(Function),
        rewind10: expect.any(Function),
        forward10: expect.any(Function),
        skipPrev: expect.any(Function),
        next: expect.any(Function),
        togglePlayPause: expect.any(Function),
        play: expect.any(Function),
        pause: expect.any(Function),
        enterPip: expect.any(Function),
        exitPip: expect.any(Function),
        close: expect.any(Function),
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
    // playhead at 0; range starts at exactly 1000ms — the boundary of
    // PLAYHEAD_TOLERANCE_MS. The tolerance exists to absorb the 1Hz
    // position-tick vs higher-rate cache-event skew, so a range that
    // starts one second after the reported playhead is still "this one".
    mockProgress.durationMs = 300_000;
    mockProgress.cacheRanges = [{start: 1000, end: 60_000}];
    mockProgress.positionMs = 0;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.normalizedWindow).toEqual({
      startMs: 1000,
      endMs: 60_000,
    });
  });

  it('normalizedWindow does NOT tolerate slop past the 1s bound', async () => {
    // 1500ms > the 1000ms tolerance, so the range does not contain the
    // playhead and the window is null (BufferedRangeFill renders
    // nothing rather than a stale fill).
    mockProgress.durationMs = 300_000;
    mockProgress.cacheRanges = [{start: 1500, end: 60_000}];
    mockProgress.positionMs = 0;
    const {result} = await renderHook(() => useTransport());
    expect(result.current.state.normalizedWindow).toBeNull();
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

  it('step() command was removed in W4 reaudit — use seekBy instead', async () => {
    // W4 reaudit: `commands.step(delta)` was a fourth name for
    // the same operation as `rewind10()` / `forward10()` /
    // `seekBy(delta)`. Junior-dev consumer confusion; removed.
    // TransportRow now calls `commands.rewind10()` /
    // `commands.forward10()` directly. The generic delta case
    // (15s skip in W2 spec) routes through `commands.seekBy(N)`.
    const {result} = await renderHook(() => useTransport());
    expect((result.current.commands as unknown as Record<string, unknown>).step).toBeUndefined();
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

// ── Tests for W3.5 surface additions (gestures + VideoMoreSheet) ─────

describe('useTransport — W3.5 surface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProgress.positionMs = 0;
    mockProgress.durationMs = 0;
  });

  it('setSpeed(rate) passes through to the lib commands', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.setSpeed(2);
    });
    expect(mockCommands.setSpeed).toHaveBeenCalledWith(2);
  });

  it('setVolume(volume) passes through to the lib commands (W3.5.3)', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.setVolume(72);
    });
    expect(mockCommands.setVolume).toHaveBeenCalledWith(72);
  });

  it('setScreenBrightness(value) passes through to the lib commands (W3.5.3)', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.setScreenBrightness(0.42);
    });
    expect(mockCommands.setScreenBrightness).toHaveBeenCalledWith(0.42);
  });

  it('getScreenBrightness() returns the lib value (W3.5.3 readback)', async () => {
    const {result} = await renderHook(() => useTransport());
    let brightness = -1;
    await act(async () => {
      brightness = result.current.commands.getScreenBrightness();
    });
    expect(brightness).toBe(0.75);
  });

  it('setProperty(name, value) passes through (W3.5.6 quality presets)', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.setProperty('hwdec', 'mediacodec');
    });
    expect(mockCommands.setProperty).toHaveBeenCalledWith(
      'hwdec',
      'mediacodec',
    );
  });
});

// ── Tests for caption-track selection (mpv property contract) ──────

/**
 * mpv keeps the three track selections in three SEPARATE properties:
 * `vid` (video), `aid` (audio), `sid` (subtitle). A command that
 * carries no track type can only pick one of them, and the lib's
 * `selectTrack(trackId)` picks the wrong one — in lib 1.8.3 its
 * native implementation is hard-wired to the video property:
 *
 *   node_modules/@simba-dev/react-native-media-player
 *     /android/src/main/cpp/main.cpp:764
 *       mpv_set_property(mpv, "vid", MPV_FORMAT_INT64, &trackId);
 *
 * So the app must select a caption through the lib's only track-TYPED
 * command, `setTrack('sub', id)`, whose Kotlin mapping is
 * 'video' -> `vid`, 'audio' -> `aid`, 'sub' -> `sid`.
 *
 * These tests pin the app-side half of that contract: what track TYPE
 * the app asks for, and that the untyped `selectTrack` (the `vid`
 * path) is never reached from a caption selection.
 */
describe('useTransport — caption track selection targets mpv `sid`', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProgress.positionMs = 60_000;
    mockProgress.durationMs = 600_000;
  });

  it("selectCaptionTrack(id) asks for the SUBTITLE track: setTrack('sub', id)", async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.selectCaptionTrack(2);
    });
    expect(mockCommands.setTrack).toHaveBeenCalledTimes(1);
    expect(mockCommands.setTrack).toHaveBeenCalledWith('sub', 2);
  });

  it('selectCaptionTrack(null) disables captions with the -1 sentinel on the SAME sub type', async () => {
    // Kotlin's `setTrack` writes the literal `"no"` for a negative id,
    // so "off" is the same property with a sentinel value — not a
    // different track type.
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.selectCaptionTrack(null);
    });
    expect(mockCommands.setTrack).toHaveBeenCalledTimes(1);
    expect(mockCommands.setTrack).toHaveBeenCalledWith('sub', -1);
  });

  it('never routes a caption selection through the untyped selectTrack (the `vid` path)', async () => {
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.selectCaptionTrack(2);
    });
    await act(async () => {
      result.current.commands.selectCaptionTrack(null);
    });
    expect(mockCommands.selectTrack).not.toHaveBeenCalled();
  });

  it('writes no mpv property at all while changing the caption track', async () => {
    // `setProperty('vid', …)` would be the other way to corrupt the
    // video track, so pin that the caption path never goes through the
    // generic property writer either.
    const {result} = await renderHook(() => useTransport());
    await act(async () => {
      result.current.commands.selectCaptionTrack(3);
    });
    await act(async () => {
      result.current.commands.selectCaptionTrack(null);
    });
    expect(mockCommands.setProperty).not.toHaveBeenCalled();
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

  it('resolves a non-finite position to 0 (the lower bound)', () => {
    // Number.isFinite(Infinity) === false, so this takes the non-finite
    // guard rather than the range clamp — and the guard resolves to 0,
    // not durationMs. Seeking to the end of the file on a degenerate
    // gesture would end playback, so the start is the safer fallback
    // (same choice Media3's Util.clampPosition makes).
    expect(clampPosition(Infinity, 300_000)).toBe(0);
    expect(clampPosition(-Infinity, 300_000)).toBe(0);
  });
});
