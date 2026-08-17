// ─── Internet Archive Audio Service ────────────────────────────────────
// Fetches public-domain audio items (old-time radio, concerts, speeches,
// music, podcasts) from the Internet Archive.
//
// Provides direct streaming URLs playable in libmpv.
// No authentication required.
//
// See https://archive.org/developers/internet-archive-audio-api.html

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
  InternetArchiveSubtitleFile,
  InternetArchiveAudioTrack,
  ApiSearchOptions,
  ArchiveTrack,
  PaginatedResult,
} from '../../types/api';

// ─── Raw API response types ───────────────────────────────────────────

interface IAResultRaw {
  identifier: string;
  title: string;
  description: string;
  creator: string;
  year: string;
  runtime: string;
  avg_rating: number;
  download_count: number;
  image_url: string;
}

interface IASearchResponse {
  response: {
    docs: IAResultRaw[];
    numFound: number;
  };
}

interface IAMetadataResponse {
  metadata: {
    identifier: string;
    title: string;
    description: string;
    creator: string;
    year: string;
    /**
     * V6 2.3.2: Internet Archive mediatype (e.g. "movies", "audio",
     * "texts"). Lets us refuse to hand non-movie items to the player.
     */
    mediatype?: string;
  };
  /**
   * V6 2.3.2: total file count from the IA metadata response. Used
   * to detect partial-replication responses where `files` is empty
   * but `files_count > 0` — those servers should be retried.
   */
  files_count?: number;
  files: {
    name: string;
    source: string;
    format: string;
    title?: string;
    track?: string;
    length?: string;
  }[];
}

// ─── Mappers ──────────────────────────────────────────────────────────

function mapItem(raw: IAResultRaw): InternetArchiveItemResult {
  return {
    identifier: raw.identifier,
    title: raw.title,
    description: raw.description || '',
    creator: raw.creator || '',
    year: raw.year || '',
    runtime: raw.runtime || '',
    avgRating: raw.avg_rating || 0,
    downloadCount: raw.download_count || 0,
    imageUrl: raw.image_url || `https://archive.org/services/img/${raw.identifier}`,
    streamingUrl: `https://archive.org/download/${raw.identifier}/`,
    downloadUrls: [],
  };
}

// ─── Public API functions ─────────────────────────────────────────────

/** Standard cover-image URL for an item identifier. */
export function archiveImageUrl(identifier: string): string {
  return `https://archive.org/services/img/${identifier}`;
}

/** Extract the IA item identifier from a url_iarchive / details URL. */
export function archiveIdentifierFromUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
}

/** True when an IA file format is an audio container we can stream. */
function isAudioFormat(format: string): boolean {
  const f = format.toLowerCase();
  return f.includes('mp3') || f.includes('ogg') || f.includes('flac');
}

/**
 * Ordered audio track list for an item (P37 — powers both audiobook
 * chapters from LibriVox items and archive audio item tracks).
 */
export async function getArchiveTracks(
  identifier: string,
): Promise<ArchiveTrack[]> {
  const data = await apiFetch<IAMetadataResponse>({
    config: API_CONFIG.internetArchive,
    path: `/metadata/${identifier}`,
    cacheTtlMs: 600_000,
  });

  const files = data.files ?? [];
  return files
    .filter(
      f =>
        f.source === 'original' &&
        isAudioFormat(f.format) &&
        !f.name.toLowerCase().includes('_sample'),
    )
    .map((f, i) => {
      const trackNum = parseInt(f.track ?? '', 10);
      return {
        name: f.name,
        title: f.title || f.name.replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' '),
        url: `https://archive.org/download/${identifier}/${f.name}`,
        lengthSeconds: parseRuntime(f.length ?? ''),
        format: f.format,
        trackNumber: isNaN(trackNum) ? i + 1 : trackNum,
      };
    })
    .sort((a, b) => a.trackNumber - b.trackNumber);
}

/** Search audio items on the Internet Archive. */
export async function searchInternetArchiveAudio(
  query: string,
  options?: ApiSearchOptions,
): Promise<PaginatedResult<InternetArchiveItemResult>> {
  const q = `(${query}) AND mediatype:(audio)`;
  const data = await apiFetch<IASearchResponse>({
    config: API_CONFIG.internetArchive,
    path: '/advancedsearch.php',
    params: {
      q,
      'fl[]': 'identifier,title,description,creator,year,runtime,avg_rating,download_count',
      rows: options?.limit ?? 10,
      page: options?.page ?? 1,
      output: 'json',
    },
    cacheTtlMs: 900_000, // 15 min — IA advancedsearch is slow; raise TTL
  });
  const docs = data.response?.docs ?? [];
  return {items: docs.map(mapItem), numFound: data.response?.numFound ?? docs.length};
}

