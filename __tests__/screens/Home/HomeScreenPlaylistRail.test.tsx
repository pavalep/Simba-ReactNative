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
 * **2. The empty rail — REVERSED.** On 2026-11-05 the rail stayed on the
 * page and said what would fill it, on the grounds that it is the
 * feature's front door: "a Home page that never mentions it is how the
 * feature went missing without anyone noticing."
 *
 * V2 reverses that. The page now has ONE rule — **a rail with nothing in
 * it is not drawn** — and the playlist rail is no longer the exception
 * that makes the rule a lie. Two headings on a screen that has one
 * grammar is exactly what the redesign removed; the lonely "Pinned
 * Playlists" line over an empty row was one of them.
 *
 * The feature did not go missing with it. The rail's own "See All" opens
 * All Playlists, and the Library and the Profile both open it too — the
 * front door is still a door, it is just no longer a sentence on an
 * otherwise blank page.
 *
 * The screen is rendered with its DATA seam mocked (`useHomeScreen`) —
 * the hook's own behaviour (which playlists are in the rail, and in what
 * order) is covered by `useHomeScreenPlaylistOrder.test.tsx`, and the
 * SHAPE of the section list by `homeSections.test.tsx`. What is under
 * test here is the wiring: the title the rail is given, and what the
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
    isScanning: false,
    sections: [{type: 'PINNED_PLAYLISTS', items: playlists}],
    greeting: {
      text: 'Good evening',
      condition: 'partlyCloudy',
      weather: null,
      isFirstLoad: false,
    },
    userFirstName: 'Paval',
    handleRemoveRecent: jest.fn(),
    handleRemoveBookmark: jest.fn(),
    user: null,
    handleOpenMedia: jest.fn(),
    handleItemPress: jest.fn(),
    handlePlaylistPress: jest.fn(),
    handleTogglePin: jest.fn(),
    handleSeeAll: jest.fn(),
    handleSearchPress: jest.fn(),
    handleAvatarPress: jest.fn(),
    handleBookmarksSeeAll: jest.fn(),
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

  it('draws no rail at all when nothing is pinned', async () => {
    // V2: a rail with nothing in it is not drawn — not even its title.
    // The section builder leaves the rail out of the page entirely, and
    // the "Your Library" divider goes with it when every rail under it
    // is empty.
    await renderHome([]);

    expect(screen.queryByText('Pinned Playlists')).toBeNull();
  });

  it('says nothing about what would fill the rail when nothing is pinned', async () => {
    // The 2026-11-05 behaviour — a line of text saying "Nothing pinned
    // yet — pin a playlist to keep it here." — is gone. It was the one
    // rail that stayed when every other rail disappeared, and it made
    // the page's grammar a rule with an exception.
    await renderHome([]);

    expect(
      screen.queryByText('Nothing pinned yet — pin a playlist to keep it here.'),
    ).toBeNull();
  });

  it('shows the pinned playlist itself', async () => {
    await renderHome([mockPinnedPlaylist]);

    expect(screen.getByText('Road Trip')).toBeOnTheScreen();
  });
});
