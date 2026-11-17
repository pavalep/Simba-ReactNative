// ─── The IPTV M3U parser — the wire, and nothing else ─────────────────
//
// WHY THIS FILE EXISTS
// --------------------
// The app used to read `https://iptv-org.github.io/api/channels.json` and
// demand a `url` from it. That file has no `url` — it is a channel
// DIRECTORY (names, owners, countries, categories), and the stream URL
// lives in a different file (`streams.json`). The adapter rejected every
// record, the whole batch failed, and Live TV showed an error card for
// every channel.
//
// The source also publishes the playlists it publishes FOR PLAYERS:
// `https://iptv-org.github.io/iptv/index.category.m3u`. One file, and each
// entry carries the id, the logo, the category and the stream URL:
//
//     #EXTINF:-1 tvg-id="3ABNKids.us@SD" tvg-logo="https://…/z3npqO1.png" group-title="Animation",3ABN Kids (720p)
//     https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8
//
// Measured over the whole index (2026-11-17): 12,269 entries, 11,558
// unique `tvg-id`, 11,543 with a playable http(s) URL, 0 without a name,
// 141 without a logo.
//
// THE THREE RULES THE MEASUREMENTS FORCE
// --------------------------------------
// 1. THE `@feed` SUFFIX STAYS IN THE ID. 11,558 unique `tvg-id` against
//    10,437 unique ids before `@` — two feeds of one channel are two
//    playable entries (`AnimaxAsia.sg@India`, `AnimaxAsia.sg@Taiwan`).
//    Dropping the suffix would merge two different streams into one.
//
// 2. THE GROUP-TITLE IS THE CATEGORY ID, IN A DIFFERENT CASE. The index
//    writes `group-title="Animation"`; `categories.json` calls it
//    `animation`. The match is case-insensitive. The one group-title with
//    no category is `Undefined` (1,558 rows) — a channel with no category,
//    not a category called "Undefined".
//
// 3. THE RESOLUTION TOKEN IS NOT THE CHANNEL'S NAME. 7,591 of the display
//    names end in `(720p)` / `(1080p)` and some carry `[Geo-blocked]`
//    after it. The resolution is a property of the STREAM, not of the
//    channel, and the row has nowhere to show it — so it is stripped and
//    the geo-block marker is kept, because that one tells the user
//    something they need.

/** One parsed playlist entry. */
export interface IPTVM3UEntry {
  /** The `tvg-id`, feed suffix included — `3ABNKids.us@SD`. */
  id: string;
  /** The display name, with the resolution token removed. */
  name: string;
  /** The stream URL. */
  url: string;
  /** The `tvg-logo`, or '' when the entry carries none. */
  logo: string;
  /** The `group-title` — the category id, or 'Undefined'. */
  group: string;
}

/** The attribute pattern every M3U entry uses: `key="value"`. */
const ATTRIBUTE_PATTERN = /([a-zA-Z0-9-]+)="([^"]*)"/g;

/**
 * The resolution token — `(720p)`, `(1080p)`, `(480p)`.
 *
 * It is removed wherever it appears, because the source puts it in the
 * middle of a name too ("Animation+ (1080p) [Geo-blocked]").
 */
const RESOLUTION_PATTERN = /\s*\(\d{3,4}p\)/g;

/** Only an http(s) URL can be played by the app's player. */
const PLAYABLE_URL = /^https?:\/\//i;

/**
 * The country code of a channel, read from its id.
 *
 * `3ABNKids.us@SD` → `us`. The code is the last dot-separated segment
 * before the `@feed` suffix. 181 distinct codes appear in the index, and
 * all 181 are present in `countries.json`.
 */
export function countryCodeFromIPTVId(id: string): string {
  const base = id.split('@')[0] ?? '';
  const segments = base.split('.');
  const last = segments[segments.length - 1] ?? '';
  return last.toLowerCase();
}

/**
 * The channel's name, without the resolution token.
 *
 * The index carries no `tvg-name` (measured: 0 of 12,269 entries), so the
 * text after the first comma is the only name there is.
 */
export function cleanIPTVName(name: string): string {
  return name.replace(RESOLUTION_PATTERN, '').trim();
}

/**
 * Parse an M3U playlist into its entries.
 *
 * Pure: the same text always gives the same entries. The rules it
 * enforces (measured against the live index):
 *
 *   - an entry needs a `tvg-id`, a name and a playable http(s) URL;
 *   - the URL is the next non-comment line after the `#EXTINF` line, and
 *     the search stops at the next `#EXTINF` — an entry with no URL of
 *     its own does not borrow the next channel's stream;
 *   - a duplicate `tvg-id` is dropped (the first one wins) — the index
 *     carries 711 of them;
 *   - the display name is everything after the FIRST comma (a name may
 *     itself contain commas).
 */
export function parseIPTVM3U(text: string): IPTVM3UEntry[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const entries: IPTVM3UEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('#EXTINF')) continue;

    const attributes: Record<string, string> = {};
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ATTRIBUTE_PATTERN.exec(line)) !== null) {
      attributes[match[1]] = match[2];
    }

    const id = (attributes['tvg-id'] ?? '').trim();
    if (!id || seen.has(id)) continue;

    // The display name is everything after the first comma. A name may
    // contain commas of its own, so the first one is the separator.
    const commaAt = line.indexOf(',');
    if (commaAt < 0) continue;
    const name = cleanIPTVName(line.slice(commaAt + 1));
    if (!name) continue;

    // The URL is the next line that is neither empty nor a comment — and
    // the search must NOT cross into the NEXT entry: a `#EXTINF` line
    // ends this entry, so an entry with no URL of its own has no URL
    // (it does not borrow the next channel's stream).
    let url = '';
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j].trim();
      if (!candidate) continue;
      if (candidate.startsWith('#EXTINF')) break;
      if (candidate.startsWith('#')) continue;
      url = candidate;
      break;
    }
    if (!PLAYABLE_URL.test(url)) continue;

    seen.add(id);
    entries.push({
      id,
      name,
      url,
      logo: (attributes['tvg-logo'] ?? '').trim(),
      group: (attributes['group-title'] ?? '').trim(),
    });
  }

  return entries;
}
