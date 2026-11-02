/**
 * Phase 6 step 33 — a MOVIE must be addable to a playlist from the Movies
 * grid.
 *
 * ## The gap this closes
 *
 * Every one of the app's nine `PlaylistSheet` call sites was music /
 * podcast / radio / live-TV, so a film could not enter a playlist AT ALL.
 * The Movies grid now opens the app's OWN media menu (`MediaActionsSheet`,
 * 58.4/58.5) on a long press, and that menu's "Add to Playlist" row opens
 * `PlaylistSheet` — the same shape as `ArchiveItemDetailScreen` and
 * `AudiobookDetailScreen`.
 *
 * ## What is asserted
 *
 * The RECEIVED classification, not "a callback fired". The movie reaches
 * the sheet as `type: 'movie'` + `mediaType: 'video'`, so the ONE shared
 * rule (`compatiblePlaylistsFor`) offers the VIDEO and MIXED playlists and
 * refuses the AUDIO one. The last test proves the SAME rule from the
 * audio side, so the rule is pinned from both directions instead of for
 * one lane only.
 *
 * The search result carries the collection DIRECTORY url, not a file, so
 * the grid resolves the playable file before it hands a uri to the sheet —
 * a playlist entry PLAYS its uri.
 */

import React from 'react';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';
import {renderWithProviders} from '../../helpers/renderWithProviders';
import {MoviesContent} from '../../../src/screens/MoviesScreen/components/MoviesContent';
import {MoviesDataProvider} from '../../../src/screens/MoviesScreen/components/MoviesDataProvider';
import {PlaylistSheet} from '../../../src/components/sheets/PlaylistSheet';
import {usePlaylistsStore} from '../../../src/state';
import type {Playlist} from '../../../src/types/playlist';
import type {InternetArchiveVideoResult} from '../../../src/types/api';
import type {SectionRenderContext} from '../../../src/screens/_shared/sectionRenderContext';

// The player bridge is native. `...actual` keeps every OTHER export of the
// package (notably `useQueue`, which the facade imports) real.
const mockOpenWithResume = jest.fn(async (): Promise<boolean> => true);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
  };
});

// The IA adapter owns the resolution of a movie's playable file. The grid
// calls it, so the call is intercepted here rather than re-implemented.
jest.mock('../../../src/infrastructure/api/internetArchive/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/internetArchive/adapter',
  );
  return {
    ...actual,
    resolveInternetArchiveVideoDetails: jest.fn(),
  };
});

// The grid's data comes from the IA search API. The scope is stubbed so
// the test drives ONE card.
jest.mock('../../../src/screens/MoviesScreen/hooks/useMoviesScreen', () => ({
  useMoviesScreen: () => ({
    data: {
      items: [mockSearchMovie],
      numFound: 1,
      hasLoaded: true,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      categoryIds: ['all'],
      term: '',
      hasMore: false,
    },
    loadMore: jest.fn(),
    refetch: jest.fn(),
  }),
}));

const {resolveInternetArchiveVideoDetails: mockResolveDetails} =
  jest.requireMock('../../../src/infrastructure/api/internetArchive/adapter') as {
    resolveInternetArchiveVideoDetails: jest.Mock;
  };

/** A search result — the collection DIRECTORY url, not a playable file. */
const mockSearchMovie: InternetArchiveVideoResult = {
  identifier: 'the-rifle',
  title: 'The Rifle',
  description: 'A USMC training film.',
  creator: 'USMC',
  year: '1960',
  duration: 540,
  avgRating: 0,
  downloadCount: 0,
  imageUrl: 'https://archive.org/services/img/the-rifle',
  streamingUrl: 'https://archive.org/download/the-rifle/',
  subtitles: [],
  audioTracks: [],
  downloadUrls: [],
  source: 'api',
  type: 'movie',
  mediaType: 'video',
};

/** The RESOLVED movie — the file url a queue/playlist entry can play. */
const mockPlayableMovie: InternetArchiveVideoResult = {
  ...mockSearchMovie,
  streamingUrl: 'https://archive.org/download/the-rifle/the-rifle.mp4',
};

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_audio',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

/** One playlist of every kind, so the rule has something to refuse. */
const PLAYLISTS: Playlist[] = [
  makePlaylist({id: 'pl_audio', name: 'Road Trip', kind: 'AUDIO_ONLY'}),
  makePlaylist({id: 'pl_video', name: 'Film Night', kind: 'VIDEO_ONLY'}),
  makePlaylist({id: 'pl_mixed', name: 'Everything', kind: 'MIXED'}),
];

