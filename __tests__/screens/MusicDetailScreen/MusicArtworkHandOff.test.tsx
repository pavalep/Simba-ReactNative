/**
 * B-026 — `MusicDetailScreen`'s play action must hand the artwork to the
 * launch.
 *
 * ## The defect
 *
 * The screen COMPUTED the artwork — `imageUrl` for a Jamendo track,
 * `artworkUrl` for an Audius one — and then dropped it. It reached the
 * More sheet's `currentItem` and the header image, and the LAUNCH was
 * the one place it did not reach.
 *
 * ## Why the launch is the place that matters
 *
 * The launch is the only route artwork takes into the history store:
 *
 *   openPlayer({thumbnailPath})
 *     -> useResumeAwareLaunch  — the session records it
 *       -> usePlaybackCheckpointSync — the checkpoint copies it
 *         -> recentHistoryStore — `thumbnailPath` on the entry
 *           -> useSearch — the search result's artwork
 *             -> ResultTile — the poster the user actually sees
 *
 * With the artwork missing at the FIRST link, every history entry was
 * written with `thumbnailPath: ''`, so the tile for a track the user had
 * already played drew a placeholder instead of a poster.
 *
 * ## What is asserted
 *
 * The RECEIVED ARGUMENT, not "a callback fired". `fireEvent.press`
 * walks UP the tree to a composite's props, so it can reach a handler the
 * component never forwarded; asserting only that something was called
 * would pass even if the artwork was dropped on the way to the launch.
 */

import React from 'react';
import {fireEvent, screen} from '@testing-library/react-native';
import {renderWithProviders} from '../../helpers/renderWithProviders';
import {MusicDetailScreen} from '../../../src/screens/MusicDetailScreen/components/MusicDetailScreen';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import type {JamendoTrackResult} from '../../../src/types/api';

const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);

// The app's launch seam routes through `useOpenWithResume`, so that is
// the hook that has to be intercepted. `...actual` keeps every OTHER
// export of the package (notably `resolveStreamType`, which the player
// barrel imports) real — a stubbed module that dropped it would fail
// with "not a function" instead of on the missing artwork.
jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
  };
});

const ARTWORK = 'https://cdn.example.test/nightdrive.jpg';

const mockTrack: JamendoTrackResult = {
  id: 42,
  name: 'Nightdrive',
  artistName: 'Kavinsky',
  albumName: 'OutRun',
  duration: 240,
  audioUrl: 'https://cdn.example.test/nightdrive.mp3',
  imageUrl: ARTWORK,
  genreName: 'Electronic',
  mediaType: 'audio',
  type: 'music',
  source: 'api',
};

jest.mock(
  '../../../src/screens/MusicDetailScreen/hooks/useMusicDetailScreen',
  () => ({
    // `mockTrack` is read when the hook is CALLED (at render time), not
    // when this factory runs — so the fixture is initialised by then.
    useMusicDetailScreen: () => ({
      track: mockTrack,
      isLoading: false,
      error: null,
    }),
  }),
);

// The "more from this artist" rail is a network query; the screen's
// artwork contract does not depend on it.
jest.mock('../../../src/hooks/useMoreFromArtist', () => ({
  useMoreFromArtist: () => ({tracks: [], isLoading: false, retry: jest.fn()}),
}));

// A modal sheet — not part of this contract, and expensive to mount.
jest.mock('../../../src/components/sheets/PlaylistSheet/PlaylistSheet', () => ({
  PlaylistSheet: () => null,
}));

// The loading orb is an animation. It is not part of this contract and
// its first mount costs seconds.
jest.mock(
  '../../../src/components/feedback/ActivityOrb/ActivityOrb',
  () => ({ActivityOrb: () => null}),
);

// The native share sheet is not reachable from a unit test.
jest.mock('../../../src/services/shareService', () => ({
  shareContent: jest.fn(),
}));

const renderScreen = async () => {
  const result = await renderWithProviders(MusicDetailScreen, {
    routeName: 'MusicDetail',
    initialParams: {trackId: '42', source: 'jamendo'},
  });
  return result;
};

describe('B-026 — MusicDetailScreen hands its artwork to the launch', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    // The session is module-global, so a test that asserts on what a
    // launch RECORDED needs a clean one to read.
    useNowPlayingStore.getState().reset();
  });

  it('sends the artwork it computed as the launch’s artworkPath', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Play track'));

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    // The artwork must be the RECEIVED value, not merely present.
    expect(mockOpenWithResume.mock.calls[0]![0]).toMatchObject({
      uri: mockTrack.audioUrl,
      artworkPath: ARTWORK,
    });
  });

  it('records the artwork on the session, which is what the checkpoint writer copies', async () => {
    // The session is the hand-off to the history store: the checkpoint
    // writer reads `session.thumbnailPath` and writes it onto the entry.
    // A launch that shows the artwork but does not RECORD it would still
    // leave the tile with nothing to draw.
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Play track'));

    expect(useNowPlayingStore.getState().current?.thumbnailPath).toBe(ARTWORK);
  });
});
