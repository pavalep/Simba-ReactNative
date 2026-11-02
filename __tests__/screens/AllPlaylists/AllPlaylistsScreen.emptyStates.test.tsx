/**
 * `AllPlaylistsScreen` — the empty states (spec §4.11).
 *
 * ## Why this exists
 *
 * An empty page is a page that makes a CLAIM. "No playlists yet" claims
 * there are none; "No playlists match this filter." claims the filter is
 * what emptied it. A page that renders one blank card for both is making
 * a claim it cannot back, and the user cannot tell whether the app lost
 * their playlists or the filter hid them.
 *
 * The third case is the PINNED section: with nothing pinned there is
 * nothing to put under the heading, and a heading with nothing under it
 * is noise (spec §4.11).
 *
 * ## What this pins
 *
 *  1. No playlists at all → "No playlists yet" AND a way out of it (a
 *     "Create playlist" button). An empty state with no action is a dead
 *     end.
 *  2. Playlists exist, none pinned → the pinned section is NOT rendered.
 *  3. A playlist IS pinned → the pinned section IS rendered.
 *  4. A filter that matches nothing → "No playlists match this filter."
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';

// `PlaylistActionMenu` is a `BottomSheet`, and `BottomSheet` drives a
// true-sheet imperatively. A mock without `present` / `dismiss` /
// `resize` is a crash, not a sheet.
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

jest.mock('../../../src/features/playlists', () => ({
  usePlaylists: jest.fn(),
}));

// The screen's `BackButton` reaches for the navigation object, and the
// screen's own hook navigates on a card press. This suite is about the
// empty states, not about routing, so the navigation seam is a stub.
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
  mockUsePlaylists.mockReturnValue(makeController(playlists) as never);
  return renderChrome(<AllPlaylistsScreen />, {theme: true});
}

describe('AllPlaylistsScreen — the empty states', () => {
  it('says "No playlists yet" when the user has none', async () => {
    await renderScreen([]);

    expect(screen.getByText('No playlists yet')).toBeOnTheScreen();
  });

  it('offers a "Create playlist" button in that state — not a dead end', async () => {
    await renderScreen([]);

    expect(screen.getByLabelText('Create playlist')).toBeOnTheScreen();
  });

  it('renders NO pinned section when nothing is pinned', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', name: 'Loose One', pinned: false})]);

    expect(screen.queryByText('Pinned')).toBeNull();
  });

  it('renders the pinned section when something is pinned', async () => {
    await renderScreen([
      makePlaylist({id: 'pl_1', name: 'Pinned One', pinned: true}),
      makePlaylist({id: 'pl_2', name: 'Loose One', pinned: false}),
    ]);

    expect(screen.getByText('Pinned')).toBeOnTheScreen();
  });

  it('says "No playlists match this filter." when the filter matches nothing', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'})]);

    await fireEvent.press(screen.getByLabelText('Video playlists'));

    expect(screen.getByText('No playlists match this filter.')).toBeOnTheScreen();
  });

  it('does not claim the user has no playlists when a filter emptied the list', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'})]);

    await fireEvent.press(screen.getByLabelText('Video playlists'));

    // The two claims are different, and the page must not blur them.
    expect(screen.queryByText('No playlists yet')).toBeNull();
  });
});