/** Search music (non-speaking) on the Internet Archive. */
export async function searchInternetArchiveMusic(
  query: string,
  options?: ApiSearchOptions,
): Promise<PaginatedResult<InternetArchiveItemResult>> {
  const q = `(${query}) AND mediatype:(audio) AND collection:(etree OR opensource_audio OR netlabels)`;
  const data = await apiFetch<IASearchResponse>({
    config: API_CONFIG.internetArchive,
    path: '/advancedsearch.php',
    params: {
      q,
      'fl[]': 'identifier,title,description,creator,year,runtime,avg_rating,download_count',
      rows: options?.limit ?? 10,
      page: options?.page ?? 1,
      output: 'json',
    },
    cacheTtlMs: 300_000,
  });
  const docs = data.response?.docs ?? [];
  return {items: docs.map(mapItem), numFound: data.response?.numFound ?? docs.length};
}

/** Get full item details including download URLs for all formats. */
export async function getInternetArchiveItemDetails(
  identifier: string,
): Promise<InternetArchiveItemResult | null> {
  try {
    const data = await apiFetch<IAMetadataResponse>({
      config: API_CONFIG.internetArchive,
      path: `/metadata/${identifier}`,
      cacheTtlMs: 600_000,
    });

    const md = data.metadata;
    const audioFiles = (data.files ?? []).filter(
      f => f.source === 'original' && (f.format === 'MP3' || f.format === 'OGG' || f.format === 'VBR MP3'),
    );

    return {
      identifier: md.identifier,
      title: md.title,
      description: md.description || '',
      creator: md.creator || '',
      year: md.year || '',
      runtime: audioFiles.find(f => f.length)?.length || '',
      avgRating: 0,
      downloadCount: 0,
      imageUrl: `https://archive.org/services/img/${md.identifier}`,
      streamingUrl: `https://archive.org/download/${md.identifier}/${audioFiles[0]?.name || ''}`,
      downloadUrls: audioFiles.map(f => ({
        format: f.format,
        url: `https://archive.org/download/${md.identifier}/${f.name}`,
      })),
    };
  } catch {
    return null;
  }
}

// ─── Video / Movie functions ───────────────────────────────────────────

/** Parse runtime string ("HH:MM:SS" or seconds) into total seconds. */
function parseRuntime(runtime: string): number {
  if (!runtime) {return 0;}
  const parts = runtime.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0], 10) * 3600
         + parseInt(parts[1], 10) * 60
         + parseInt(parts[2], 10);
  }
  const secs = parseInt(runtime, 10);
  return isNaN(secs) ? 0 : secs;
}

/** Map raw search result to InternetArchiveVideoResult (no details yet). */
function mapVideoItem(raw: IAVideoResultRaw): InternetArchiveVideoResult {
  return {
    identifier: raw.identifier,
    title: raw.title,
    description: raw.description || '',
    creator: raw.creator || '',
    year: raw.year || '',
    duration: parseRuntime(raw.runtime),
    avgRating: raw.avg_rating || 0,
    downloadCount: raw.download_count || 0,
    // V6 2.3.2: thumbnail URL — `https://archive.org/services/img/{id}`.
    // This is the IA's universal thumbnail redirect:
    //   - Returns 200 image/jpeg for every item we tested (10/10 in the
    //     silent_films sample, plus the Three Ages item).
    //   - Serves the IA's curated thumbnail when present.
    //   - Falls back to the IA logo when no item thumbnail exists.
    //   - No metadata fetch needed — works directly from the search
    //     response, so the list shows thumbnails with zero extra API
    //     calls.
    // The per-frame pattern `…/{id}.thumbs/{stem}_000114.jpg` is the
    // higher-quality option but requires the `{stem}` (video file
    // name) which the search API doesn't expose — using it would
    // require a metadata fetch per item. We prefer cheap-and-correct
    // over rich-and-slow here.
    imageUrl: `https://archive.org/services/img/${raw.identifier}`,
    streamingUrl: `https://archive.org/download/${raw.identifier}/`,
    subtitles: [],
    audioTracks: [],
    downloadUrls: [],
  };
}

