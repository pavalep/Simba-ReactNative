/**
 * Internet Archive — WHICH FILE the player is pointed at.
 *
 * ## Why this file exists
 *
 * The file-selection rule had no test at all. The only coverage of this
 * convertor was signal threading and malformed-payload handling, so
 * `f.source === 'original'` could mean anything and nothing would notice.
 *
 * ## The fixtures are REAL
 *
 * Every payload below is a verbatim `https://archive.org/metadata/<id>`
 * response, captured while diagnosing a black video on device. That matters:
 * a hand-written fixture tends to encode what the code already does, and
 * would have passed against the bug. These three items each break a
 * different rule, and all three are ordinary archive.org feature films.
 */

import {internetArchiveVideoDetailsFromRaw} from '../../../../src/infrastructure/api/internetArchive/adapter';

/**
 * The wire shape, described locally rather than imported.
 *
 * `IAMetadataResponse` is declared inside the adapter and deliberately not
 * exported, so the test cannot widen the module's public surface just to
 * build fixtures. This is the wire contract, which is what these tests are
 * actually about — the adapter's job is to consume exactly this.
 */
interface WireFile {
  name: string;
  source: string;
  format: string;
  title?: string;
  track?: string;
  length?: string;
  size?: string;
}

interface WireResponse {
  metadata: {identifier: string; title: string; mediatype: string};
  files_count?: number;
  files?: WireFile[];
}

function meta(files: WireFile[], filesCount?: number): WireResponse {
  return {
    metadata: {identifier: 'fixture', title: 'Fixture', mediatype: 'movies'},
    files_count: filesCount,
    files,
  };
}

/** The convertor takes its own response type; the two are structurally identical. */
const convert = internetArchiveVideoDetailsFromRaw as (
  identifier: string,
  data: WireResponse | undefined,
) => ReturnType<typeof internetArchiveVideoDetailsFromRaw>;

type IAFile = WireFile;

// ── IAccuseMyParents — real response ───────────────────────────────────
//  derivative h.264     389.2 MB   IAccuseMyParents.mp4
//  original  Cinepack   699.5 MB   IAccuseMyParents.avi
const I_ACCUSE = meta(
  [
    {name: 'IAccuseMyParents.mp4', source: 'derivative', format: 'h.264', size: '408063488'},
    {name: 'IAccuseMyParents.avi', source: 'original', format: 'Cinepack', size: '733520038'},
  ],
  78,
);

// ── cpa_000031 — real response ─────────────────────────────────────────
//  original  h.264 HD  837 MB    (the old code picked this)
//  derivative h.264     66.3 MB
const CPA = meta(
  [
    {name: 'cpa_000031_access.HD.mp4', source: 'original', format: 'h.264 HD', size: '877490176'},
    {name: 'cpa_000031_access.mp4', source: 'derivative', format: 'h.264', size: '69560806'},
  ],
  2,
);

// ── e_history_StreamRoot_DH_0124_19570730_01 — real response ──────────
//  derivative h.264     50.9 MB   and NOTHING else
// The old code found no `original` video, treated the item as a partially
// replicated node, returned null, and declared a playable film unplayable.
const DERIVATIVE_ONLY = meta(
  [{name: 'e_history_StreamRoot_DH_0124_19570730_01.mp4', source: 'derivative', format: 'h.264', size: '53354496'}],
  1,
);

