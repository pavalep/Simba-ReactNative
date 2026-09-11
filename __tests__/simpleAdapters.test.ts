/**
 * V18 — convertor tests for the 5 simple search-service adapters
 * (audius, jamendo, librivox, musicbrainz, tvmaze). Each describe
 * block covers the per-adapter convertors per the V18 type contract
 * (happy / missing / undefined).
 */
import {
  trackResultFromRaw as audiusTrackFromRaw,
  trackResultsFromListRaw as audiusTracksFromList,
} from '../src/infrastructure/api/audius/adapter';
import {
  trackResultFromRaw as jamendoTrackFromRaw,
  trackResultsFromResponseRaw as jamendoTracksFromResponse,
} from '../src/infrastructure/api/jamendo/adapter';
import {
  audiobookResultFromRaw as libroBookFromRaw,
  audiobookResultsFromResponseRaw as libroBooksFromResponse,
} from '../src/infrastructure/api/librivox/adapter';
import {
  artistResultFromRaw as mbArtistFromRaw,
  artistResultsFromSearchRaw as mbArtistsFromSearch,
  releaseResultFromRaw as mbReleaseFromRaw,
  releaseResultsFromArtistLookupRaw as mbReleasesFromArtist,
} from '../src/infrastructure/api/musicbrainz/adapter';
import {showsFromSearchRaw as tvmazeShowsFromSearch} from '../src/infrastructure/api/tvmaze/adapter';

describe('audiusAdapter', () => {
  it('trackResultFromRaw maps a full track', () => {
    expect(
      audiusTrackFromRaw({
        id: '1',
        title: 'A',
        duration: 100,
        genre: 'rock',
        description: 'd',
        user: {id: 'u1', name: 'Alice', handle: 'alice'},
      }),
    ).toMatchObject({
      id: '1',
      title: 'A',
      artistName: 'Alice',
      artistId: 'u1',
      duration: 100,
      genre: 'rock',
      streamUrl: expect.stringContaining('/v1/tracks/1/stream'),
    });
  });

  it('trackResultFromRaw throws AdapterParseError for undefined', () => {
    // V21 W6 P21c: malformed / undefined input throws
    // `AdapterParseError` (was `null` pre-W22 — the silent-skip
    // pattern masked upstream API breakages).
    expect(() => audiusTrackFromRaw(undefined)).toThrow(/expected track object/);
  });

  it('trackResultsFromListRaw handles missing data envelope', () => {
    expect(audiusTracksFromList(undefined)).toEqual([]);
    expect(audiusTracksFromList({})).toEqual([]);
    expect(audiusTracksFromList({data: []})).toEqual([]);
  });
});

describe('jamendoAdapter', () => {
  const baseRaw = {
    id: '1',
    name: 'T',
    artist_name: 'Alice',
    album_name: 'Al',
    duration: 100,
    audio: 'http://x/audio',
    image: 'http://x/img',
    genre_name: 'rock',
  };

  it('trackResultFromRaw maps a track (id is coerced to number)', () => {
    expect(jamendoTrackFromRaw(baseRaw)).toMatchObject({
      id: 1,
      name: 'T',
      artistName: 'Alice',
      audioUrl: 'http://x/audio',
    });
  });

  it('trackResultFromRaw throws AdapterParseError for undefined', () => {
    // V21 W6 P21c: malformed / undefined input throws
    // `AdapterParseError` (was `null` pre-W22 — the silent-skip
    // pattern masked upstream API breakages).
    expect(() => jamendoTrackFromRaw(undefined)).toThrow(/expected track object/);
  });

  it('trackResultsFromResponseRaw throws AdapterParseError on a failed envelope', () => {
    // V21 W6 P21c: envelope failure throws `AdapterParseError`
    // (was `ApiError` pre-W22 — the transport-level / shape-level
    // distinction is now first-class in catch blocks).
    expect(() =>
      jamendoTracksFromResponse({headers: {status: 'error'}, results: []}),
    ).toThrow(/Jamendo request failed/);
  });

  it('trackResultsFromResponseRaw returns [] on success with empty results', () => {
    expect(
      jamendoTracksFromResponse({headers: {status: 'success'}, results: []}),
    ).toEqual([]);
  });
});