/** Extract human-readable language from a subtitle filename. */
function extractSubtitleLanguage(filename: string): string {
  const match = filename.match(/\.([a-z]{2,3})\.(srt|vtt)$/i);
  if (match) {
    const code = match[1].toLowerCase();
    const langMap: Record<string, string> = {
      en: 'English', eng: 'English',
      es: 'Spanish', spa: 'Spanish',
      fr: 'French', fre: 'French',
      de: 'German', ger: 'German',
      it: 'Italian', ita: 'Italian',
      pt: 'Portuguese', por: 'Portuguese',
      ru: 'Russian', rus: 'Russian',
      ja: 'Japanese', jpn: 'Japanese',
      zh: 'Chinese', chi: 'Chinese',
      ar: 'Arabic', ara: 'Arabic',
      nl: 'Dutch', dut: 'Dutch',
      pl: 'Polish', pol: 'Polish',
      sv: 'Swedish', swe: 'Swedish',
      da: 'Danish', dan: 'Danish',
      fi: 'Finnish', fin: 'Finnish',
      no: 'Norwegian', nor: 'Norwegian',
      cs: 'Czech', cze: 'Czech',
      hu: 'Hungarian', hun: 'Hungarian',
      ro: 'Romanian', rum: 'Romanian',
      tr: 'Turkish', tur: 'Turkish',
      ko: 'Korean', kor: 'Korean',
      hi: 'Hindi',
      bn: 'Bengali',
      th: 'Thai',
      vi: 'Vietnamese',
    };
    return langMap[code] || code.toUpperCase();
  }
  return 'Unknown';
}

// ─── Raw search response for video ─────────────────────────────────────

interface IAVideoResultRaw {
  identifier: string;
  title: string;
  description: string;
  creator: string;
  year: string;
  runtime: string;
  avg_rating: number;
  download_count: number;
  image_url: string;
}

interface IAVideoSearchResponse {
  response: {
    docs: IAVideoResultRaw[];
    numFound: number;
  };
}

// ─── Public video API functions ────────────────────────────────────────

/**
 * Search video/movie items on the Internet Archive.
 * Uses `mediatype:(movies)` filter for movies, old films, documentaries etc.
 * No authentication required.
 */
export async function searchInternetArchiveVideos(
  query: string,
  options?: ApiSearchOptions,
): Promise<PaginatedResult<InternetArchiveVideoResult>> {
  const q = `(${query}) AND mediatype:(movies)`;
  const data = await apiFetch<IAVideoSearchResponse>({
    config: API_CONFIG.internetArchive,
    path: '/advancedsearch.php',
    params: {
      q,
      // No `image_url` field — the search API returns it empty for
      // almost every item, and the universal thumbnail URL
      // (`services/img/{id}`) is constructed from the identifier in
      // the mapper. Listing the field here just wastes bandwidth.
      'fl[]': 'identifier,title,description,creator,year,runtime,avg_rating,download_count',
      rows: options?.limit ?? 10,
      page: options?.page ?? 1,
      output: 'json',
      // Optional IA sort (e.g. "downloads desc" for the All tab so
      // popular movies surface instead of relevance-ranked noise).
      ...(options?.sort ? {'sort[]': options.sort} : {}),
    },
    cacheTtlMs: 300_000,
  });
  const docs = data.response?.docs ?? [];
  return {items: docs.map(mapVideoItem), numFound: data.response?.numFound ?? docs.length};
}

/**
 * Get full video item details including subtitles, audio tracks,
 * and direct streaming/download URLs.
 */
export async function getInternetArchiveVideoDetails(
  identifier: string,
): Promise<InternetArchiveVideoResult | null> {
  return resolveInternetArchiveVideoDetails(identifier);
}

/**
 * V6 2.3.2: Resolve a playable Internet Archive video URL with retry.
 *
 * The Internet Archive's metadata API is hosted on a CDN cluster
 * (`d1`, `d2`, `workable_servers[]`). On a cold call, the first server
 * we hit may return a partial response — `files_count > 0` but the
 * `files` array is empty because the cluster hasn't replicated yet.
 * The user's symptom was: "first tap → No Video File error, after
 * reload → loads fine". The retry walks the API until we either get
 * a real video file or exhaust the attempts.
 *
 * @param identifier  Internet Archive item identifier (e.g. "TheAdventurer")
 * @param onRetry     Optional callback fired before each retry attempt
 *                    after the first. Lets the caller show a toast like
 *                    "Trying alternate server… (attempt 2/3)".
 * @param maxAttempts Total attempts including the first. Default 3.
 */
