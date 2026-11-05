/**
 * `AllPlaylistsScreen` — the kind filter (spec §4.5, §4.8).
 *
 * ## Why this exists
 *
 * The page gained a kind chip, and a chip that does nothing is a control
 * that lies. Two things have to hold at once:
 *
 *  1. The chip NARROWS what the page shows — and only that. It is a
 *     FILTER, never a lane switch: filtering the list never changes what
 *     a playlist may contain.
 *  2. The chip SAYS that it is the active one. `PlaylistCreateModal`'s
 *     kind chips already do this with `accessibilityState.selected`, and
 *     a chip that looks active but does not tell a screen reader is half
 *     a control.
 *
 * ## The retraction
 *
 * This file used to pin a MIXED chip. The mixed playlist kind was removed
 * on 2026-11-05, so the chip went with it — from this page AND from the
 * Library, because both pages read the SAME chip list
 * (`LOCAL_PLAYLIST_FILTERS`). A chip with no kind behind it filters
 * nothing, so it was removed rather than left as a dead control.
 *
 * ## What this pins
 *
 *  1. A chip exists for every kind — the kinds are offered, not hidden.
 *  2. Pressing it narrows the list to that kind.
 *  3. The chip states its selection, and the state follows the press.
 *  4. The chip's label names the kind, so "Video" is not just a word on
 *     a pill.
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

describe('AllPlaylistsScreen — the kind filter', () => {
  it('offers a chip for every kind', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'VIDEO_ONLY'})]);

    expect(screen.getByLabelText('Video playlists')).toBeOnTheScreen();
    expect(screen.getByLabelText('Audio playlists')).toBeOnTheScreen();
    expect(screen.getByLabelText('All playlists')).toBeOnTheScreen();
  });

  it('names the kind the chip filters by', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'})]);

    expect(screen.getByLabelText('Audio playlists')).toBeOnTheScreen();
    expect(screen.getByLabelText('All playlists')).toBeOnTheScreen();
  });

  it('narrows the list to the kind the chip names', async () => {
    await renderScreen([
      makePlaylist({id: 'pl_1', name: 'Audio One', kind: 'AUDIO_ONLY'}),
      makePlaylist({id: 'pl_2', name: 'Video One', kind: 'VIDEO_ONLY'}),
    ]);

    await fireEvent.press(screen.getByLabelText('Video playlists'));

    expect(screen.getByLabelText('Open playlist Video One')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Open playlist Audio One')).toBeNull();
  });

  it('shows every kind again when the filter goes back to All', async () => {
    await renderScreen([
      makePlaylist({id: 'pl_1', name: 'Audio One', kind: 'AUDIO_ONLY'}),
      makePlaylist({id: 'pl_2', name: 'Video One', kind: 'VIDEO_ONLY'}),
    ]);

    await fireEvent.press(screen.getByLabelText('Video playlists'));
    await fireEvent.press(screen.getByLabelText('All playlists'));

    expect(screen.getByLabelText('Open playlist Video One')).toBeOnTheScreen();
    expect(screen.getByLabelText('Open playlist Audio One')).toBeOnTheScreen();
  });

  it('states the chip\'s selection', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'})]);

    expect(screen.getByLabelText('All playlists').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('Video playlists').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('moves the selected state with the press', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'})]);

    await fireEvent.press(screen.getByLabelText('Video playlists'));

    expect(screen.getByLabelText('Video playlists').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByLabelText('All playlists').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('gives the chip a role — it is a button, not a decoration', async () => {
    await renderScreen([makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'})]);

    expect(screen.getByLabelText('Video playlists').props.accessibilityRole).toBe('button');
  });
});
