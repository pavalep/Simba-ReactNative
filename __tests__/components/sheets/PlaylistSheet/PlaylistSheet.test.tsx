/**
 * `PlaylistSheet` — the empty state that tells the truth, and the ONE
 * create owner.
 *
 * ## The defect this pins
 *
 * The sheet used to render ONE empty state for every empty case:
 *
 *     "No playlists yet. Create one to get started."
 *
 * and then HID the create row whenever the compatible-playlist list was
 * empty. So a user who had three playlists and picked a radio station was
 * told to create a playlist by a control that was not on screen. The
 * instruction could not be followed in ANY state — the sheet's empty state
 * was a dead end dressed as a helper.
 *
 * ## What this pins
 *
 *  1. The empty state names the REAL reason: the user has no playlists at
 *     all, or the user has playlists and none of them can take this item.
 *  2. The create row is reachable exactly when the empty state tells the
 *     user to create one. Never "create one" with no create row.
 *  3. The create FORM belongs to `PlaylistCreateModal` — the one owner.
 *     The sheet owns only whether that owner is open.
 *  4. The sheet offers the playlists that can take the item, by the ONE
 *     shared rule (`compatiblePlaylistsFor`). A radio station is not
 *     playlist material, and no playlist is offered for it.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../../helpers/renderChrome';

jest.mock('../../../../src/components/playlist/PlaylistCreateModal', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const {View} = jest.requireActual('react-native') as typeof import('react-native');
  return {
    // The owner, stubbed so the sheet's own behaviour is what is read:
    // it renders ONLY while it is open.
    PlaylistCreateModal: ({visible}: {visible: boolean}) =>
      visible ? ReactActual.createElement(View, {testID: 'playlist-create-modal'}) : null,
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
import {PlaylistSheet} from '../../../../src/components/sheets/PlaylistSheet/PlaylistSheet';
import type {Playlist} from '../../../../src/types/playlist';

/** The sheet's own item shape — the sheet classifies it, the test does not. */
type SheetItem = React.ComponentProps<typeof PlaylistSheet>['currentItem'];

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

const MUSIC_ITEM: SheetItem = {
  fileUri: 'file:///music/song.mp3',
  title: 'Song',
  duration: 210,
  type: 'music',
  mediaType: 'audio',
};

/** A radio station: audio lane, but NOT playlist material. */
const RADIO_ITEM: SheetItem = {
  fileUri: 'file:///radio/station',
  title: 'Station',
  duration: 0,
  type: 'radio',
  mediaType: 'audio',
};

/** A film: video lane, and playlist material. */
const VIDEO_ITEM: SheetItem = {
  fileUri: 'file:///video/film.mp4',
  title: 'Film',
  duration: 5400,
  type: 'movie',
  mediaType: 'video',
};

async function renderSheet(currentItem: SheetItem, playlists: Playlist[]) {
  mockUsePlaylists.mockReturnValue(makeController(playlists));
  return renderChrome(
    <PlaylistSheet visible onClose={jest.fn()} currentItem={currentItem} />,
    {theme: true},
  );
}

describe('PlaylistSheet — the empty state tells the truth', () => {
  it('says "No playlists yet" when the user has no playlists at all', async () => {
    await renderSheet(MUSIC_ITEM, []);

    expect(screen.getByText('No playlists yet. Create one to get started.')).toBeOnTheScreen();
  });

  it('offers the create row when there are no playlists at all', async () => {
    await renderSheet(MUSIC_ITEM, []);

    // The instruction must be followable. This is the half of the old
    // defect that a text-only assertion would have missed.
    expect(screen.getByLabelText('Create new playlist')).toBeOnTheScreen();
  });

  it('says "No playlist can take this item" when the playlists cannot take it', async () => {
    await renderSheet(RADIO_ITEM, [
      makePlaylist({id: 'pl_1', name: 'Commute'}),
      makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
    ]);

    expect(screen.getByText('No playlist can take this item.')).toBeOnTheScreen();
    expect(screen.queryByText('No playlists yet. Create one to get started.')).toBeNull();
  });

  it('hides the create row when no playlist can take the item', async () => {
    await renderSheet(RADIO_ITEM, [
      makePlaylist({id: 'pl_1', name: 'Commute'}),
      makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
    ]);

    // THE DEFECT: "create one" + no create row. The sheet must not tell
    // the user to do what it will not let them do.
    expect(screen.queryByLabelText('Create new playlist')).toBeNull();
  });

  it('never tells the user to create a playlist the sheet will not let them create', async () => {
    await renderSheet(RADIO_ITEM, [
      makePlaylist({id: 'pl_1', name: 'Commute'}),
      makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
    ]);

    const saysCreate = screen.queryByText('No playlists yet. Create one to get started.');
    const hasCreateRow = screen.queryByLabelText('Create new playlist') !== null;
    expect(saysCreate === null || hasCreateRow).toBe(true);
  });
});

describe('PlaylistSheet — the create form has ONE owner', () => {
  it('does not open the create owner on its own', async () => {
    await renderSheet(MUSIC_ITEM, []);

    expect(screen.queryByTestId('playlist-create-modal')).toBeNull();
  });

  it('opens PlaylistCreateModal when the create row is pressed', async () => {
    await renderSheet(MUSIC_ITEM, []);

    await fireEvent.press(screen.getByLabelText('Create new playlist'));

    expect(screen.getByTestId('playlist-create-modal')).toBeOnTheScreen();
  });
});

describe('PlaylistSheet — the shared compatibility rule', () => {
  it('offers only the playlists that can take the item', async () => {
    await renderSheet(MUSIC_ITEM, [
      makePlaylist({id: 'pl_1', name: 'Commute'}),
      makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
      makePlaylist({id: 'pl_3', name: 'Workout', kind: 'AUDIO_ONLY'}),
    ]);

    expect(screen.getByText('Commute')).toBeOnTheScreen();
    expect(screen.getByText('Workout')).toBeOnTheScreen();
    expect(screen.queryByText('Films')).toBeNull();
  });

  it('offers NO playlist for a radio station', async () => {
    await renderSheet(RADIO_ITEM, [
      makePlaylist({id: 'pl_1', name: 'Commute'}),
      makePlaylist({id: 'pl_2', name: 'Films', kind: 'VIDEO_ONLY'}),
    ]);

    // The radio station has an AUDIO lane, and an audio-lane playlist has
    // an audio allow-list. A lane is not a permission.
    expect(screen.queryByText('Commute')).toBeNull();
    expect(screen.queryByText('Films')).toBeNull();
    expect(screen.getByText('No playlist can take this item.')).toBeOnTheScreen();
  });

  it('offers a video playlist for a film, and refuses the audio ones', async () => {
    await renderSheet(VIDEO_ITEM, [
      makePlaylist({id: 'pl_1', name: 'Commute'}),
      makePlaylist({id: 'pl_2', name: 'Film Night', kind: 'VIDEO_ONLY'}),
    ]);

    expect(screen.getByText('Film Night')).toBeOnTheScreen();
    expect(screen.queryByText('Commute')).toBeNull();
  });
});
