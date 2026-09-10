// ─── V21 W6 P21 — Podcast Index adapter parse + signal tests ─────────
//
// Covers the W6 P21 additions: AdapterParseError on malformed wire
// payloads, signal threading through apiFetch, and the documented
// retries constant. The other 9 adapters (`audius`, `internetArchive`,
// `iptv`, `jamendo`, `librivox`, `musicbrainz`, `radioBrowser`,
// `tvmaze`, `weather`) get the same 3-test shape in their own test
// files in W6 P21b.

import {
  searchPodcasts,
  getTrendingPodcasts,
  getEpisodes,
  getPodcastById,
  getPodcastCategories,
  PODCAST_INDEX_RETRIES,
} from '../../../../src/infrastructure/api/podcastIndex/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

// Mock apiFetch so the adapters can be exercised without a network.
// We assert the call shape (signal/params) and return a canned payload.
jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

// Override the default empty react-native-config mock with non-empty
// Podcast Index credentials so `buildAuthHeaders()` doesn't throw
// "API key and secret are required" before apiFetch is called.
jest.mock('react-native-config', () => ({
  PODCAST_INDEX_API_KEY: 'test-key',
  PODCAST_INDEX_API_SECRET: 'test-secret',
}));

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('podcastIndex adapter — V21 W6 P21', () => {
  it('exposes a documented retries constant', () => {
    expect(PODCAST_INDEX_RETRIES).toBe(2);
  });

  it('throws AdapterParseError when the envelope status is "false"', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'false',
      description: 'authentication failed',
    });
    await expect(searchPodcasts('test query')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('throws AdapterParseError when the envelope is missing the expected field', async () => {
    // /search/byterm is supposed to return `{status, feeds: [...]}`.
    // The mock omits `feeds` — the adapter should throw.
    mockedApiFetch.mockResolvedValueOnce({status: 'true'});
    await expect(searchPodcasts('test query')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('threads the AbortSignal to apiFetch', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      feeds: [],
    });
    const controller = new AbortController();
    await searchPodcasts('test', 25, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('parseRawFeed rejects a record with the wrong field type', async () => {
    // `id` is required to be a finite number; the mock returns a string.
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      feeds: [{id: 'not-a-number', title: 'x', author: 'y', description: 'z', image: 'u', url: 'v', episodeCount: 0, categories: {}}],
    });
    await expect(searchPodcasts('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed results on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      feeds: [
        {
          id: 1,
          title: 'Test Podcast',
          author: 'Tester',
          description: 'A test',
          image: 'https://example.com/img.jpg',
          url: 'https://example.com/feed',
          episodeCount: 5,
          categories: {'Technology': 'tech'},
        },
      ],
    });
    const results = await searchPodcasts('test');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Podcast');
  });

  it('getTrendingPodcasts threads signal', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      feeds: [],
    });
    const controller = new AbortController();
    await getTrendingPodcasts(10, undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getEpisodes threads signal', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      items: [],
    });
    const controller = new AbortController();
    await getEpisodes(123, 10, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getPodcastById threads signal', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      feed: {
        id: 1,
        title: 'Podcast',
        author: 'Author',
        description: 'Desc',
        image: 'img',
        url: 'feed-url',
        episodeCount: 0,
        categories: {},
      },
    });
    const controller = new AbortController();
    await getPodcastById(123, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getPodcastCategories threads signal', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      status: 'true',
      feeds: [
        {id: 1, name: 'Technology'},
        {id: 2, name: 'Arts'},
      ],
    });
    const controller = new AbortController();
    const cats = await getPodcastCategories(controller.signal);
    expect(cats).toHaveLength(2);
    expect(cats[0].name).toBe('Technology');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });
});