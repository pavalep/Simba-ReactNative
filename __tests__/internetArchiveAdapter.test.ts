/**
 * V18.5.2: convertor tests for the Internet Archive adapter.
 *
 * Covers the 7 convertors + 2 pure helpers:
 *   - internetArchiveItemResultFromRaw
 *   - internetArchiveItemResultsFromRaw
 *   - internetArchiveItemDetailsFromRaw
 *   - internetArchiveVideoResultFromRaw
 *   - internetArchiveVideoResultsFromRaw
 *   - internetArchiveVideoDetailsFromRaw
 *   - archiveTracksFromRaw
 *   - archiveImageUrl
 *   - archiveIdentifierFromUrl
 *
 * Each test exercises the contract per V18 type §2:
 *   - single convertor: null on undefined input
 *   - list convertor: empty array on undefined input
 *   - happy path: maps every wire field to the right domain field
 *   - missing fields: defaults applied cleanly (no crash, no NaN, no undefined leaking)
 */
import {
  internetArchiveItemResultFromRaw,
  internetArchiveItemResultsFromRaw,
  internetArchiveItemDetailsFromRaw,
  internetArchiveVideoResultFromRaw,
  internetArchiveVideoResultsFromRaw,
  internetArchiveVideoDetailsFromRaw,
  archiveTracksFromRaw,
  archiveImageUrl,
  archiveIdentifierFromUrl,
  parseRuntime,
} from '../src/infrastructure/api/internetArchive/adapter';

describe('internetArchiveItemResultFromRaw', () => {
  it('maps a complete item to the domain shape', () => {
    expect(
      internetArchiveItemResultFromRaw({
        identifier: 'TestItem',
        title: 'Test Title',
        description: 'desc',
        creator: 'Author',
        year: '1955',
        runtime: '30:00',
        avg_rating: 4.5,
        download_count: 100,
        image_url: 'http://custom/img.jpg',
      }),
    ).toEqual({
      identifier: 'TestItem',
      title: 'Test Title',
      description: 'desc',
      creator: 'Author',
      year: '1955',
      runtime: '30:00',
      avgRating: 4.5,
      downloadCount: 100,
      imageUrl: 'http://custom/img.jpg',
      streamingUrl: 'https://archive.org/download/TestItem/',
      downloadUrls: [],
    });
  });

  it('falls back to the universal thumbnail when image_url is missing', () => {
    expect(
      internetArchiveItemResultFromRaw({
        identifier: 'NoImage',
        title: 't',
        description: '',
        creator: '',
        year: '',
        runtime: '',
        avg_rating: 0,
        download_count: 0,
        image_url: '',
      }),
    ).toMatchObject({
      identifier: 'NoImage',
      imageUrl: 'https://archive.org/services/img/NoImage',
    });
  });

  it('defaults empty strings to empty values without crashing', () => {
    const result = internetArchiveItemResultFromRaw({
      identifier: 'x',
      title: '',
      description: '',
      creator: '',
      year: '',
      runtime: '',
      avg_rating: 0,
      download_count: 0,
      image_url: '',
    });
    expect(result).toMatchObject({
      identifier: 'x',
      title: '',
      description: '',
      creator: '',
      year: '',
      runtime: '',
      avgRating: 0,
      downloadCount: 0,
    });
  });

  it('throws AdapterParseError on undefined input (V21 W6 P21c)', () => {
    // Pre-W22 returned `null` (silent-skip pattern that masked
    // upstream API breakages). The new contract throws.
    expect(() => internetArchiveItemResultFromRaw(undefined)).toThrow(
      /expected doc object/,
    );
  });

  it('throws AdapterParseError when identifier is missing (V21 W6 P21c)', () => {
    expect(() =>
      internetArchiveItemResultFromRaw({
        identifier: '',
        title: 'no id',
        description: '',
        creator: '',
        year: '',
        runtime: '',
        avg_rating: 0,
        download_count: 0,
        image_url: '',
      }),
    ).toThrow(/expected non-empty string/);
  });
});

