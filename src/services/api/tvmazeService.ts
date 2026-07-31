// ─── TVmaze API Service ───────────────────────────────────────────────────
// Real API client for tvmaze.com.

import {apiFetch} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import type {TVMazeShow, TVMazeEpisode} from '../../types/api';

// ─── Raw TVmaze response types ────────────────────────────────────────

interface RawSearchResult {
  score: number;
  show: TVMazeShow;
}

// ─── Cache TTLs (ms) ───────────────────────────────────────────────────

const CACHE = {
  SEARCH: 600_000,     // 10 min
  SCHEDULE: 1_800_000, // 30 min
  DETAILS: 3_600_000,  // 1 hour
  BROWSE: 3_600_000,   // 1 hour
} as const;

// ─── Exported Functions ────────────────────────────────────────────────

/**
 * Search for TV shows by query string.
 * TVmaze search returns [{score, show}] — the `show` objects are extracted.
 * Cache: 10 minutes.
 */
export async function searchShows(query: string): Promise<TVMazeShow[]> {
  const data = await apiFetch<RawSearchResult[]>({
    config: API_CONFIG.tvmaze,
    path: '/search/shows',
    params: {q: query},
    cacheTtlMs: CACHE.SEARCH,
  });
  return data.map(r => r.show);
}

/**
 * P38: browse popular shows — TVmaze /shows?page=N returns 250 per page.
 * Cache: 1 hour.
 */
export async function getPopularShows(page: number): Promise<TVMazeShow[]> {
  return apiFetch<TVMazeShow[]>({
    config: API_CONFIG.tvmaze,
    path: '/shows',
    params: {page},
    cacheTtlMs: CACHE.BROWSE,
  });
}

/**
 * Get full show details by TVmaze ID.
 * Cache: 1 hour.
 */
export async function getShowById(id: number): Promise<TVMazeShow> {
  return apiFetch<TVMazeShow>({
    config: API_CONFIG.tvmaze,
    path: `/shows/${id}`,
    cacheTtlMs: CACHE.DETAILS,
  });
}

/**
 * Get the episode list for a show.
 * Cache: 1 hour.
 */
export async function getEpisodeList(
  showId: number,
): Promise<TVMazeEpisode[]> {
  return apiFetch<TVMazeEpisode[]>({
    config: API_CONFIG.tvmaze,
    path: `/shows/${showId}/episodes`,
    cacheTtlMs: CACHE.DETAILS,
  });
}

/**
 * Get the TV schedule, optionally filtered by date and/or country.
 * Cache: 30 minutes.
 */
export async function getSchedule(
  date?: string,
  country?: string,
): Promise<
  {
    id: number;
    name: string;
    season: number;
    number: number;
    airdate: string;
    show: TVMazeShow;
  }[]
> {
  const params: Record<string, string | number | undefined> = {};
  if (date) {
    params.date = date;
  }
  if (country) {
    params.country = country;
  }

  return apiFetch({
    config: API_CONFIG.tvmaze,
    path: '/schedule',
    params,
    cacheTtlMs: CACHE.SCHEDULE,
  });
}
