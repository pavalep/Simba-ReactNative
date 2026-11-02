/**
 * `useAllPlaylistsScreen` — the pin ACTION.
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
 * ## What this pins
 *
 *  1. The toggle asks the FEATURE to set the state - `setPinned(id,
 *     pinned)` - and not the store directly. The facade is the one owner.
 *  2. It passes the state it is asked for, so "pin" and "unpin" are the
 *     same call with a different flag.
 */

import {renderHook} from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../src/features/playlists', () => ({
  usePlaylists: jest.fn(),
}));

import {useNavigation} from '@react-navigation/native';
import {usePlaylists} from '../../../src/features/playlists';
import {useAllPlaylistsScreen} from '../../../src/screens/AllPlaylists/hooks/useAllPlaylistsScreen';

const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUsePlaylists = usePlaylists as jest.MockedFunction<typeof usePlaylists>;

const mockSetPinned = jest.fn();

function makeController() {
  return {
    list: [],
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
    playlists: [],
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
