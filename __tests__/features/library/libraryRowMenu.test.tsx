/**
 * The Library's row menu — every action must DO something.
 *
 * ## The defect this pins
 *
 * `MediaListItem` used to render `MediaContextMenu` — a second copy of the
 * app's bottom-sheet grammar — and three of its four rows were empty
 * `onPress: () => {}` no-ops: "Add to Playlist", "Add to Queue" and "Info".
 * A user long-pressed a scanned file in the Library, tapped "Add to Queue",
 * and NOTHING happened, silently. A control that cannot act must not
 * occupy space.
 *
 * ## What this asserts
 *
 *  1. The row opens the app's ONE menu (`MediaActionsSheet`) — the old copy
 *     is gone.
 *  2. "Play" plays the row.
 *  3. "Play Next" and "Add to Queue" reach the queue store, carrying the
 *     SCANNER's classification and a duration in SECONDS. The row's own
 *     `duration` prop is MILLISECONDS, so this also pins the unit
 *     conversion: 125 s must not reach the queue as 125000, nor as 0.125.
 *  4. "Add to Playlist" opens the app's ONE playlist picker.
 *  5. There is no "Info" row. The app has no media-info surface for a local
 *     file, so the row is removed rather than left as a dead control.
 */

import React from 'react';
import {act, fireEvent} from '@testing-library/react-native';
import type {RenderResult} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';
import {LibraryAudioSegment} from '../../../src/features/library/presentation/components/LibraryAudioSegment';
import {usePlayerQueueStore} from '@simba-dev/react-native-media-player/src/stores/playerQueueStore';
import {darkTokens} from '../../../src/theme/tokens';
import type {ScannedTrack} from '../../../src/state';

/** The scanner's unit is SECONDS. The row's `duration` prop is × 1000. */
const TRACK: ScannedTrack = {
  uri: 'file:///storage/emulated/0/Music/field-recording.mp3',
  title: 'Field Recording',
  artist: 'Home Tapes',
  album: 'Home Tapes',
  year: 2026,
  genre: '',
  trackNumber: 0,
  duration: 125,
  albumArtUri: '',
  folderPath: '/storage/emulated/0/Music',
  folderId: 'local-folder:audio:/storage/emulated/0/Music',
  source: 'local',
  type: 'audio',
  mediaType: 'audio',
};

const mockMediaPress = jest.fn();

/**
 * The queries come from the render result, not from the global `screen`:
 * RNTL points `screen` at the most recent render, so a global query can end
 * up looking at a tree this test never mounted.
 */
async function renderSegment(track: ScannedTrack = TRACK): Promise<RenderResult> {
  return renderChrome(
    <LibraryAudioSegment
      audioFolders={['/storage/emulated/0/Music']}
      scannedTracks={[track]}
      filterType="all"
      sortBy="name"
      colors={darkTokens.colors}
      onNavigateToFolderBrowser={jest.fn()}
      onNavigateToLinkedFolders={jest.fn()}
      onMediaPress={mockMediaPress}
    />,
    {theme: true},
  );
}

async function openRowMenu(view: RenderResult) {
  await fireEvent(view.getByText(TRACK.title), 'longPress');
}

/**
 * The queue is the app's own store — read it, do not re-implement it.
 *
 * It is read through the module's own queue store, which is a plain zustand
 * store: `getState()` gives the queue with no React tree of its own, so the
 * Library's tree stays the only tree in this test.
 */
function readQueue() {
  return usePlayerQueueStore.getState().queue;
}

/**
 * Empty the queue between tests.
 *
 * The `act` MUST be awaited. An un-awaited `act` leaves React's act scope
 * open, and the NEXT test's tree then never commits — it renders empty, and
 * the row cannot be found.
 */
async function clearQueue() {
  await act(async () => {
    usePlayerQueueStore.getState().clearQueue();
  });
}

describe('the Library row menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the app ONE menu — not a second copy of it', async () => {
    const view = await renderSegment();
    await openRowMenu(view);

    // The app's menu is `MediaActionsSheet`. Its scrim carries this label;
    // the deleted `MediaContextMenu` did not.
    expect(view.getByLabelText('Close menu')).toBeOnTheScreen();
    expect(view.getByText('Play')).toBeOnTheScreen();
    expect(view.getByText('Play Next')).toBeOnTheScreen();
    expect(view.getByText('Add to Queue')).toBeOnTheScreen();
    expect(view.getByText('Add to Playlist')).toBeOnTheScreen();
  });

  it('offers no row that leads nowhere — "Info" is gone', async () => {
    const view = await renderSegment();
    await openRowMenu(view);

    // The app has no media-info surface for a local media file.
    expect(view.queryByText('Info')).toBeNull();
  });

  it('plays the row', async () => {
    const view = await renderSegment();
    await openRowMenu(view);

    await fireEvent.press(view.getByText('Play'));

    expect(mockMediaPress).toHaveBeenCalledWith(TRACK);
  });

  it('puts the track at the head of the queue — "Play Next"', async () => {
    const view = await renderSegment();
    await clearQueue();

    await openRowMenu(view);
    await fireEvent.press(view.getByText('Play Next'));

    // The queue store is written synchronously by the action.
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]).toMatchObject({
      uri: TRACK.uri,
      title: TRACK.title,
      // SECONDS. The row's prop is milliseconds (125 × 1000), and the queue
      // stores seconds — so this is exactly one conversion, at the seam.
      duration: TRACK.duration,
      source: 'local',
      type: 'audio',
      mediaType: 'audio',
      folderId: TRACK.folderId,
    });
  });

  it('puts the track at the tail of the queue — "Add to Queue"', async () => {
    const view = await renderSegment();
    await clearQueue();

    await openRowMenu(view);
    await fireEvent.press(view.getByText('Add to Queue'));

    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]).toMatchObject({
      uri: TRACK.uri,
      title: TRACK.title,
      duration: TRACK.duration,
      source: 'local',
      type: 'audio',
      mediaType: 'audio',
      folderId: TRACK.folderId,
    });
  });

  it('opens the app ONE playlist picker — "Add to Playlist"', async () => {
    const view = await renderSegment();
    await openRowMenu(view);

    await fireEvent.press(view.getByText('Add to Playlist'));

    expect(view.getByText('Select a Playlist')).toBeOnTheScreen();
  });
});
