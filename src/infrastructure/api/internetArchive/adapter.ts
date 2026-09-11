// ─── Internet Archive Adapter ──────────────────────────────────────────
// V18.5.1: the V18-ideal rewrite of `internetArchiveService.ts`.
//
// Architecture (per V18 type contract §2):
//   - File-local *Raw DTOs (the wire shape from IA's API)
//   - EXPORTED named convertors (pure, testable in isolation)
//   - Service functions return `Promise<DomainType>`
//   - Domain types are imported from `src/types/api.ts` (re-exported
//     downstream by the adapter consumers)
//
// Junior-dev rule: 1 import per consumer.
//   Before: `import {searchAudio, getItemDetails, getTracks, ...} from '.../internetArchiveService'`
//   After:  `import {searchInternetArchiveAudio, getInternetArchiveItemDetails, getArchiveTracks, ...} from '.../internetArchiveAdapter'`
//   (Same function names — only the source file changes.)
//
// Public surface preserved 1:1 with the old service so the
// consumer migration is a search-and-replace, not a rewrite:
//   - searchInternetArchiveAudio / searchInternetArchiveMusic
//   - getInternetArchiveItemDetails
//   - getArchiveTracks
//   - searchInternetArchiveVideos
//   - getInternetArchiveVideoDetails
//   - resolveInternetArchiveVideoDetails
//   - archiveImageUrl / archiveIdentifierFromUrl (pure helpers)

import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
  InternetArchiveSubtitleFile,
  InternetArchiveAudioTrack,
  ApiSearchOptions,
  ArchiveTrack,
  PaginatedResult,
} from '../../../types/api';

// ─── Raw wire types (file-local per V18 type contract §2) ──────────────

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
  response?: {
    docs?: IAResultRaw[];
    numFound?: number;
  };
}

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
  response?: {
    docs?: IAVideoResultRaw[];
    numFound?: number;
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
  files?: {
    name: string;
    source: string;
    format: string;
    title?: string;
    track?: string;
    length?: string;
  }[];
}

// ─── Pure helpers (file-local; not exported) ───────────────────────────

/** True when an IA file format is an audio container we can stream. */
function isAudioFormat(format: string): boolean {
  const f = format.toLowerCase();
  return f.includes('mp3') || f.includes('ogg') || f.includes('flac');
}

/** Parse runtime string ("HH:MM:SS" / "MM:SS" / bare seconds) into total seconds. */
export function parseRuntime(runtime: string): number {
  if (!runtime) return 0;
  const parts = runtime.split(':');
  if (parts.length === 3) {
    return (
      parseInt(parts[0], 10) * 3600 +
      parseInt(parts[1], 10) * 60 +
      parseInt(parts[2], 10)
    );
  }
  if (parts.length === 2) {
    // MM:SS — common for IA audio files (e.g. "10:00" = 10 minutes).
    // The original parser treated this as bare seconds, silently
    // misreading audiobook chapters as 10-second clips. Fix per
    // V18.5.2: the test "builds the ordered audio track list,
    // sorted by track number" relies on this returning 600.
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  const secs = parseInt(runtime, 10);
  return isNaN(secs) ? 0 : secs;
}

/** Subtitle language from a filename. */
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

/** Ordered list of video formats we can stream (broadest device support first). */
const VIDEO_FORMATS: readonly string[] = [
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

/** Build the universal thumbnail URL for an item identifier. */
function imageUrlFor(identifier: string): string {
  return `https://archive.org/services/img/${identifier}`;
}

/** Build the directory URL for an item (used when no specific file is selected). */
function directoryUrlFor(identifier: string): string {
  return `https://archive.org/download/${identifier}/`;
}

/** Build the per-file URL for an item. */
function fileUrlFor(identifier: string, name: string): string {
  return `https://archive.org/download/${identifier}/${name}`;
}

// ─── Convertors (exported, pure, named per contract §2) ────────────────

/**
 * Single audio/music search result → domain.
 *
 * V21 W6 P21c: a malformed record (missing required `identifier`)
 * throws `AdapterParseError`. Pre-W22 returned `null` and the
 * caller silently filtered it — the user saw fewer results than
 * the API returned, with no diagnostic.
 */
export const internetArchiveItemResultFromRaw = (
  raw: unknown,
  path: string = 'doc',
): InternetArchiveItemResult => {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'internetArchive',
      path,
      'expected doc object',
    );
  }
  const r = raw as Partial<IAResultRaw>;
  if (typeof r.identifier !== 'string' || r.identifier.length === 0) {
    throw new AdapterParseError(
      'internetArchive',
      `${path}.identifier`,
      'expected non-empty string',
    );
  }
  return {
    identifier: r.identifier,
    title: r.title || '',
    description: r.description || '',
    creator: r.creator || '',
    year: r.year || '',
    runtime: r.runtime || '',
    avgRating: r.avg_rating || 0,
    downloadCount: r.download_count || 0,
    imageUrl: r.image_url || imageUrlFor(r.identifier),
    streamingUrl: directoryUrlFor(r.identifier),
    downloadUrls: [],
  };
};