describe('internetArchiveItemResultsFromRaw', () => {
  it('maps a search response with docs and numFound', () => {
    const out = internetArchiveItemResultsFromRaw({
      response: {
        docs: [
          {
            identifier: 'a',
            title: 'A',
            description: '',
            creator: '',
            year: '',
            runtime: '',
            avg_rating: 0,
            download_count: 0,
            image_url: '',
          },
          {
            identifier: 'b',
            title: 'B',
            description: '',
            creator: '',
            year: '',
            runtime: '',
            avg_rating: 0,
            download_count: 0,
            image_url: '',
          },
        ],
        numFound: 42,
      },
    });
    expect(out.items.map(i => i.identifier)).toEqual(['a', 'b']);
    expect(out.numFound).toBe(42);
  });

  it('returns empty on undefined input', () => {
    expect(internetArchiveItemResultsFromRaw(undefined)).toEqual({
      items: [],
      numFound: 0,
    });
  });

  it('returns empty on a response with no docs', () => {
    expect(
      internetArchiveItemResultsFromRaw({response: {numFound: 0}}),
    ).toEqual({items: [], numFound: 0});
  });

  it('throws AdapterParseError when ANY item fails the per-item convertor (V21 W6 P21c)', () => {
    // Pre-W22 silently filtered out malformed items and the
    // caller saw fewer results than the API returned, with no
    // diagnostic. The new contract throws — the whole batch is
    // rejected so the hook layer can decide whether to retry
    // or surface a toast.
    expect(() =>
      internetArchiveItemResultsFromRaw({
        response: {
          docs: [
            {
              identifier: 'good',
              title: 'G',
              description: '',
              creator: '',
              year: '',
              runtime: '',
              avg_rating: 0,
              download_count: 0,
              image_url: '',
            },
            {
              identifier: '',
              title: 'bad',
              description: '',
              creator: '',
              year: '',
              runtime: '',
              avg_rating: 0,
              download_count: 0,
              image_url: '',
            },
          ],
          numFound: 2,
        },
      }),
    ).toThrow(/expected non-empty string/);
  });

  it('falls back to docs.length when numFound is missing', () => {
    const out = internetArchiveItemResultsFromRaw({
      response: {
        docs: [
          {
            identifier: 'a',
            title: '',
            description: '',
            creator: '',
            year: '',
            runtime: '',
            avg_rating: 0,
            download_count: 0,
            image_url: '',
          },
        ],
      },
    });
    expect(out.numFound).toBe(1);
  });
});

describe('internetArchiveItemDetailsFromRaw', () => {
  it('builds a fully-resolved audio item with download URLs', () => {
    const out = internetArchiveItemDetailsFromRaw('abc', {
      metadata: {
        identifier: 'abc',
        title: 'Audiobook',
        description: 'desc',
        creator: 'narrator',
        year: '2020',
      },
      files: [
        {name: 'a.mp3', source: 'original', format: 'MP3', length: '5:00', track: '1'},
        {name: 'b.mp3', source: 'original', format: 'MP3', length: '6:00', track: '2'},
        {name: 'c.ogv', source: 'original', format: 'Ogg Video'}, // not audio — should be filtered out
        {name: 'a_thumb.jpg', source: 'derivative', format: 'JPEG'}, // not original — should be filtered out
      ],
    });
    expect(out).toMatchObject({
      identifier: 'abc',
      title: 'Audiobook',
      streamingUrl: 'https://archive.org/download/abc/a.mp3',
      downloadUrls: [
        {format: 'MP3', url: 'https://archive.org/download/abc/a.mp3'},
        {format: 'MP3', url: 'https://archive.org/download/abc/b.mp3'},
      ],
      runtime: '5:00',
    });
  });

  it('returns null on undefined input', () => {
    expect(internetArchiveItemDetailsFromRaw('abc', undefined)).toBeNull();
  });

  it('returns null when metadata is missing', () => {
    expect(
      internetArchiveItemDetailsFromRaw('abc', {files: []} as unknown as Parameters<typeof internetArchiveItemDetailsFromRaw>[1]),
    ).toBeNull();
  });

  it('falls back to the directory URL when no audio files are present', () => {
    const out = internetArchiveItemDetailsFromRaw('noaudio', {
      metadata: {
        identifier: 'noaudio',
        title: 'No audio',
        description: '',
        creator: '',
        year: '',
      },
      files: [],
    });
    expect(out?.streamingUrl).toBe('https://archive.org/download/noaudio/');
  });
});

