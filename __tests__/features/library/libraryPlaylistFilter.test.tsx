/**
 * The Library's playlist filter — RETIRED to All Playlists (R3c).
 *
 * ## What changed
 *
 * The Library used to carry a "Playlists" CONTENT MODE: the same
 * playlist list and the same three kind chips as All Playlists, on a
 * second page. All Playlists is the OWNER of that list (spec §6.4), so
 * the mode is gone. The Library always renders its own segments
 * (Folders / Audio / Artists / Albums), and the title dropdown's
 * "Playlists" entry NAVIGATES to All Playlists instead of swapping what
 * the page renders.
 *
 * ## What this pins
 *
 *  1. The kind chips are still ONE list, and the labels still come from
 *     `PLAYLIST_KIND_LABELS`. The list did not move — the page that
 *     drew it did.
 *  2. The Library's dropdown offers exactly two entries: the page you
 *     are on, and the page that owns the playlists.
 *  3. Choosing "Playlists" navigates to All Playlists and closes the
 *     sheet; choosing "Library" only closes the sheet.
 *  4. The Library's hook owns NO playlist list and NO playlist filter:
 *     the narrowing by kind belongs to `useAllPlaylistsScreen` now (see
 *     `__tests__/screens/AllPlaylists/useAllPlaylistsScreen.test.tsx`).
 *
 * The file keeps its name because the CHIP LIST it pins is the same
 * list — only the page that drew it changed.
 */

import {renderHook, act} from '@testing-library/react-native';

jest.mock('../../../src/theme', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {
      background: {primary: '#000000', elevated: '#111111'},
      accent: {gold: '#c9a84c'},
    },
  }),
}));
jest.mock('../../../src/infrastructure/player', () => ({
  resolveStreamType: (kind: string) => kind,
  useResumeAwareLaunch: () => ({openPlayer: jest.fn()}),
  usePlayer: () => ({state: {isPlaying: false}}),
}));
jest.mock('../../../src/infrastructure/player/miniPlayerChrome', () => ({
  useBottomChromeInset: () => 0,
}));
jest.mock('../../../src/hooks/useMediaScanner', () => ({
  useMediaScanner: () => ({
    startScan: jest.fn(),
    cancelScan: jest.fn(),
    isScanning: false,
    scanProgress: null,
    scanHistory: null,
    cancelRequested: false,
    permissionRevokedFolders: [],
  }),
}));
jest.mock('../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: jest.fn(), hide: jest.fn()}),
}));
jest.mock('../../../src/state', () => ({
  useSettingsStore: (
    selector: (s: {videoFolders: string[]; audioFolders: string[]; lastScanTimestamp: number | null}) => unknown,
  ) => selector({videoFolders: [], audioFolders: [], lastScanTimestamp: null}),
  useMediaStore: (selector: (s: {tracks: unknown[]}) => unknown) => selector({tracks: []}),
  usePlayerStore: (selector: (s: {currentFile: unknown}) => unknown) => selector({currentFile: null}),
}));

import {LOCAL_PLAYLIST_FILTERS} from '../../../src/features/library/presentation/related/localFilesConfig';
import {PLAYLIST_KIND_LABELS} from '../../../src/types/playlist';
import {
  LIBRARY_MENU_ENTRIES,
  useLibraryScreen,
} from '../../../src/features/library/presentation/hooks/useLibraryScreen';

const mockNavigate = jest.fn();

function fakeNavigation() {
  return {
    navigate: mockNavigate,
    dispatch: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  } as never;
}

describe('the kind chips — the ONE list All Playlists draws', () => {
  it('offers All, Audio and Video', () => {
    expect(LOCAL_PLAYLIST_FILTERS.map(f => f.key)).toEqual([
      'ALL',
      'AUDIO_ONLY',
      'VIDEO_ONLY',
    ]);
  });

  it('labels the kind chips from the one owner of the kind labels', () => {
    const labels = Object.fromEntries(LOCAL_PLAYLIST_FILTERS.map(f => [f.key, f.label]));

    expect(labels.AUDIO_ONLY).toBe(PLAYLIST_KIND_LABELS.AUDIO_ONLY);
    expect(labels.VIDEO_ONLY).toBe(PLAYLIST_KIND_LABELS.VIDEO_ONLY);
  });
});

describe("the Library's title menu — the two entries", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('offers the page you are on and the page that owns the playlists', () => {
    expect(LIBRARY_MENU_ENTRIES.map(entry => entry.key)).toEqual([
      'library',
      'playlists',
    ]);
    expect(LIBRARY_MENU_ENTRIES.map(entry => entry.label)).toEqual([
      'Library',
      'Playlists',
    ]);
  });

  it('navigates to All Playlists when Playlists is chosen', async () => {
    const {result} = await renderHook(() => useLibraryScreen(fakeNavigation()));

    await act(async () => {
      result.current.handleLibraryMenuSelect('playlists');
    });

    expect(mockNavigate).toHaveBeenCalledWith('AllPlaylistsScreen');
  });

  it('stays on the Library when Library is chosen', async () => {
    const {result} = await renderHook(() => useLibraryScreen(fakeNavigation()));

    await act(async () => {
      result.current.handleLibraryMenuSelect('library');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('closes the sheet either way', async () => {
    const {result} = await renderHook(() => useLibraryScreen(fakeNavigation()));

    await act(async () => {
      result.current.setShowDropdown(true);
    });
    expect(result.current.showDropdown).toBe(true);

    await act(async () => {
      result.current.handleLibraryMenuSelect('playlists');
    });
    expect(result.current.showDropdown).toBe(false);
  });
});

describe('the Library owns no playlist list of its own', () => {
  it('exposes no playlist list, no playlist filter and no create modal', async () => {
    const {result} = await renderHook(() => useLibraryScreen(fakeNavigation()));

    const surface = result.current as unknown as Record<string, unknown>;
    expect(surface.filteredPlaylists).toBeUndefined();
    expect(surface.playlistFilterType).toBeUndefined();
    expect(surface.setPlaylistFilterType).toBeUndefined();
    expect(surface.createModalVisible).toBeUndefined();
    expect(surface.setCreateModalVisible).toBeUndefined();
  });
});
