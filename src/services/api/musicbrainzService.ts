// ─── MusicBrainz API Service ────────────────────────────────────────────
// See https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {ApiSearchOptions, MusicBrainzArtist, MusicBrainzRelease} from '../../types/api';

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
    coverArtUrl: null,
  };
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

/** Get the cover art URL for a release. Returns null if no front cover exists (404). */
export async function getCoverArt(
  releaseId: string,
): Promise<string | null> {
  const url = `https://coverartarchive.org/release/${releaseId}/front-250`;

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