const CTX: SectionRenderContext = {query: '', options: {}, offline: false};

async function renderMoviesGrid() {
  const Harness: React.FC = () => (
    <MoviesDataProvider>
      <MoviesContent ctx={CTX} />
    </MoviesDataProvider>
  );
  return renderWithProviders(Harness, {routeName: 'MoviesScreen'});
}

/** The sheet's own item shape — the sheet classifies it, the test does not. */
type SheetItem = React.ComponentProps<typeof PlaylistSheet>['currentItem'];

/**
 * The sheet closes itself 800 ms after an add. Let that timer run, or the
 * suite leaks a pending handle and the worker is force-exited.
 */
async function letSheetClose(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 900));
  });
}

describe('Movies grid — a movie reaches the playlist sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlaylistsStore.getState().setPlaylists(PLAYLISTS);
    mockResolveDetails.mockResolvedValue(mockPlayableMovie);
  });

  it('opens the app media menu on a long press, and its Add to Playlist row opens PlaylistSheet', async () => {
    await renderMoviesGrid();

    await fireEvent(screen.getByText('The Rifle'), 'longPress');

    // The app's ONE media menu (58.4/58.5) — not a per-screen menu.
    expect(screen.getByText('Play Next')).toBeOnTheScreen();
    expect(screen.getByText('Add to Queue')).toBeOnTheScreen();
    expect(screen.getByText('Add to Playlist')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Add to Playlist'));

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });
  });

  it('offers the movie the VIDEO and MIXED playlists, and refuses the AUDIO one', async () => {
    await renderMoviesGrid();

    await fireEvent(screen.getByText('The Rifle'), 'longPress');
    await fireEvent.press(screen.getByText('Add to Playlist'));

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });

    // A film can go into a video playlist…
    expect(screen.getByText('Film Night')).toBeOnTheScreen();
    // …and into a mixed playlist…
    expect(screen.getByText('Everything')).toBeOnTheScreen();
    // …but NOT into an audio playlist. This is the "must not" claim: it
    // fails the moment the movie's kind is anything but a video kind.
    expect(screen.queryByText('Road Trip')).toBeNull();
  });

  it('stores the movie with its TRUTHFUL kind and the RESOLVED file url', async () => {
    await renderMoviesGrid();

    await fireEvent(screen.getByText('The Rifle'), 'longPress');
    await fireEvent.press(screen.getByText('Add to Playlist'));

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByText('Film Night'));

    await waitFor(() => {
      const playlist = usePlaylistsStore
        .getState()
        .playlists.find(entry => entry.id === 'pl_video');
      expect(playlist?.items).toHaveLength(1);
    });

    const stored = usePlaylistsStore
      .getState()
      .playlists.find(entry => entry.id === 'pl_video')?.items[0];

    // The search result's url ends in "/" — the DIRECTORY. A playlist
    // entry PLAYS its uri, so the sheet must have been handed the FILE.
    expect(mockResolveDetails).toHaveBeenCalledWith('the-rifle');
    expect(stored?.fileUri).toBe(
      'https://archive.org/download/the-rifle/the-rifle.mp4',
    );
    // And the kind it was stored under is the TRUTH about a film.
    expect(stored?.type).toBe('movie');
    expect(stored?.mediaType).toBe('video');
    expect(stored?.source).toBe('api');
    expect(stored?.provider).toBe('internetArchive');

    await letSheetClose();
  });
});

describe('the shared playlist rule — proven from BOTH sides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlaylistsStore.getState().setPlaylists(PLAYLISTS);
  });

  it('still offers an AUDIO item the AUDIO and MIXED playlists, and refuses the VIDEO one', async () => {
    const AUDIO_ITEM: SheetItem = {
      fileUri: 'file:///music/song.mp3',
      title: 'A Song',
      duration: 210,
      source: 'local',
      type: 'music',
      mediaType: 'audio',
    };

    await renderChrome(
      <PlaylistSheet visible onClose={jest.fn()} currentItem={AUDIO_ITEM} />,
      {theme: true},
    );

    // The mirror image of the movie case above. The same rule, the other
    // lane: an audio playlist and a mixed playlist take a track…
    expect(screen.getByText('Road Trip')).toBeOnTheScreen();
    expect(screen.getByText('Everything')).toBeOnTheScreen();
    // …and a video playlist does not. This is the "must not" claim.
    expect(screen.queryByText('Film Night')).toBeNull();
  });
});
