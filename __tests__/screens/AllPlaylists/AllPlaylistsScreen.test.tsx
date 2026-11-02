/**
 * `AllPlaylistsScreen` — the pin TOGGLE on the management row.
 *
 * ## Why this exists
 *
 * The pin BADGE could be drawn on a card, but **nothing in the app could
 * set `pinned`**. The badge was a decoration on a state the user could
 * not reach.
 *
 * The management page is where the pin belongs (D-P8, spec §4.5): it is
 * the MANAGEMENT page, it already shows visible management buttons, and a
 * long-press is not reachable by a screen reader or a keyboard.
 *
 * ## What this pins
 *
 *  1. The toggle says what it DOES - "Pin to top" / "Unpin from top" -
 *     and states its state (`accessibilityState.selected`).
 *  2. Pressing it asks the screen to toggle that playlist's pin, with the
 *     state the playlist should END in.
 *  3. The row's own label says ", pinned" for a pinned playlist, and does
 *     not for an unpinned one - the state is SPOKEN, not just drawn.
 *  4. The toggle is a 32 px control (spec §4.5).
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';

// The page's long-press menu is a `BottomSheet`, and `BottomSheet`
// drives a true-sheet imperatively. A mock without `present` / `dismiss`
// / `resize` is a crash, not a sheet.
jest.mock('@lodev09/react-native-true-sheet', () => {
  const ReactLocal = require('react');
  const {View: RNView} = require('react-native');

  const mockPresent = jest.fn(() => Promise.resolve());
  const mockDismiss = jest.fn(() => Promise.resolve());
  const mockResize = jest.fn(() => Promise.resolve());

  return {
    TrueSheet: ReactLocal.forwardRef((props: {children?: unknown}, ref: unknown) => {
      ReactLocal.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
        resize: mockResize,
      }));
      return ReactLocal.createElement(RNView, {testID: 'true-sheet'}, props.children);
    }),
  };
});

jest.mock('../../../src/screens/AllPlaylists/hooks/useAllPlaylistsScreen', () => ({
  useAllPlaylistsScreen: jest.fn(),
}));

// The screen's `BackButton` reaches for the navigation object. This suite
// is about the pin toggle, not about routing, so the navigation seam is a
// stub — the screen's own hook (above) is mocked for the same reason.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn(), canGoBack: () => true}),
  useIsFocused: () => true,
  useRoute: () => ({params: {}, name: 'AllPlaylists'}),
  useFocusEffect: jest.fn(),
}));

import {useAllPlaylistsScreen} from '../../../src/screens/AllPlaylists/hooks/useAllPlaylistsScreen';
import {AllPlaylistsScreen} from '../../../src/screens/AllPlaylists/components/AllPlaylistsScreen';
import type {Playlist} from '../../../src/types/playlist';

const mockUseAllPlaylistsScreen = useAllPlaylistsScreen as jest.MockedFunction<
  typeof useAllPlaylistsScreen
>;

const mockTogglePin = jest.fn();

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

async function renderScreen(playlists: Playlist[]) {
  mockUseAllPlaylistsScreen.mockReturnValue({
    allPlaylists: playlists,
    filterType: 'ALL',
    setFilterType: jest.fn(),
    filteredPlaylists: playlists,
    pinnedPlaylists: playlists.filter(playlist => playlist.pinned),
    otherPlaylists: playlists.filter(playlist => !playlist.pinned),
    handlePlaylistPress: jest.fn(),
    handleCreate: jest.fn(),
    handleTogglePin: mockTogglePin,
  });
  return renderChrome(<AllPlaylistsScreen />, {theme: true});
}

describe('AllPlaylistsScreen — the pin toggle', () => {
  beforeEach(() => {
    mockTogglePin.mockReset();
  });

  it('offers "Pin to top" on an unpinned playlist', async () => {
    await renderScreen([makePlaylist({pinned: false})]);

    expect(screen.getByLabelText('Pin to top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Unpin from top')).toBeNull();
  });

  it('offers "Unpin from top" on a pinned playlist', async () => {
    await renderScreen([makePlaylist({pinned: true})]);

    expect(screen.getByLabelText('Unpin from top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Pin to top')).toBeNull();
  });

  it('states the toggle\'s state', async () => {
    await renderScreen([
      makePlaylist({id: 'pl_1', name: 'Pinned One', pinned: true}),
      makePlaylist({id: 'pl_2', name: 'Loose One', pinned: false}),
    ]);

    expect(screen.getByLabelText('Unpin from top').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('Pin to top').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('pins an unpinned playlist', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', pinned: false})]);

    await fireEvent.press(screen.getByLabelText('Pin to top'));

    expect(mockTogglePin).toHaveBeenCalledWith('pl_1', true);
  });

  it('unpins a pinned playlist', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', pinned: true})]);

    await fireEvent.press(screen.getByLabelText('Unpin from top'));

    expect(mockTogglePin).toHaveBeenCalledWith('pl_1', false);
  });

  it('is a 32 px control', async () => {
    await renderScreen([makePlaylist()]);

    expect(screen.getByLabelText('Pin to top')).toHaveStyle({width: 32, height: 32});
  });

  it('says ", pinned" on a pinned row and does not on an unpinned one', async () => {
    await renderScreen([
      makePlaylist({id: 'pl_1', name: 'Pinned One', pinned: true}),
      makePlaylist({id: 'pl_2', name: 'Loose One', pinned: false}),
    ]);

    expect(screen.getByLabelText('Open playlist Pinned One, pinned')).toBeOnTheScreen();
    expect(screen.getByLabelText('Open playlist Loose One')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Open playlist Loose One, pinned')).toBeNull();
  });

  it('names the playlist the toggle acts on', async () => {
    await renderScreen([makePlaylist({name: 'Road Trip'})]);

    expect(screen.getByLabelText('Pin to top').props.accessibilityHint).toBe('Road Trip');
  });
});
