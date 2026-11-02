/**
 * `PlaylistContextMenu` — the batch picker, and the SECOND add-to-playlist
 * surface.
 *
 * ## The defect this pins
 *
 * This menu and `PlaylistSheet` both answer "which playlists can take this
 * item?" and they used to answer it DIFFERENTLY: the sheet filtered by
 * lane, this menu filtered by NOTHING. So the same radio station was
 * offered an audio playlist here and not there — two surfaces, one
 * question, two answers.
 *
 * Now both call `compatiblePlaylistsFor`, and these tests pin the fact that
 * they AGREE, and that the batch branch is deliberately different.
 *
 * ## What this pins
 *
 *  1. A single item is filtered by the shared rule. A radio station is
 *     offered no playlist at all.
 *  2. A BATCH is not filtered. A multi-file selection may legitimately mix
 *     lanes — an audio file and a video file picked together — so the batch
 *     branch offers every playlist and the toast reports what was ACTUALLY
 *     added.
 *  3. The empty state names the real reason: no playlists at all, or none
 *     that can take this item.
 */

import React from 'react';
import {screen} from '@testing-library/react-native';

import {renderChrome} from '../../../helpers/renderChrome';

jest.mock('@lodev09/react-native-true-sheet', () => {
  const ReactLocal = require('react');
  const {View: RNView} = require('react-native');

  // The imperative surface `BottomSheet` drives: it presents and dismisses
  // the sheet itself. A mock without it is a crash, not a sheet.
  const mockPresent = jest.fn<Promise<void>, [number?]>(() => Promise.resolve());
  const mockDismiss = jest.fn<Promise<void>, []>(() => Promise.resolve());
  const mockResize = jest.fn<Promise<void>, [number]>(() => Promise.resolve());

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

jest.mock('../../../../src/features/playlists', () => {
  const actual = jest.requireActual('../../../../src/features/playlists');
  return {
    ...actual,
    usePlaylists: jest.fn(),
  };
});

import {usePlaylists} from '../../../../src/features/playlists';
import {PlaylistContextMenu} from '../../../../src/components/playlist/PlaylistContextMenu/PlaylistContextMenu';
import type {Playlist} from '../../../../src/types/playlist';

type Controller = ReturnType<typeof usePlaylists>;

const mockUsePlaylists = usePlaylists as jest.MockedFunction<typeof usePlaylists>;

function makeController(playlists: Playlist[]): Controller {
  return {
    list: playlists,
    getPlaylist: jest.fn(),
    createPlaylist: jest.fn(),
    renamePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    reorderItems: jest.fn(),
    clearPlaylist: jest.fn(),
    importPlaylist: jest.fn(),
    updateItemPosition: jest.fn(),
    setPinned: jest.fn(),
    playlists,
    maxPlaylists: 50,
    maxItemsPerPlaylist: 100,
  } as unknown as Controller;
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Commute',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

const MUSIC_ITEM = {
  fileUri: 'file:///music/song.mp3',
  title: 'Song',
  duration: 210,
  type: 'music' as const,
  mediaType: 'audio' as const,
};

const RADIO_ITEM = {
  fileUri: 'file:///radio/station',
  title: 'Station',
  duration: 0,
  type: 'radio' as const,
  mediaType: 'audio' as const,
};

async function renderMenu(
  props: Partial<React.ComponentProps<typeof PlaylistContextMenu>> = {},
  playlists: Playlist[] = [],
) {
  mockUsePlaylists.mockReturnValue(makeController(playlists));
  return renderChrome(
    <PlaylistContextMenu
      visible
      onClose={jest.fn()}
      onAddToPlaylist={jest.fn()}
      onCreateNew={jest.fn()}
      {...props}
    />,
    {theme: true},
  );
}

describe('PlaylistContextMenu — the shared compatibility rule', () => {
  it('offers only the playlists that can take the item', async () => {
    await renderMenu(
      {item: MUSIC_ITEM},
      [
        makePlaylist({id: 'pl_1', name: 'Commute'}),
        makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
        makePlaylist({id: 'pl_3', name: 'Everything', kind: 'MIXED'}),
      ],
    );

    expect(screen.getByText('Commute')).toBeOnTheScreen();
    expect(screen.getByText('Everything')).toBeOnTheScreen();
    expect(screen.queryByText('Films')).toBeNull();
  });

  it('offers NO playlist for a radio station — the same answer the sheet gives', async () => {
    await renderMenu(
      {item: RADIO_ITEM},
      [
        makePlaylist({id: 'pl_1', name: 'Commute'}),
        makePlaylist({id: 'pl_3', name: 'Everything', kind: 'MIXED'}),
      ],
    );

    expect(screen.queryByText('Commute')).toBeNull();
    expect(screen.queryByText('Everything')).toBeNull();
  });
});

describe('PlaylistContextMenu — a batch may mix lanes', () => {
  it('offers EVERY playlist to a batch', async () => {
    await renderMenu(
      {item: MUSIC_ITEM, batchCount: 2},
      [
        makePlaylist({id: 'pl_1', name: 'Commute'}),
        makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
        makePlaylist({id: 'pl_3', name: 'Everything', kind: 'MIXED'}),
      ],
    );

    expect(screen.getByText('Commute')).toBeOnTheScreen();
    expect(screen.getByText('Films')).toBeOnTheScreen();
    expect(screen.getByText('Everything')).toBeOnTheScreen();
  });

  it('names the batch in its title', async () => {
    await renderMenu({item: MUSIC_ITEM, batchCount: 3}, [makePlaylist()]);

    expect(screen.getByText('Add 3 items to Playlist')).toBeOnTheScreen();
  });
});

describe('PlaylistContextMenu — the empty state tells the truth', () => {
  it('says "No playlists yet" when the user has no playlists at all', async () => {
    await renderMenu({item: MUSIC_ITEM}, []);

    expect(screen.getByText('No playlists yet')).toBeOnTheScreen();
  });

  it('says "No playlist can take this item" when playlists exist but none fit', async () => {
    await renderMenu(
      {item: RADIO_ITEM},
      [makePlaylist({id: 'pl_1', name: 'Commute'})],
    );

    expect(screen.getByText('No playlist can take this item')).toBeOnTheScreen();
    expect(screen.queryByText('No playlists yet')).toBeNull();
  });
});
