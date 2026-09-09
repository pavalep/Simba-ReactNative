/**
 * V18 — audiusAdapter
 *
 * Replaces `audiusService.ts`. Type contract (see SPEC §2):
 *   *Raw DTOs are file-local; *Result types are re-exported.
 *   Convertors are pure, exported, named. Service functions always
 *   return Promise<DomainType>.
 */
import {apiFetch} from '../apiClient';
import {API_CONFIG} from '../../../constants/api';
import type {AudiusTrackResult, ApiSearchOptions} from '../../../types/api';

// Re-export the domain type so consumers can do
// `import type {AudiusTrackResult} from '../infrastructure/api/audius/adapter'`.
export type {AudiusTrackResult};

const AUDIUS_API_PATH = '/v1/tracks';

interface AudiusTrackRaw {
  id: string;
  title: string;
  duration: number;
  genre: string;
  description: string;
  user: {id: string; name: string; handle: string};
  artwork?: {_480x480: string; _1000x1000: string};
}

interface AudiusListRaw {
  data?: AudiusTrackRaw[];
}

interface AudiusSingleRaw {
  data?: AudiusTrackRaw;
}

/**
 * Build the stream URL. Audius redirects the stream request to the
 * discovery node that holds the audio; we just construct the well-
 * known shape.
 */
function buildStreamUrl(trackId: string): string {
  return `${API_CONFIG.audius.baseUrl}${AUDIUS_API_PATH}/${trackId}/stream`;
}

function resolveArtworkUrl(track: AudiusTrackRaw): string {
  return track.artwork?._480x480
    ? `https://creatornode.audius.co/ipfs/${track.artwork._480x480}`
    : '';
}

/**
 * Per-item convertor. `undefined` input → `null` (transport failure
 * case per the type contract).
 */
export function trackResultFromRaw(
  raw: AudiusTrackRaw | undefined,
): AudiusTrackResult | null {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    artistName: raw.user?.name || 'Unknown Artist',
    artistId: raw.user?.id || '',
    duration: raw.duration,
    genre: raw.genre || '',
    streamUrl: buildStreamUrl(raw.id),
    artworkUrl: resolveArtworkUrl(raw),
    description: raw.description || '',
  };
}

/**
 * List convertor. Handles the `data` envelope + missing-data case.
 */
export function trackResultsFromListRaw(
  raw: AudiusListRaw | undefined,
): AudiusTrackResult[] {
  return (raw?.data ?? []).map(trackResultFromRaw).filter(
    (t): t is AudiusTrackResult => t !== null,
  );
}

export async function searchAudiusTracks(
  query: string,
  options?: ApiSearchOptions,
): Promise<AudiusTrackResult[]> {
  const raw = await apiFetch<AudiusListRaw>({
    config: API_CONFIG.audius,
    path: `${AUDIUS_API_PATH}/search`,
    params: {
      query,
      limit: options?.limit ?? 10,
      offset: options?.page ? (options.page - 1) * (options.limit ?? 10) : 0,
    },
  });
  return trackResultsFromListRaw(raw);
}

export async function getTrendingAudiusTracks(
  limit: number = 20,
): Promise<AudiusTrackResult[]> {
  const raw = await apiFetch<AudiusListRaw>({
    config: API_CONFIG.audius,
    path: `${AUDIUS_API_PATH}/trending`,
    params: {limit},
  });
  return trackResultsFromListRaw(raw);
}

export async function getAudiusTrackById(
  id: string,
): Promise<AudiusTrackResult | null> {
  try {
    const raw = await apiFetch<AudiusSingleRaw>({
      config: API_CONFIG.audius,
      path: `${AUDIUS_API_PATH}/${id}`,
    });
    return trackResultFromRaw(raw.data);
  } catch {
    return null;
  }
}
