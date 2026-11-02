/**
 * The batch-add report — B-034.
 *
 * ## The defect this pins
 *
 * `addItemToPlaylist` **silently refuses** a lane mismatch: adding a video
 * to an `AUDIO_ONLY` playlist returns `{status: 'lane-mismatch'}` and puts
 * nothing in the list. But `FolderBrowserScreen` toasted
 *
 *     `Added ${selectedItems.length} items to …`
 *
 * — the count the user **SELECTED**, not the count that was actually
 * added. A user who ticked a video and an audio file for an audio playlist
 * was told both were added. One of them was not, and the toast was the
 * only place that could have said so.
 *
 * The report lives with the feature that produces the statuses
 * (`src/features/playlists/batchAddReport.ts`), because the refusal is in
 * the status and nowhere else.
 *
 * ## What this pins
 *
 *  1. When every item went in, the toast says so — all of them, and it is
 *     a success.
 *  2. When some were refused, the toast does NOT claim all of them went
 *     in. It says how many went in, how many did not, and WHY.
 *  3. When none went in, the toast says NOTHING was added.
 *  4. Every reason is a REAL status of `addItemToPlaylist`. A reason the
 *     store cannot produce is a lie in the toast.
 */

import {
  reportBatchAdd,
  type AddPlaylistItemResult,
} from '../../../src/features/playlists';
import type {Playlist, PlaylistItem} from '../../../src/types/playlist';

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

function makeItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'pli_1',
    fileUri: 'file:///music/song.mp3',
    title: 'Song',
    duration: 210,
    addedAt: '2026-10-20T10:00:00.000Z',
    source: 'local',
    type: 'music',
    mediaType: 'audio',
    ...overrides,
  };
}

const playlist = makePlaylist();
const item = makeItem();

const added: AddPlaylistItemResult = {status: 'added', playlist, item};
const duplicate: AddPlaylistItemResult = {status: 'duplicate', playlist, item};
const laneMismatch: AddPlaylistItemResult = {status: 'lane-mismatch', playlist, item};
const unsupported: AddPlaylistItemResult = {
  status: 'unsupported-media-kind',
  playlist,
  item,
};
const full: AddPlaylistItemResult = {status: 'playlist-full', playlist, max: 100};
const missing: AddPlaylistItemResult = {status: 'playlist-not-found'};

describe('reportBatchAdd — the toast tells the truth', () => {
  it('claims every item when every item went in', () => {
    const report = reportBatchAdd([added, added], 'Commute');

    expect(report.added).toBe(2);
    expect(report.skipped).toBe(0);
    expect(report.severity).toBe('success');
    expect(report.message).toBe('Added 2 items to Commute');
  });

  it('does NOT claim every item when some were refused', () => {
    const report = reportBatchAdd([added, laneMismatch], 'Commute');

    expect(report.added).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.severity).toBe('warning');
    expect(report.message).not.toContain('Added 2 items');
    expect(report.message).toContain('Added 1 of 2 items');
    expect(report.message).toContain('1 skipped');
  });

  it('says NOTHING was added when nothing went in', () => {
    const report = reportBatchAdd([laneMismatch, unsupported], 'Commute');

    expect(report.added).toBe(0);
    expect(report.skipped).toBe(2);
    expect(report.severity).toBe('error');
    expect(report.message).toContain('Nothing was added to Commute');
    expect(report.message).toContain('2 items skipped');
  });

  it('names the reason a duplicate was skipped', () => {
    const report = reportBatchAdd([duplicate], 'Commute');

    expect(report.message).toContain('already in the playlist');
  });

  it('names the reason a lane mismatch was skipped', () => {
    const report = reportBatchAdd([laneMismatch], 'Commute');

    expect(report.message).toContain('the wrong type for that playlist');
  });

  it('names the reason an unsupported media kind was skipped', () => {
    const report = reportBatchAdd([unsupported], 'Commute');

    expect(report.message).toContain('the wrong type for that playlist');
  });

  it('names the reason a full playlist was skipped', () => {
    const report = reportBatchAdd([full], 'Commute');

    expect(report.message).toContain('the playlist is full');
  });

  it('names the reason a missing playlist was skipped', () => {
    const report = reportBatchAdd([missing], 'Commute');

    expect(report.message).toContain('the playlist no longer exists');
  });

  it('uses the singular for one item', () => {
    const report = reportBatchAdd([added], 'Commute');

    expect(report.message).toBe('Added 1 item to Commute');
  });

  it('reports every distinct reason once', () => {
    const report = reportBatchAdd([laneMismatch, laneMismatch, duplicate], 'Commute');

    expect(report.message).toContain('already in the playlist');
    expect(report.message).toContain('the wrong type for that playlist');
    // Two lane mismatches, ONE reason line — the reason list is a set.
    expect(report.message.match(/the wrong type for that playlist/g)).toHaveLength(1);
  });
});
