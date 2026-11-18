/**
 * The Music screen's rows can be QUEUED.
 *
 * The Music screen was the only catalogue in the app without the
 * standard long-press menu: a Jamendo track could be played from its
 * own page, but it could never be added to the queue or played next
 * from the list — while Movies, All Videos, Album, Artist, the
 * streaming rows, History and the rest all carry the same menu.
 *
 * What is asserted here:
 *
 *   1. a LONG PRESS opens the app's ONE media menu (`MediaActionsSheet`)
 *      with "Play Next" and "Add to Queue";
 *   2. "Add to Queue" really QUEUES the track — the item lands in the
 *      queue store carrying the app's Jamendo classification — and the
 *      toast fires, because `useQueueActions` owns both;
 *   3. a TAP still opens the track's own page. The long press must not
 *      have taken the tap away.
 *
 * The queries are taken from the render RESULT, not from the global
 * `screen`: reading the queue needs a hook, and `renderHook` installs
 * a second root, which would move the global `screen` off the tree
 * under test.
 */

import React from 'react';
import {
  fireEvent,
  render,
  renderHook,
  type RenderResult,
} from '@testing-library/react-native';
import {
  useQueue,
  useQueueItems,
} from '@simba-dev/react-native-media-player';

import {ThemeProvider} from '../../../src/theme';
import {ToastProvider} from '../../../src/components/feedback/Toast';
import {TrackCard} from '../../../src/screens/MusicScreen/components/TrackCard';
import type {JamendoTrackResult} from '../../../src/types/api';

const TRACK: JamendoTrackResult = {
  id: 1,
  name: 'Night Drive',
  artistName: 'A Band',
  albumName: 'An Album',
  duration: 180,
  audioUrl: 'https://example.test/a.mp3',
  imageUrl: 'https://example.test/cover.jpg',
};

async function renderRow(
  onPress: () => void = jest.fn(),
): Promise<RenderResult> {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <TrackCard item={TRACK} onPress={onPress} />
      </ToastProvider>
    </ThemeProvider>,
  );
}

/** The queue store is a module singleton — each test starts empty. */
async function clearQueue(): Promise<void> {
  const {result} = await renderHook(() => useQueue());
  result.current.clearQueue();
}

async function readQueue() {
  const {result} = await renderHook(() => useQueueItems());
  return result.current;
}

describe('Music — the row menu', () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it('opens the app media menu on a long press', async () => {
    const view = await renderRow();

    // Nothing is open until the row is long-pressed.
    expect(view.queryByText('Play Next')).toBeNull();

    await fireEvent(view.getByText('Night Drive'), 'longPress');

    // The app's ONE media menu (58.4/58.5).
    expect(view.getByText('Play Next')).toBeOnTheScreen();
    expect(view.getByText('Add to Queue')).toBeOnTheScreen();

    // The sheet's header is the track, and the artist is its subtitle
    // — the same shape the streaming rows use. The artist appears
    // TWICE: once in the row itself and once as the sheet's subtitle.
    expect(view.getAllByText('A Band')).toHaveLength(2);
  });

  it('queues the track with the app Jamendo classification, and toasts', async () => {
    const view = await renderRow();

    await fireEvent(view.getByText('Night Drive'), 'longPress');
    await fireEvent.press(view.getByText('Add to Queue'));

    // The toast is `useQueueActions`' job — the queue wrapper, not the
    // store. It is what makes the action visible to the user.
    expect(view.getByText('Added to queue')).toBeOnTheScreen();

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      uri: TRACK.audioUrl,
      title: TRACK.name,
      duration: TRACK.duration,
      source: 'api',
      type: 'music',
      mediaType: 'audio',
      provider: 'jamendo',
    });
  });

  it('plays the track NEXT from the same menu', async () => {
    const view = await renderRow();

    await fireEvent(view.getByText('Night Drive'), 'longPress');
    await fireEvent.press(view.getByText('Play Next'));

    expect(view.getByText('Playing next')).toBeOnTheScreen();

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      uri: TRACK.audioUrl,
      type: 'music',
      mediaType: 'audio',
      provider: 'jamendo',
    });
  });

  it('a TAP still opens the track own page, and does not open the menu', async () => {
    const onPress = jest.fn();
    const view = await renderRow(onPress);

    await fireEvent.press(view.getByText('Night Drive'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.queryByText('Add to Queue')).toBeNull();
  });
});
