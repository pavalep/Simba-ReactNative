/**
 * The pinned order — the ONE owner (D-P3).
 *
 * ## Why this file exists
 *
 * "Pinned playlists sort by the RECENCY OF PINNING, not by the
 * playlist's own `updatedAt`" used to be written out TWICE — once in
 * Home's shelf hook and once in the management page's hook. Two copies
 * of one rule is one copy too many: they can drift, and a drift here
 * shows the same list in two different orders.
 *
 * The rule now lives in ONE place — `pinnedAtMs()` in the playlists
 * feature facade, beside the other playlist rules (`compatiblePlaylistsFor`,
 * `setPlaylistPinned`) — and both surfaces read it. These assertions
 * pin that ONE owner, so the next person who reaches for `updatedAt`
 * finds a failing test instead of a silent second copy.
 *
 * ## What is NOT here
 *
 * That the two SURFACES agree is pinned in
 * `__tests__/features/playlists/pinnedOrderAgrees.test.tsx`. This file
 * pins the RULE; that one pins the agreement.
 */

import {pinnedAtMs} from '../../../src/features/playlists';
import type {Playlist} from '../../../src/types/playlist';

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

const ms = (iso: string): number => new Date(iso).getTime();

describe('pinnedAtMs — the recency of PINNING', () => {
  it('reads the pin stamp, not the playlist\'s own age', () => {
    const playlist = makePlaylist({
      pinned: true,
      pinnedAt: '2026-10-20T00:00:00.000Z',
      updatedAt: '2026-10-29T00:00:00.000Z',
    });

    expect(pinnedAtMs(playlist)).toBe(ms('2026-10-20T00:00:00.000Z'));
  });

  it('falls back to the playlist\'s own recency when there is no pin stamp', () => {
    const playlist = makePlaylist({
      pinned: true,
      updatedAt: '2026-10-29T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
    });

    expect(pinnedAtMs(playlist)).toBe(ms('2026-10-29T00:00:00.000Z'));
  });

  it('falls back to the creation stamp when there is neither', () => {
    // A persisted playlist can reach the app without an `updatedAt` at
    // all, so the chain has a third link. The TYPE says `updatedAt` is
    // required, which is why the fixture has to say otherwise
    // explicitly - the guard exists for data, not for the type.
    const playlist = {
      id: 'pl_1',
      name: 'Playlist',
      kind: 'AUDIO_ONLY',
      items: [],
      pinned: true,
      createdAt: '2026-10-05T00:00:00.000Z',
      updatedAt: undefined,
    } as unknown as Playlist;

    expect(pinnedAtMs(playlist)).toBe(ms('2026-10-05T00:00:00.000Z'));
  });

  it('orders pinned playlists by when they were pinned, not by when they were edited', () => {
    const pinnedFirst = makePlaylist({
      id: 'pl_pinned_first',
      name: 'Pinned First',
      pinned: true,
      pinnedAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    });
    const pinnedLast = makePlaylist({
      id: 'pl_pinned_last',
      name: 'Pinned Last',
      pinned: true,
      pinnedAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    });

    const ordered = [pinnedFirst, pinnedLast].sort(
      (a, b) => pinnedAtMs(b) - pinnedAtMs(a),
    );

    expect(ordered.map(playlist => playlist.id)).toEqual([
      'pl_pinned_last',
      'pl_pinned_first',
    ]);
  });

  it('is the OPPOSITE of the order `updatedAt` would give', () => {
    // The fixture above is chosen so the two rules disagree: the
    // playlist pinned first was edited last. Sorting by `updatedAt`
    // would put it first, and the rule says it goes last. This is the
    // assertion that catches a rule quietly swapped for the other one.
    const pinnedFirst = makePlaylist({
      id: 'pl_pinned_first',
      name: 'Pinned First',
      pinned: true,
      pinnedAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    });
    const pinnedLast = makePlaylist({
      id: 'pl_pinned_last',
      name: 'Pinned Last',
      pinned: true,
      pinnedAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    });

    const byUpdatedAt = [pinnedFirst, pinnedLast].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    // The two rules DISAGREE on this fixture: the playlist pinned
    // first was edited last. So no single implementation can satisfy
    // both, and this is the assertion that tells them apart.
    expect(byUpdatedAt.map(playlist => playlist.id)).toEqual([
      'pl_pinned_first',
      'pl_pinned_last',
    ]);
    expect(pinnedAtMs(pinnedFirst)).toBeLessThan(pinnedAtMs(pinnedLast));
  });
});
