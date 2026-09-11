/**
 * V18 + V21 W6 P21c — musicbrainzAdapter
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
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `artistResultFromRaw` and `releaseResultFromRaw` validate
 * per-record shape and throw `AdapterParseError` for malformed
 * records (was silent `null` skip pre-W22). All 4 service
 * functions accept `signal?: AbortSignal` so TanStack Query can
 * cancel stale requests on screen unmount / query-key change.
 * The inner recordings call inside `getReleaseGroupDetail`
 * also threads the signal (so a TanStack cancellation propagates
 * through the two-call flow).
 *
 * The Jamendo / Audius / Internet Archive / IPTV / LibriVox
 * adapters are the proof-of-pattern references for the W6 P21c
 * shape; this file follows the same pattern.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {
  MusicBrainzArtist,
  MusicBrainzRelease,
  MusicBrainzReleaseGroupDetail,
  MusicBrainzRecording,
  ApiSearchOptions,
} from '../../../types/api';

export type {
  MusicBrainzArtist,
  MusicBrainzRelease,
  MusicBrainzReleaseGroupDetail,
  MusicBrainzRecording,
};

const USER_AGENT = API_CONFIG.musicbrainz.userAgent;

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

/**
 * V21 W6 P21c — per-artist shape validation.
 * Throws `AdapterParseError` for malformed records (was silent
 * `null` skip pre-W22). Required fields: `id` is non-empty
 * string, `name` is string.
 */
function parseRawArtist(raw: unknown, path: string): MusicBrainzArtist {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError('musicbrainz', path, 'expected artist object');
  }
  const a = raw as Partial<RawArtist>;
  if (typeof a.id !== 'string' || a.id.length === 0) {
    throw new AdapterParseError(
      'musicbrainz',
      `${path}.id`,
      'expected non-empty string',
    );
  }
  if (typeof a.name !== 'string') {
    throw new AdapterParseError(
      'musicbrainz',
      `${path}.name`,
      'expected string',
    );
  }
  return {
    id: a.id,
    name: a.name,
    sortName: a['sort-name'] ?? '',
    type: a.type ?? '',
    country: a.country ?? '',
    disambiguation: a.disambiguation ?? '',
  };
}

/**
 * V21 W6 P21c — thin wrapper for the V18 convertor name.
 * Pre-W22 returned `null` for malformed / undefined input.
 * Now throws `AdapterParseError`.
 */
export function artistResultFromRaw(
  raw: unknown,
  path: string = 'artist',
): MusicBrainzArtist {
  return parseRawArtist(raw, path);
}

export function artistResultsFromSearchRaw(raw: unknown): MusicBrainzArtist[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'musicbrainz',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<ArtistSearchRaw>;
  const artists = e.artists ?? [];
  return artists.map((a, i) => parseRawArtist(a, `artists[${i}]`));
}

/**
 * V21 W6 P21c — per-release shape validation.
 */
function parseRawRelease(raw: unknown, path: string): MusicBrainzRelease {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError('musicbrainz', path, 'expected release object');
  }
  const r = raw as Partial<RawRelease>;
  if (typeof r.id !== 'string' || r.id.length === 0) {
    throw new AdapterParseError(
      'musicbrainz',
      `${path}.id`,
      'expected non-empty string',
    );
  }
  if (typeof r.title !== 'string') {
    throw new AdapterParseError(
      'musicbrainz',
      `${path}.title`,
      'expected string',
    );
  }
  return {
    id: r.id,
    title: r.title,
    date: r['first-release-date'] ?? '',
    country: r.country ?? '',
    status: r.status ?? '',
    coverArtUrl:
      r['cover-art-archive']?.front === true ? coverArtUrlFor(r.id) : null,
  };
}

/**
 * V21 W6 P21c — thin wrapper for the V18 convertor name.
 */
export function releaseResultFromRaw(
  raw: unknown,
  path: string = 'release',
): MusicBrainzRelease {
  return parseRawRelease(raw, path);
}

export function releaseResultsFromArtistLookupRaw(
  raw: unknown,
): MusicBrainzRelease[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'musicbrainz',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<ArtistLookupRaw>;
  const releases = e['release-groups'] ?? [];
  return releases.map((r, i) => parseRawRelease(r, `release-groups[${i}]`));
}

/**
 * V21 W6 P21c — per-recording shape validation.
 */
function parseRawRecording(raw: unknown, path: string): MusicBrainzRecording {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'musicbrainz',
      path,
      'expected recording object',
    );
  }
  const r = raw as Partial<RawRecording>;
  if (typeof r.id !== 'string' || r.id.length === 0) {
    throw new AdapterParseError(
      'musicbrainz',
      `${path}.id`,
      'expected non-empty string',
    );
  }
  if (typeof r.title !== 'string') {
    throw new AdapterParseError(
      'musicbrainz',
      `${path}.title`,
      'expected string',
    );
  }
  return {
    id: r.id,
    title: r.title,
    length: r.length ?? 0,
  };
}

