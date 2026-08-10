// ─── MusicBrainz API Service ────────────────────────────────────────────
// See https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {
  ApiSearchOptions,
  MusicBrainzArtist,
  MusicBrainzRelease,
  MusicBrainzReleaseGroupDetail,
} from '../../types/api';

// ─── Constants ──────────────────────────────────────────────────────────

const USER_AGENT = API_CONFIG.musicbrainz.userAgent;
const SEARCH_CACHE_TTL = 10 * 60 * 1000;   // 10 minutes
const DISCOGRAPHY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Raw MusicBrainz Response Types ─────────────────────────────────────
// MusicBrainz uses hyphenated field names (e.g. `sort-name`); we map them
// to camelCase TypeScript types.

interface RawArtist {
  id: string;
  name: string;
  'sort-name': string;
  type: string | null;
  country: string | null;
  disambiguation: string;
}

interface RawRelease {
  id: string;
  title: string;
  'first-release-date': string | null;
  'release-group'?: {
    'primary-type': string | null;
  };
  country: string | null;
  status: string | null;
  'cover-art-archive'?: {
    front: boolean;
  };
}

interface ArtistSearchResponse {
  artists: RawArtist[];
}

interface ArtistLookupResponse {
  id: string;
  name: string;
  'release-groups': RawRelease[];
}

interface RawRecording {
  id: string;
  title: string;
  length: number | null;
}

interface RawReleaseGroupDetail {
  id: string;
  title: string;
  'first-release-date': string | null;
  'primary-type': string | null;
  /**
   * P39.4: MusicBrainz release-group doesn't expose recordings directly
   * (`inc=recordings` is rejected with 400). To get the tracklist, we
   * fetch the release-group with `inc=releases+artists`, then a follow-up
   * call to `/release/{id}?inc=recordings` for the earliest release.
   */
  releases?: Array<{id: string; title: string; date?: string}>;
  'cover-art-archive'?: {
    front: boolean;
  };
}

/**
 * P39.4: MusicBrainz's `/release/{id}?inc=recordings` does NOT return
 * recordings at the top level — they are nested under
 * `media[*].tracks[*].recording`. We flatten that here.
 */
interface RawReleaseMediaTrack {
  position: number;
  number: string;
  title: string;
  length?: number | null;
  recording: RawRecording;
}

interface RawReleaseMedia {
  format: string;
  'track-count': number;
  tracks?: RawReleaseMediaTrack[];
}

interface RawReleaseWithRecordings {
  id: string;
  title: string;
  'first-release-date'?: string | null;
  media?: RawReleaseMedia[];
}

// ─── Mappers ────────────────────────────────────────────────────────────

function toArtist(raw: RawArtist): MusicBrainzArtist {
  return {
    id: raw.id,
    name: raw.name,
    sortName: raw['sort-name'],
    type: raw.type ?? '',
    country: raw.country ?? '',
    disambiguation: raw.disambiguation,
  };
}

function toRelease(raw: RawRelease): MusicBrainzRelease {
  return {
    id: raw.id,
    title: raw.title,
    date: raw['first-release-date'] ?? '',
    country: raw.country ?? '',
    status: raw.status ?? '',
    coverArtUrl:
      raw['cover-art-archive']?.front === true
        ? coverArtUrlFor(raw.id)
        : null,
  };
}

/** CAA front-cover URL template for a release id (P39.2). */
function coverArtUrlFor(releaseId: string): string {
  return `https://coverartarchive.org/release/${releaseId}/front-250`;
}

// ─── Exported Functions ─────────────────────────────────────────────────

/** Search for artists by query string. */
export async function searchArtists(
  query: string,
  options?: ApiSearchOptions,
): Promise<MusicBrainzArtist[]> {
  const response = await apiFetch<ArtistSearchResponse>({
    config: API_CONFIG.musicbrainz,
    path: '/artist',
    params: {query, fmt: 'json', limit: options?.limit},
    cacheTtlMs: SEARCH_CACHE_TTL,
    headers: {'User-Agent': USER_AGENT},
  });
  return (response.artists ?? []).map(toArtist);
}

/** Get an artist's full discography (release groups). */
export async function getArtistDiscography(
  artistId: string,
): Promise<MusicBrainzRelease[]> {
  const response = await apiFetch<ArtistLookupResponse>({
    config: API_CONFIG.musicbrainz,
    path: `/artist/${artistId}`,
    params: {inc: 'release-groups', fmt: 'json'},
    cacheTtlMs: DISCOGRAPHY_CACHE_TTL,
    headers: {'User-Agent': USER_AGENT},
  });
  return (response['release-groups'] ?? []).map(toRelease);
}

/**
 * Get the cover art URL for a release group (recordings + art flags, P39.3).
 * The lookup already reports whether a front cover exists, so no extra
 * HEAD request is needed — we construct the CAA url directly.
 *
 * P39.4: MB rejects `inc=recordings` on /release-group. We use
 * `inc=releases+artists` and follow up with a single /release call
 * for the earliest release to get the tracklist. If the second call
 * fails (e.g. the release id is gone), we still return the metadata
 * with an empty recordings array — the consumer's "matched tracks"
 * counter gracefully degrades to 0.
 */
export async function getReleaseGroupDetail(
  releaseGroupId: string,
): Promise<MusicBrainzReleaseGroupDetail | null> {
  try {
    const response = await apiFetch<RawReleaseGroupDetail>({
      config: API_CONFIG.musicbrainz,
      path: `/release-group/${releaseGroupId}`,
      params: {inc: 'releases+artists', fmt: 'json'},
      cacheTtlMs: DISCOGRAPHY_CACHE_TTL,
      headers: {'User-Agent': USER_AGENT},
    });

    // Pick the earliest release for the tracklist (most representative).
    const sortedReleases = (response.releases ?? []).slice().sort((a, b) => {
      const da = a.date ?? '';
      const db = b.date ?? '';
      return da.localeCompare(db);
    });
    const firstRelease = sortedReleases[0];

    let recordings: RawRecording[] = [];
    if (firstRelease) {
      try {
        const rel = await apiFetch<RawReleaseWithRecordings>({
          config: API_CONFIG.musicbrainz,
          path: `/release/${firstRelease.id}`,
          params: {inc: 'recordings', fmt: 'json'},
          cacheTtlMs: DISCOGRAPHY_CACHE_TTL,
          headers: {'User-Agent': USER_AGENT},
        });
        // Recordings are nested under media[*].tracks[*].recording —
        // NOT at the top level. Flatten and de-dupe by recording id.
        const seen = new Set<string>();
        for (const m of rel.media ?? []) {
          for (const t of m.tracks ?? []) {
            const r = t.recording;
            if (r && !seen.has(r.id)) {
              seen.add(r.id);
              recordings.push(r);
            }
          }
        }
      } catch {
        // release lookup failed — keep going with empty recordings
      }
    }

    return {
      id: response.id,
      title: response.title,
      date: response['first-release-date'] ?? '',
      primaryType: response['primary-type'] ?? '',
      coverArtUrl:
        response['cover-art-archive']?.front === true
          ? coverArtUrlFor(response.id)
          : null,
      recordings: recordings.map(r => ({
        id: r.id,
        title: r.title,
        length: r.length ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

/** Get the cover art URL for a release. Returns null if no front cover exists (404). */
export async function getCoverArt(
  releaseId: string,
): Promise<string | null> {
  const url = coverArtUrlFor(releaseId);

  try {
    const response = await fetch(url, {method: 'HEAD'});
    if (response.status === 404) {
      return null;
    }
    if (response.ok || response.status === 302) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}
