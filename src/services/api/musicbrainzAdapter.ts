/**
 * V18 — musicbrainzAdapter
 *
 * Replaces `musicbrainzService.ts`. MusicBrainz uses hyphenated
 * field names (e.g. `sort-name`); the convertors map them to
 * camelCase domain types.
 *
 * `getReleaseGroupDetail` is a two-call flow: the release-group
 * endpoint rejects `inc=recordings` (P39.4), so we fetch the
 * release-group first, pick the earliest release, then fetch that
 * release with `inc=recordings`. Recordings are nested under
 * `media[*].tracks[*].recording` and need to be flattened + deduped.
 *
 * `getCoverArt` uses raw `fetch` for a HEAD probe — the CAA
 * endpoint doesn't go through `apiFetch` because the response
 * shape is binary (a 302 to the actual image). This is one of the
 * rare cases where a service function doesn't use the canonical
 * helper; the convertor pattern still applies for the URL builder.
 */
import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {
  MusicBrainzArtist,
  MusicBrainzRelease,
  MusicBrainzReleaseGroupDetail,
  MusicBrainzRecording,
  ApiSearchOptions,
} from '../../types/api';

export type {
  MusicBrainzArtist,
  MusicBrainzRelease,
  MusicBrainzReleaseGroupDetail,
  MusicBrainzRecording,
};

const USER_AGENT = API_CONFIG.musicbrainz.userAgent;
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 min
const DISCOGRAPHY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
  country: string | null;
  status: string | null;
  'cover-art-archive'?: {front: boolean};
}

interface ArtistSearchRaw {
  artists: RawArtist[];
}

interface ArtistLookupRaw {
  id: string;
  name: string;
  'release-groups': RawRelease[];
}

interface RawRecording {
  id: string;
  title: string;
  length: number | null;
}

interface RawReleaseGroupDetailRaw {
  id: string;
  title: string;
  'first-release-date': string | null;
  'primary-type': string | null;
  releases?: Array<{id: string; title: string; date?: string}>;
  'cover-art-archive'?: {front: boolean};
}

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

/** CAA front-cover URL template for a release id. */
function coverArtUrlFor(releaseId: string): string {
  return `https://coverartarchive.org/release/${releaseId}/front-250`;
}

export function artistResultFromRaw(
  raw: RawArtist | undefined,
): MusicBrainzArtist | null {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name,
    sortName: raw['sort-name'],
    type: raw.type ?? '',
    country: raw.country ?? '',
    disambiguation: raw.disambiguation,
  };
}

export function artistResultsFromSearchRaw(
  raw: ArtistSearchRaw | undefined,
): MusicBrainzArtist[] {
  return (raw?.artists ?? [])
    .map(artistResultFromRaw)
    .filter((a): a is MusicBrainzArtist => a !== null);
}

export function releaseResultFromRaw(
  raw: RawRelease | undefined,
): MusicBrainzRelease | null {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    date: raw['first-release-date'] ?? '',
    country: raw.country ?? '',
    status: raw.status ?? '',
    coverArtUrl:
      raw['cover-art-archive']?.front === true ? coverArtUrlFor(raw.id) : null,
  };
}

export function releaseResultsFromArtistLookupRaw(
  raw: ArtistLookupRaw | undefined,
): MusicBrainzRelease[] {
  return (raw?.['release-groups'] ?? [])
    .map(releaseResultFromRaw)
    .filter((r): r is MusicBrainzRelease => r !== null);
}

/**
 * Combine a release-group raw with a list of recordings (already
 * resolved via the follow-up /release call) into the domain shape.
 */
function releaseGroupDetailFromRaw(
  raw: RawReleaseGroupDetailRaw,
  recordings: MusicBrainzRecording[],
): MusicBrainzReleaseGroupDetail {
  return {
    id: raw.id,
    title: raw.title,
    date: raw['first-release-date'] ?? '',
    primaryType: raw['primary-type'] ?? '',
    coverArtUrl:
      raw['cover-art-archive']?.front === true
        ? coverArtUrlFor(raw.id)
        : null,
    recordings,
  };
}

export async function searchArtists(
  query: string,
  options?: ApiSearchOptions,
): Promise<MusicBrainzArtist[]> {
  const raw = await apiFetch<ArtistSearchRaw>({
    config: API_CONFIG.musicbrainz,
    path: '/artist',
    params: {query, fmt: 'json', limit: options?.limit},
    cacheTtlMs: SEARCH_CACHE_TTL,
    headers: {'User-Agent': USER_AGENT},
  });
  return artistResultsFromSearchRaw(raw);
}

export async function getArtistDiscography(
  artistId: string,
): Promise<MusicBrainzRelease[]> {
  const raw = await apiFetch<ArtistLookupRaw>({
    config: API_CONFIG.musicbrainz,
    path: `/artist/${artistId}`,
    params: {inc: 'release-groups', fmt: 'json'},
    cacheTtlMs: DISCOGRAPHY_CACHE_TTL,
    headers: {'User-Agent': USER_AGENT},
  });
  return releaseResultsFromArtistLookupRaw(raw);
}

export async function getReleaseGroupDetail(
  releaseGroupId: string,
): Promise<MusicBrainzReleaseGroupDetail | null> {
  try {
    const raw = await apiFetch<RawReleaseGroupDetailRaw>({
      config: API_CONFIG.musicbrainz,
      path: `/release-group/${releaseGroupId}`,
      params: {inc: 'releases+artists', fmt: 'json'},
      cacheTtlMs: DISCOGRAPHY_CACHE_TTL,
      headers: {'User-Agent': USER_AGENT},
    });
    const sortedReleases = (raw.releases ?? []).slice().sort((a, b) => {
      const da = a.date ?? '';
      const db = b.date ?? '';
      return da.localeCompare(db);
    });
    const firstRelease = sortedReleases[0];

    const recordings: MusicBrainzRecording[] = [];
    if (firstRelease) {
      try {
        const rel = await apiFetch<RawReleaseWithRecordings>({
          config: API_CONFIG.musicbrainz,
          path: `/release/${firstRelease.id}`,
          params: {inc: 'recordings', fmt: 'json'},
          cacheTtlMs: DISCOGRAPHY_CACHE_TTL,
          headers: {'User-Agent': USER_AGENT},
        });
        const seen = new Set<string>();
        for (const m of rel.media ?? []) {
          for (const t of m.tracks ?? []) {
            const r = t.recording;
            if (r && !seen.has(r.id)) {
              seen.add(r.id);
              recordings.push({
                id: r.id,
                title: r.title,
                length: r.length ?? 0,
              });
            }
          }
        }
      } catch {
        // release lookup failed — degrade to empty recordings
      }
    }
    return releaseGroupDetailFromRaw(raw, recordings);
  } catch {
    return null;
  }
}

export async function getCoverArt(
  releaseId: string,
): Promise<string | null> {
  const url = coverArtUrlFor(releaseId);
  try {
    const response = await fetch(url, {method: 'HEAD'});
    if (response.status === 404) return null;
    if (response.ok || response.status === 302) return url;
    return null;
  } catch {
    return null;
  }
}
