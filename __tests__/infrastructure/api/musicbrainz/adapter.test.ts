/**
 * V21 W6 P21c — MusicBrainz adapter parse + signal tests.
 *
 * Mirrors the Jamendo (W22 F/U #4 proof-of-pattern), Audius
 * (F/U #5), Internet Archive (F/U #6), IPTV (F/U #7), and
 * LibriVox (F/U #8) patterns. MusicBrainz has 4 service
 * functions + a two-call flow inside `getReleaseGroupDetail`.
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *     (per-artist + per-release + per-recording + envelope)
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - signal threads through the inner recordings call in
 *     `getReleaseGroupDetail`
 *   - the documented retries constant
 *   - getReleaseGroupDetail propagates AdapterParseError
 *     (the narrowed-catch proof)
 *   - getReleaseGroupDetail degrades to empty recordings
 *     when the inner release call fails (transport error,
 *     not shape error)
 */

import {
  searchArtists,
  getArtistDiscography,
  getReleaseGroupDetail,
  MUSICBRAINZ_RETRIES,
} from '../../../../src/infrastructure/api/musicbrainz/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockedApiFetch.mockReset();
});

function validArtist(id = 'a-1') {
  return {
    id,
    name: 'Artist ' + id,
    'sort-name': 'Artist, ' + id,
    type: 'Person',
    country: 'US',
    disambiguation: '',
  };
}

function validRelease(id = 'r-1') {
  return {
    id,
    title: 'Release ' + id,
    'first-release-date': '2020-01-01',
    country: 'US',
    status: 'Official',
    'cover-art-archive': {front: true},
  };
}

function validRecording(id = 'rec-1') {
  return {
    id,
    title: 'Track ' + id,
    length: 180000,
  };
}

describe('musicbrainz adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(MUSICBRAINZ_RETRIES).toBe(2);
  });

  it('searchArtists threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({artists: [validArtist('a')]});
    const controller = new AbortController();
    await searchArtists('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getArtistDiscography threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      id: 'a',
      name: 'A',
      'release-groups': [validRelease('r')],
    });
    const controller = new AbortController();
    await getArtistDiscography('a', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getReleaseGroupDetail threads the AbortSignal to both calls', async () => {
    // First call: release-group. Second call: release with recordings.
    mockedApiFetch.mockResolvedValueOnce({
      id: 'rg',
      title: 'Album',
      'first-release-date': '2020-01-01',
      'primary-type': 'Album',
      releases: [{id: 'r1', title: 'R1', date: '2020-01-01'}],
      'cover-art-archive': {front: true},
    });
    mockedApiFetch.mockResolvedValueOnce({
      id: 'r1',
      title: 'R1',
      media: [{format: 'CD', 'track-count': 1, tracks: []}],
    });
    const controller = new AbortController();
    await getReleaseGroupDetail('rg', controller.signal);
    // Both calls thread the signal.
    expect(mockedApiFetch.mock.calls[0][0]).toEqual(
      expect.objectContaining({signal: controller.signal}),
    );
    expect(mockedApiFetch.mock.calls[1][0]).toEqual(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('artistResultsFromSearchRaw throws AdapterParseError when an artist has a missing id', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      artists: [{...validArtist('a'), id: ''}],
    });
    await expect(searchArtists('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('artistResultsFromSearchRaw throws AdapterParseError when an artist is missing name', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      artists: [{...validArtist('a'), name: undefined}],
    });
    await expect(searchArtists('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('releaseResultsFromArtistLookupRaw throws AdapterParseError when a release has no title', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      id: 'a',
      name: 'A',
      'release-groups': [{...validRelease('r'), title: undefined}],
    });
    await expect(getArtistDiscography('a')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed artists on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      artists: [validArtist('a'), validArtist('b')],
    });
    const result = await searchArtists('test');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'a',
      name: 'Artist a',
      sortName: 'Artist, a',
      country: 'US',
    });
  });

  it('returns parsed releases on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      id: 'a',
      name: 'A',
      'release-groups': [validRelease('r1'), validRelease('r2')],
    });
    const result = await getArtistDiscography('a');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'r1',
      title: 'Release r1',
      date: '2020-01-01',
      coverArtUrl: expect.stringContaining('r1'),
    });
  });

  it('handles missing / empty artists envelope as zero results (not a parse error)', async () => {
    mockedApiFetch.mockResolvedValueOnce({artists: []});
    expect(await searchArtists('test')).toEqual([]);

    mockedApiFetch.mockResolvedValueOnce({});
    expect(await searchArtists('test')).toEqual([]);
  });

  it('getReleaseGroupDetail returns null on a not-found (transport error)', async () => {
    mockedApiFetch.mockRejectedValueOnce(new Error('network'));
    expect(await getReleaseGroupDetail('missing')).toBeNull();
  });

  it('getReleaseGroupDetail propagates AdapterParseError on a malformed envelope', async () => {
    mockedApiFetch.mockResolvedValueOnce({not: 'an object with expected fields'});
    await expect(getReleaseGroupDetail('rg')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('getReleaseGroupDetail degrades to empty recordings when the inner call fails (transport error)', async () => {
    // First call succeeds, second call fails. Result should
    // be the release-group detail with empty recordings (not
    // `null` — the metadata is still valid).
    mockedApiFetch.mockResolvedValueOnce({
      id: 'rg',
      title: 'Album',
      'first-release-date': '2020-01-01',
      'primary-type': 'Album',
      releases: [{id: 'r1', title: 'R1', date: '2020-01-01'}],
      'cover-art-archive': {front: true},
    });
    mockedApiFetch.mockRejectedValueOnce(new Error('network'));
    const result = await getReleaseGroupDetail('rg');
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Album');
    expect(result?.recordings).toEqual([]);
  });

  it('getReleaseGroupDetail propagates AdapterParseError when the inner call has malformed recordings', async () => {
    // First call succeeds. Second call has a recording with
    // a missing id. The inner catch propagates AdapterParseError.
    mockedApiFetch.mockResolvedValueOnce({
      id: 'rg',
      title: 'Album',
      'first-release-date': '2020-01-01',
      'primary-type': 'Album',
      releases: [{id: 'r1', title: 'R1', date: '2020-01-01'}],
      'cover-art-archive': {front: true},
    });
    mockedApiFetch.mockResolvedValueOnce({
      id: 'r1',
      title: 'R1',
      media: [
        {
          format: 'CD',
          'track-count': 1,
          tracks: [{position: 1, number: '1', title: 'T', recording: {id: '', title: 'T', length: 1000}}],
        },
      ],
    });
    await expect(getReleaseGroupDetail('rg')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('getReleaseGroupDetail returns parsed detail with recordings on a valid two-call flow', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      id: 'rg',
      title: 'Album',
      'first-release-date': '2020-01-01',
      'primary-type': 'Album',
      releases: [{id: 'r1', title: 'R1', date: '2020-01-01'}],
      'cover-art-archive': {front: true},
    });
    mockedApiFetch.mockResolvedValueOnce({
      id: 'r1',
      title: 'R1',
      media: [
        {
          format: 'CD',
          'track-count': 2,
          tracks: [
            {position: 1, number: '1', title: 'T1', recording: validRecording('rec-1')},
            {position: 2, number: '2', title: 'T2', recording: validRecording('rec-2')},
          ],
        },
      ],
    });
    const result = await getReleaseGroupDetail('rg');
    expect(result?.title).toBe('Album');
    expect(result?.recordings).toHaveLength(2);
    expect(result?.recordings[0].title).toBe('Track rec-1');
  });
});
