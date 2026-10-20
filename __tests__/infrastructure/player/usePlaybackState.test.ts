/**
 * The phase derivation — the two claims lib v1.17.0 made possible.
 *
 * ## The defect this pins
 *
 * A 9-second load over a throttled link showed NOTHING on screen: no
 * spinner, no message, just a black picture. Both phases this hook used
 * to derive from were wrong while the file was opening:
 *
 *   - `state.isPlaying` — mpv's core state is "playing" from the moment
 *     `loadfile` is called until the file has been parsed, so "playing"
 *     during a load means "the engine was told to play".
 *   - `hasSession` — the playlist is not populated until the file
 *     arrives, so "idle" during a load means "no playlist entry yet".
 *
 * And a second defect, on the same device: an audio-track init failure
 * (an mpv fatal LOG line, while the video kept playing) produced a
 * terminal error card over the WORKING picture.
 *
 * So the lib now owns two facts:
 *
 *   - `state.isLoading` — a load was requested and the file has not
 *     arrived yet. That is the "preparing" phase.
 *   - `state.error.recoverable` — false means playback STOPPED (the
 *     error card's case); true means the engine complained and the
 *     picture kept playing.
 *
 * ## What is asserted
 *
 * The phase, for each combination that used to be wrong. Not "the
 * overlay renders" — the overlay was already correct; it was never
 * given a phase it could act on.
 */

import {renderHook} from '@testing-library/react-native';
import {usePlaybackState} from '../../../src/infrastructure/player/usePlaybackState';

// `jest.mock` factories may only close over `mock*`-prefixed bindings,
// so the state the mocked lib hands back lives here. The factory is
// hoisted above the imports by babel, but it only dereferences these
// inside the hook bodies, which run inside a test.
const mockState = {
  isPlaying: false,
  isLoading: false,
  playlist: [] as unknown[],
  currentIndex: -1,
  error: null as
    | {
        code: number;
        codeName?: string;
        recoverable: boolean;
        message: string;
      }
    | null,
};

const mockProgress = {
  positionMs: 0,
  durationMs: 0,
  isBuffering: false,
};

jest.mock('@simba-dev/react-native-media-player', () => ({
  // The real `usePlayer()` returns `{state, progress, commands}` — the
  // hook under test destructures `{state}` out of it.
  usePlayer: () => ({state: mockState}),
  usePlayerProgress: () => mockProgress,
}));

function resetState() {
  mockState.isPlaying = false;
  mockState.isLoading = false;
  mockState.playlist = [];
  mockState.currentIndex = -1;
  mockState.error = null;
  mockProgress.positionMs = 0;
  mockProgress.durationMs = 0;
  mockProgress.isBuffering = false;
}

describe('usePlaybackState — the file is OPENING', () => {
  beforeEach(resetState);

  it('is preparing while a load is in flight', async () => {
    mockState.isLoading = true;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).toBe('preparing');
  });

  it('is preparing even when the playlist is not populated yet', async () => {
    // The claim that matters: during a load there is no playlist entry,
    // so the old derivation said "idle" and the loading overlay was
    // never shown.
    mockState.isLoading = true;
    mockState.playlist = [];
    mockState.currentIndex = -1;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).not.toBe('idle');
    expect(result.current.videoState).toBe('preparing');
  });

  it('is preparing even when mpv already says "playing"', async () => {
    // mpv's core state flips to "playing" the moment `loadfile` is
    // called. The file is still opening.
    mockState.isLoading = true;
    mockState.isPlaying = true;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).toBe('preparing');
  });

  it('is idle once the load is over and there is no session', async () => {
    mockState.isLoading = false;
    mockState.playlist = [];
    mockState.currentIndex = -1;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).toBe('idle');
  });

  it('is playing once the file has arrived', async () => {
    mockState.isLoading = false;
    mockState.isPlaying = true;
    mockState.playlist = [{filename: 'file:///movies/film.mkv'}];
    mockState.currentIndex = 0;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).toBe('playing');
  });
});

describe('usePlaybackState — only a TERMINAL failure is the error phase', () => {
  beforeEach(resetState);

  it('is error when the failure ended playback', async () => {
    mockState.error = {
      code: 3001,
      codeName: 'E_LOAD_FAILED',
      recoverable: false,
      message: 'failed to load',
    };

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).toBe('error');
  });

  it('is NOT error when playback continued', async () => {
    // The device case: an mpv fatal LOG line (an audio-track init
    // failure) while the video played on. The error card covered the
    // working picture and offered a Retry for a file that was playing.
    mockState.error = {
      code: 3011,
      codeName: 'E_GENERIC',
      recoverable: true,
      message: 'AudioTrack Init failed',
    };
    mockState.isPlaying = true;
    mockState.playlist = [{filename: 'file:///movies/film.mkv'}];
    mockState.currentIndex = 0;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).not.toBe('error');
    expect(result.current.videoState).toBe('playing');
  });

  it('still exposes the non-terminal failure to the classifier', async () => {
    // The phase is not "error", but the raw failure is not swallowed:
    // `VideoErrorOverlay` classifies whatever it is given.
    mockState.error = {
      code: 3011,
      codeName: 'E_GENERIC',
      recoverable: true,
      message: 'AudioTrack Init failed',
    };

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.error).toBe(mockState.error);
  });
});

describe('usePlaybackState — buffering', () => {
  beforeEach(resetState);

  it('is buffering when the engine reports a cache stall', async () => {
    mockProgress.isBuffering = true;
    mockState.isPlaying = true;
    mockState.playlist = [{filename: 'file:///movies/film.mkv'}];
    mockState.currentIndex = 0;

    const {result} = await renderHook(() => usePlaybackState());

    expect(result.current.videoState).toBe('buffering');
    expect(result.current.isBuffering).toBe(true);
  });
});
