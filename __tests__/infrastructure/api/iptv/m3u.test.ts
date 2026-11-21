/**
 * WAVE B13.1 — the M3U parser.
 *
 * The parser is where the old bug died: the app used to read a JSON
 * directory and demand a stream URL from it, and the source has none. The
 * playlist carries the stream URL, the logo, the id and the category in
 * two lines — and these assertions are the rules that make those two
 * lines into a channel.
 *
 * Every rule here was measured against the live index on 2026-11-17:
 * 12,269 entries, 11,558 unique `tvg-id`, 11,543 playable, 0 without a
 * name, 141 without a logo, 15 with a non-http URL.
 */

import {
  parseIPTVM3U,
  cleanIPTVName,
  countryCodeFromIPTVId,
} from '../../../../src/infrastructure/api/iptv/m3u';

const PLAYLIST = [
  '#EXTM3U',
  '#EXTINF:-1 tvg-id="3ABNKids.us@SD" tvg-logo="https://i.imgur.com/z3npqO1.png" group-title="Animation",3ABN Kids (720p)',
  'https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8',
  '#EXTINF:-1 tvg-id="AnimaxAsia.sg@Taiwan" group-title="Animation",Animax Asia Taiwan',
  'https://example.com/animax-taiwan.m3u8',
].join('\n');

describe('iptv m3u — the parser', () => {
  it('reads the id, the logo, the category, the name and the URL', () => {
    const entries = parseIPTVM3U(PLAYLIST);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: '3ABNKids.us@SD',
      name: '3ABN Kids',
      url: 'https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8',
      logo: 'https://i.imgur.com/z3npqO1.png',
      group: 'Animation',
    });
  });

  it('strips the resolution token from the name', () => {
    // 7,591 of the index's display names end in "(720p)" / "(1080p)".
    // The resolution is a property of the STREAM; the channel's name is
    // not "3ABN Kids (720p)".
    expect(cleanIPTVName('3ABN Kids (720p)')).toBe('3ABN Kids');
    expect(cleanIPTVName('Some Channel (1080p)')).toBe('Some Channel');
  });

  it('keeps a geo-block marker — that one tells the user something', () => {
    expect(cleanIPTVName('Animation+ (1080p) [Geo-blocked]')).toBe(
      'Animation+ [Geo-blocked]',
    );
  });

  it('keeps the @feed suffix in the id, so two feeds stay two channels', () => {
    // 11,558 unique `tvg-id` against 10,437 unique ids before `@`.
    const entries = parseIPTVM3U(PLAYLIST);
    expect(entries.map(e => e.id)).toContain('AnimaxAsia.sg@Taiwan');
    expect(entries[1].id).toBe('AnimaxAsia.sg@Taiwan');
  });

  it('drops an entry whose URL cannot be played', () => {
    // The index carries 15 of them: rtmp ×11, mmsh ×2, srt ×1, rtsp ×1.
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A (720p)',
      'rtmp://example.com/live/stream',
    ].join('\n');

    expect(parseIPTVM3U(playlist)).toEqual([]);
  });

  it('drops an entry with no URL line at all', () => {
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A (720p)',
      '#EXTINF:-1 tvg-id="B.us@SD" group-title="News",B',
      'https://example.com/b.m3u8',
    ].join('\n');

    const entries = parseIPTVM3U(playlist);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('B.us@SD');
  });

  it('drops a duplicate tvg-id and keeps the first', () => {
    // The index carries 711 duplicate entries.
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A (720p)',
      'https://example.com/a-first.m3u8',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A (720p)',
      'https://example.com/a-second.m3u8',
    ].join('\n');

    const entries = parseIPTVM3U(playlist);
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://example.com/a-first.m3u8');
  });

  it('drops an entry with no tvg-id', () => {
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 group-title="News",Nameless (720p)',
      'https://example.com/x.m3u8',
    ].join('\n');

    expect(parseIPTVM3U(playlist)).toEqual([]);
  });

  it('takes the whole name after the FIRST comma', () => {
    // A channel's own name may contain a comma.
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",News, Live (720p)',
      'https://example.com/a.m3u8',
    ].join('\n');

    expect(parseIPTVM3U(playlist)[0].name).toBe('News, Live');
  });

  it('copes with an empty playlist', () => {
    expect(parseIPTVM3U('')).toEqual([]);
    expect(parseIPTVM3U('#EXTM3U\n')).toEqual([]);
  });


  it('carries the request headers the playlist declared', () => {
    // Measured on the live index (2026-11-21): 999 `#EXTVLCOPT`
    // directives across 12,396 entries, every one of them a
    // `http-user-agent` or a `http-referrer`. A provider that checks its
    // own User-Agent refuses a stream asked for without one, so these
    // lines are the difference between a channel that plays and one that
    // does not.
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A',
      '#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      '#EXTVLCOPT:http-referrer=https://example.com',
      'https://example.com/a.m3u8',
    ].join('\n');

    const entry = parseIPTVM3U(playlist)[0];
    expect(entry.headers).toEqual({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      Referer: 'https://example.com',
    });
  });

  it('gives an entry with no directives no headers at all', () => {
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A',
      'https://example.com/a.m3u8',
    ].join('\n');

    const entry = parseIPTVM3U(playlist)[0];
    expect(entry.headers).toBeUndefined();
  });

  it('ignores a directive that is not an HTTP request header', () => {
    // The playlist uses `#EXTVLCOPT` for transport settings too, and a
    // proxy is not a header. Forwarding one as a header would put
    // nonsense in front of the provider.
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A',
      '#EXTVLCOPT:http-proxy=http://proxy.example.com:3128',
      'https://example.com/a.m3u8',
    ].join('\n');

    expect(parseIPTVM3U(playlist)[0].headers).toBeUndefined();
  });

  it('keeps everything after the first equals in a directive value', () => {
    const playlist = [
      '#EXTM3U',
      '#EXTINF:-1 tvg-id="A.us@SD" group-title="News",A',
      '#EXTVLCOPT:http-referrer=https://example.com/?a=b&c=d',
      'https://example.com/a.m3u8',
    ].join('\n');

    expect(parseIPTVM3U(playlist)[0].headers).toEqual({
      Referer: 'https://example.com/?a=b&c=d',
    });
  });

  it('reads the country code out of the id', () => {
    expect(countryCodeFromIPTVId('3ABNKids.us@SD')).toBe('us');
    expect(countryCodeFromIPTVId('AnimaxAsia.sg@Taiwan')).toBe('sg');
    // No dot at all — the whole id is the code.
    expect(countryCodeFromIPTVId('nodot')).toBe('nodot');
  });
});
