/**
 * The Library's playlist filter rail — the kind chips.
 *
 * ## What this pins
 *
 * A chip that selects a filter the list ignores is a DEAD control: the
 * user taps "Audio", nothing changes, and the chip is a lie. So this file
 * pins both halves:
 *
 *  1. The rail OFFERS every kind (All / Audio / Video).
 *  2. The Library's playlist segment HONOURS them — selecting `Audio`
 *     narrows the list to the audio playlists and to nothing else.
 *
 * The segment is fed `filteredPlaylists`, and the filter is
 * `p.kind === playlistFilterType`. `Audio` is a `PlaylistKind`, so the
 * predicate covers it without a special case — and that is exactly what
 * the second half of this file proves, on the hook that computes it.
 *
 * ## The retraction
 *
 * This file used to pin a `Mixed` chip. The mixed playlist kind was
 * removed on 2026-11-05, so the chip went with it — and it went from the
 * management page too, because both pages read the SAME chip list
 * (`LOCAL_PLAYLIST_FILTERS`). A chip with no kind behind it is a dead
 * control, so it was removed rather than left to filter nothing.
 *
 * The chip labels come from `PLAYLIST_KIND_LABELS`, the ONE owner of the
 * kind labels, so "Audio" is spelled in one place.
 */

import {renderHook, act} from '@testing-library/react-native';
import type {Playlist} from '../../../src/types/playlist';

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
  useOpenPlaylist: () => ({openPlaylist: jest.fn()}),
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
  usePlayerStore: Object.assign(
    (selector: (s: {currentFile: unknown}) => unknown) => selector({currentFile: null}),
    {getState: () => ({loadPlaylistToPlayer: jest.fn()})},
  ),
  playlistItemsToEntries: (items: unknown[]) => items,
}));
// The playlist list is created INSIDE the factory and handed back on a
// `__`-prefixed property: a factory that closed over a `const` declared
// in this file would run before that `const` initialised, and the mock
// would cache `undefined`.
jest.mock('../../../src/features/playlists', () => {
  const mockPlaylistState: {list: Playlist[]} = {list: []};
  return {
    __mockPlaylistState: mockPlaylistState,
    usePlaylists: () => ({list: mockPlaylistState.list, createPlaylist: jest.fn()}),
  };
});

import {LOCAL_PLAYLIST_FILTERS} from '../../../src/features/library/presentation/related/localFilesConfig';
import type {FilterType} from '../../../src/features/library/presentation/types';
import {PLAYLIST_KIND_LABELS} from '../../../src/types/playlist';
import {useLibraryScreen} from '../../../src/features/library/presentation/hooks/useLibraryScreen';

const {__mockPlaylistState} = jest.requireMock('../../../src/features/playlists') as {
  __mockPlaylistState: {list: Playlist[]};
};

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Playlist',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeNavigation() {
  return {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  } as never;
}

/**
 * The key the rail would set when the user taps the chip.
 *
 * It is read from the CHIP LIST, not hardcoded, on purpose: the rail
 * and the filter are one thing, and a chip whose key the filter
 * cannot match is a dead control.
 */
function chipKeyFor(label: string): FilterType {
  const chip = LOCAL_PLAYLIST_FILTERS.find(f => f.label === label);
  if (!chip) {
    throw new Error(`no playlist filter chip labelled "${label}"`);
  }
  return chip.key;
}

describe('the Library playlist filter — the kind chips', () => {
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

  it('narrows the playlist list to the audio playlists', async () => {
    __mockPlaylistState.list = [
      makePlaylist({id: 'pl_audio', name: 'Songs', kind: 'AUDIO_ONLY'}),
      makePlaylist({id: 'pl_video', name: 'Films', kind: 'VIDEO_ONLY'}),
    ];

    const {result} = await renderHook(() => useLibraryScreen(fakeNavigation()));

    await act(async () => {
      result.current.setPlaylistFilterType(chipKeyFor(PLAYLIST_KIND_LABELS.AUDIO_ONLY));
    });

    expect(result.current.filteredPlaylists.map(p => p.name)).toEqual(['Songs']);
  });

  it('keeps every playlist under All, and each one under its own lane', async () => {
    __mockPlaylistState.list = [
      makePlaylist({id: 'pl_audio', name: 'Songs', kind: 'AUDIO_ONLY'}),
      makePlaylist({id: 'pl_video', name: 'Films', kind: 'VIDEO_ONLY'}),
    ];

    const {result} = await renderHook(() => useLibraryScreen(fakeNavigation()));

    // ALL
    await act(async () => {
      result.current.setPlaylistFilterType(chipKeyFor('All'));
    });
    expect(result.current.filteredPlaylists.map(p => p.name)).toEqual([
      'Songs',
      'Films',
    ]);

    await act(async () => {
      result.current.setPlaylistFilterType(chipKeyFor(PLAYLIST_KIND_LABELS.AUDIO_ONLY));
    });
    expect(result.current.filteredPlaylists.map(p => p.name)).toEqual(['Songs']);

    await act(async () => {
      result.current.setPlaylistFilterType(chipKeyFor(PLAYLIST_KIND_LABELS.VIDEO_ONLY));
    });
    expect(result.current.filteredPlaylists.map(p => p.name)).toEqual(['Films']);
  });
});
