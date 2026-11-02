/**
 * `AllPlaylistsScreen` — the create action.
 *
 * ## Why this exists
 *
 * "Create a playlist" was implemented THREE times (D-P4): here as an
 * inline modal, once inside `AllPlaylistsScreen`, and once as an inline
 * create MODE inside `PlaylistSheet`. `PlaylistCreateModal` is the one
 * owner, and this page opens it.
 *
 * The page also has a header button AND an empty-state button that both
 * open it. Those are the SAME action in two places on purpose — they
 * are never on screen at the same time (the empty state only exists when
 * there are no playlists at all, and the header is always there). There
 * is no FAB: a second create affordance on one page is two ways to do
 * one thing (spec §4.5).
 *
 * ## What this pins
 *
 *  1. The page carries NO create form of its own — the form belongs to
 *     `PlaylistCreateModal`.
 *  2. The header's "Create" button opens that modal.
 *  3. The empty state's "Create playlist" button opens that same modal.
 *  4. The modal offers the MIXED kind, because it is the one owner and
 *     it offers every kind.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';

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

const mockCreateModalSpy = jest.fn<void, [{visible?: boolean}]>();

// The create modal is spied on, not replaced: the real component still
// renders (so its OWN copy is what the page shows), but the suite can
// also see that the COMPONENT — not a form the page grew itself — is
// what opened.
jest.mock('../../../src/components/playlist/PlaylistCreateModal', () => {
  const ReactLocal = require('react');
  const actual = jest.requireActual(
    '../../../src/components/playlist/PlaylistCreateModal',
  );
  return {
    ...actual,
    PlaylistCreateModal: (props: {visible?: boolean}) => {
      mockCreateModalSpy(props);
      return ReactLocal.createElement(actual.PlaylistCreateModal, props);
    },
  };
});

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
  mockUsePlaylists.mockReturnValue(makeController(playlists) as never);
  return renderChrome(<AllPlaylistsScreen />, {theme: true});
}

describe('AllPlaylistsScreen — the create action', () => {
  it('carries NO create form of its own', async () => {
    await renderScreen([makePlaylist({id: 'pl_1'})]);

    // The form belongs to `PlaylistCreateModal`. A form on the page
    // itself would be a second implementation of "create a playlist".
    expect(screen.queryByText('New Playlist')).toBeNull();
    expect(screen.queryByPlaceholderText('My Playlist')).toBeNull();
  });

  it('opens PlaylistCreateModal from the header', async () => {
    await renderScreen([makePlaylist({id: 'pl_1'})]);

    await fireEvent.press(screen.getByLabelText('Create'));

    expect(screen.getByText('New Playlist')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('My Playlist')).toBeOnTheScreen();
  });

  it('opens the PlaylistCreateModal COMPONENT — not a form the page grew itself', async () => {
    await renderScreen([makePlaylist({id: 'pl_1'})]);

    await fireEvent.press(screen.getByLabelText('Create'));

    const calls = mockCreateModalSpy.mock.calls;
    expect(calls[calls.length - 1][0].visible).toBe(true);
  });

  it('opens the SAME modal from the empty state', async () => {
    await renderScreen([]);

    await fireEvent.press(screen.getByLabelText('Create playlist'));

    expect(screen.getByText('New Playlist')).toBeOnTheScreen();
  });

  it('offers the MIXED kind — the modal is the one owner and it offers every kind', async () => {
    await renderScreen([makePlaylist({id: 'pl_1'})]);

    await fireEvent.press(screen.getByLabelText('Create'));

    expect(screen.getByLabelText('Mixed playlist type')).toBeOnTheScreen();
  });

  it('has no second create affordance — there is no FAB on this page', async () => {
    await renderScreen([makePlaylist({id: 'pl_1'})]);

    // The header's "Create" is the page's only create button while the
    // list is on screen.
    expect(screen.getAllByLabelText('Create')).toHaveLength(1);
  });
});
