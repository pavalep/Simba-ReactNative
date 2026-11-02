/**
 * The Library's playlist segment — the long-press that opens the pin menu.
 *
 * ## Why this matters
 *
 * The Library is a BROWSING surface: a grid of playlists, potentially
 * fifty of them. A permanent pin button on every card is noise, so the
 * pin's shortcut here is a long-press — and the management row carries
 * the visible toggle, so the pin is never reachable only by a gesture
 * (locked decision D-P8, spec §4.5).
 *
 * ## What this pins
 *
 *  1. A long-press on a playlist card reaches the segment's handler, with
 *     that playlist's id.
 *  2. The card offers NO long-press hint when there is no handler — a hint
 *     that promises a gesture the card does not have is a lie the screen
 *     reader tells.
 *  3. The browsing card carries NO permanent pin button.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../helpers/renderChrome';
import {LibraryPlaylistsSegment} from '../../../src/features/library/presentation/components/LibraryPlaylistsSegment';
import type {Playlist} from '../../../src/types/playlist';

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

async function renderSegment(
  playlists: Playlist[],
  onPlaylistCardLongPress?: (playlistId: string) => void,
) {
  return renderChrome(
    <LibraryPlaylistsSegment
      playlists={playlists}
      onPlaylistCardPress={jest.fn()}
      onPlayAllPlaylist={jest.fn()}
      onShufflePlaylist={jest.fn()}
      onPlaylistCardLongPress={onPlaylistCardLongPress}
    />,
    {theme: true},
  );
}

describe('The Library playlist segment — the long-press', () => {
  it('reaches the handler with the playlist id', async () => {
    const onLongPress = jest.fn();
    await renderSegment([makePlaylist({id: 'pl_9', name: 'Road Trip'})], onLongPress);

    await fireEvent(screen.getByLabelText('Open playlist Road Trip'), 'longPress');

    expect(onLongPress).toHaveBeenCalledWith('pl_9');
  });

  it('promises the gesture in the card hint when the handler is there', async () => {
    await renderSegment([makePlaylist({name: 'Road Trip'})], jest.fn());

    expect(screen.getByLabelText('Open playlist Road Trip').props.accessibilityHint).toBe(
      'Long press for more actions',
    );
  });

  it('promises NOTHING when there is no handler', async () => {
    await renderSegment([makePlaylist({name: 'Road Trip'})]);

    expect(screen.getByLabelText('Open playlist Road Trip').props.accessibilityHint).toBeUndefined();
  });

  it('carries no permanent pin button', async () => {
    await renderSegment([makePlaylist({name: 'Road Trip'})], jest.fn());

    expect(screen.queryByLabelText('Pin to top')).toBeNull();
    expect(screen.queryByLabelText('Unpin from top')).toBeNull();
  });
});
