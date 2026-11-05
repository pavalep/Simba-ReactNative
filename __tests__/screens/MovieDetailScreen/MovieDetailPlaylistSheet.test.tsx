/**
 * Phase 6 step 33 — the MOVIE DETAIL screen must reach `PlaylistSheet`.
 *
 * ## Which mechanism this screen uses, and why
 *
 * `MovieDetailScreen` shows ONE movie and no list of playlist-able items
 * (its lists are subtitle tracks, audio tracks and download formats — all
 * facets of the same film, not separate playlist material). So it uses the
 * VISIBLE-BUTTON precedent, exactly like `MusicDetailScreen`: an "Add to
 * Playlist" button under the title that opens `PlaylistSheet`. A long-press
 * menu on a single hero would have been an affordance with nothing to
 * apply it to.
 *
 * ## What is asserted
 *
 * The RECEIVED classification: the movie reaches the sheet as
 * `type: 'movie'` + `mediaType: 'video'`, so the ONE shared rule
 * (`compatiblePlaylistsFor`) offers the VIDEO playlist and refuses the
 * AUDIO one.
 */

import React from 'react';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {MovieDetailScreen} from '../../../src/screens/MovieDetailScreen/components/MovieDetailScreen';
import {usePlaylistsStore} from '../../../src/state';
import type {Playlist} from '../../../src/types/playlist';
import type {InternetArchiveVideoResult} from '../../../src/types/api';

// The player bridge is native.
const mockOpenWithResume = jest.fn(async (): Promise<boolean> => true);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
  };
});

// The detail screen reads its movie from the IA details API. The seam is
// the hook, so the fixture is driven from here.
let mockDetailMovie: InternetArchiveVideoResult | null = null;

jest.mock(
  '../../../src/screens/MovieDetailScreen/hooks/useMovieDetailScreen',
  () => ({
    useMovieDetailScreen: () => ({
      item: mockDetailMovie,
      isLoading: false,
      error: null,
      retry: jest.fn(),
    }),
  }),
);

// The native share sheet is not reachable from a unit test.
jest.mock('../../../src/services/shareService', () => ({
  shareContent: jest.fn(),
}));

const PLAYABLE_MOVIE: InternetArchiveVideoResult = {
  identifier: 'the-rifle',
  title: 'The Rifle',
  description: 'A USMC training film.',
  creator: 'USMC',
  year: '1960',
  duration: 540,
  avgRating: 0,
  downloadCount: 0,
  imageUrl: 'https://archive.org/services/img/the-rifle',
  streamingUrl: 'https://archive.org/download/the-rifle/the-rifle.mp4',
  subtitles: [],
  audioTracks: [],
  downloadUrls: [],
  source: 'api',
  type: 'movie',
  mediaType: 'video',
};

/** A movie whose IA item has no playable file — the DIRECTORY url. */
const UNPLAYABLE_MOVIE: InternetArchiveVideoResult = {
  ...PLAYABLE_MOVIE,
  streamingUrl: 'https://archive.org/download/the-rifle/',
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

const PLAYLISTS: Playlist[] = [
  makePlaylist({id: 'pl_audio', name: 'Road Trip', kind: 'AUDIO_ONLY'}),
  makePlaylist({id: 'pl_video', name: 'Film Night', kind: 'VIDEO_ONLY'}),
];

async function renderScreen() {
  return renderWithProviders(MovieDetailScreen, {
    routeName: 'MovieDetail',
    initialParams: {identifier: 'the-rifle'},
  });
}

/**
 * The sheet closes itself 800 ms after an add. Let that timer run, or the
 * suite leaks a pending handle and the worker is force-exited.
 */
async function letSheetClose(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 900));
  });
}

describe('MovieDetailScreen — the visible Add to Playlist button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlaylistsStore.getState().setPlaylists(PLAYLISTS);
    mockDetailMovie = PLAYABLE_MOVIE;
  });

  it('shows an Add to Playlist button that opens PlaylistSheet', async () => {
    await renderScreen();

    // The VISIBLE button — the MusicDetailScreen precedent, because this
    // screen shows one movie and no list of items.
    const button = screen.getByLabelText('Add movie to playlist');
    expect(button).toBeOnTheScreen();

    await fireEvent.press(button);

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });
  });

  it('offers the movie the VIDEO playlist, and refuses the AUDIO one', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Add movie to playlist'));

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });

    expect(screen.getByText('Film Night')).toBeOnTheScreen();
    // The "must not" claim: a film must not be offered an audio playlist.
    expect(screen.queryByText('Road Trip')).toBeNull();
  });

  it('stores the movie with its TRUTHFUL kind', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Add movie to playlist'));
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

    expect(stored?.fileUri).toBe(
      'https://archive.org/download/the-rifle/the-rifle.mp4',
    );
    expect(stored?.type).toBe('movie');
    expect(stored?.mediaType).toBe('video');
    expect(stored?.source).toBe('api');

    await letSheetClose();
  });

  it('must NOT open the playlist sheet for a movie with no playable file', async () => {
    mockDetailMovie = UNPLAYABLE_MOVIE;

    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Add movie to playlist'));

    // The IA url is the collection DIRECTORY — there is no file to list,
    // so the sheet must not open on a uri that cannot play.
    expect(screen.queryByText('Select a Playlist')).toBeNull();
  });
});