/**
 * Combine a release-group raw with a list of recordings (already
 * resolved via the follow-up /release call) into the domain shape.
 *
 * V21 W6 P21c: validates `id` and `title` on the release-group
 * raw — the `getReleaseGroupDetail` two-call flow passes the raw
 * through here, and a malformed wire-shape envelope (missing
 * `id` / `title`) should propagate as `AdapterParseError` instead
 * of rendering a half-broken release-group.
 */
function releaseGroupDetailFromRaw(
  raw: unknown,
  recordings: MusicBrainzRecording[],
): MusicBrainzReleaseGroupDetail {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'musicbrainz',
      'release-group',
      'expected object envelope',
    );
  }
  const r = raw as Partial<RawReleaseGroupDetailRaw>;
  if (typeof r.id !== 'string' || r.id.length === 0) {
    throw new AdapterParseError(
      'musicbrainz',
      'release-group.id',
      'expected non-empty string',
    );
  }
  if (typeof r.title !== 'string') {
    throw new AdapterParseError(
      'musicbrainz',
      'release-group.title',
      'expected string',
    );
  }
  return {
    id: r.id,
    title: r.title,
    date: r['first-release-date'] ?? '',
    primaryType: r['primary-type'] ?? '',
    coverArtUrl:
      r['cover-art-archive']?.front === true
        ? coverArtUrlFor(r.id)
        : null,
    recordings,
  };
}

export async function searchArtists(
  query: string,
  options?: ApiSearchOptions,
  signal?: AbortSignal,
): Promise<MusicBrainzArtist[]> {
  const raw = await apiFetch<ArtistSearchRaw>({
    config: API_CONFIG.musicbrainz,
    path: '/artist',
    params: {query, fmt: 'json', limit: options?.limit},
    headers: {'User-Agent': USER_AGENT},
    signal,
  });
  return artistResultsFromSearchRaw(raw);
}

export async function getArtistDiscography(
  artistId: string,
  signal?: AbortSignal,
): Promise<MusicBrainzRelease[]> {
  const raw = await apiFetch<ArtistLookupRaw>({
    config: API_CONFIG.musicbrainz,
    path: `/artist/${artistId}`,
    params: {inc: 'release-groups', fmt: 'json'},
    headers: {'User-Agent': USER_AGENT},
    signal,
  });
  return releaseResultsFromArtistLookupRaw(raw);
}

/**
 * V21 W6 P21c: catch narrowed — transport-level failures
 * (`ApiError` + signal aborts) are still swallowed (the
 * caller's intent is "is this release-group here?");
 * `AdapterParseError` propagates so the hook layer / caller
 * can distinguish "server is down" from "server returned
 * garbage". The inner recordings call has the same narrowed
 * catch — its failure degrades to empty recordings (legitimate
 * "partial data" — the release-group metadata still renders).
 */
export async function getReleaseGroupDetail(
  releaseGroupId: string,
  signal?: AbortSignal,
): Promise<MusicBrainzReleaseGroupDetail | null> {
  try {
    const raw = await apiFetch<RawReleaseGroupDetailRaw>({
      config: API_CONFIG.musicbrainz,
      path: `/release-group/${releaseGroupId}`,
      params: {inc: 'releases+artists', fmt: 'json'},
      headers: {'User-Agent': USER_AGENT},
      signal,
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
          headers: {'User-Agent': USER_AGENT},
          signal,
        });
        const seen = new Set<string>();
        for (const m of rel.media ?? []) {
          for (const t of m.tracks ?? []) {
            const r = t.recording;
            if (r && !seen.has(r.id)) {
              seen.add(r.id);
              recordings.push(parseRawRecording(r, `media[].tracks[].recording`));
            }
          }
        }
      } catch (e) {
        // release lookup failed — degrade to empty recordings.
        // AdapterParseError still propagates (the recordings
        // call is a follow-up; if it returned garbage, the
        // caller should know).
        if (e instanceof AdapterParseError) throw e;
      }
    }
    return releaseGroupDetailFromRaw(raw, recordings);
  } catch (e) {
    if (e instanceof AdapterParseError) throw e;
    return null;
  }
}

/**
 * V21 W6 P21c: `getCoverArt` uses raw `fetch` (not `apiFetch`)
 * because the CAA response is binary. The native `fetch`
 * supports an `AbortSignal` in its options — we thread the
 * signal through for cancellation parity.
 *
 * No `AdapterParseError` here (the response shape is just
 * HTTP status + redirect, not a structured payload).
 */
export async function getCoverArt(
  releaseId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = coverArtUrlFor(releaseId);
  try {
    const response = await fetch(url, {method: 'HEAD', signal});
    if (response.status === 404) return null;
    if (response.ok || response.status === 302) return url;
    return null;
  } catch {
    return null;
  }
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const MUSICBRAINZ_RETRIES = 2;
