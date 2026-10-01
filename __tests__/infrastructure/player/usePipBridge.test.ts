/// <reference types="node" />
/**
 * V19 W6.1 — `usePipBridge()`: PiP reconciliation.
 *
 * The bug this exists to prevent: the lib emits `onPipModeChanged`, and
 * nothing in the app subscribed. So when Android dismissed the PiP
 * window (swipe-away, system Back, Home), only the native side knew —
 * the JS `pipActive` flag stayed `true`, `presentation.mode` stayed
 * `'pip'`, and `SimbaPlayerContent` kept returning `null`. A black
 * activity with no chrome and no way back short of killing the app.
 *
 * Mocked at the real lib path so `subscribePlayerEvent` is the only
 * thing under test, and so the mockHandlers can be driven directly.
 */

import {renderHook} from '@testing-library/react-native';
import {usePipBridge} from '../../../src/infrastructure/player/usePipBridge';

type Handler = (payload: unknown) => void;

const mockHandlers = new Map<string, Handler>();
const mockUnsubscribed: string[] = [];

const mockCommands = {
  play: jest.fn(),
  pause: jest.fn(),
  close: jest.fn(),
  exitPip: jest.fn(),
  enterPip: jest.fn(),
  seek: jest.fn(),
  setRepeatMode: jest.fn(),
};

let mockIsPlaying = false;
const mockSetPipActiveCalls: boolean[] = [];

jest.mock('@simba-dev/react-native-media-player', () => ({
  subscribePlayerEvent: (event: string, handler: Handler) => {
    mockHandlers.set(event, handler);
    return () => {
      mockUnsubscribed.push(event);
      mockHandlers.delete(event);
    };
  },
}));

jest.mock('../../../src/infrastructure/player/useTransport', () => ({
  useTransport: () => ({
    state: {
      isPlaying: mockIsPlaying,
      isEnded: false,
      isBuffering: false,
      canEnterPip: true,
      currentUri: 'file:///a.mkv',
      title: 'A',
    },
    commands: mockCommands,
  }),
}));

// The presentation layer is mocked to RECORD what the bridge asks for,
// rather than to mutate a real store. That is the contract worth
// pinning: the bridge's whole job is to tell the presentation layer
// what the native window is doing. (It also keeps every out-of-scope
// identifier `mock`-prefixed, which `jest.mock` factories require.)
//
// Note `setPipActive` is an inline arrow — a NEW identity on every
// render, which is exactly what the real zustand action is not. That is
// deliberate: it makes the "does not resubscribe across re-renders" test
// below fail if the bridge ever starts depending on it directly, instead
// of passing only because the real store happens to be stable.
jest.mock('../../../src/infrastructure/player/usePresentation', () => ({
  usePresentation: () => ({
    mode: 'expanded',
    isPip: false,
    isExpanded: true,
    setPipActive: (next: boolean) => {
      mockSetPipActiveCalls.push(next);
    },
    togglePip: jest.fn(),
  }),
}));

/** Fire a native PiP event the way the lib's emitter would. */
const emit = (event: string, payload: unknown = {}) => {
  const handler = mockHandlers.get(event);
  if (!handler) throw new Error(`no handler registered for ${event}`);
  handler(payload);
};

/**
 * The value the bridge has most recently asked the presentation layer to
 * hold — i.e. what `pipActive` would be. `undefined` before the first
 * call, which is itself worth being able to assert.
 */
const pipActiveFlag = () => mockSetPipActiveCalls.at(-1);

describe('usePipBridge', () => {
  beforeEach(() => {
    mockHandlers.clear();
    mockUnsubscribed.length = 0;
    mockSetPipActiveCalls.length = 0;
    mockIsPlaying = false;
    jest.clearAllMocks();
  });

  it('subscribes to all four PiP events', async () => {
    const {unmount} = await renderHook(() => usePipBridge());
    expect([...mockHandlers.keys()].sort()).toEqual([
      'onPipClose',
      'onPipExpand',
      'onPipModeChanged',
      'onPipPlayPause',
    ]);
    await unmount();
  });

  it('unsubscribes every event on unmount', async () => {
    const {unmount} = await renderHook(() => usePipBridge());
    await unmount();
    expect(mockUnsubscribed.sort()).toEqual([
      'onPipClose',
      'onPipExpand',
      'onPipModeChanged',
      'onPipPlayPause',
    ]);
  });

  /**
   * THE regression test — swipe the PiP window away. Android restores
   * the fullscreen activity and only the native side learns about it.
   */
  it('a system PiP dismissal restores the chrome', async () => {
    await renderHook(() => usePipBridge());

    emit('onPipModeChanged', {isInPip: true});
    expect(pipActiveFlag()).toBe(true);

    // Swiped away.
    emit('onPipModeChanged', {isInPip: false});
    expect(pipActiveFlag()).toBe(false);
  });

  it('entering PiP from the system is reflected too', async () => {
    await renderHook(() => usePipBridge());
    // Home gesture / auto-enter: the app never pressed its own button.
    emit('onPipModeChanged', {isInPip: true});
    expect(mockSetPipActiveCalls).toEqual([true]);
  });

  describe('the PiP window transport buttons', () => {
    it('play/pause pauses while playing', async () => {
      mockIsPlaying = true;
      await renderHook(() => usePipBridge());
      emit('onPipPlayPause');
      expect(mockCommands.pause).toHaveBeenCalledTimes(1);
      expect(mockCommands.play).not.toHaveBeenCalled();
    });

    it('play/pause plays while paused', async () => {
      mockIsPlaying = false;
      await renderHook(() => usePipBridge());
      emit('onPipPlayPause');
      expect(mockCommands.play).toHaveBeenCalledTimes(1);
      expect(mockCommands.pause).not.toHaveBeenCalled();
    });

    it('expand leaves PiP natively AND clears the flag', async () => {
      await renderHook(() => usePipBridge());
      emit('onPipModeChanged', {isInPip: true});

      emit('onPipExpand');
      expect(mockCommands.exitPip).toHaveBeenCalledTimes(1);
      expect(pipActiveFlag()).toBe(false);
    });

    it('close stops playback, not just the chrome', async () => {
      await renderHook(() => usePipBridge());
      emit('onPipClose');
      expect(mockCommands.close).toHaveBeenCalledTimes(1);
      expect(pipActiveFlag()).toBe(false);
    });
  });

  /**
   * The handlers read through refs precisely so that a re-render does
   * NOT tear down and rebuild four native listeners. If it did, a
   * `play/pause` press landing in the gap would be dropped. The mocked
   * `usePresentation` returns a fresh `setPipActive` every render, so
   * this also fails if that one ever leaks into the dependency list.
   */
  it('does not resubscribe across re-renders, and still sees fresh state', async () => {
    mockIsPlaying = true;
    const {rerender} = await renderHook(() => usePipBridge());
    const firstHandlers = [...mockHandlers.keys()];
    expect(mockUnsubscribed).toHaveLength(0);

    await rerender({});
    await rerender({});

    expect(mockUnsubscribed).toHaveLength(0);
    expect([...mockHandlers.keys()].sort()).toEqual(firstHandlers.sort());

    // And the stable subscription still routes on current values.
    emit('onPipPlayPause');
    expect(mockCommands.pause).toHaveBeenCalledTimes(1);
  });
});



