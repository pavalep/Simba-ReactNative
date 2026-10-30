/**
 * B-026 — `ArchiveItemDetailScreen`'s track press must hand the artwork to
 * the launch.
 *
 * ## The defect
 *
 * The screen had the item's cover art in hand — `item.imageUrl` — and
 * used it for the bookmark sheet and the add-to-playlist sheet. The
 * LAUNCH was the one place it did not reach: `handleTrackPress` opened
 * the player with `{uri, title, type}` and nothing else.
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
 * written with `thumbnailPath: ''`, so the tile for a film the user had
 * already watched drew a placeholder instead of a poster.
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
import {ArchiveItemDetailScreen} from '../../../src/screens/ArchiveItemDetailScreen/components/ArchiveItemDetailScreen';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import type {
  ArchiveTrack,
  InternetArchiveItemResult,
} from '../../../src/types/api';

const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);

// The app's launch seam routes through `useOpenWithResume`, so that is
// the hook that has to be intercepted. `...actual` keeps every OTHER
// export of the package (notably `resolveStreamType` and `useQueue`,
// which the player barrel imports) real — a stubbed module that dropped
// them would fail with "not a function" instead of on the missing
// artwork.
jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
  };
});

const ARTWORK = 'https://archive.org/services/img/the-rifle';

const mockItem: InternetArchiveItemResult = {
  identifier: 'the-rifle',
  title: 'The Rifle',
  description: 'A USMC training film.',
  creator: 'USMC',
  year: '1960',
  runtime: '9 min',
  avgRating: 0,
  downloadCount: 0,
  imageUrl: ARTWORK,
  streamingUrl: 'https://archive.org/download/the-rifle/the-rifle.mp4',
  downloadUrls: [],
  mediaType: 'video',
  type: 'movie',
  source: 'api',
};

const mockTracks: ArchiveTrack[] = [
  {
    name: 'the-rifle.mp4',
    title: 'The Rifle',
    url: 'https://archive.org/download/the-rifle/the-rifle.mp4',
    lengthSeconds: 540,
    format: 'h.264',
    trackNumber: 1,
    mediaType: 'video',
    type: 'movie',
    source: 'api',
  },
];

jest.mock(
  '../../../src/screens/ArchiveItemDetailScreen/hooks/useArchiveItemDetailScreen',
  () => ({
    // The fixtures are read when the hook is CALLED (at render time),
    // not when this factory runs — so they are initialised by then.
    useArchiveItemDetailScreen: () => ({
      item: mockItem,
      tracks: mockTracks,
      isLoading: false,
      error: null,
      retry: jest.fn(),
    }),
  }),
);

// Modal sheets — not part of this contract, and expensive to mount.
jest.mock(
  '../../../src/components/sheets/PlaylistSheet/PlaylistSheet',
  () => ({PlaylistSheet: () => null}),
);
jest.mock(
  '../../../src/components/sheets/MediaActionsSheet/MediaActionsSheet',
  () => ({MediaActionsSheet: () => null}),
);

// The loading orb is an animation. It is not part of this contract and
// its first mount costs seconds.
jest.mock(
  '../../../src/components/feedback/ActivityOrb/ActivityOrb',
  () => ({ActivityOrb: () => null}),
);

// The native share sheet and the haptics bridge are not reachable from a
// unit test.
jest.mock('../../../src/services/shareService', () => ({
  shareContent: jest.fn(),
}));
jest.mock('react-native-haptic-feedback', () => ({
  useHaptics: () => ({trigger: jest.fn()}),
}));

const renderScreen = async () =>
  renderWithProviders(ArchiveItemDetailScreen, {
    routeName: 'ArchiveItemDetail',
    initialParams: {identifier: 'the-rifle', title: 'The Rifle'},
  });

describe('B-026 — ArchiveItemDetailScreen hands its artwork to the launch', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    // The session is module-global, so a test that asserts on what a
    // launch RECORDED needs a clean one to read.
    useNowPlayingStore.getState().reset();
  });

  it('sends the item’s cover art as the launch’s artworkPath', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByText('1. The Rifle'));

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    // The artwork must be the RECEIVED value, not merely present.
    expect(mockOpenWithResume.mock.calls[0]![0]).toMatchObject({
      uri: mockTracks[0]!.url,
      artworkPath: ARTWORK,
    });
  });

  it('records the artwork on the session, which is what the checkpoint writer copies', async () => {
    // The session is the hand-off to the history store: the checkpoint
    // writer reads `session.thumbnailPath` and writes it onto the entry.
    // A launch that shows the artwork but does not RECORD it would still
    // leave the tile with nothing to draw.
    await renderScreen();

    await fireEvent.press(screen.getByText('1. The Rifle'));

    expect(useNowPlayingStore.getState().current?.thumbnailPath).toBe(ARTWORK);
  });
});