/**
 * Audio/music search response → paginated result.
 *
 * V21 W6 P21c: `unknown` input + per-item validation. Missing
 * `response` is a valid "no results" envelope; malformed per-item
 * shapes throw `AdapterParseError` (the whole batch is rejected).
 */
export const internetArchiveItemResultsFromRaw = (
  raw: unknown,
): PaginatedResult<InternetArchiveItemResult> => {
  if (raw === undefined || raw === null) return {items: [], numFound: 0};
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'internetArchive',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<IASearchResponse>;
  if (e.response === undefined) return {items: [], numFound: 0};
  const docs = e.response.docs ?? [];
  return {
    items: docs.map((d, i) => internetArchiveItemResultFromRaw(d, `docs[${i}]`)),
    numFound: e.response.numFound ?? docs.length,
  };
};

/**
 * Audio item metadata response → fully-resolved domain item (with download URLs).
 *
 * V21 W6 P21c: a missing `metadata` block returns `null` (legitimate
 * "item not found"); a malformed inner identifier throws
 * `AdapterParseError`. The wire-shape check distinguishes "server
 * says no such item" (silent null) from "server returned garbage"
 * (propagated error).
 */
export const internetArchiveItemDetailsFromRaw = (
  identifier: string,
  data: unknown,
): InternetArchiveItemResult | null => {
  if (data === undefined || data === null) return null;
  if (typeof data !== 'object') {
    throw new AdapterParseError(
      'internetArchive',
      'envelope',
      'expected object envelope',
    );
  }
  const e = data as Partial<IAMetadataResponse>;
  if (!e.metadata) return null;
  const md = e.metadata;
  if (typeof md.identifier !== 'string' || md.identifier.length === 0) {
    throw new AdapterParseError(
      'internetArchive',
      'metadata.identifier',
      'expected non-empty string',
    );
  }
  const audioFiles = (e.files ?? []).filter(
    f =>
      f.source === 'original' &&
      (f.format === 'MP3' || f.format === 'OGG' || f.format === 'VBR MP3'),
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
    imageUrl: imageUrlFor(md.identifier),
    streamingUrl: audioFiles[0]?.name
      ? fileUrlFor(md.identifier, audioFiles[0].name)
      : directoryUrlFor(md.identifier),
    downloadUrls: audioFiles.map(f => ({
      format: f.format,
      url: fileUrlFor(md.identifier, f.name),
    })),
  };
};

/**
 * Single video search result → domain.
 *
 * V21 W6 P21c: a malformed record (missing required `identifier`)
 * throws `AdapterParseError`. Pre-W22 returned `null`.
 */
export const internetArchiveVideoResultFromRaw = (
  raw: unknown,
  path: string = 'doc',
): InternetArchiveVideoResult => {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'internetArchive',
      path,
      'expected doc object',
    );
  }
  const r = raw as Partial<IAVideoResultRaw>;
  if (typeof r.identifier !== 'string' || r.identifier.length === 0) {
    throw new AdapterParseError(
      'internetArchive',
      `${path}.identifier`,
      'expected non-empty string',
    );
  }
  return {
    identifier: r.identifier,
    title: r.title || '',
    description: r.description || '',
    creator: r.creator || '',
    year: r.year || '',
    duration: parseRuntime(r.runtime ?? ''),
    avgRating: r.avg_rating || 0,
    downloadCount: r.download_count || 0,
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
    imageUrl: imageUrlFor(r.identifier),
    streamingUrl: directoryUrlFor(r.identifier),
    subtitles: [],
    audioTracks: [],
    downloadUrls: [],
  };
};

/**
 * Video search response → paginated result.
 *
 * V21 W6 P21c: `unknown` input + per-item validation. Same shape
 * as the audio variant.
 */
