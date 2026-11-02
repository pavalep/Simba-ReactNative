/**
 * `HomeScreen` — the playlist rail's TITLE.
 *
 * ## The defect this pins
 *
 * The rail was called **"Pinned Playlists"** while it showed the pinned
 * playlists FIRST and then the rest by recency — so it showed unpinned
 * playlists too, under a title that said it did not. Spec §4.0 rule 4:
 * a title that lies is a bug. The honest title is "Playlists", and the
 * pin badge on each tile says which ones are pinned.
 *
 * The second claim is the collapse: a rail with nothing to show takes
 * its TITLE with it (spec §4.11). An empty rail under a title is a lie
 * of a different kind.
 *
 * The screen is rendered with its DATA seam mocked (`useHomeScreen`) —
 * the hook's own behaviour is covered by its own suite. What is under
 * test here is the wiring: which title the rail is given, and what the
 * rail does when it has nothing.
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';

const mockUseHomeScreen = jest.fn();

jest.mock('../../../src/screens/Home/hooks/useHomeScreen', () => ({
  useHomeScreen: () => mockUseHomeScreen(),
}));
jest.mock('../../../src/infrastructure/player/miniPlayerChrome', () => ({
  useBottomChromeInset: () => 0,
}));
jest.mock('../../../src/components/layout/HomeHeader/HomeHeader', () => ({
  HomeHeader: () => null,
}));

import {ThemeProvider} from '../../../src/theme';
import {HomeScreen} from '../../../src/screens/Home';
import type {Playlist} from '../../../src/types/playlist';

const mockPlaylist: Playlist = {
  id: 'pl_1',
  name: 'Road Trip',
  kind: 'AUDIO_ONLY',
  items: [],
  pinned: false,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

function mockHomeState(playlists: Playlist[]) {
  return {
    colors: {
      background: {primary: '#101014'},
      accent: {gold: '#C9A84C'},
    },
    insets: {top: 0, bottom: 0},
    refreshing: false,
    isSettled: true,
    hasError: false,
    isScanning: false,
    sections: [{type: 'PLAYLISTS', items: playlists}],
    greeting: {text: 'Good evening', weather: '', condition: ''},
    userFirstName: 'Paval',
    handleRemoveRecent: jest.fn(),
    handleRemoveBookmark: jest.fn(),
    user: null,
    handleOpenMedia: jest.fn(),
    handleItemPress: jest.fn(),
    handlePlaylistPress: jest.fn(),
    handleGenrePress: jest.fn(),
    handleSeeAll: jest.fn(),
    handleSettingsPress: jest.fn(),
    handleSearchPress: jest.fn(),
    handleAvatarPress: jest.fn(),
    handleBookmarksSeeAll: jest.fn(),
    onRefresh: jest.fn(),
    setHasError: jest.fn(),
  };
}

async function renderHome(playlists: Playlist[]) {
  mockUseHomeScreen.mockReturnValue(mockHomeState(playlists));
  return await render(
    <ThemeProvider>
      <HomeScreen
        navigation={{navigate: jest.fn()} as never}
        route={{key: 'Home', name: 'Home'} as never}
      />
    </ThemeProvider>,
  );
}

describe('HomeScreen — the playlist rail', () => {
  it('titles the rail "Playlists", not "Pinned Playlists"', async () => {
    await renderHome([mockPlaylist]);

    expect(screen.getByText('Playlists')).toBeOnTheScreen();
    expect(screen.queryByText('Pinned Playlists')).toBeNull();
  });

  it('collapses the rail — and its title — when there is nothing to show', async () => {
    await renderHome([]);

    expect(screen.queryByText('Playlists')).toBeNull();
    expect(screen.queryByText('Pinned Playlists')).toBeNull();
  });
});