export async function resolveInternetArchiveVideoDetails(
  identifier: string,
  onRetry?: (attempt: number, maxAttempts: number) => void,
  maxAttempts: number = 3,
): Promise<InternetArchiveVideoResult | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 && onRetry) {
      onRetry(attempt, maxAttempts);
    }
    const result = await getInternetArchiveVideoDetailsOnce(identifier, attempt);
    if (result) {
      return result;
    }
    // Result is null either because the API failed entirely, or because
    // the response had files_count>0 but no video-shaped files (the
    // partial-replication case). Either way, retrying usually picks up
    // a healthier server.
    if (attempt < maxAttempts) {
      // 250ms / 500ms / 1000ms backoff — short enough to feel snappy,
      // long enough that the CDN picks a different node on the next try.
      await new Promise<void>(r => setTimeout(r, 250 * attempt));
    }
  }
  return null;
}

/**
 * Single-attempt version of the metadata fetch. Returns null on either
 * network failure OR partial-replication failure (server claims files
 * exist but returned an empty list). Callers that don't want retries
 * can use this directly.
 */
async function getInternetArchiveVideoDetailsOnce(
  identifier: string,
  attempt: number,
): Promise<InternetArchiveVideoResult | null> {
  try {
    const data = await apiFetch<IAMetadataResponse>({
      config: API_CONFIG.internetArchive,
      path: `/metadata/${identifier}`,
      // Bypass the cache on retries so we actually hit a different server
      // instead of getting the same broken response back. The first
      // attempt CAN use the cache (cacheTtlMs > 0) to benefit from a
      // healthy response that was stored within the last 10 minutes.
      cacheTtlMs: attempt === 1 ? 600_000 : 0,
    });

    const md = data.metadata;
    const files = data.files ?? [];

    // Primary video file — prefer h.264 MP4 (broadest device support),
    // then MPEG4, then anything else video-shaped. Without this broad
    // filter, items whose only video file is Matroska / Ogg Theora /
    // WebM fall through to the directory URL and the player shows
    // "File Not Found".
    const VIDEO_FORMATS = [
      'h.264',
      'h264',
      'MPEG4',
      'MPEG-4',
      'Matroska',
      'WebM',
      'Ogg Theora',
      'Ogg Video',
      'Cinepack',
      'AVI',
    ];
    const videoFiles = files.filter(
      f => f.source === 'original' && VIDEO_FORMATS.includes(f.format),
    );
    // Prefer h.264 → MPEG4 → anything video-shaped
    const primaryVideo =
      videoFiles.find(f => f.format === 'h.264' || f.format === 'h264') ||
      videoFiles.find(f => f.format === 'MPEG4' || f.format === 'MPEG-4') ||
      videoFiles.find(f => f.format === 'Matroska') ||
      videoFiles.find(f => f.format === 'WebM') ||
      videoFiles[0] ||
      null;

    // Subtitle files (.srt / .vtt)
    const subtitles: InternetArchiveSubtitleFile[] = files
      .filter(f => {
        const name = f.name.toLowerCase();
        return name.endsWith('.srt') || name.endsWith('.vtt');
      })
      .map(f => ({
        language: extractSubtitleLanguage(f.name),
        url: `https://archive.org/download/${identifier}/${f.name}`,
        format: f.name.toLowerCase().endsWith('.vtt') ? 'vtt' as const : 'srt' as const,
      }));

    // Alternate audio tracks (MP3 / OGG separate from the video)
    const audioTracks: InternetArchiveAudioTrack[] = files
      .filter(f =>
        f.source === 'original'
        && (f.format === 'MP3' || f.format === 'OGG')
        && !f.name.toLowerCase().includes('_sample'),
      )
      .map(f => ({
        name: f.track || f.name,
        url: `https://archive.org/download/${identifier}/${f.name}`,
        format: f.format,
      }));

    // V6 2.3.2: detect partial-replication failure. The IA metadata
    // response includes `files_count` even when the files array is
    // empty (the server hasn't replicated the file list yet). If we
    // see files_count > 0 but found zero video files, this server
    // doesn't have the answer — return null so the retry helper
    // tries a different CDN node.
    if ((data.files_count ?? 0) > 0 && videoFiles.length === 0) {
      return null;
    }

    return {
      identifier: md.identifier,
      title: md.title,
      description: md.description || '',
      creator: md.creator || '',
      year: md.year || '',
      duration: 0,
      avgRating: 0,
      downloadCount: 0,
      imageUrl: `https://archive.org/services/img/${md.identifier}`,
      streamingUrl: primaryVideo
        ? `https://archive.org/download/${identifier}/${primaryVideo.name}`
        : `https://archive.org/download/${identifier}/`,
      subtitles,
      audioTracks,
      downloadUrls: videoFiles.map(f => ({
        format: f.format,
        url: `https://archive.org/download/${identifier}/${f.name}`,
      })),
    };
  } catch {
    return null;
  }
}