export const internetArchiveVideoResultsFromRaw = (
  raw: unknown,
): PaginatedResult<InternetArchiveVideoResult> => {
  if (raw === undefined || raw === null) return {items: [], numFound: 0};
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'internetArchive',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<IAVideoSearchResponse>;
  if (e.response === undefined) return {items: [], numFound: 0};
  const docs = e.response.docs ?? [];
  return {
    items: docs.map((d, i) => internetArchiveVideoResultFromRaw(d, `docs[${i}]`)),
    numFound: e.response.numFound ?? docs.length,
  };
};

/**
 * Video metadata response → fully-resolved domain video (with subtitles,
 * audio tracks, download URLs). Returns `null` on partial-replication
 * failure (`files_count > 0` but no video-shaped files); the retry
 * helper translates that to a re-attempt on a different CDN node.
 */
export const internetArchiveVideoDetailsFromRaw = (
  identifier: string,
  data: IAMetadataResponse | undefined,
): InternetArchiveVideoResult | null => {
  if (!data?.metadata) return null;
  const md = data.metadata;
  const files = data.files ?? [];

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

  const subtitles: InternetArchiveSubtitleFile[] = files
    .filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.srt') || name.endsWith('.vtt');
    })
    .map(f => ({
      language: extractSubtitleLanguage(f.name),
      url: fileUrlFor(identifier, f.name),
      format: f.name.toLowerCase().endsWith('.vtt') ? ('vtt' as const) : ('srt' as const),
    }));

  const audioTracks: InternetArchiveAudioTrack[] = files
    .filter(
      f =>
        f.source === 'original' &&
        (f.format === 'MP3' || f.format === 'OGG') &&
        !f.name.toLowerCase().includes('_sample'),
    )
    .map(f => ({
      name: f.track || f.name,
      url: fileUrlFor(identifier, f.name),
      format: f.format,
    }));

  // Partial-replication: server claims files exist but the file list is
  // empty (CDN hasn't replicated yet). Return null so the retry helper
  // tries a different node.
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
    imageUrl: imageUrlFor(md.identifier),
    streamingUrl: primaryVideo
      ? fileUrlFor(identifier, primaryVideo.name)
      : directoryUrlFor(identifier),
    subtitles,
    audioTracks,
    downloadUrls: videoFiles.map(f => ({
      format: f.format,
      url: fileUrlFor(identifier, f.name),
    })),
  };
};

/** Item metadata response → ordered audio track list. Empty on undefined. */
export const archiveTracksFromRaw = (
  identifier: string,
  data: IAMetadataResponse | undefined,
): ArchiveTrack[] => {
  if (!data) return [];
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
        url: fileUrlFor(identifier, f.name),
        lengthSeconds: parseRuntime(f.length ?? ''),
        format: f.format,
        trackNumber: isNaN(trackNum) ? i + 1 : trackNum,
      };
    })
    .sort((a, b) => a.trackNumber - b.trackNumber);
};

// ─── Pure URL helpers (exported for direct use by the UI) ──────────────

/** Standard cover-image URL for an item identifier. */
export const archiveImageUrl = (identifier: string): string =>
  imageUrlFor(identifier);

/** Extract the IA item identifier from a url_iarchive / details URL. */
export const archiveIdentifierFromUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
};

// ─── Service functions (return Promise<DomainType> per contract §2.3) ──

