/**
 * `PlaylistDetailScreen` — the "Add items" action, the header's pin toggle
 * and the empty playlist state.
 *
 * ## What this pins
 *
 *  1. The "Add items" action is REACHABLE and navigates to the new page
 *     WITH the playlist's id. It is not a dead control.
 *  2. An empty playlist says "This playlist is empty" and offers an
 *     "Add items" button that goes to the same page.
 *  3. The pin toggle says what it DOES ("Pin to top" / "Unpin from top"),
 *     states its state (`accessibilityState.selected`), carries the
 *     playlist's name as its hint, and is 32 px — the shape the AllPlaylists
 *     screen's action button already uses.
 *  4. The pin toggle reaches the feature facade: the store's playlist is
 *     really pinned. There is no second copy of the pin rule in the screen.
 */

import React from 'react';
import {StyleSheet} from 'react-native';
import {screen, fireEvent, waitFor} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';
import {PlaylistDetailScreen} from '../../../src/screens/PlaylistDetail/components/PlaylistDetailScreen';
import {usePlaylistsStore} from '../../../src/state';
import type {Playlist, PlaylistItem} from '../../../src/types/playlist';

// The BackButton reaches for the navigation object. The screen takes its
// navigation as a PROP, so the test hands it one and asserts on that one;
// this stub is only here so the BackButton has something to call.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: () => true,
  }),
  useIsFocused: () => true,
  useRoute: () => ({params: {}, name: 'PlaylistDetail'}),
  useFocusEffect: jest.fn(),
}));

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  canGoBack: () => true,
};

const ITEM: PlaylistItem = {
  id: 'pli_1',
  fileUri: 'file:///music/song.mp3',
  title: 'A Song',
  duration: 1000,
  addedAt: '2026-10-20T10:00:00.000Z',
  source: 'local',
  type: 'audio',
  mediaType: 'audio',
};

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

async function renderScreen(playlist: Playlist) {
  usePlaylistsStore.getState().setPlaylists([playlist]);
  return renderChrome(
    <PlaylistDetailScreen
      navigation={navigation as never}
      route={
        {
          params: {playlistId: playlist.id, playlistName: playlist.name},
          name: 'PlaylistDetail',
          key: 'pl-detail',
        } as never
      }
    />,
    {theme: true},
  );
}

describe('PlaylistDetailScreen — add items, pin, and the empty state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the add-to-playlist page with the playlist id', async () => {
    await renderScreen(makePlaylist({items: [ITEM]}));

    await fireEvent.press(screen.getByLabelText('Add items'));

    expect(navigation.navigate).toHaveBeenCalledWith('AddToPlaylist', {
      playlistId: 'pl_1',
      playlistName: 'Road Trip',
    });
  });

  it('says the playlist is empty and offers the button', async () => {
    await renderScreen(makePlaylist({items: []}));

    expect(
      screen.getByText('This playlist is empty. Add items to get started.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Add items'));

    expect(navigation.navigate).toHaveBeenCalledWith('AddToPlaylist', {
      playlistId: 'pl_1',
      playlistName: 'Road Trip',
    });
  });

  it('offers "Pin to top" on an unpinned playlist', async () => {
    await renderScreen(makePlaylist({pinned: false}));

    expect(screen.getByLabelText('Pin to top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Unpin from top')).toBeNull();
  });

  it('offers "Unpin from top" on a pinned playlist', async () => {
    await renderScreen(makePlaylist({pinned: true}));

    expect(screen.getByLabelText('Unpin from top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Pin to top')).toBeNull();
  });

  it('states the toggle\'s state and names the playlist', async () => {
    await renderScreen(makePlaylist({name: 'Road Trip', pinned: false}));

    const toggle = screen.getByLabelText('Pin to top');
    expect(toggle.props.accessibilityState).toEqual({selected: false});
    expect(toggle.props.accessibilityHint).toBe('Road Trip');
  });

  it('is a 32 px control', async () => {
    await renderScreen(makePlaylist());

    const style = StyleSheet.flatten(
      screen.getByLabelText('Pin to top').props.style,
    );
    expect(style.width).toBe(32);
    expect(style.height).toBe(32);
  });

  it('pins the playlist through the feature facade', async () => {
    await renderScreen(makePlaylist({pinned: false}));

    await fireEvent.press(screen.getByLabelText('Pin to top'));

    await waitFor(() => {
      expect(usePlaylistsStore.getState().playlists[0].pinned).toBe(true);
    });
  });

  it('unpins the playlist through the feature facade', async () => {
    await renderScreen(makePlaylist({pinned: true}));

    await fireEvent.press(screen.getByLabelText('Unpin from top'));

    await waitFor(() => {
      expect(usePlaylistsStore.getState().playlists[0].pinned).toBe(false);
    });
  });
});
