/**
 * `QuickAccessShelf` — the Home playlist rail.
 *
 * ## What this pins
 *
 * **The tile draws the playlist's cover.** The tile used to draw a
 * generic `listMusic` glyph box, so a playlist looked like one thing in
 * the Library and another thing on Home. The cover has ONE owner now
 * (`PlaylistCover`), and the tile draws it — which is also how the pin
 * badge reaches Home at all (spec §4.2, §4.6).
 *
 * **The pinned state is SPOKEN.** The tile's own accessibility label says
 * ", pinned", because a glyph is not a label (spec §4.13).
 *
 * **The rail collapses when it has nothing to show.** An empty rail
 * under a title is a lie of a different kind, so the title goes with it
 * (spec §4.11).
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';

jest.mock('../../../src/components/utility/SvgIcon', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const {View} = jest.requireActual('react-native') as typeof import('react-native');
  return {
    SvgIcon: ({name, size, color}: {name: string; size?: number; color?: string}) =>
      ReactActual.createElement(View, {
        testID: `icon-${name}`,
        style: {width: size, height: size},
        color,
      } as never),
  };
});

import {ThemeProvider} from '../../../src/theme';
import {QuickAccessShelf} from '../../../src/screens/Home/components/QuickAccessShelf';
import {PLAYLIST_PIN_BADGE_TEST_ID} from '../../../src/components/playlist/PlaylistCover';
import type {Playlist, PlaylistItem} from '../../../src/types/playlist';

function makeItem(over: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'item-1',
    fileUri: 'file:///media/song.mp3',
    title: 'Song',
    duration: 120,
    addedAt: '2026-10-01T10:00:00.000Z',
    source: 'local',
    type: 'music',
    mediaType: 'audio',
    ...over,
  };
}

function makePlaylist(over: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [makeItem({thumbnailPath: 'file:///a.jpg'})],
    pinned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...over,
  };
}

async function renderShelf(playlists: Playlist[], title = 'Playlists') {
  return await render(
    <ThemeProvider>
      <QuickAccessShelf
        title={title}
        playlists={playlists}
        onPlaylistPress={jest.fn()}
        onSeeAll={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('QuickAccessShelf — the playlist tile', () => {
  it('draws the playlist\'s cover on the tile', async () => {
    await renderShelf([makePlaylist()]);

    const covers = screen.getAllByTestId('playlist-cover');
    expect(covers).toHaveLength(1);
    // The tile's artwork is the playlist's artwork — the same collage the
    // Library card draws.
    expect(covers[0]).toContainElement(screen.getByTestId('playlist-cover-cell'));
  });

  it('shows the pin badge on a pinned playlist, and NOTHING on an unpinned one', async () => {
    const {unmount} = await renderShelf([makePlaylist({pinned: true})]);
    expect(screen.getByTestId(PLAYLIST_PIN_BADGE_TEST_ID)).toBeOnTheScreen();
    await unmount();

    await renderShelf([makePlaylist({pinned: false})]);
    expect(screen.queryByTestId(PLAYLIST_PIN_BADGE_TEST_ID)).toBeNull();
  });

  it('announces the pinned state in the tile label', async () => {
    await renderShelf([makePlaylist({name: 'Road Trip', pinned: true})]);

    expect(screen.getByLabelText('Open playlist Road Trip, pinned')).toBeOnTheScreen();
  });

  it('does not claim an unpinned tile is pinned', async () => {
    await renderShelf([makePlaylist({name: 'Road Trip', pinned: false})]);

    expect(screen.getByLabelText('Open playlist Road Trip')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Open playlist Road Trip, pinned')).toBeNull();
  });
});

describe('QuickAccessShelf — the rail collapses when it is empty', () => {
  it('renders NOTHING at all — the title goes with it', async () => {
    await renderShelf([]);

    expect(screen.queryByText('Playlists')).toBeNull();
    expect(screen.queryByTestId('playlist-cover')).toBeNull();
    expect(screen.queryByText('No Playlists Yet')).toBeNull();
  });

  it('renders the title when it HAS something to show', async () => {
    await renderShelf([makePlaylist()]);

    expect(screen.getByText('Playlists')).toBeOnTheScreen();
  });
});