/** Search audio items on the Internet Archive. */
export async function searchInternetArchiveAudio(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<PaginatedResult<InternetArchiveItemResult>> {
  const q = `(${query}) AND mediatype:(audio)`;
  const raw = await apiFetch<IASearchResponse>({
    config: API_CONFIG.internetArchive,
    path: '/advancedsearch.php',
    params: {
      q,
      'fl[]': 'identifier,title,description,creator,year,runtime,avg_rating,download_count',
      rows: options?.limit ?? 10,
      page: options?.page ?? 1,
      output: 'json',
    },
    signal,
  });
  return internetArchiveItemResultsFromRaw(raw);
}

/** Search music (non-speaking) on the Internet Archive. */
export async function searchInternetArchiveMusic(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<PaginatedResult<InternetArchiveItemResult>> {
  const q = `(${query}) AND mediatype:(audio) AND collection:(etree OR opensource_audio OR netlabels)`;
  const raw = await apiFetch<IASearchResponse>({
    config: API_CONFIG.internetArchive,
    path: '/advancedsearch.php',
    params: {
      q,
      'fl[]': 'identifier,title,description,creator,year,runtime,avg_rating,download_count',
      rows: options?.limit ?? 10,
      page: options?.page ?? 1,
      output: 'json',
    },
    signal,
  });
  return internetArchiveItemResultsFromRaw(raw);
}

/**
 * Get full item details including download URLs for all formats.
 *
 * V21 W6 P21c: transport-level failures (`ApiError` from apiFetch +
 * `AbortError` on signal abort) are still swallowed — the caller's
 * intent is "tell me whether this item exists, with null meaning
 * 'no'". Wire-shape failures (`AdapterParseError` thrown from the
 * convertor) propagate so the hook layer / caller can distinguish
 * "server is down" from "server returned garbage".
 */
export async function getInternetArchiveItemDetails(
  identifier: string,
  signal?: AbortSignal,
): Promise<InternetArchiveItemResult | null> {
  try {
    const data = await apiFetch<IAMetadataResponse>({
      config: API_CONFIG.internetArchive,
      path: `/metadata/${identifier}`,
      signal,
    });
    return internetArchiveItemDetailsFromRaw(identifier, data);
  } catch (e) {
    if (e instanceof AdapterParseError) throw e;
    return null;
  }
}

/**
 * Ordered audio track list for an item (P37 — powers both audiobook
 * chapters from LibriVox items and archive audio item tracks).
 */
export async function getArchiveTracks(
  identifier: string,
  signal?: AbortSignal,
): Promise<ArchiveTrack[]> {
  const data = await apiFetch<IAMetadataResponse>({
    config: API_CONFIG.internetArchive,
    path: `/metadata/${identifier}`,
    signal,
  });
  return archiveTracksFromRaw(identifier, data);
}

/**
 * Search video/movie items on the Internet Archive.
 * Uses `mediatype:(movies)` filter for movies, old films, documentaries etc.
 * No authentication required.
 */
export async function searchInternetArchiveVideos(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<PaginatedResult<InternetArchiveVideoResult>> {
  const q = `(${query}) AND mediatype:(movies)`;
  const raw = await apiFetch<IAVideoSearchResponse>({
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
      // Optional IA sort for callers that explicitly opt in.
      ...(options?.sort ? {'sort[]': options.sort} : {}),
    },
    signal,
  });
  return internetArchiveVideoResultsFromRaw(raw);
}

/**
 * Get full video item details including subtitles, audio tracks,
 * and direct streaming/download URLs.
 */
export async function getInternetArchiveVideoDetails(
  identifier: string,
  signal?: AbortSignal,
): Promise<InternetArchiveVideoResult | null> {
  return resolveInternetArchiveVideoDetails(identifier, undefined, 3, signal);
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
 * @param signal      Optional AbortSignal — threaded through to the
 *                    single-attempt helper so the retry loop is
 *                    cancellable (V21 W6 P21c).
 */
export async function resolveInternetArchiveVideoDetails(
  identifier: string,
  onRetry?: (attempt: number, maxAttempts: number) => void,
  maxAttempts: number = 3,
  signal?: AbortSignal,
): Promise<InternetArchiveVideoResult | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1 && onRetry) {
      onRetry(attempt, maxAttempts);
    }
    const result = await getInternetArchiveVideoDetailsOnce(
      identifier,
      attempt,
      signal,
    );
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
 *
 * V21 W6 P21c: wire-shape failures (`AdapterParseError` from the
 * convertor) propagate; transport-level failures (`ApiError` from
 * apiFetch + `AbortError` on signal abort) are swallowed.
 */
async function getInternetArchiveVideoDetailsOnce(
  identifier: string,
  attempt: number,
  signal?: AbortSignal,
): Promise<InternetArchiveVideoResult | null> {
  try {
    const data = await apiFetch<IAMetadataResponse>({
      config: API_CONFIG.internetArchive,
      path: `/metadata/${identifier}`,
      signal,
      // Bypass the cache on retries so we actually hit a different server
      // instead of getting the same broken response back. The first
      // attempt CAN use the cache (via `staleTime` on the
      // `useApiQuery` call site) to benefit from a healthy response
      // that was stored within the last 10 minutes.
    });
    return internetArchiveVideoDetailsFromRaw(identifier, data);
  } catch (e) {
    if (e instanceof AdapterParseError) throw e;
    return null;
  }
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const INTERNET_ARCHIVE_RETRIES = 2;