describe('internetArchiveVideoResultFromRaw', () => {
  it('maps a complete video search result and parses runtime to seconds', () => {
    expect(
      internetArchiveVideoResultFromRaw({
        identifier: 'Movie',
        title: 'Movie',
        description: '',
        creator: '',
        year: '',
        runtime: '01:30:00',
        avg_rating: 0,
        download_count: 0,
        image_url: '',
      }),
    ).toMatchObject({
      identifier: 'Movie',
      duration: 5400, // 1h30m
      imageUrl: 'https://archive.org/services/img/Movie',
      streamingUrl: 'https://archive.org/download/Movie/',
    });
  });

  it('throws AdapterParseError on undefined input (V21 W6 P21c)', () => {
    // Pre-W22 returned `null`. The new contract throws so the
    // call site can distinguish "missing doc" (which is
    // legitimate — `internetArchiveVideoResultsFromRaw` filters
    // it before reaching here) from "server returned garbage".
    expect(() => internetArchiveVideoResultFromRaw(undefined)).toThrow(
      /expected doc object/,
    );
  });

  it('parses bare-seconds runtime', () => {
    expect(
      internetArchiveVideoResultFromRaw({
        identifier: 'x',
        title: '',
        description: '',
        creator: '',
        year: '',
        runtime: '90',
        avg_rating: 0,
        download_count: 0,
        image_url: '',
      }),
    ).toMatchObject({duration: 90});
  });
});

describe('internetArchiveVideoResultsFromRaw', () => {
  it('maps a video search response', () => {
    const out = internetArchiveVideoResultsFromRaw({
      response: {
        docs: [
          {
            identifier: 'a',
            title: 'A',
            description: '',
            creator: '',
            year: '',
            runtime: '',
            avg_rating: 0,
            download_count: 0,
            image_url: '',
          },
        ],
        numFound: 7,
      },
    });
    expect(out.items).toHaveLength(1);
    expect(out.numFound).toBe(7);
  });

  it('returns empty on undefined input', () => {
    expect(internetArchiveVideoResultsFromRaw(undefined)).toEqual({
      items: [],
      numFound: 0,
    });
  });
});

describe('internetArchiveVideoDetailsFromRaw (the partial-replication case)', () => {
  it('builds a fully-resolved video with subtitles + audio tracks + download URLs', () => {
    const out = internetArchiveVideoDetailsFromRaw('vid', {
      metadata: {
        identifier: 'vid',
        title: 'V',
        description: '',
        creator: '',
        year: '',
      },
      files: [
        {name: 'a.mp4', source: 'original', format: 'h.264'},
        {name: 'a.en.srt', source: 'original', format: 'SubRip'},
        {name: 'b.fr.vtt', source: 'original', format: 'Web Video Text Tracks'},
        {name: 'c.mp3', source: 'original', format: 'MP3', track: 'Soundtrack'},
      ],
    });
    expect(out).toMatchObject({
      identifier: 'vid',
      streamingUrl: 'https://archive.org/download/vid/a.mp4',
      subtitles: [
        {language: 'English', url: 'https://archive.org/download/vid/a.en.srt', format: 'srt'},
        {language: 'French', url: 'https://archive.org/download/vid/b.fr.vtt', format: 'vtt'},
      ],
      audioTracks: [
        {name: 'Soundtrack', url: 'https://archive.org/download/vid/c.mp3', format: 'MP3'},
      ],
    });
  });

  it('returns null on partial-replication (files_count>0 but no video files)', () => {
    expect(
      internetArchiveVideoDetailsFromRaw('partial', {
        metadata: {
          identifier: 'partial',
          title: 'P',
          description: '',
          creator: '',
          year: '',
        },
        files: [],
        files_count: 5, // server claims 5 files but list is empty
      }),
    ).toBeNull();
  });

  it('returns null on undefined input', () => {
    expect(internetArchiveVideoDetailsFromRaw('vid', undefined)).toBeNull();
  });

  it('falls back to the directory URL when no video files are present and no partial-replication', () => {
    const out = internetArchiveVideoDetailsFromRaw('noVideo', {
      metadata: {
        identifier: 'noVideo',
        title: 'NV',
        description: '',
        creator: '',
        year: '',
      },
      files: [{name: 'poster.jpg', source: 'derivative', format: 'JPEG'}],
    });
    expect(out?.streamingUrl).toBe('https://archive.org/download/noVideo/');
  });
});

