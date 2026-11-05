/**
 * Home's shelf and the management page — the SAME pinned order.
 *
 * ## What this pins
 *
 * The two surfaces that show pinned playlists must not disagree about
 * which one is pinned most recently. Home's shelf (headed "Pinned
 * Playlists") and the management page's pinned section both sort by the
 * recency of PINNING (D-P3), and they read that rule from the same
 * owner — `pinnedAtMs()` in the playlists feature facade.
 *
 * The rule used to be written out twice, once per hook. Two copies of
 * one rule is one copy too many, and this file is what makes the
 * duplication impossible to reintroduce silently: if either surface
 * stops reading the facade's owner, the two orders stop matching and
 * this fails.
 *
 * ## What it is NOT
 *
 * Neither surface is RENDERED here — both are hooks, and the hook is
 * where the order is decided. Rendering the screens would add a view
 * tree without adding a rule.
 */

import {renderHook} from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  CommonActions: {navigate: jest.fn()},
}));
jest.mock('../../../src/infrastructure/player', () => ({
  resolveStreamType: (kind: string) => kind,
  useResumeAwareLaunch: () => ({openPlayer: jest.fn()}),
}));
jest.mock('../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: jest.fn(), hide: jest.fn()}),
}));
jest.mock('../../../src/components/core/Dialog', () => ({
  useConfirmDialog: () => ({confirm: jest.fn()}),
}));
jest.mock('../../../src/theme', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {accent: {gold: '#c9a84c'}, text: {inverse: '#000000'}},
  }),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({user: null}),
}));
jest.mock('../../../src/hooks/useWeather', () => ({
  useWeather: () => ({snapshot: null, isFirstLoad: false}),
}));
jest.mock('../../../src/features/bookmarks', () => ({
  useBookmarks: () => ({allBookmarks: [], remove: jest.fn()}),
}));
jest.mock('../../../src/features/followedPodcasts', () => ({
  useFollowedPodcasts: () => ({list: []}),
}));
jest.mock('../../../src/features/recentHistory', () => ({
  useRecentHistory: () => ({list: [], removeRecent: jest.fn()}),
}));
jest.mock('../../../src/state', () => ({
  useMediaStore: (selector: (s: {tracks: unknown[]; isScanning: boolean}) => unknown) =>
    selector({tracks: [], isScanning: false}),
}));
// The playlist list is created INSIDE the factory and handed back on a
// `__`-prefixed property: a factory that closed over a `const` declared
// in this file would run before that `const` initialised, and the mock
// would cache `undefined`.
//
// The REAL `pinnedAtMs` comes along with it. The mock replaces the
// HOOK (the thing that reads the store), not the RULE — a mock that
// handed over a second implementation of the rule would let both
// surfaces agree on something the app never does.
jest.mock('../../../src/features/playlists', () => {
  const mockPlaylistState: {list: Playlist[]} = {list: []};
  return {
    ...jest.requireActual('../../../src/features/playlists'),
    __mockPlaylistState: mockPlaylistState,
    usePlaylists: () => ({
      list: mockPlaylistState.list,
      playlists: mockPlaylistState.list,
      createPlaylist: jest.fn(),
      setPinned: jest.fn(),
    }),
  };
});

import {useNavigation} from '@react-navigation/native';
import {useHomeScreen} from '../../../src/screens/Home/hooks/useHomeScreen';
import {useAllPlaylistsScreen} from '../../../src/screens/AllPlaylists/hooks/useAllPlaylistsScreen';
import type {Playlist} from '../../../src/types/playlist';

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
 * Three playlists, and the two pinned ones DISAGREE with `updatedAt`:
 * the playlist pinned first was edited last. Any rule that reaches for
 * `updatedAt` instead of `pinnedAt` puts them the other way round.
 */
const PLAYLISTS: Playlist[] = [
  makePlaylist({
    id: 'pl_pinned_first',
    name: 'Pinned First',
    pinned: true,
    pinnedAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
  }),
  makePlaylist({
    id: 'pl_pinned_last',
    name: 'Pinned Last',
    pinned: true,
    pinnedAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  }),
  makePlaylist({
    id: 'pl_unpinned',
    name: 'Unpinned',
    pinned: false,
    updatedAt: '2026-10-29T00:00:00.000Z',
  }),
];

const EXPECTED_PINNED_ORDER = ['pl_pinned_last', 'pl_pinned_first'];

describe('the pinned order — Home and the management page agree', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({navigate: jest.fn()});
    __mockPlaylistState.list = PLAYLISTS;
  });

  it('puts the same pinned playlists in the same order on both surfaces', async () => {
    const home = await renderHook(() => useHomeScreen(fakeNavigation()));
    const page = await renderHook(() => useAllPlaylistsScreen());

    const rail = home.result.current.sections.find(section => section.type === 'PINNED_PLAYLISTS');
    if (!rail || rail.type !== 'PINNED_PLAYLISTS') {
      throw new Error('Home rendered no PINNED_PLAYLISTS section');
    }
    const homePinned = (rail.items as Playlist[]).map(playlist => playlist.id);
    const pagePinned = page.result.current.pinnedPlaylists.map(playlist => playlist.id);

    expect(homePinned).toEqual(EXPECTED_PINNED_ORDER);
    expect(pagePinned).toEqual(EXPECTED_PINNED_ORDER);
    expect(homePinned).toEqual(pagePinned);
  });

  it('leaves the unpinned playlist to the management page', async () => {
    const home = await renderHook(() => useHomeScreen(fakeNavigation()));
    const page = await renderHook(() => useAllPlaylistsScreen());

    const rail = home.result.current.sections.find(section => section.type === 'PINNED_PLAYLISTS');
    if (!rail || rail.type !== 'PINNED_PLAYLISTS') {
      throw new Error('Home rendered no PINNED_PLAYLISTS section');
    }

    // Home's rail is headed "Pinned Playlists", so it holds the pinned
    // ones and nothing else — the unpinned playlist lives on the page
    // that owns it, and the two surfaces cannot disagree about which
    // pinned playlist is the most recently pinned one.
    expect((rail.items as Playlist[]).map(playlist => playlist.id)).toEqual([
      'pl_pinned_last',
      'pl_pinned_first',
    ]);
    expect(
      page.result.current.otherPlaylists.map(playlist => playlist.id),
    ).toEqual(['pl_unpinned']);
  });
});
