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
  };
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
): Promise<InternetArchiveItemResult[]> {
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
    cacheTtlMs: 300_000,
  });
  return (data.response?.docs ?? []).map(mapItem);
}

/** Search music (non-speaking) on the Internet Archive. */
export async function searchInternetArchiveMusic(
  query: string,
  options?: ApiSearchOptions,
): Promise<InternetArchiveItemResult[]> {
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
  return (data.response?.docs ?? []).map(mapItem);
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
    imageUrl: raw.image_url || `https://archive.org/services/img/${raw.identifier}`,
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
): Promise<InternetArchiveVideoResult[]> {
  const q = `(${query}) AND mediatype:(movies)`;
  const data = await apiFetch<IAVideoSearchResponse>({
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
  return (data.response?.docs ?? []).map(mapVideoItem);
}

/**
 * Get full video item details including subtitles, audio tracks,
 * and direct streaming/download URLs.
 */
export async function getInternetArchiveVideoDetails(
  identifier: string,
): Promise<InternetArchiveVideoResult | null> {
  try {
    const data = await apiFetch<IAMetadataResponse>({
      config: API_CONFIG.internetArchive,
      path: `/metadata/${identifier}`,
      cacheTtlMs: 600_000,
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
