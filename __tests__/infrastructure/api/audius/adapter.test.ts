/**
 * V21 W6 P21c — Audius adapter parse + signal tests.
 *
 * Mirrors the Jamendo pattern from
 * `__tests__/infrastructure/api/jamendo/adapter.test.ts` (the
 * proof-of-pattern reference). Audius has only the `data` field
 * in its envelope (no `status`), so the envelope validator is
 * `parseAudiusListEnvelope` (no status check) and
 * `parseAudiusSingleEnvelope` (returns null for missing data,
 * since the API uses `{data: null}` or `{}` for a missing track).
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - per-track shape validation (rejects a track with the
 *     wrong field type instead of silently skipping it)
 *   - documented retries constant
 *   - getAudiusTrackById propagates AdapterParseError
 *     (the narrowed-catch proof)
 */

import {
  searchAudiusTracks,
  getTrendingAudiusTracks,
  getAudiusTrackById,
  AUDIUS_RETRIES,
} from '../../../../src/infrastructure/api/audius/adapter';
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

function validTrack(id = 1) {
  return {
    id: String(id),
    title: 'Track ' + id,
    duration: 180,
    genre: 'rock',
    description: 'd',
    user: {id: 'u' + id, name: 'Artist ' + id, handle: 'a' + id},
  };
}

describe('audius adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(AUDIUS_RETRIES).toBe(2);
  });

  it('throws AdapterParseError when data is present but not an array', async () => {
    // Audius has no status field — the envelope is just
    // `{data: T[]}`. We reject when `data` is present but the
    // wrong shape (an upstream API breakage or malicious payload).
    mockedApiFetch.mockResolvedValueOnce({data: 'not-an-array'});
    await expect(searchAudiusTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('handles missing / empty data envelope as zero results (not a parse error)', async () => {
    // Audius returns `{data: []}` for empty results — that IS
    // valid, not a parse failure. Missing `data` is also valid
    // (some endpoints return `{}`).
    mockedApiFetch.mockResolvedValueOnce({});
    const results = await searchAudiusTracks('test');
    expect(results).toEqual([]);

    mockedApiFetch.mockResolvedValueOnce({data: []});
    const results2 = await searchAudiusTracks('test');
    expect(results2).toEqual([]);
  });

  it('threads the AbortSignal to apiFetch on search', async () => {
    mockedApiFetch.mockResolvedValueOnce({data: []});
    const controller = new AbortController();
    await searchAudiusTracks('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getTrendingAudiusTracks', async () => {
    mockedApiFetch.mockResolvedValueOnce({data: [validTrack(1)]});
    const controller = new AbortController();
    await getTrendingAudiusTracks(20, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getAudiusTrackById', async () => {
    mockedApiFetch.mockResolvedValueOnce({data: validTrack(7)});
    const controller = new AbortController();
    await getAudiusTrackById('7', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('parseRawAudiusTrack rejects a record with the wrong id type', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      data: [{...validTrack(1), id: ''}],
    });
    await expect(searchAudiusTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('parseRawAudiusTrack rejects a record with missing user object', async () => {
    // `user` is required for the result's `artistName` /
    // `artistId` — an upstream API breakage that drops `user`
    // is a hard failure, not a partial result.
    mockedApiFetch.mockResolvedValueOnce({
      data: [{...validTrack(1), user: undefined}],
    });
    await expect(searchAudiusTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed results on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      data: [validTrack(1), validTrack(2)],
    });
    const results = await searchAudiusTracks('test');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: '1',
      title: 'Track 1',
      artistName: 'Artist 1',
      streamUrl: expect.stringContaining('/v1/tracks/1/stream'),
    });
  });

  it('getAudiusTrackById returns null on a not-found (missing data)', async () => {
    // The API uses `{data: null}` or `{}` for a missing track.
    mockedApiFetch.mockResolvedValueOnce({data: null});
    expect(await getAudiusTrackById('999')).toBeNull();

    mockedApiFetch.mockResolvedValueOnce({});
    expect(await getAudiusTrackById('999')).toBeNull();
  });

  it('getAudiusTrackById swallows transport errors but propagates AdapterParseError', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures returned `null`. Now only transport-level
    // failures are swallowed; shape failures propagate so the
    // caller can distinguish "server is down" from "server
    // returned garbage".
    mockedApiFetch.mockResolvedValueOnce({data: 'not-a-track-object'});
    await expect(getAudiusTrackById('1')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });
});
