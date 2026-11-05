/**
 * `AddToPlaylistScreen` — the page that gathers items from several
 * sections and adds them to ONE playlist.
 *
 * ## Why this page exists
 *
 * `PlaylistSheet` adds ONE item to ONE playlist, from one tile. This page
 * adds MANY items, gathered from more than one section, to ONE playlist.
 * They are different verbs, so they are different surfaces.
 *
 * ## What this pins
 *
 *  1. The page lists items from MORE THAN ONE section — a selection can
 *     be made from more than one section in one visit.
 *  2. The playlist list is filtered by the ONE rule
 *     (`compatiblePlaylistsFor`): ticking a film takes the audio playlists
 *     off the list, and leaves the video one on it. The rule itself is NOT
 *     re-implemented here — the test uses the real one.
 *  3. A playlist is created through the ONE create owner
 *     (`PlaylistCreateModal`) — the page has no create form of its own.
 *  4. The ticked items land in the chosen playlist.
 */

import React from 'react';
import {screen, fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {AddToPlaylistScreen} from '../../../src/screens/AddToPlaylistScreen/components/AddToPlaylistScreen';
import {usePlaylistsStore, useDownloadsStore} from '../../../src/state';
import type {Playlist} from '../../../src/types/playlist';
import type {DownloadRecord} from '../../../src/services/downloadService';

// The two catalogue adapters. The page talks to them directly, so the
// sections can be browsed without a network.
jest.mock('../../../src/infrastructure/api/jamendo/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/jamendo/adapter',
  );
  return {...actual, getPopularJamendoTracks: jest.fn()};
});

jest.mock('../../../src/infrastructure/api/internetArchive/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/internetArchive/adapter',
  );
  return {
    ...actual,
    searchInternetArchiveVideos: jest.fn(),
    resolveInternetArchiveVideoDetails: jest.fn(),
  };
});

const {getPopularJamendoTracks: mockGetPopularJamendoTracks} =
  jest.requireMock('../../../src/infrastructure/api/jamendo/adapter') as {
    getPopularJamendoTracks: jest.Mock;
  };

const {
  searchInternetArchiveVideos: mockSearchInternetArchiveVideos,
  resolveInternetArchiveVideoDetails: mockResolveInternetArchiveVideoDetails,
} = jest.requireMock(
  '../../../src/infrastructure/api/internetArchive/adapter',
) as {
  searchInternetArchiveVideos: jest.Mock;
  resolveInternetArchiveVideoDetails: jest.Mock;
};

const TRACK = {
  id: 4242,
  name: 'Night Drive',
  artistName: 'The Commuters',
  albumName: 'Late',
  duration: 201,
  audioUrl: 'https://cdn.jamendo.test/track.mp3',
  imageUrl: 'https://cdn.jamendo.test/cover.jpg',
  genreName: 'Electronic',
};

const MOVIE = {
  identifier: 'night_of_the_living_dead',
  title: 'Night of the Living Dead',
  description: 'A 1968 film.',
  creator: 'George A. Romero',
  year: '1968',
  duration: 5760,
  avgRating: 4.2,
  downloadCount: 10,
  imageUrl: 'https://archive.test/services/img/night_of_the_living_dead',
  // A search result carries the collection's DIRECTORY, not a file.
  streamingUrl: 'https://archive.test/download/night_of_the_living_dead/',
  subtitles: [],
  audioTracks: [],
  downloadUrls: [],
};

const PLAYABLE_MOVIE = {
  ...MOVIE,
  streamingUrl: 'https://archive.test/download/night_of_the_living_dead/movie.mp4',
};

const DOWNLOAD: DownloadRecord = {
  uri: 'https://cdn.jamendo.test/downloaded.mp3',
  localPath: '/data/user/0/app/files/downloaded.mp3',
  title: 'Downloaded Song',
  size: 1024,
  received: 1024,
  status: 'done',
  mediaType: 'audio',
  type: 'music',
  source: 'api',
  provider: 'jamendo',
  downloadedAt: 1_700_000_000_000,
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
  makePlaylist({id: 'pl_audio2', name: 'Workout', kind: 'AUDIO_ONLY'}),
  makePlaylist({id: 'pl_video', name: 'Film Night', kind: 'VIDEO_ONLY'}),
];

async function renderScreen(params?: {playlistId?: string; playlistName?: string}) {
  return renderWithProviders(AddToPlaylistScreen, {
    routeName: 'AddToPlaylist',
    initialParams: params,
  });
}

