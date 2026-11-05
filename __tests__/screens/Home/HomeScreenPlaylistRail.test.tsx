/**
 * `HomeScreen` — the playlist rail: its TITLE, and what it does when it
 * has nothing.
 *
 * ## What this pins
 *
 * Home's playlist rail is titled **"Pinned Playlists"** and holds ONLY the
 * pinned playlists, so the title is true of every tile in it (spec §4.0
 * rule 4: a title that lies is a bug). The unpinned playlists live behind
 * "See All" → All Playlists, which is the page that owns them.
 *
 * ## The two things this changed, and why
 *
 * **1. The title.** F-050 (app `9c22f56`) retitled the rail "Playlists"
 * because it showed pinned playlists FIRST and then the rest by recency —
 * so "Pinned Playlists" was false for every unpinned playlist in it. The
 * rail no longer mixes the two: it holds the pinned ones and nothing else,
 * which makes "Pinned Playlists" true again. (Superseded by the user's
 * decision of 2026-11-05.)
 *
 * **2. The collapse.** Spec §4.11 says a rail with nothing to show takes
 * its TITLE with it. That is right for a rail that only appears once it
 * has data — but this rail is the feature's front door, and a Home page
 * that never mentions it is how the feature went missing without anyone
 * noticing. So the rail stays on the page and says what would fill it.
 *
 * The screen is rendered with its DATA seam mocked (`useHomeScreen`) —
 * the hook's own behaviour (which playlists are in the rail, and in what
 * order) is covered by `useHomeScreenPlaylistOrder.test.tsx`. What is
 * under test here is the wiring: the title the rail is given, and what the
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

const mockPinnedPlaylist: Playlist = {
  id: 'pl_1',
  name: 'Road Trip',
  kind: 'AUDIO_ONLY',
  items: [],
  pinned: true,
  pinnedAt: '2026-10-18T10:00:00.000Z',
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
    sections: [{type: 'PINNED_PLAYLISTS', items: playlists}],
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

describe('HomeScreen — the pinned playlist rail', () => {
  it('titles the rail "Pinned Playlists"', async () => {
    await renderHome([mockPinnedPlaylist]);

    expect(screen.getByText('Pinned Playlists')).toBeOnTheScreen();
  });

  it('keeps the rail on the page when nothing is pinned', async () => {
    // The rail used to collapse — and take its title with it — so a Home
    // page with no pinned playlists said nothing at all about them. The
    // title stays, so the feature is on the page whether or not it is in
    // use.
    await renderHome([]);

    expect(screen.getByText('Pinned Playlists')).toBeOnTheScreen();
  });

  it('says what would fill the rail when nothing is pinned', async () => {
    await renderHome([]);

    expect(
      screen.getByText('Nothing pinned yet — pin a playlist to keep it here.'),
    ).toBeOnTheScreen();
  });

  it('shows the pinned playlist itself', async () => {
    await renderHome([mockPinnedPlaylist]);

    expect(screen.getByText('Road Trip')).toBeOnTheScreen();
  });
});
