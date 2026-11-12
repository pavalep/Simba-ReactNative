/**
 * V21 W6 P21c — Jamendo adapter parse + signal tests.
 *
 * Covers the W6 P21c additions (mirrors the Podcast Index
 * pattern from `__tests__/infrastructure/api/podcastIndex/adapter.test.ts`):
 *   - AdapterParseError on malformed wire payloads
 *   - signal threading through apiFetch (so TanStack Query
 *     can cancel stale requests on screen unmount / query-key
 *     change)
 *   - per-track shape validation (rejects a track with the
 *     wrong field type instead of silently skipping it)
 *   - the documented retries constant
 *
 * The other 8 adapters (`audius`, `internetArchive`, `iptv`,
 * `librivox`, `musicbrainz`, `radioBrowser`, `tvmaze`,
 * `weather`) get the same shape in their own test files —
 * jamendo is the proof-of-pattern reference.
 */

import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
  getJamendoTrackById,
  decodeJamendoText,
  JAMENDO_RETRIES,
} from '../../../../src/infrastructure/api/jamendo/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

// Override the default empty react-native-config mock so
// `clientId()` returns a non-empty string (the env-mocked
// value below is what JAMENDO_CLIENT_ID resolves to).
jest.mock('react-native-config', () => ({
  JAMENDO_CLIENT_ID: 'test-client-id',
}));

beforeEach(() => {
  mockedApiFetch.mockReset();
});

// Minimal valid track shape for the happy-path mocks.
function validTrack(id = 1) {
  return {
    id: String(id),
    name: 'Track ' + id,
    artist_name: 'Artist ' + id,
    album_name: 'Album ' + id,
    duration: 180,
    audio: `https://example.com/audio-${id}.mp3`,
    image: `https://example.com/image-${id}.jpg`,
    genre_name: 'rock',
  };
}

describe('jamendo adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(JAMENDO_RETRIES).toBe(2);
  });

  it('throws AdapterParseError when the envelope status is "error"', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'error', code: 10, error_message: 'invalid client_id'},
      results: [],
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('throws AdapterParseError when results is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: 'not-an-array',
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('threads the AbortSignal to apiFetch on search', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [],
    });
    const controller = new AbortController();
    await searchJamendoTracks('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getJamendoTracksByGenre', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [],
    });
    const controller = new AbortController();
    await getJamendoTracksByGenre('rock', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getPopularJamendoTracks', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });
    const controller = new AbortController();
    await getPopularJamendoTracks(20, 1, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getJamendoTrackById', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(7)],
    });
    const controller = new AbortController();
    await getJamendoTrackById(7, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('parseRawJamendoTrack rejects a record with the wrong id type', async () => {
    // `id` is required to be a parseable integer; the mock
    // returns a non-numeric string.
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [{...validTrack(1), id: 'not-a-number'}],
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('parseRawJamendoTrack rejects a record with a missing audio url', async () => {
    // `audio` is required (non-empty string) — the API would
    // never return a playable track without it.
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [{...validTrack(1), audio: ''}],
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed results on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1), validTrack(2)],
    });
    const results = await searchJamendoTracks('test');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 1,
      name: 'Track 1',
      artistName: 'Artist 1',
      audioUrl: 'https://example.com/audio-1.mp3',
      genreName: 'rock',
    });
  });

  it('getJamendoTrackById returns null on a not-found (empty results)', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [],
    });
    expect(await getJamendoTrackById(999)).toBeNull();
  });

  it('getJamendoTrackById swallows transport errors but propagates AdapterParseError', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures returned `null`. Now only transport-level
    // failures (ApiError from apiFetch, signal aborts) are
    // swallowed; shape failures propagate so the caller can
    // distinguish "server is down" from "server returned garbage".
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'error', error_message: 'oops'},
      results: [],
    });
    await expect(getJamendoTrackById(1)).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });
});

describe('jamendo adapter — the escaped text fields', () => {
  // Jamendo escapes the characters that are not legal in its payload, so
  // the artist "Besson & Sa" arrives as "Besson&amp;sa" — and the app
  // used to draw the ESCAPED name on the row (seen on the Search page's
  // results on 2026-11-12: "Bad Intentions, Bessonn&amp;sa").
  it('decodes the named entities in the track, artist, album and genre', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [
        {
          ...validTrack(1),
          name: 'Rock &amp; Roll',
          artist_name: 'Besson&amp;sa',
          album_name: 'Hits &lt;Live&gt;',
          genre_name: 'rock &amp; roll',
        },
      ],
    });
    const results = await searchJamendoTracks('test');
    expect(results[0]).toMatchObject({
      name: 'Rock & Roll',
      artistName: 'Besson&sa',
      albumName: 'Hits <Live>',
      genreName: 'rock & roll',
    });
  });

  it('decodes the numeric entities', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [{...validTrack(1), name: 'Caf&#233; &#x26; Bar'}],
    });
    const results = await searchJamendoTracks('test');
    expect(results[0].name).toBe('Café & Bar');
  });

  it('leaves an unknown entity alone', () => {
    expect(decodeJamendoText('Foo &bar; Baz')).toBe('Foo &bar; Baz');
  });

  it('leaves a text without an ampersand alone', () => {
    expect(decodeJamendoText('Plain Name')).toBe('Plain Name');
  });
});