describe('librivoxAdapter', () => {
  const baseBook = {
    id: 1,
    title: 'B',
    description: 'd',
    url_zip_file: 'z',
    url_librivox: 'l',
    url_iarchive: 'i',
    totaltime: '01:02:03',
    language: 'en',
    authors: {name: 'Author'},
  };

  it('audiobookResultFromRaw parses totaltime and author', () => {
    expect(libroBookFromRaw(baseBook)).toEqual({
      id: 1,
      title: 'B',
      author: 'Author',
      description: 'd',
      urlZipFile: 'z',
      urlLibrivox: 'l',
      urlIArchive: 'i',
      totalTime: 3723, // 1*3600 + 2*60 + 3
      language: 'en',
    });
  });

  it('audiobookResultFromRaw throws AdapterParseError for undefined (V21 W6 P21c)', () => {
    // Pre-W22 returned `null` (silent-skip pattern). The new
    // contract throws.
    expect(() => libroBookFromRaw(undefined)).toThrow(/expected book object/);
  });

  it('audiobookResultFromRaw defaults to "Unknown Author" when missing', () => {
    expect(libroBookFromRaw({...baseBook, authors: undefined})?.author).toBe(
      'Unknown Author',
    );
  });

  it('audiobookResultsFromResponseRaw handles all 3 wire shapes', () => {
    // Single object
    expect(
      libroBooksFromResponse({books: baseBook}),
    ).toHaveLength(1);
    // Numeric-keyed dict
    expect(
      libroBooksFromResponse({books: {1: baseBook, 2: baseBook}}),
    ).toHaveLength(2);
    // Missing
    expect(libroBooksFromResponse({})).toEqual([]);
    expect(libroBooksFromResponse(undefined)).toEqual([]);
  });
});

describe('musicbrainzAdapter', () => {
  it('artistResultFromRaw maps a raw artist', () => {
    expect(
      mbArtistFromRaw({
        id: 'a1',
        name: 'Beatles',
        'sort-name': 'Beatles, The',
        type: 'Group',
        country: 'GB',
        disambiguation: '',
      }),
    ).toEqual({
      id: 'a1',
      name: 'Beatles',
      sortName: 'Beatles, The',
      type: 'Group',
      country: 'GB',
      disambiguation: '',
    });
  });

  it('artistResultFromRaw returns null for undefined', () => {
    expect(mbArtistFromRaw(undefined)).toBeNull();
  });

  it('artistResultsFromSearchRaw handles missing artists', () => {
    expect(mbArtistsFromSearch(undefined)).toEqual([]);
    expect(mbArtistsFromSearch({artists: []})).toEqual([]);
  });

  it('releaseResultFromRaw sets coverArtUrl only when front cover exists', () => {
    const withCover = mbReleaseFromRaw({
      id: 'r1',
      title: 'R',
      'first-release-date': '2020-01-01',
      country: 'US',
      status: 'Official',
      'cover-art-archive': {front: true},
    });
    expect(withCover?.coverArtUrl).toBe(
      'https://coverartarchive.org/release/r1/front-250',
    );
    const noCover = mbReleaseFromRaw({
      id: 'r2',
      title: 'R',
      'first-release-date': '2020-01-01',
      country: 'US',
      status: 'Official',
      'cover-art-archive': {front: false},
    });
    expect(noCover?.coverArtUrl).toBeNull();
  });

  it('releaseResultsFromArtistLookupRaw handles missing release-groups', () => {
    expect(
      mbReleasesFromArtist({id: 'a1', name: 'A', 'release-groups': []}),
    ).toEqual([]);
    expect(
      mbReleasesFromArtist({id: 'a1', name: 'A'} as any),
    ).toEqual([]);
  });
});

describe('tvmazeAdapter', () => {
  it('showsFromSearchRaw unwraps the {score, show} envelope', () => {
    const show = {id: 1, name: 'Show', summary: 's', image: null, genres: [], status: 'Running', premiered: '2020-01-01'};
    expect(
      tvmazeShowsFromSearch([
        {score: 0.9, show: show as any},
        {score: 0.8, show: {...show, id: 2, name: 'Show2'} as any},
      ]),
    ).toHaveLength(2);
  });

  it('showsFromSearchRaw returns [] for undefined', () => {
    expect(tvmazeShowsFromSearch(undefined)).toEqual([]);
  });
});
