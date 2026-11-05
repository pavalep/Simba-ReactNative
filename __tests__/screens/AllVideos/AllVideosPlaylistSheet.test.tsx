/**
 * Phase 6 step 33 — a LOCAL VIDEO must be addable to a playlist from the
 * All Videos screen.
 *
 * ## The mechanism
 *
 * A long press on a video tile opens `MediaActionsSheet` — the app's ONE
 * media menu (58.4/58.5) — and that menu's "Add to Playlist" row opens
 * `PlaylistSheet`. The same shape as the Movies grid.
 *
 * ## What is asserted
 *
 * The RECEIVED classification. A scanned local file already carries its
 * own kind (`type: 'video'`, `mediaType: 'video'`, `source: 'local'`) —
 * the scanner owns it — so the sheet offers the VIDEO playlist and refuses
 * the AUDIO one.
 */

import React from 'react';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {AllVideosScreen} from '../../../src/screens/AllVideos/components/AllVideosScreen';
import {useMediaStore, usePlaylistsStore} from '../../../src/state';
import type {Playlist} from '../../../src/types/playlist';
import type {ScannedTrack} from '../../../src/state';

// The player bridge is native.
const mockOpenWithResume = jest.fn(async (): Promise<boolean> => true);

jest.mock('@simba-dev/react-native-media-player', () => {
  const actual = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    ...actual,
    useOpenWithResume: () => mockOpenWithResume,
  };
});

// The scanner reaches for the file system on mount; the library is
// seeded instead.
jest.mock('../../../src/hooks/useMediaScanner', () => {
  const actual = jest.requireActual('../../../src/hooks/useMediaScanner');
  return {
    ...actual,
    useMediaScanner: () => ({startScan: jest.fn(), isScanning: false}),
  };
});

const mockVideoTrack: ScannedTrack = {
  uri: 'file:///storage/emulated/0/Movies/family-reel.mp4',
  title: 'Family Reel',
  artist: 'Unknown Artist',
  album: 'Unknown Album',
  year: 2024,
  genre: '',
  trackNumber: 0,
  duration: 125,
  albumArtUri: '',
  folderPath: '/storage/emulated/0/Movies',
  folderId: 'local-folder:video',
  source: 'local',
  type: 'video',
  mediaType: 'video',
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
  return renderWithProviders(AllVideosScreen, {routeName: 'AllVideosScreen'});
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

describe('AllVideosScreen — a local video reaches the playlist sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlaylistsStore.getState().setPlaylists(PLAYLISTS);
    useMediaStore.getState().setTracks([mockVideoTrack]);
  });

  it('opens the app media menu on a long press, and its Add to Playlist row opens PlaylistSheet', async () => {
    await renderScreen();

    await fireEvent(screen.getByText('Family Reel'), 'longPress');

    // The app's ONE media menu (58.4/58.5).
    expect(screen.getByText('Play Next')).toBeOnTheScreen();
    expect(screen.getByText('Add to Queue')).toBeOnTheScreen();
    expect(screen.getByText('Add to Playlist')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Add to Playlist'));

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });
  });

  it('offers the video the VIDEO playlist, and refuses the AUDIO one', async () => {
    await renderScreen();

    await fireEvent(screen.getByText('Family Reel'), 'longPress');
    await fireEvent.press(screen.getByText('Add to Playlist'));

    await waitFor(() => {
      expect(screen.getByText('Select a Playlist')).toBeOnTheScreen();
    });

    expect(screen.getByText('Film Night')).toBeOnTheScreen();
    // The "must not" claim: a video must not be offered an audio playlist.
    expect(screen.queryByText('Road Trip')).toBeNull();
  });

  it('stores the video with the scanner-owned kind and the local file uri', async () => {
    await renderScreen();

    await fireEvent(screen.getByText('Family Reel'), 'longPress');
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

    expect(stored?.fileUri).toBe(mockVideoTrack.uri);
    expect(stored?.type).toBe('video');
    expect(stored?.mediaType).toBe('video');
    expect(stored?.source).toBe('local');
    expect(stored?.folderId).toBe(mockVideoTrack.folderId);

    await letSheetClose();
  });
});