describe('AddToPlaylistScreen — the multi-section page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlaylistsStore.getState().setPlaylists(PLAYLISTS);
    useDownloadsStore.getState().setRecords([DOWNLOAD]);
    mockGetPopularJamendoTracks.mockResolvedValue([TRACK]);
    mockSearchInternetArchiveVideos.mockResolvedValue({
      items: [MOVIE],
      numFound: 1,
    });
    mockResolveInternetArchiveVideoDetails.mockResolvedValue(PLAYABLE_MOVIE);
  });

  it('lists items from more than one section', async () => {
    await renderScreen();

    // The Music section — Jamendo's popular tracks.
    await waitFor(() => {
      expect(screen.getByText('Night Drive')).toBeOnTheScreen();
    });

    // The Downloads section — the app's own downloaded files.
    await fireEvent.press(screen.getByLabelText('Downloads'));

    await waitFor(() => {
      expect(screen.getByText('Downloaded Song')).toBeOnTheScreen();
    });
    expect(screen.queryByText('Night Drive')).toBeNull();
  });

  it('offers only the playlists the one rule allows', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Movies'));
    await waitFor(() => {
      expect(screen.getByText('Night of the Living Dead')).toBeOnTheScreen();
    });

    // Before anything is ticked, every playlist is on offer.
    expect(screen.getByLabelText('Add to Road Trip')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByLabelText('Night of the Living Dead'),
    );

    // A film cannot go into an audio playlist — the ONE rule says so, and
    // the page follows it.
    await waitFor(() => {
      expect(screen.queryByLabelText('Add to Road Trip')).toBeNull();
    });
    expect(screen.queryByLabelText('Add to Workout')).toBeNull();
    expect(screen.getByLabelText('Add to Film Night')).toBeOnTheScreen();
  });

  it('creates a playlist through the one create owner', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('New playlist'));

    // The ONE create owner's own form is what appears.
    expect(screen.getByText('New Playlist')).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByPlaceholderText('My Playlist'),
      'Evening',
    );
    await fireEvent.press(screen.getByText('Create'));

    await waitFor(() => {
      const names = usePlaylistsStore
        .getState()
        .playlists.map(playlist => playlist.name);
      expect(names).toContain('Evening');
    });
  });

  it('adds the ticked items to the chosen playlist', async () => {
    await renderScreen({playlistId: 'pl_audio', playlistName: 'Road Trip'});

    await waitFor(() => {
      expect(screen.getByText('Night Drive')).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByLabelText('Night Drive'));
    await fireEvent.press(screen.getByText('Add 1 item'));

    await waitFor(() => {
      const playlist = usePlaylistsStore
        .getState()
        .playlists.find(entry => entry.id === 'pl_audio');
      expect(playlist?.items.map(item => item.title)).toEqual([
        'Night Drive',
      ]);
    });
  });

  // The unit is the contract. `PlaylistItem.duration` is SECONDS — the
  // media store says so, the bookmarks store says so, the scanner writes
  // seconds, and the queue reads seconds. Every catalogue adapter answers
  // in seconds too. So the duration is passed through UNCHANGED, and a
  // conversion here would store a 3-minute track as 50 hours.
  it("keeps a track's duration in SECONDS", async () => {
    await renderScreen({playlistId: 'pl_audio', playlistName: 'Road Trip'});

    await waitFor(() => {
      expect(screen.getByText('Night Drive')).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByLabelText('Night Drive'));
    await fireEvent.press(screen.getByText('Add 1 item'));

    await waitFor(() => {
      const playlist = usePlaylistsStore
        .getState()
        .playlists.find(entry => entry.id === 'pl_audio');
      expect(playlist?.items[0]?.duration).toBe(TRACK.duration);
    });
  });

  it("keeps a film's duration in SECONDS", async () => {
    await renderScreen({playlistId: 'pl_video', playlistName: 'Film Night'});

    await fireEvent.press(screen.getByLabelText('Movies'));
    await waitFor(() => {
      expect(screen.getByText('Night of the Living Dead')).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByLabelText('Night of the Living Dead'));
    await fireEvent.press(screen.getByText('Add 1 item'));

    await waitFor(() => {
      const playlist = usePlaylistsStore
        .getState()
        .playlists.find(entry => entry.id === 'pl_video');
      expect(playlist?.items[0]?.duration).toBe(MOVIE.duration);
    });
  });
});

describe('AddToPlaylistScreen — the route', () => {
  /**
   * A page that is not REGISTERED cannot be reached at all, and no
   * behavioural test can see the navigator's screen list without mounting
   * the whole app. So this reads the two files — the same source-reading
   * guard the repo already uses for the PiP toggle and the video surface.
   * (The route's TYPE is guarded by the compiler: the screen asks for
   * `RootStackScreenProps<'AddToPlaylist'>`, so a missing route fails
   * `tsc --noEmit`.)
   */
  it('is registered in the navigator and in the route types', () => {
    const fs = require('fs');
    const path = require('path');
    const src = path.join(__dirname, '../../../src');

    const navigator = fs.readFileSync(
      path.join(src, 'navigation/RootNavigator.tsx'),
      'utf8',
    );
    const types = fs.readFileSync(
      path.join(src, 'navigation/types.ts'),
      'utf8',
    );

    expect(navigator).toMatch(/name="AddToPlaylist"/);
    expect(navigator).toMatch(/component=\{AddToPlaylistScreen\}/);
    expect(types).toMatch(/AddToPlaylist:/);
  });
});
