/**
 * V18 — convertor tests for the 3 paginated service adapters
 * (iptv, radioBrowser, podcastIndex). Each describe block covers
 * the per-adapter convertor contracts (happy / missing / undefined).
 *
 * Note: the actual HTTP endpoints are exercised in V18.4.4 (manual
 * smoke + the migrated useApiQuery hooks). These are pure-unit
 * convertor tests.
 */
import {
  channelResultFromRaw as iptvChannelFromRaw,
  channelResultsFromRaw as iptvChannelsFromRaw,
  categoryResultFromRaw as iptvCategoryFromRaw,
} from '../src/infrastructure/api/iptv/adapter';
import {
  browseTagFromRaw as radioBrowseTagFromRaw,
  browseTagsFromRaw as radioBrowseTagsFromRaw,
} from '../src/infrastructure/api/radioBrowser/adapter';
import {
  podcastResultFromRaw as podResultFromRaw,
  podcastResultsFromRaw as podResultsFromRaw,
  podcastEpisodeResultFromRaw as podEpisodeFromRaw,
} from '../src/infrastructure/api/podcastIndex/adapter';

describe('iptvAdapter', () => {
  it('channelResultFromRaw maps a complete channel', () => {
    expect(
      iptvChannelFromRaw({
        id: 'c1',
        name: 'CNN',
        url: 'http://x/stream',
        logo: 'http://x/logo',
        country: 'United States',
        country_code: 'US',
        languages: ['en'],
        categories: ['news'],
        is_playable: true,
      }),
    ).toEqual({
      id: 'c1',
      name: 'CNN',
      url: 'http://x/stream',
      image: 'http://x/logo',
      country: 'United States',
      countryCode: 'US',
      language: 'en',
      category: 'news',
      isPlayable: true,
    });
  });

  it('channelResultFromRaw throws AdapterParseError for undefined (V21 W6 P21c)', () => {
    // Pre-W22 returned `null` (silent-skip pattern that masked
    // upstream API breakages). The new contract throws.
    expect(() => iptvChannelFromRaw(undefined)).toThrow(/expected channel object/);
  });

  it('channelResultFromRaw defaults isPlayable to true when missing', () => {
    const result = iptvChannelFromRaw({
      id: 'c1',
      name: 'X',
      url: 'http://x',
      logo: '',
      country: '',
      country_code: '',
      languages: [],
      categories: [],
    } as any);
    expect(result?.isPlayable).toBe(true);
  });

  it('channelResultsFromRaw throws AdapterParseError on a malformed entry (V21 W6 P21c)', () => {
    // Pre-W22 silently filtered out malformed entries and the
    // caller saw fewer channels than the API returned, with no
    // diagnostic. The new contract rejects the whole batch.
    expect(() =>
      iptvChannelsFromRaw([
        {
          id: '1',
          name: 'A',
          url: 'u',
          logo: '',
          country: '',
          country_code: '',
          languages: [],
          categories: [],
          is_playable: true,
        },
        undefined as any,
      ]),
    ).toThrow(/expected channel object/);
  });

  it('categoryResultFromRaw renames channel_count → channelCount', () => {
    expect(iptvCategoryFromRaw({id: 'cat1', name: 'News', channel_count: 42})).toEqual({
      id: 'cat1',
      name: 'News',
      channelCount: 42,
    });
  });
});

describe('radioBrowserAdapter', () => {
  it('browseTagFromRaw renames stationcount → stationCount', () => {
    expect(radioBrowseTagFromRaw({name: 'rock', stationcount: 1234})).toEqual({
      name: 'rock',
      stationCount: 1234,
    });
  });

  it('browseTagFromRaw throws AdapterParseError for missing name (V21 W6 P21c)', () => {
    // Pre-W22 returned `null` (silent-skip pattern). The new
    // contract throws.
    expect(() =>
      radioBrowseTagFromRaw({name: '', stationcount: 100}),
    ).toThrow(/expected non-empty string/);
  });

  it('browseTagFromRaw defaults stationCount to 0 when missing', () => {
    expect(radioBrowseTagFromRaw({name: 'pop'})).toEqual({name: 'pop', stationCount: 0});
  });

  it('browseTagsFromRaw throws AdapterParseError on a malformed entry (V21 W6 P21c)', () => {
    // Pre-W22 silently filtered out malformed entries and the
    // caller saw fewer tags than the API returned, with no
    // diagnostic. The new contract rejects the whole batch.
    expect(radioBrowseTagsFromRaw(undefined)).toEqual([]);
    expect(() =>
      radioBrowseTagsFromRaw([
        {name: 'rock', stationcount: 1},
        {name: '', stationcount: 1},
        {name: 'pop', stationcount: 2},
      ]),
    ).toThrow(/expected non-empty string/);
  });
});

describe('podcastIndexAdapter', () => {
  it('podcastResultFromRaw maps a feed', () => {
    expect(
      podResultFromRaw({
        id: 1,
        title: 'Test Pod',
        author: 'Author',
        description: 'd',
        image: 'http://x/i',
        url: 'http://x/feed',
        episodeCount: 5,
        categories: {'1': 'Tech'},
      }),
    ).toEqual({
      id: 1,
      title: 'Test Pod',
      author: 'Author',
      description: 'd',
      image: 'http://x/i',
      feedUrl: 'http://x/feed',
      episodeCount: 5,
      categories: {'1': 'Tech'},
    });
  });

  it('podcastResultFromRaw returns null for undefined', () => {
    expect(podResultFromRaw(undefined)).toBeNull();
  });

  it('podcastResultsFromRaw filters nulls', () => {
    expect(
      podResultsFromRaw([
        {
          id: 1,
          title: 'A',
          author: '',
          description: '',
          image: '',
          url: '',
          episodeCount: 0,
          categories: {},
        },
        undefined as any,
      ]),
    ).toHaveLength(1);
  });

  it('podcastEpisodeResultFromRaw maps an episode', () => {
    expect(
      podEpisodeFromRaw({
        id: 1,
        title: 'Ep 1',
        description: 'd',
        datePublished: 1234,
        duration: 600,
        image: 'http://x/i',
        feedUrl: 'http://x/feed',
        enclosureUrl: 'http://x/audio.mp3',
        enclosureType: 'audio/mpeg',
      }),
    ).toEqual({
      id: 1,
      title: 'Ep 1',
      description: 'd',
      datePublished: 1234,
      duration: 600,
      image: 'http://x/i',
      feedUrl: 'http://x/feed',
      enclosureUrl: 'http://x/audio.mp3',
      enclosureType: 'audio/mpeg',
    });
  });

  it('podcastEpisodeResultFromRaw returns null for undefined', () => {
    expect(podEpisodeFromRaw(undefined)).toBeNull();
  });
});
