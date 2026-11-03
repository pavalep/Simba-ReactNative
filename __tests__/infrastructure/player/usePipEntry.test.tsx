/// <reference types="node" />
/**
 * V22 W23 (2026-11-03) — `usePipEntry()`: the owner of the PiP entry.
 *
 * ## The defect this exists to prevent
 *
 * The user reported that the PiP window showed the app's **full expanded
 * chrome** — the header band with the lock and the bookmark, the scrub
 * row with the elapsed and remaining clocks, and the transport row with
 * the ±10 buttons and the big pause button — scaled down into the small
 * window, and called it "not professional looking at all".
 *
 * Measured on the emulator on 2026-11-03:
 *
 *  - `pipActive` was `true`, `mode` was `'pip'`, `isExpanded` was
 *    `false` — the React state was CORRECT;
 *  - the chrome was still PAINTED in the PiP window;
 *  - tapping the big pause button inside the PiP window did **not** pause
 *    playback;
 *  - the clock froze at `51:09` while the real position was `54:15`.
 *
 * Dead buttons and a frozen clock are a **stale surface**: the views were
 * gone (the taps hit nothing) but the pixels were not. An Activity in
 * Picture-in-Picture does not redraw, so whatever the window held at the
 * moment of the transition is what the PiP window keeps showing.
 *
 * ## The contract these tests pin
 *
 *   1. the chrome is UNMOUNTED (`pipActive` is already `true`, so
 *      `isExpanded` is already `false`), and
 *   2. the frame that drew it without the chrome is PRESENTED, and
 *   3. only THEN is the OS asked for the window.
 *
 * The REAL presentation store is used here — the state machine is the
 * thing under test, and a mocked store would only prove that the mock
 * was called.
 *
 * ## Why `requestAnimationFrame` is controlled
 *
 * The entry is deliberately deferred to the next frame, and "the next
 * frame" is not something a test should wait for. `requestAnimationFrame`
 * is stubbed here so the frame callback is captured and run by the test
 * when it wants it to run — which makes the deferral EXACTLY assertable:
 * the OS is not asked until the test says the frame happened.
 */

import {act, renderHook} from '@testing-library/react-native';
import {usePipEntry} from '../../../src/infrastructure/player/usePipEntry';
import {usePresentationStore} from '../../../src/state/usePresentationStore';

const mockEnterPip = jest.fn(() => true);

/**
 * What the store held at the moment the OS was asked for the window.
 *
 * `mock`-prefixed because a `jest.mock` factory may only close over
 * `mock*` bindings — babel-plugin-jest-hoist rejects the others.
 */
let mockStateWhenAsked: {
  pipActive: boolean;
  pipEntryRequested: boolean;
} | null = null;

/** The frame callbacks the hook has scheduled but not yet run. */
type FrameCallback = (time: number) => void;
let mockFrameCallbacks: FrameCallback[] = [];

jest.mock('../../../src/infrastructure/player/useTransport', () => {
  // The store is required INSIDE the factory: a module factory may not
  // reference an out-of-scope import.
  const {
    usePresentationStore: store,
  } = jest.requireActual('../../../src/state/usePresentationStore') as typeof import('../../../src/state/usePresentationStore');

  return {
    useTransport: () => ({
      state: {
        isPlaying: true,
        isEnded: false,
        isBuffering: false,
        canEnterPip: true,
        currentUri: 'file:///a.mkv',
        title: 'A',
      },
      commands: {
        enterPip: () => {
          const s = store.getState();
          mockStateWhenAsked = {
            pipActive: s.pipActive,
            pipEntryRequested: s.pipEntryRequested,
          };
          return mockEnterPip();
        },
      },
    }),
  };
});

/** Run the frame the hook has scheduled. */
const runNextFrame = async () => {
  const callback = mockFrameCallbacks.shift();
  expect(callback).toBeDefined();
  await act(async () => {
    callback?.(0);
  });
};

