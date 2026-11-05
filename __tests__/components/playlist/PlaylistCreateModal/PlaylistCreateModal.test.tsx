/**
 * `PlaylistCreateModal` — the ONE owner of "create a playlist".
 *
 * ## Why this exists
 *
 * "Create a playlist" was implemented THREE times: here, as an inline modal
 * inside `AllPlaylistsScreen`, and as an inline create MODE inside
 * `PlaylistSheet`. Three implementations, three copies of the kind picker,
 * and two of them could not offer every kind — because the kinds they were
 * written for did not exist yet.
 *
 * This modal is now the only place a playlist is created (D-P4). These
 * tests pin that it can create EVERY kind, and that the kind's LABEL comes
 * from the one owner (`PLAYLIST_KIND_LABELS`) rather than from a local
 * copy that could drift.
 *
 * ## The retraction
 *
 * This file used to pin THREE kinds, the third one mixed. The mixed
 * playlist kind was removed on 2026-11-05: a list that spans two lanes is
 * a queue, not a playlist. The kind picker now offers the two kinds a
 * playlist can be, and the mixed chip is gone with it.
 *
 * ## What this pins
 *
 *  1. BOTH kinds are offered — `AUDIO_ONLY` and `VIDEO_ONLY`.
 *  2. The kind's label comes from `PLAYLIST_KIND_LABELS`. A local copy
 *     that said "Mixed content" would fail here.
 *  3. Creating a playlist reports the kind the user chose.
 *  4. An empty name and a duplicate name are refused, and nothing is
 *     created.
 */

import React from 'react';
import {screen, fireEvent} from '@testing-library/react-native';

import {renderChrome} from '../../../helpers/renderChrome';

jest.mock('../../../../src/features/playlists', () => {
  const actual = jest.requireActual('../../../../src/features/playlists');
  return {
    ...actual,
    usePlaylists: jest.fn(),
  };
});

import {usePlaylists} from '../../../../src/features/playlists';
import {PlaylistCreateModal} from '../../../../src/components/playlist/PlaylistCreateModal/PlaylistCreateModal';
import {PLAYLIST_KIND_LABELS, type Playlist} from '../../../../src/types/playlist';

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

async function renderModal(
  existing: Playlist[] = [],
  onCreate: (name: string, kind: string) => void = jest.fn(),
) {
  mockUsePlaylists.mockReturnValue(makeController(existing));
  return renderChrome(
    <PlaylistCreateModal visible onClose={jest.fn()} onCreate={onCreate} />,
    {theme: true},
  );
}

describe('PlaylistCreateModal — the one create owner', () => {
  it('offers both kinds', async () => {
    await renderModal();

    expect(screen.getByLabelText('Audio playlist type')).toBeOnTheScreen();
    expect(screen.getByLabelText('Video playlist type')).toBeOnTheScreen();
  });

  it('labels every kind from the ONE owner', async () => {
    await renderModal();

    // The expectation is built FROM the owner, so a modal that kept its
    // own label copy with a different word would fail here.
    for (const kind of ['AUDIO_ONLY', 'VIDEO_ONLY'] as const) {
      expect(
        screen.getByLabelText(`${PLAYLIST_KIND_LABELS[kind]} playlist type`),
      ).toBeOnTheScreen();
    }
  });

  it('offers EXACTLY two kinds — a third is a control that lies', async () => {
    await renderModal();

    // The "must not" claim. The removed mixed kind had a chip here once,
    // and a chip for a kind the domain no longer has is a dead control.
    // Counting the chips is the assertion that survives a NEW kind being
    // added: an assertion that only checks the two it knows about would
    // pass with a third sitting next to them.
    expect(screen.getAllByLabelText(/playlist type$/)).toHaveLength(2);
  });
});

describe('PlaylistCreateModal — creating a playlist', () => {
  it('creates an audio playlist by default', async () => {
    const onCreate = jest.fn();
    await renderModal([], onCreate);

    await fireEvent.changeText(screen.getByPlaceholderText('My Playlist'), 'Road Trip');
    await fireEvent.press(screen.getByText('Create'));

    expect(onCreate).toHaveBeenCalledWith('Road Trip', 'AUDIO_ONLY');
  });

  it('creates a video playlist', async () => {
    const onCreate = jest.fn();
    await renderModal([], onCreate);

    await fireEvent.changeText(screen.getByPlaceholderText('My Playlist'), 'Films');
    await fireEvent.press(screen.getByLabelText('Video playlist type'));
    await fireEvent.press(screen.getByText('Create'));

    expect(onCreate).toHaveBeenCalledWith('Films', 'VIDEO_ONLY');
  });

  it('refuses an empty name', async () => {
    const onCreate = jest.fn();
    await renderModal([], onCreate);

    await fireEvent.press(screen.getByText('Create'));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByText('Playlist name is required')).toBeOnTheScreen();
  });

  it('refuses a duplicate name', async () => {
    const onCreate = jest.fn();
    await renderModal(
      [
        {
          id: 'pl_1',
          name: 'Road Trip',
          kind: 'AUDIO_ONLY',
          items: [],
          pinned: false,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-20T10:00:00.000Z',
        },
      ],
      onCreate,
    );

    await fireEvent.changeText(screen.getByPlaceholderText('My Playlist'), 'road trip');
    await fireEvent.press(screen.getByText('Create'));

    expect(onCreate).not.toHaveBeenCalled();
    expect(
      screen.getByText('A playlist with this name already exists'),
    ).toBeOnTheScreen();
  });
});
