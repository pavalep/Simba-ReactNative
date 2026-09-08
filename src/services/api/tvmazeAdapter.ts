/**
 * V18 — tvmazeAdapter
 *
 * Replaces `tvmazeService.ts`. For most methods, the wire shape IS
 * the domain shape — `TVMazeShow` and `TVMazeEpisode` are stable
 * field-for-field with the API. The only conversion is
 * `searchShows`, which extracts `.show` from the `[{score, show}]`
 * envelope.
 */
import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {TVMazeShow, TVMazeEpisode} from '../../types/api';

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

export function showsFromSearchRaw(
  raw: RawSearchResult[] | undefined,
): TVMazeShow[] {
  return (raw ?? []).map(r => r.show);
}

export async function searchShows(query: string): Promise<TVMazeShow[]> {
  const raw = await apiFetch<RawSearchResult[]>({
    config: API_CONFIG.tvmaze,
    path: '/search/shows',
    params: {q: query},
  });
  return showsFromSearchRaw(raw);
}

export async function getPopularShows(
  page: number,
  genre?: string,
): Promise<TVMazeShow[]> {
  return apiFetch<TVMazeShow[]>({
    config: API_CONFIG.tvmaze,
    path: '/shows',
    params: genre ? {page, genre} : {page},
  });
}

export async function getShowById(id: number): Promise<TVMazeShow> {
  return apiFetch<TVMazeShow>({
    config: API_CONFIG.tvmaze,
    path: `/shows/${id}`,
  });
}

export async function getEpisodeList(
  showId: number,
): Promise<TVMazeEpisode[]> {
  return apiFetch<TVMazeEpisode[]>({
    config: API_CONFIG.tvmaze,
    path: `/shows/${showId}/episodes`,
  });
}

export async function getSchedule(
  date?: string,
  country?: string,
): Promise<TVMazeScheduleItem[]> {
  const params: Record<string, string | number | undefined> = {};
  if (date) params.date = date;
  if (country) params.country = country;
  return apiFetch<TVMazeScheduleItem[]>({
    config: API_CONFIG.tvmaze,
    path: '/schedule',
    params,
  });
}
