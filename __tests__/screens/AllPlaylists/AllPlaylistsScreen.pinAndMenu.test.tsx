/**
 * `AllPlaylistsScreen` — the pin toggle and the long-press menu.
 *
 * ## Why this exists
 *
 * The page is the MANAGEMENT page, so it carries BOTH doors to the pin:
 * the visible 32 px toggle on the card, and the long-press menu that is
 * the shortcut (D-P8, spec §4.5).
 *
 * The long-press is NOT the only door. A long-press is not reachable by
 * a screen reader or a keyboard, so a pin that could only be reached by a
 * gesture is a pin some users cannot use. That is why the card's visible
 * toggle is asserted HERE, with no gesture anywhere in the test.
 *
 * ## What this pins
 *
 *  1. The card carries the pin toggle — visible, labelled, and reachable
 *     with no gesture at all.
 *  2. Pressing it asks the feature to pin that playlist.
 *  3. A long-press opens the ONE long-press menu, with its pin row.
 *  4. With the menu open there are TWO ways to pin — the menu is the
 *     shortcut, not the only door.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';


jest.mock('../../../src/features/playlists', () => ({
  usePlaylists: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn(), canGoBack: () => true}),
  useIsFocused: () => true,
  useRoute: () => ({params: {}, name: 'AllPlaylistsScreen'}),
  useFocusEffect: jest.fn(),
}));

import {usePlaylists} from '../../../src/features/playlists';
import {AllPlaylistsScreen} from '../../../src/screens/AllPlaylists/components/AllPlaylistsScreen';
import {makeController, makePlaylist} from './fixtures';
import type {Playlist} from '../../../src/types/playlist';

const mockUsePlaylists = usePlaylists as jest.MockedFunction<typeof usePlaylists>;

async function renderScreen(playlists: Playlist[]) {
  const controller = makeController(playlists);
  mockUsePlaylists.mockReturnValue(controller as never);
  const rendered = await renderChrome(<AllPlaylistsScreen />, {theme: true});
  return {...rendered, controller};
}

describe('AllPlaylistsScreen — the pin toggle rides on the card', () => {
  it('offers the toggle with NO gesture at all', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Road Trip', pinned: false})]);

    // Nothing was long-pressed, nothing was swiped: the toggle is simply
    // on the card.
    expect(screen.getByLabelText('Pin to top')).toBeOnTheScreen();
  });

  it('says what the toggle does', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Road Trip', pinned: true})]);

    expect(screen.getByLabelText('Unpin from top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Pin to top')).toBeNull();
  });

  it('states the toggle\'s state', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', pinned: true})]);

    expect(screen.getByLabelText('Unpin from top').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('is a 32 px control — the hit slop widens, the icon does not grow', async () => {
    await renderScreen([makePlaylist({id: 'pl_1'})]);

    expect(screen.getByLabelText('Pin to top')).toHaveStyle({width: 32, height: 32});
  });

  it('pins the playlist it acts on', async () => {
    const {controller} = await renderScreen([makePlaylist({id: 'pl_1', pinned: false})]);

    await fireEvent.press(screen.getByLabelText('Pin to top'));

    expect(controller.setPinned).toHaveBeenCalledWith('pl_1', true);
  });

  it('names the playlist the toggle acts on', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Road Trip'})]);

    expect(screen.getByLabelText('Pin to top').props.accessibilityHint).toBe('Road Trip');
  });
});

describe('AllPlaylistsScreen — the long-press menu', () => {
  it('opens the menu on a long-press', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Road Trip'})]);

    // The menu's row is the only thing on this page that SAYS "Pin to
    // top" in words — the card's toggle is an icon.
    expect(screen.queryByText('Pin to top')).toBeNull();

    await fireEvent(screen.getByLabelText('Open playlist Road Trip'), 'longPress');

    expect(screen.getByText('Pin to top')).toBeOnTheScreen();
  });

  it('leaves the visible toggle in place — the menu is the shortcut, not the only door', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Road Trip'})]);

    await fireEvent(screen.getByLabelText('Open playlist Road Trip'), 'longPress');

    // The card's toggle AND the menu's row.
    expect(screen.getAllByLabelText('Pin to top')).toHaveLength(2);
  });

  it('promises the gesture in the card\'s hint', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Road Trip'})]);

    expect(screen.getByLabelText('Open playlist Road Trip').props.accessibilityHint).toBe(
      'Long press for more actions',
    );
  });
});
