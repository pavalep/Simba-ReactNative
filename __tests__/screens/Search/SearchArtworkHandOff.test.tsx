/**
 * B-026 — the search grid's play action must hand the artwork to the
 * launch.
 *
 * ## The defect
 *
 * The search grid's play action had no artwork field at all:
 * `playWithToast` took `{uri, title, mediaType}`, so there was nothing
 * for a result to pass even when the result had a poster in hand.
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
 * already watched drew a placeholder instead of a poster — even though
 * the catalogue plainly had the artwork.
 *
 * ## What is asserted
 *
 * The RECEIVED ARGUMENT, not "a callback fired". `fireEvent.press`
 * walks UP the tree to a composite's props, so it can reach a handler the
 * component never forwarded; asserting only that something was called
 * would pass even if the artwork was dropped on the way to the launch.
 *
 * The whole chain is real here — the real grid, the real screen, the
 * real seam — so a mutation at ANY link (the tile's press, the grid's
 * `onPlayFile`, the screen's `handlePlayFile`, the facade's `usePlay`)
 * fails the assertion.
 */

import React from 'react';
import {fireEvent, screen} from '@testing-library/react-native';
import {renderWithProviders} from '../../helpers/renderWithProviders';
import {SearchScreen} from '../../../src/screens/Search/components/SearchScreen';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import type {SearchResultItem} from '../../../src/hooks/useSearch';

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

const ARTWORK = 'file:///movies/The.Rifle.1960/poster.jpg';

/**
 * The result the search hook reports. It is read when the hook is
 * CALLED (at render time), not when the factory runs — so the fixtures
 * are initialised by then.
 */
let mockAllResults: SearchResultItem[] = [];

jest.mock('../../../src/hooks/useSearch', () => ({
  useSearch: () => ({
    searchText: 'rifle',
    setSearchText: jest.fn(),
    debouncedQuery: 'rifle',
    allResults: mockAllResults,
    isSearching: false,
  }),
}));

// The remote half of the search screen. Not part of this contract, and
// it would fire five network queries.
jest.mock('../../../src/screens/Search/hooks/useAggregatedSearch', () => ({
  useAggregatedSearch: () => ({
    results: {
      podcasts: [],
      radioStations: [],
      audiobooks: [],
      iptvChannels: [],
      jamendoTracks: [],
      internetArchiveItems: [],
      audiusTracks: [],
    },
    isLoading: false,
    trending: [],
  }),
}));

// The tile's long-press sheet and the queue it writes to.
jest.mock(
  '../../../src/components/sheets/MediaActionsSheet/useQueueActions',
  () => ({
    useQueueActions: () => ({playNext: jest.fn(), addToQueue: jest.fn()}),
  }),
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

const renderScreen = async () =>
  renderWithProviders(SearchScreen, {routeName: 'Search'});

describe('B-026 — the search grid hands its artwork to the launch', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    mockAllResults = [];
    // The session is module-global, so a test that asserts on what a
    // launch RECORDED needs a clean one to read.
    useNowPlayingStore.getState().reset();
  });

  it('hands the film’s catalogue artwork to the launch', async () => {
    // The ticket's own scenario: a film the user has already watched.
    // The result carries the catalogue art the media store knows about.
    mockAllResults = [
      {
        id: 'track-file:///movies/The.Rifle.1960.mkv',
        title: 'The.Rifle.1960.mkv',
        group: 'videos',
        fileUri: 'file:///movies/The.Rifle.1960.mkv',
        thumbnailPath: ARTWORK,
        relevanceScore: 100,
      },
    ];

    await renderScreen();
    await fireEvent.press(screen.getByLabelText('Play The.Rifle.1960.mkv'));

    // A VIDEO launch renders in-window and never opens an Activity, so
    // the artwork cannot be seen on the bridge — it is recorded on the
    // SESSION, which is what the checkpoint writer copies into the
    // history entry, and therefore what the next search for this film
    // draws.
    expect(useNowPlayingStore.getState().current?.thumbnailPath).toBe(
      ARTWORK,
    );
  });

  it('hands an audio result’s artwork to the bridge as artworkPath', async () => {
    // The audio lane still opens an Activity, so the artwork is also the
    // media notification's large icon.
    mockAllResults = [
      {
        id: 'track-file:///music/nightdrive.mp3',
        title: 'nightdrive.mp3',
        group: 'audio',
        fileUri: 'file:///music/nightdrive.mp3',
        thumbnailPath: 'file:///music/nightdrive/cover.jpg',
        relevanceScore: 100,
      },
    ];

    await renderScreen();
    await fireEvent.press(screen.getByLabelText('Play nightdrive.mp3'));

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    expect(mockOpenWithResume.mock.calls[0]![0]).toMatchObject({
      uri: 'file:///music/nightdrive.mp3',
      artworkPath: 'file:///music/nightdrive/cover.jpg',
    });
  });
});
