/**
 * Home's playlist shelf — the ORDER.
 *
 * ## What this pins
 *
 * The shelf is headed "Pinned Playlists", so the order under that title
 * has to be the truth the title claims: PINNED playlists first, and the
 * pinned order is the RECENCY OF PINNING (`pinnedAt`) — not the
 * playlist's own `updatedAt`. The unpinned playlists follow, by recency
 * (D-P3, spec §4.6).
 *
 * The old shelf sorted by `updatedAt` alone, so a playlist edited
 * yesterday outranked one the user pinned last week: the title said
 * "Pinned" and the list did not agree.
 *
 * The evidence the tracker asks for is here verbatim — an unpinned,
 * recently-updated playlist and a pinned, older one, and the pinned one
 * comes FIRST.
 */

import {renderHook} from '@testing-library/react-native';
import type {Playlist} from '../../../src/types/playlist';

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
jest.mock('../../../src/features/playlists', () => {
  const mockPlaylistState: {list: Playlist[]} = {list: []};
  return {
    // The REAL `pinnedAtMs` — the shelf's pinned order comes from the
    // facade's one owner, so this mock must not hand the hook a second
    // implementation of the rule to read instead.
    ...jest.requireActual('../../../src/features/playlists'),
    __mockPlaylistState: mockPlaylistState,
    usePlaylists: () => ({list: mockPlaylistState.list}),
  };
});

import {useHomeScreen} from '../../../src/screens/Home/hooks/useHomeScreen';

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

/** The names on Home's playlist shelf, in the order the shelf shows them. */
async function shelfNames(playlists: Playlist[]): Promise<string[]> {
  __mockPlaylistState.list = playlists;
  const {result} = await renderHook(() => useHomeScreen(fakeNavigation()));
  const section = result.current.sections.find(s => s.type === 'PLAYLISTS');
  if (!section || section.type !== 'PLAYLISTS') {
    throw new Error('Home rendered no PLAYLISTS section');
  }
  return (section.items as Playlist[]).map(p => p.name);
}

describe('useHomeScreen — the playlist shelf order', () => {
  it('puts a pinned playlist above a more recently updated unpinned one', async () => {
    const names = await shelfNames([
      makePlaylist({
        id: 'pl_unpinned',
        name: 'Edited Yesterday',
        pinned: false,
        updatedAt: '2026-10-29T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_pinned',
        name: 'Pinned Last Week',
        pinned: true,
        pinnedAt: '2026-10-20T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      }),
    ]);

    expect(names).toEqual(['Pinned Last Week', 'Edited Yesterday']);
  });

  it('orders the pinned playlists by when they were pinned', async () => {
    const names = await shelfNames([
      makePlaylist({
        id: 'pl_old_pin',
        name: 'Pinned First',
        pinned: true,
        pinnedAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_new_pin',
        name: 'Pinned Last',
        pinned: true,
        pinnedAt: '2026-10-26T00:00:00.000Z',
        updatedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    expect(names).toEqual(['Pinned Last', 'Pinned First']);
  });

  it('orders the unpinned playlists by recency', async () => {
    const names = await shelfNames([
      makePlaylist({
        id: 'pl_older',
        name: 'Older',
        pinned: false,
        updatedAt: '2026-10-05T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_newer',
        name: 'Newer',
        pinned: false,
        updatedAt: '2026-10-27T00:00:00.000Z',
      }),
    ]);

    expect(names).toEqual(['Newer', 'Older']);
  });

  it('keeps every pinned playlist above every unpinned one', async () => {
    const names = await shelfNames([
      makePlaylist({id: 'pl_a', name: 'Unpinned Recent', pinned: false, updatedAt: '2026-10-29T00:00:00.000Z'}),
      makePlaylist({id: 'pl_b', name: 'Pinned A', pinned: true, pinnedAt: '2026-10-10T00:00:00.000Z'}),
      makePlaylist({id: 'pl_c', name: 'Unpinned Older', pinned: false, updatedAt: '2026-10-28T00:00:00.000Z'}),
      makePlaylist({id: 'pl_d', name: 'Pinned B', pinned: true, pinnedAt: '2026-10-12T00:00:00.000Z'}),
    ]);

    // The shelf shows THREE, so the fourth never reaches the rail: the
    // two pinned ones take the first two slots and the most recently
    // updated unpinned one takes the third.
    expect(names).toEqual(['Pinned B', 'Pinned A', 'Unpinned Recent']);
  });

  it('shows at most three playlists', async () => {
    const names = await shelfNames([
      makePlaylist({id: 'pl_1', name: 'One', pinned: true, pinnedAt: '2026-10-03T00:00:00.000Z'}),
      makePlaylist({id: 'pl_2', name: 'Two', pinned: true, pinnedAt: '2026-10-02T00:00:00.000Z'}),
      makePlaylist({id: 'pl_3', name: 'Three', pinned: true, pinnedAt: '2026-10-01T00:00:00.000Z'}),
      makePlaylist({id: 'pl_4', name: 'Four', pinned: false, updatedAt: '2026-10-29T00:00:00.000Z'}),
    ]);

    expect(names).toEqual(['One', 'Two', 'Three']);
  });

  it('does not reorder the playlist list it was given', async () => {
    // The shelf's order is the SHELF's. The Library shows the same list,
    // and a sort that ran in place would reorder it there too.
    // The PINNED one is the more recently updated one, so a sort that
    // ran in place over the list it was given WOULD reorder it - and
    // the assertion below is what catches that.
    const list = [
      makePlaylist({
        id: 'pl_1',
        name: 'Unpinned',
        pinned: false,
        updatedAt: '2026-10-10T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_2',
        name: 'Pinned',
        pinned: true,
        pinnedAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-29T00:00:00.000Z',
      }),
    ];

    await shelfNames(list);

    expect(list.map(p => p.name)).toEqual(['Unpinned', 'Pinned']);
  });
});
