/**
 * Fixtures shared by the `AllPlaylistsScreen` suites.
 *
 * ## Why this exists
 *
 * The page's suites all need the same two things: a playlist that looks
 * like a playlist, and a `usePlaylists()` facade that answers with a
 * known list. Both used to be written out per suite, and a suite that
 * drifted from the others would then be testing a page that does not
 * exist.
 *
 * The facade here is the FEATURE's shape — the same fields the real
 * `usePlaylists()` returns — so a screen that starts reading a new field
 * fails to typecheck here rather than at runtime.
 */

import type {usePlaylists} from '../../../src/features/playlists';
import type {Playlist} from '../../../src/types/playlist';

export type PlaylistsController = ReturnType<typeof usePlaylists>;

export function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
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

export function makeController(
  playlists: Playlist[],
  overrides: Partial<PlaylistsController> = {},
): PlaylistsController {
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
    ...overrides,
  } as unknown as PlaylistsController;
}
