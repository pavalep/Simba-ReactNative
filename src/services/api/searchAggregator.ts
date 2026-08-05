// ─── Cross-API Search Aggregator ────────────────────────────────────────
// Runs a search term across all free full-length content API services
// and merges results grouped by content type.
//
// Only includes APIs that provide free, full-length content — no
// 30-second previews, no paid commercial plans.

import {searchAudiobooks} from './librivoxService';
import {getAllIPTVChannels} from './iptvService';
import {searchJamendoTracks} from './jamendoService';
import {searchInternetArchiveAudio} from './internetArchiveService';
import {searchAudiusTracks} from './audiusService';
import type {AggregatedSearchResults, ApiSearchOptions} from '../../types/api';

/**
 * Search across all free content APIs for the given query.
 * Each API is called independently — individual failures do not block
 * results from other APIs.
 */
export async function aggregateSearch(
  query: string,
  options?: ApiSearchOptions,
): Promise<AggregatedSearchResults> {
  const limit = options?.limit ?? 10;

  const results = await Promise.allSettled([
    searchAudiobooks(query, {...options, limit}).catch(() => []),
    getAllIPTVChannels({...options, limit}).catch(() => []),
    searchJamendoTracks(query, {...options, limit}).catch(() => []),
    // PaginatedResult — only the items are aggregated here.
    searchInternetArchiveAudio(query, {...options, limit})
      .then(r => r.items)
      .catch(() => []),
    searchAudiusTracks(query, {...options, limit}).catch(() => []),
  ]);

  return {
    podcasts: [], // Podcast Index uses SHA1 auth; excluded from raw aggregator
    radioStations: [], // Radio Browser needs name-based query; skipped here
    audiobooks: extractValue(results[0]),
    iptvChannels: extractValue(results[1]),
    jamendoTracks: extractValue(results[2]),
    internetArchiveItems: extractValue(results[3]),
    audiusTracks: extractValue(results[4]),
  };
}

function extractValue<T>(result: PromiseSettledResult<T>): T {
  return result.status === 'fulfilled' ? result.value : ([] as unknown as T);
}
