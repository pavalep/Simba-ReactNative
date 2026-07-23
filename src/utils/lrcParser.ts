// ─── Types ──────────────────────────────────────────────────

export interface LrcLine {
  /** Time in seconds when this lyric should be displayed */
  time: number;
  /** The lyric text */
  text: string;
}

export interface LrcMetadata {
  ti?: string; // title
  ar?: string; // artist
  al?: string; // album
  by?: string; // creator
  offset?: string; // time offset in ms
}

export interface LrcParseResult {
  metadata: LrcMetadata;
  lines: LrcLine[];
}

// ─── Regex ──────────────────────────────────────────────────

/**
 * Matches a timestamp tag: [mm:ss.xx] or [mm:ss.xxx]
 * Captures: minutes, seconds, centiseconds/milliseconds
 */
const TIME_TAG_RE = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/** Matches metadata tags: [tag:value] */
const META_TAG_RE = /^\[([a-z]+):(.+)\]$/i;

// ─── Parser ─────────────────────────────────────────────────

/**
 * Parse an LRC-formatted lyrics string into structured data.
 *
 * Supports:
 * - [mm:ss.xx] and [mm:ss.xxx] timestamp formats
 * - Multiple timestamps per line: [00:01.00][00:15.00]Lyric
 * - Metadata tags: [ti:Title], [ar:Artist], [al:Album], [by:Creator], [offset:±500]
 *
 * @param lrcText Raw LRC file content
 * @returns Parsed lyrics sorted by timestamp
 */
export function parseLrc(lrcText: string): LrcParseResult {
  const lines = lrcText.split('\n');
  const rawMeta: Record<string, string> = {};
  const lyrics: LrcLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for metadata tag
    const metaMatch = line.match(META_TAG_RE);
    if (metaMatch) {
      const [, tag, value] = metaMatch;
      rawMeta[tag.toLowerCase()] = value.trim();
      continue;
    }

    // Extract all timestamps
    const timestamps: number[] = [];
    let timeMatch: RegExpExecArray | null;
    let lastIndex = 0;

    // Reset regex state
    TIME_TAG_RE.lastIndex = 0;

    while ((timeMatch = TIME_TAG_RE.exec(line)) !== null) {
      const minutes = parseInt(timeMatch[1], 10);
      const seconds = parseInt(timeMatch[2], 10);
      let millis = 0;
      if (timeMatch[3]) {
        const frac = timeMatch[3];
        // Handle either .xx (centiseconds) or .xxx (milliseconds)
        millis = frac.length === 2 ? parseInt(frac, 10) * 10 : parseInt(frac, 10);
      }
      timestamps.push(minutes * 60 + seconds + millis / 1000);
      lastIndex = timeMatch.index + timeMatch[0].length;
    }

    if (timestamps.length > 0) {
      // Extract text after the last timestamp tag
      const text = line.slice(lastIndex).trim();

      if (text) {
        // Create a lyric entry for each timestamp
        for (const ts of timestamps) {
          lyrics.push({time: ts, text});
        }
      }
    }
  }

  // Apply global offset if present
  const globalOffset = rawMeta.offset ? parseInt(rawMeta.offset, 10) : 0;
  if (globalOffset !== 0) {
    const offsetSeconds = globalOffset / 1000;
    for (const lyric of lyrics) {
      lyric.time = Math.max(0, lyric.time + offsetSeconds);
    }
  }

  // Sort by time ascending
  lyrics.sort((a, b) => a.time - b.time);

  return {metadata: rawMeta as LrcMetadata, lines: lyrics};
}

/**
 * Get the current lyric line index based on playback position.
 *
 * @param lines Sorted array of LRC lines
 * @param position Current playback position in seconds
 * @returns Index of the current active lyric line, or -1 if none
 */
export function getCurrentLyricIndex(
  lines: LrcLine[],
  position: number,
): number {
  if (lines.length === 0) return -1;

  // Find the last line whose time <= position
  let activeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= position) {
      activeIdx = i;
    } else {
      break;
    }
  }
  return activeIdx;
}

/**
 * Get upcoming lyric lines from a given position.
 *
 * @param lines Sorted array of LRC lines
 * @param position Current playback position in seconds
 * @param count Number of upcoming lines to return
 * @returns Array of upcoming lyric lines
 */
export function getUpcomingLyrics(
  lines: LrcLine[],
  position: number,
  count: number = 5,
): LrcLine[] {
  const currentIdx = getCurrentLyricIndex(lines, position);
  const startIdx = Math.max(0, currentIdx + 1);
  return lines.slice(startIdx, startIdx + count);
}