describe('archiveTracksFromRaw', () => {
  it('builds the ordered audio track list, sorted by track number', () => {
    const tracks = archiveTracksFromRaw('book', {
      metadata: {
        identifier: 'book',
        title: 'B',
        description: '',
        creator: '',
        year: '',
      },
      files: [
        {name: 'c03.mp3', source: 'original', format: 'MP3', track: '3', length: '10:00'},
        {name: 'c01.mp3', source: 'original', format: 'MP3', track: '1', length: '10:00'},
        {name: 'c02.mp3', source: 'original', format: 'MP3', track: '2', length: '10:00'},
      ],
    });
    expect(tracks.map(t => t.trackNumber)).toEqual([1, 2, 3]);
    expect(tracks[0].url).toBe('https://archive.org/download/book/c01.mp3');
    expect(tracks[0].lengthSeconds).toBe(600);
  });

  it('filters out non-audio and sample files', () => {
    const tracks = archiveTracksFromRaw('x', {
      metadata: {
        identifier: 'x',
        title: '',
        description: '',
        creator: '',
        year: '',
      },
      files: [
        {name: 'a.mp3', source: 'original', format: 'MP3'},
        {name: 'b.mp4', source: 'original', format: 'MPEG4'}, // not audio
        {name: 'a_sample.mp3', source: 'original', format: 'MP3'}, // sample — excluded
        {name: 'derivative.mp3', source: 'derivative', format: 'MP3'}, // not original — excluded
      ],
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe('a.mp3');
  });

  it('returns empty on undefined input', () => {
    expect(archiveTracksFromRaw('x', undefined)).toEqual([]);
  });

  it('falls back to array index + 1 when track is missing or non-numeric', () => {
    const tracks = archiveTracksFromRaw('x', {
      metadata: {
        identifier: 'x',
        title: '',
        description: '',
        creator: '',
        year: '',
      },
      files: [
        {name: 'a.mp3', source: 'original', format: 'MP3'},
        {name: 'b.mp3', source: 'original', format: 'MP3', track: 'NaN'},
      ],
    });
    expect(tracks.map(t => t.trackNumber)).toEqual([1, 2]);
  });
});

describe('pure helpers', () => {
  describe('archiveImageUrl', () => {
    it('builds the universal thumbnail URL', () => {
      expect(archiveImageUrl('ItemId')).toBe(
        'https://archive.org/services/img/ItemId',
      );
    });
  });

  describe('archiveIdentifierFromUrl', () => {
    it('extracts the identifier from a details URL', () => {
      expect(archiveIdentifierFromUrl('https://archive.org/details/Foo')).toBe(
        'Foo',
      );
    });

    it('extracts the identifier from a download URL with a file', () => {
      expect(
        archiveIdentifierFromUrl('https://archive.org/download/Foo/track.mp3'),
      ).toBe('track.mp3');
    });

    it('trims trailing slashes', () => {
      expect(archiveIdentifierFromUrl('Foo///')).toBe('Foo');
    });

    it('returns empty string on empty input', () => {
      expect(archiveIdentifierFromUrl('')).toBe('');
    });
  });

  describe('parseRuntime', () => {
    it('parses HH:MM:SS to total seconds', () => {
      expect(parseRuntime('01:30:00')).toBe(5400);
    });

    it('parses bare seconds', () => {
      expect(parseRuntime('90')).toBe(90);
    });

    it('returns 0 on empty string', () => {
      expect(parseRuntime('')).toBe(0);
    });

    it('returns 0 on non-numeric input', () => {
      expect(parseRuntime('not a time')).toBe(0);
    });
  });
});
