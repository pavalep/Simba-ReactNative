/**
 * `useAllPlaylistsScreen` — the pin ACTION and the kind FILTER.
 *
 * ## Why this exists
 *
 * The pin state existed in the model (`Playlist.pinned`) and the pin BADGE
 * existed on the card, but **nothing in the app could set `pinned`**. A
 * badge that can never appear is not a badge; it is a decoration on a
 * state the user cannot reach.
 *
 * The management page is where the pin belongs (D-P8): it already shows
 * visible management buttons, and a long-press is not reachable by a
 * screen reader or a keyboard.
 *
 * The page also grew a kind FILTER, and the split between the pinned
 * playlists and the rest is the page's own logic — so the logic lives
 * here, in the hook, and not in the view.
 *
 * ## What this pins
 *
 *  1. The toggle asks the FEATURE to set the state - `setPinned(id,
 *     pinned)` - and not the store directly. The facade is the one owner.
 *  2. It passes the state it is asked for, so "pin" and "unpin" are the
 *     same call with a different flag.
 *  3. The filter NARROWS the list by kind, and the pinned playlists are
 *     split from the rest - a playlist is listed ONCE, in the section
 *     that describes its state.
 *  4. The pinned order is the RECENCY OF PINNING (D-P3).
 */

import {act, renderHook} from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../src/features/playlists', () => ({
  usePlaylists: jest.fn(),
}));

import {useNavigation} from '@react-navigation/native';
import {usePlaylists} from '../../../src/features/playlists';
import {useAllPlaylistsScreen} from '../../../src/screens/AllPlaylists/hooks/useAllPlaylistsScreen';
import type {Playlist} from '../../../src/types/playlist';

const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUsePlaylists = usePlaylists as jest.MockedFunction<typeof usePlaylists>;

const mockSetPinned = jest.fn();

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

function makeController(playlists: Playlist[] = []) {
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
    setPinned: mockSetPinned,
    playlists,
    maxPlaylists: 50,
    maxItemsPerPlaylist: 100,
  };
}

describe('useAllPlaylistsScreen — the pin action', () => {
  beforeEach(() => {
    mockSetPinned.mockReset();
    mockUseNavigation.mockReturnValue({navigate: jest.fn()} as never);
    mockUsePlaylists.mockReturnValue(makeController() as never);
  });

  it('pins a playlist through the feature facade', async () => {
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    result.current.handleTogglePin('pl_1', true);

    expect(mockSetPinned).toHaveBeenCalledWith('pl_1', true);
  });

  it('unpins a playlist through the same call', async () => {
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    result.current.handleTogglePin('pl_1', false);

    expect(mockSetPinned).toHaveBeenCalledWith('pl_1', false);
  });
});

describe('useAllPlaylistsScreen — the kind filter', () => {
  beforeEach(() => {
    mockUseNavigation.mockReturnValue({navigate: jest.fn()} as never);
  });

  it('lists everything under ALL', async () => {
    mockUsePlaylists.mockReturnValue(
      makeController([
        makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'}),
        makePlaylist({id: 'pl_2', kind: 'MIXED'}),
      ]) as never,
    );
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    expect(result.current.filterType).toBe('ALL');
    expect(result.current.filteredPlaylists).toHaveLength(2);
  });

  it('narrows the list to the kind the filter names', async () => {
    mockUsePlaylists.mockReturnValue(
      makeController([
        makePlaylist({id: 'pl_1', kind: 'AUDIO_ONLY'}),
        makePlaylist({id: 'pl_2', kind: 'MIXED'}),
      ]) as never,
    );
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    await act(async () => {
      result.current.setFilterType('MIXED');
    });

    expect(result.current.filteredPlaylists.map(playlist => playlist.id)).toEqual([
      'pl_2',
    ]);
  });

  it('splits the pinned playlists from the rest — a playlist is listed once', async () => {
    mockUsePlaylists.mockReturnValue(
      makeController([
        makePlaylist({id: 'pl_1', pinned: true}),
        makePlaylist({id: 'pl_2', pinned: false}),
      ]) as never,
    );
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    expect(result.current.pinnedPlaylists.map(playlist => playlist.id)).toEqual(['pl_1']);
    expect(result.current.otherPlaylists.map(playlist => playlist.id)).toEqual(['pl_2']);
  });

  it('orders the pinned playlists by the recency of PINNING, not by their own age', async () => {
    mockUsePlaylists.mockReturnValue(
      makeController([
        makePlaylist({
          id: 'pl_older',
          pinned: true,
          updatedAt: '2026-10-30T10:00:00.000Z',
          pinnedAt: '2026-11-01T10:00:00.000Z',
        }),
        makePlaylist({
          id: 'pl_newer',
          pinned: true,
          updatedAt: '2026-10-01T10:00:00.000Z',
          pinnedAt: '2026-11-02T10:00:00.000Z',
        }),
      ]) as never,
    );
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    expect(result.current.pinnedPlaylists.map(playlist => playlist.id)).toEqual([
      'pl_newer',
      'pl_older',
    ]);
  });
});

describe('useAllPlaylistsScreen — opening a playlist', () => {
  it('navigates with the playlist the card rendered', async () => {
    const navigate = jest.fn();
    mockUseNavigation.mockReturnValue({navigate} as never);
    mockUsePlaylists.mockReturnValue(
      makeController([makePlaylist({id: 'pl_1', name: 'Road Trip'})]) as never,
    );
    const {result} = await renderHook(() => useAllPlaylistsScreen());

    result.current.handlePlaylistPress('pl_1');

    expect(navigate).toHaveBeenCalledWith('PlaylistDetail', {
      playlistId: 'pl_1',
      playlistName: 'Road Trip',
    });
  });
});