describe('usePipEntry', () => {
  let rafSpy: jest.SpyInstance;
  let cafSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockStateWhenAsked = null;
    mockFrameCallbacks = [];
    mockEnterPip.mockReturnValue(true);

    // The frame is controlled, not waited for.
    rafSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((cb: FrameCallback) => {
        mockFrameCallbacks.push(cb);
        return mockFrameCallbacks.length;
      });
    cafSpy = jest
      .spyOn(global, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    // A clean slate: not in PiP, no entry requested. The reset is inside
    // act() because the hook from the previous test may still be mounted,
    // and a store write outside act() is an update React did not expect.
    await act(async () => {
      usePresentationStore.setState({
        pipActive: false,
        pipEntryRequested: false,
      });
    });
  });

  afterEach(async () => {
    rafSpy.mockRestore();
    cafSpy.mockRestore();
    await act(async () => {
      usePresentationStore.setState({
        pipActive: false,
        pipEntryRequested: false,
      });
    });
  });

  it('does NOT enter PiP until the app asks for it', async () => {
    await renderHook(() => usePipEntry());
    expect(mockEnterPip).not.toHaveBeenCalled();
  });

  it('the request hides the chrome and records the request in ONE update', async () => {
    await renderHook(() => usePipEntry());

    await act(async () => {
      usePresentationStore.getState().requestPip();
    });

    // There is no frame in which the app has asked for PiP but the chrome
    // is still up: both facts are written together.
    expect(usePresentationStore.getState().pipActive).toBe(true);
    expect(usePresentationStore.getState().pipEntryRequested).toBe(true);
  });

  it('does NOT ask the OS until the frame that removed the chrome has run', async () => {
    await renderHook(() => usePipEntry());

    await act(async () => {
      usePresentationStore.getState().requestPip();
    });

    // The frame has been SCHEDULED but has not run. The OS is not asked
    // yet — this is the whole point of the fix.
    expect(mockFrameCallbacks).toHaveLength(1);
    expect(mockEnterPip).not.toHaveBeenCalled();

    await runNextFrame();
    expect(mockEnterPip).toHaveBeenCalledTimes(1);
  });

  it('asks the OS only AFTER the chrome is gone', async () => {
    await renderHook(() => usePipEntry());

    await act(async () => {
      usePresentationStore.getState().requestPip();
    });
    await runNextFrame();

    // The fact that matters: at the moment the OS was asked, the chrome
    // was already unmounted. `pipActive` true ⇒ `mode` is 'pip' ⇒
    // `isExpanded` is false ⇒ the expanded chrome is not in the tree.
    expect(mockStateWhenAsked).toEqual({
      pipActive: true,
      pipEntryRequested: true,
    });
  });

  it('a REFUSED entry puts the chrome back exactly as it was', async () => {
    mockEnterPip.mockReturnValue(false);
    await renderHook(() => usePipEntry());

    await act(async () => {
      usePresentationStore.getState().requestPip();
    });
    expect(usePresentationStore.getState().pipActive).toBe(true);

    await runNextFrame();

    expect(mockEnterPip).toHaveBeenCalledTimes(1);
    expect(usePresentationStore.getState().pipActive).toBe(false);
    expect(usePresentationStore.getState().pipEntryRequested).toBe(false);
  });

  it('a GRANTED entry keeps the chrome gone and clears the request', async () => {
    await renderHook(() => usePipEntry());

    await act(async () => {
      usePresentationStore.getState().requestPip();
    });
    await runNextFrame();

    expect(usePresentationStore.getState().pipActive).toBe(true);
    expect(usePresentationStore.getState().pipEntryRequested).toBe(false);
  });

  it('does not enter twice for one request', async () => {
    await renderHook(() => usePipEntry());

    await act(async () => {
      usePresentationStore.getState().requestPip();
    });
    await runNextFrame();

    // The request was cleared, so the effect has nothing left to do. If
    // it had not been cleared, the OS would be asked again on every
    // render.
    expect(mockFrameCallbacks).toHaveLength(0);
    expect(mockEnterPip).toHaveBeenCalledTimes(1);
  });

  it('a request that arrives while the app is already in PiP is not a second window', async () => {
    usePresentationStore.setState({pipActive: true, pipEntryRequested: false});
    await renderHook(() => usePipEntry());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(mockEnterPip).not.toHaveBeenCalled();
  });
});