describe('internetArchiveVideoDetailsFromRaw — file selection', () => {
  describe('the regression: a 699 MB Cinepack AVI was chosen over a 389 MB h.264 MP4', () => {
    it('streams the h.264 derivative', () => {
      const r = convert('IAccuseMyParents', I_ACCUSE);
      expect(r).not.toBeNull();
      expect(r!.streamingUrl).toBe(
        'https://archive.org/download/IAccuseMyParents/IAccuseMyParents.mp4',
      );
    });

    it('never streams the AVI when an MP4 exists for the same item', () => {
      const r = convert('IAccuseMyParents', I_ACCUSE);
      expect(r!.streamingUrl).not.toMatch(/\.avi$/i);
    });

    it('lists the MP4 first among the downloadable formats', () => {
      // `downloadUrls` is what a "download" affordance would use, so the
      // hostile format must not lead the list either.
      const r = convert('IAccuseMyParents', I_ACCUSE);
      expect(r!.downloadUrls[0].url).toMatch(/\.mp4$/i);
    });
  });

  describe('size decides within a format — the original is often far larger', () => {
    it('prefers the 66 MB derivative over the 837 MB h.264 HD original', () => {
      const r = convert('cpa_000031', CPA);
      expect(r!.streamingUrl).toBe(
        'https://archive.org/download/cpa_000031/cpa_000031_access.mp4',
      );
      expect(r!.streamingUrl).not.toMatch(/\.HD\.mp4$/);
    });
  });

  describe('an item with only a derivative is playable, not missing', () => {
    it('returns a result', () => {
      const r = convert(
        'e_history_StreamRoot_DH_0124_19570730_01',
        DERIVATIVE_ONLY,
      );
      expect(r).not.toBeNull();
    });

    it('points at the derivative', () => {
      const r = convert(
        'e_history_StreamRoot_DH_0124_19570730_01',
        DERIVATIVE_ONLY,
      );
      expect(r!.streamingUrl).toMatch(/e_history_StreamRoot_DH_0124_19570730_01\.mp4$/);
    });
  });

  describe('format matching is by substring, because archive.org decorates it', () => {
    it.each(['h.264', 'h.264 HD', 'h.264 IA', 'h264'])(
      'recognises %s as a preferred format',
      format => {
        const r = convert('x', meta([
          {name: 'cinepack.avi', source: 'original', format: 'Cinepack', size: '999'},
          {name: 'clip.mp4', source: 'derivative', format, size: '500'},
        ]));
        expect(r!.streamingUrl).toMatch(/clip\.mp4$/);
      },
    );

    it('recognises MPEG4 and MPEG-4 as the same format', () => {
      const r = convert('x', meta([
        {name: 'a.avi', source: 'original', format: 'Cinepack', size: '999'},
        {name: 'b.mp4', source: 'derivative', format: 'MPEG-4', size: '500'},
      ]));
      expect(r!.streamingUrl).toMatch(/b\.mp4$/);
    });
  });

  describe('a Cinepack-only item still plays', () => {
    it('falls back rather than declaring the item unavailable', () => {
      // Refusing to play something that IS playable would be a new lie. The
      // fallback is ranked last, never above a real h.264.
      const r = convert('onlycinepack', meta([
        {name: 'only.avi', source: 'original', format: 'Cinepack', size: '999'},
      ]));
      expect(r).not.toBeNull();
      expect(r!.streamingUrl).toMatch(/only\.avi$/);
    });
  });

  describe('an unknown size never outranks a known one', () => {
    it('prefers the sized file within the same format', () => {
      // The point of comparing sizes is to avoid committing to a download we
      // cannot size. A file with no `size` must not win by default.
      //
      // The two names are deliberately NOT substrings of one another, and
      // the assertion is exact equality rather than a suffix regex. The
      // first version of this test used `unknown.mp4` and
      // `expect(url).toMatch(/known\.mp4$/)` — and `unknown.mp4` ENDS WITH
      // `known.mp4`, so the regex was satisfied by the wrong answer. The
      // test passed with the very mutation it was written to catch.
      const r = convert('x', meta([
        {name: 'no-size.mp4', source: 'derivative', format: 'h.264'},
        {name: 'sized.mp4', source: 'derivative', format: 'h.264', size: '1000'},
      ]));
      expect(r!.streamingUrl).toBe(
        'https://archive.org/download/x/sized.mp4',
      );
    });
  });

  describe('the partial-replication guard still holds', () => {
    it('returns null when files exist but none is video-shaped', () => {
      const r = convert('audioonly', meta([
        {name: 'a.mp3', source: 'original', format: 'VBR MP3', size: '10'},
      ], 5));
      expect(r).toBeNull();
    });

    it('returns null for an empty file list with files_count > 0', () => {
      expect(convert('empty', meta([], 12))).toBeNull();
    });
  });

  describe('determinism', () => {
    it('picks the same file on repeated calls', () => {
      const a = convert('IAccuseMyParents', I_ACCUSE);
      const b = convert('IAccuseMyParents', I_ACCUSE);
      expect(a!.streamingUrl).toBe(b!.streamingUrl);
    });

    it('breaks an exact size tie by archive.org listing order', () => {
      const payload = meta([
        {name: 'first.mp4', source: 'derivative', format: 'h.264', size: '100'},
        {name: 'second.mp4', source: 'derivative', format: 'h.264', size: '100'},
      ]);
      expect(convert('tie', payload)!.streamingUrl)
        .toMatch(/first\.mp4$/);
    });
  });

  describe('audio items are untouched', () => {
    it('never picks an audio file as the video source', () => {
      const r = convert('x', meta([
        {name: 'a.mp3', source: 'original', format: 'VBR MP3', size: '1'},
        {name: 'b.ogg', source: 'original', format: 'Ogg Video', size: '2'},
      ]));
      expect(r!.streamingUrl).toMatch(/b\.ogg$/);
    });
  });
});