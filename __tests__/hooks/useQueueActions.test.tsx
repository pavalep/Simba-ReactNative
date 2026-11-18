/**
 * The queue action's toast offers an UNDO, and the undo removes the right
 * item.
 *
 * ## Why this exists
 *
 * "Added to queue" is a thing you can regret. Spotify, Apple Music and
 * YouTube Music all offer an **Undo** on that exact toast, and the app's
 * own `Toast` was BUILT for it — its action slot's docblock names "Undo"
 * as the example — but nothing used one for a queue action.
 *
 * ## What is asserted
 *
 *  1. the toast carries an Undo action;
 *  2. the Undo removes the item that was just added;
 *  3. the Undo removes the RIGHT one — "Add to Queue" appends, so its
 *     undo removes from the TAIL, and "Play Next" prepends, so its undo
 *     removes from the HEAD. Matching by URI, not by a remembered index,
 *     is what makes that correct when the queue changed in between.
 *
 * The lib's queue is a plain zustand store with no native bridge, so the
 * REAL store is used here — a mocked one would be a second owner of the
 * same fact.
 */

import * as React from 'react';
import {renderHook, act} from '@testing-library/react-native';

const mockToastShow = jest.fn();

jest.mock('../../src/components/feedback/Toast', () => ({
  ToastProvider: ({children}: {children: React.ReactNode}) => children,
  useToast: () => ({show: mockToastShow, hide: jest.fn()}),
}));

/**
 * Only the queue surface, taken from the REAL lib. The app's barrel also
 * exports `VideoPlayer`, which imports the barrel back — a cycle this
 * suite has no reason to walk.
 */
jest.mock('../../src/infrastructure/player', () => {
  const lib = jest.requireActual('@simba-dev/react-native-media-player');
  return {useQueue: lib.useQueue};
});

import {useQueueActions} from '../../src/hooks/useQueueActions';
import {usePlayerQueueStore} from '@simba-dev/react-native-media-player/src/stores/playerQueueStore';

const TRACK = {
  uri: 'file:///music/song.mp3',
  title: 'A Song',
  duration: 210,
  source: 'local' as const,
  type: 'music' as const,
  mediaType: 'audio' as const,
};

const OTHER = {...TRACK, uri: 'file:///music/other.mp3', title: 'Another'};

const queue = () => usePlayerQueueStore.getState().queue;

/** The Undo action the toast was given, if it was given one. */
function undoAction(): (() => void) | null {
  const call = mockToastShow.mock.calls[mockToastShow.mock.calls.length - 1];
  const options = call?.[2] as
    | {action?: {label: string; onPress: () => void}}
    | undefined;
  return options?.action?.onPress ?? null;
}

describe('useQueueActions — the toast offers an Undo', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // RNTL 14's `act` is ASYNC and must be awaited. A store write outside
    // an awaited act leaves a pending act queue behind, and the NEXT
    // test's tree renders empty — which reads as a null hook result and
    // nothing like the cause.
    await act(async () => {
      usePlayerQueueStore.getState().clearQueue();
    });
  });

  it('adds the item and shows a toast carrying an Undo', async () => {
    const {result} = await renderHook(() => useQueueActions());

    await act(async () => {
      result.current.addToQueue(TRACK);
    });

    expect(queue()).toHaveLength(1);
    expect(queue()[0]?.uri).toBe(TRACK.uri);
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(undoAction()).toBeTruthy();
  });

  it('the Undo removes the item that was added', async () => {
    const {result} = await renderHook(() => useQueueActions());

    await act(async () => {
      result.current.addToQueue(TRACK);
    });
    const undo = undoAction();
    expect(undo).toBeTruthy();

    await act(async () => {
      undo?.();
    });

    expect(queue()).toHaveLength(0);
  });

  it('"Add to Queue" appends, so its Undo removes from the TAIL', async () => {
    const {result} = await renderHook(() => useQueueActions());

    await act(async () => {
      result.current.addToQueue(OTHER);
    });
    await act(async () => {
      result.current.addToQueue(TRACK);
    });
    expect(queue().map(q => q.uri)).toEqual([OTHER.uri, TRACK.uri]);

    // The SECOND toast is the one for TRACK.
    const undo = undoAction();
    await act(async () => {
      undo?.();
    });

    // The item that was added is gone; the other one is untouched.
    expect(queue().map(q => q.uri)).toEqual([OTHER.uri]);
  });

  it('"Play Next" prepends, so its Undo removes from the HEAD', async () => {
    const {result} = await renderHook(() => useQueueActions());

    await act(async () => {
      result.current.addToQueue(OTHER);
    });
    await act(async () => {
      result.current.playNext(TRACK);
    });
    expect(queue().map(q => q.uri)).toEqual([TRACK.uri, OTHER.uri]);

    const undo = undoAction();
    await act(async () => {
      undo?.();
    });

    // The prepended item is gone; the appended one is untouched. An undo
    // that removed from the tail would take the WRONG track away.
    expect(queue().map(q => q.uri)).toEqual([OTHER.uri]);
  });

  it('the item reaches the queue with its classification', async () => {
    const {result} = await renderHook(() => useQueueActions());

    await act(async () => {
      result.current.addToQueue({
        uri: 'https://cdn.test/film.mkv',
        title: 'A Film',
        duration: 5400,
        source: 'api',
        type: 'movie',
        mediaType: 'video',
        provider: 'internetArchive',
      });
    });

    expect(queue()[0]).toMatchObject({
      uri: 'https://cdn.test/film.mkv',
      duration: 5400,
      source: 'api',
      type: 'movie',
      mediaType: 'video',
      provider: 'internetArchive',
    });
  });
});
