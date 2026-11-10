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
 * **The rail is not drawn when it has nothing to show.** Not "drawn with
 * a line of text saying what would fill it" — that was the 2026-11-05
 * rule, and V2 reverses it: the page has ONE rule, a rail with nothing
 * in it is not drawn, and the playlist rail is no longer the exception
 * that makes the rule a lie.
 *
 * **The tile carries the app's own action menu.** The Home tile used to
 * have no way to unpin at all — the only door was All Playlists. A
 * long-press opens the SAME sheet the All Playlists grid opens, so
 * there is one menu, not two.
 */

import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';

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
  const onTogglePin = jest.fn();
  const view = await render(
    <ThemeProvider>
      <QuickAccessShelf
        title={title}
        playlists={playlists}
        onPlaylistPress={jest.fn()}
        onTogglePin={onTogglePin}
        onSeeAll={jest.fn()}
      />
    </ThemeProvider>,
  );
  return {...view, onTogglePin};
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

  it('shows how many items the playlist holds', async () => {
    await renderShelf([makePlaylist({items: [makeItem(), makeItem({id: 'item-2'})]})]);

    expect(screen.getByText('2 ITEMS')).toBeOnTheScreen();
  });
});

describe('QuickAccessShelf — the long-press menu', () => {
  it('opens the app\'s own action menu on a long press', async () => {
    // The Home tile used to have no way to unpin at all — the only door
    // was All Playlists. The menu is the SAME sheet that grid opens, so
    // there is one menu, not two.
    await renderShelf([makePlaylist({pinned: true})]);

    await fireEvent(screen.getByLabelText('Open playlist Road Trip, pinned'), 'longPress');

    expect(screen.getByText('Unpin from top')).toBeOnTheScreen();
  });

  it('unpins from the menu and says which state the playlist should end in', async () => {
    const {onTogglePin} = await renderShelf([makePlaylist({pinned: true})]);

    await fireEvent(screen.getByLabelText('Open playlist Road Trip, pinned'), 'longPress');
    await fireEvent.press(screen.getByText('Unpin from top'));

    expect(onTogglePin).toHaveBeenCalledWith('pl_1', false);
  });
});

describe('QuickAccessShelf — the rail with nothing to show', () => {
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
