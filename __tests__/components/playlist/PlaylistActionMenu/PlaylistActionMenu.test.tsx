/**
 * `PlaylistActionMenu` — the long-press menu on a playlist.
 *
 * ## Why this exists
 *
 * A playlist grid can hold fifty playlists. A permanent pin button on each
 * one is noise, so YouTube Music and Spotify both put the pin behind a
 * long-press. The menu is that shortcut.
 *
 * ## Why the menu is NOT the only way to pin
 *
 * A long-press is not reachable by a screen reader or a keyboard. A pin
 * that could only be reached by a gesture would be a pin some users cannot
 * use, so the management row and the detail header also carry a visible
 * 32 px toggle (locked decision D-P8). This menu is the shortcut, not the
 * only door.
 *
 * ## What this pins
 *
 *  1. The action is a TOGGLE, not a confirmation: the label changes with
 *     the state, and it states that state to a screen reader.
 *  2. It reports the state the playlist should END in, and it closes.
 *  3. It names the playlist it acts on.
 *  4. With no playlist selected, it offers NOTHING — a menu that offers a
 *     pin for a playlist that is not there is a control that lies.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../../helpers/renderChrome';

jest.mock('@lodev09/react-native-true-sheet', () => {
  const ReactLocal = require('react');
  const {View: RNView} = require('react-native');

  // The imperative surface `BottomSheet` drives. A mock without it is a
  // crash, not a sheet.
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

import {PlaylistActionMenu} from '../../../../src/components/playlist/PlaylistActionMenu/PlaylistActionMenu';
import type {Playlist} from '../../../../src/types/playlist';

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

async function renderMenu(
  playlist: Playlist | null,
  onTogglePin: (playlistId: string, pinned: boolean) => void = jest.fn(),
  onClose: () => void = jest.fn(),
) {
  return renderChrome(
    <PlaylistActionMenu
      visible
      playlist={playlist}
      onTogglePin={onTogglePin}
      onClose={onClose}
    />,
    {theme: true},
  );
}

describe('PlaylistActionMenu — the pin action', () => {
  it('offers "Pin to top" for an unpinned playlist', async () => {
    await renderMenu(makePlaylist({pinned: false}));

    expect(screen.getByLabelText('Pin to top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Unpin from top')).toBeNull();
  });

  it('offers "Unpin from top" for a pinned playlist', async () => {
    await renderMenu(makePlaylist({pinned: true}));

    expect(screen.getByLabelText('Unpin from top')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Pin to top')).toBeNull();
  });

  it('reports the state the playlist should END in, and closes', async () => {
    const onTogglePin = jest.fn();
    const onClose = jest.fn();
    await renderMenu(makePlaylist({id: 'pl_7', pinned: false}), onTogglePin, onClose);

    await fireEvent.press(screen.getByLabelText('Pin to top'));

    expect(onTogglePin).toHaveBeenCalledWith('pl_7', true);
    expect(onClose).toHaveBeenCalled();
  });

  it('unpins through the same call', async () => {
    const onTogglePin = jest.fn();
    await renderMenu(makePlaylist({id: 'pl_7', pinned: true}), onTogglePin);

    await fireEvent.press(screen.getByLabelText('Unpin from top'));

    expect(onTogglePin).toHaveBeenCalledWith('pl_7', false);
  });

  it('states the toggle state', async () => {
    await renderMenu(makePlaylist({pinned: true}));

    expect(screen.getByLabelText('Unpin from top').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('names the playlist it acts on', async () => {
    await renderMenu(makePlaylist({name: 'Road Trip'}));

    expect(screen.getByLabelText('Pin to top').props.accessibilityHint).toBe('Road Trip');
  });

  it('offers NOTHING when no playlist is selected', async () => {
    await renderMenu(null);

    expect(screen.queryByLabelText('Pin to top')).toBeNull();
    expect(screen.queryByLabelText('Unpin from top')).toBeNull();
  });
});
