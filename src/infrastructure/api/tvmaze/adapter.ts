/**
 * V18 + V21 W6 P21c — tvmazeAdapter
 *
 * Replaces `tvmazeService.ts`. For most methods, the wire shape IS
 * the domain shape — `TVMazeShow` and `TVMazeEpisode` are stable
 * field-for-field with the API. The only conversion is
 * `searchShows`, which extracts `.show` from the `[{score, show}]`
 * envelope and validates per-show shape.
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `showsFromSearchRaw` validates per-show shape and throws
 * `AdapterParseError` for malformed records (was silent
 * pass-through pre-W22). All 5 service functions accept
 * `signal?: AbortSignal` so TanStack Query can cancel stale
 * requests on screen unmount / query-key change.
 *
 * The Jamendo / Audius / Internet Archive / IPTV / LibriVox /
 * MusicBrainz / RadioBrowser adapters are the proof-of-pattern
 * references for the W6 P21c shape; this file follows the
 * same pattern.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import {AdapterParseError} from '../adapterErrors';
import type {TVMazeShow, TVMazeEpisode} from '../../../types/api';

export type {TVMazeShow, TVMazeEpisode};

interface RawSearchResult {
  score: number;
  show: TVMazeShow;
}

interface RawScheduleItem {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  show: TVMazeShow;
}

export type TVMazeScheduleItem = RawScheduleItem;

const CACHE = {
  SEARCH: 600_000, // 10 min
  SCHEDULE: 1_800_000, // 30 min
  DETAILS: 3_600_000, // 1 hour
  BROWSE: 3_600_000, // 1 hour
} as const;

/**
 * V21 W6 P21c — per-show shape validation for search results.
 * Required: `id` is a finite number, `name` is a non-empty string.
 * The full `TVMazeShow` shape has many optional fields; we only
 * validate the ones the search-list UI renders.
 */
function parseRawSearchShow(
  raw: unknown,
  path: string,
): TVMazeShow {
  if (typeof raw !== 'object' || raw === null) {
    throw new AdapterParseError(
      'tvmaze',
      path,
      'expected show object',
    );
  }
  const s = raw as Partial<TVMazeShow>;
  if (typeof s.id !== 'number' || !Number.isFinite(s.id)) {
    throw new AdapterParseError(
      'tvmaze',
      `${path}.id`,
      `expected finite number, got ${s.id}`,
    );
  }
  if (typeof s.name !== 'string' || s.name.length === 0) {
    throw new AdapterParseError(
      'tvmaze',
      `${path}.name`,
      'expected non-empty string',
    );
  }
  return s as TVMazeShow;
}

/**
 * V21 W6 P21c — typed `unknown` input; per-show validation
 * throws on malformed records (whole batch rejected on any
 * malformed entry).
 */
export function showsFromSearchRaw(raw: unknown): TVMazeShow[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new AdapterParseError(
      'tvmaze',
      'envelope',
      'expected array of search results',
    );
  }
  return raw.map((r, i) => {
    if (typeof r !== 'object' || r === null) {
      throw new AdapterParseError(
        'tvmaze',
        `results[${i}]`,
        'expected search result object',
      );
    }
    const result = r as Partial<RawSearchResult>;
    return parseRawSearchShow(result.show, `results[${i}].show`);
  });
}

export async function searchShows(
  query: string,
  signal?: AbortSignal,
): Promise<TVMazeShow[]> {
  const raw = await apiFetch<RawSearchResult[]>({
    config: API_CONFIG.tvmaze,
    path: '/search/shows',
    params: {q: query},
    signal,
  });
  return showsFromSearchRaw(raw);
}

export async function getPopularShows(
  page: number,
  genre?: string,
  signal?: AbortSignal,
): Promise<TVMazeShow[]> {
  return apiFetch<TVMazeShow[]>({
    config: API_CONFIG.tvmaze,
    path: '/shows',
    params: genre ? {page, genre} : {page},
    signal,
  });
}

export async function getShowById(
  id: number,
  signal?: AbortSignal,
): Promise<TVMazeShow> {
  return apiFetch<TVMazeShow>({
    config: API_CONFIG.tvmaze,
    path: `/shows/${id}`,
    signal,
  });
}

export async function getEpisodeList(
  showId: number,
  signal?: AbortSignal,
): Promise<TVMazeEpisode[]> {
  return apiFetch<TVMazeEpisode[]>({
    config: API_CONFIG.tvmaze,
    path: `/shows/${showId}/episodes`,
    signal,
  });
}

export async function getSchedule(
  date?: string,
  country?: string,
  signal?: AbortSignal,
): Promise<TVMazeScheduleItem[]> {
  const params: Record<string, string | number | undefined> = {};
  if (date) params.date = date;
  if (country) params.country = country;
  return apiFetch<TVMazeScheduleItem[]>({
    config: API_CONFIG.tvmaze,
    path: '/schedule',
    params,
    signal,
  });
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const TVMAZE_RETRIES = 2;
