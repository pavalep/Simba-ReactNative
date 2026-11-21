// ─── The IPTV catalogue — the domain, and nothing else ────────────────
//
// WHAT THIS IS
// ------------
// The catalogue is the whole channel directory as the app understands it:
// every playable channel with its logo, its category and its country, plus
// the categories themselves with the count the app counted.
//
// It is built ONCE from the M3U index and the two small maps, and it is
// then filtered in memory — a category filter or a search term is a
// `useMemo` over this array, never a download.
//
// (The wire lives in `../adapter.ts`; the playlist text lives in
// `./m3u.ts`.)

import type {IPTVChannelResult, IPTVCategory} from '../../../types/api';
import {countryCodeFromIPTVId, type IPTVM3UEntry} from './m3u';

/** The whole directory: the channels, and the categories over them. */
export interface IPTVCatalogue {
  channels: IPTVChannelResult[];
  categories: IPTVCategory[];
}

/**
 * The group-title the source writes for a channel it has no category for.
 *
 * Measured: 1,558 of the index's 12,269 entries carry it. It is NOT a
 * category — `categories.json` has no such id — so those rows keep no
 * category and are reachable under "All" only.
 */
const UNDEFINED_GROUP = 'undefined';

/**
 * Build the catalogue from the parsed playlist and the two name maps.
 *
 * Pure. `categoryNames` is keyed by the category id in lower case
 * (`news` → `News`); `countryNames` by the country code (`us` →
 * `United States`).
 *
 * The category COUNT is computed here, because `/api/categories.json` does
 * not serve one — measured: 30 records, 0 occurrences of `channel_count`.
 * The count is real because the app counted the rows it holds.
 */
export function buildIPTVCatalogue(
  entries: IPTVM3UEntry[],
  categoryNames: Map<string, string>,
  countryNames: Map<string, string>,
): IPTVCatalogue {
  const channels: IPTVChannelResult[] = [];
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const countryCode = countryCodeFromIPTVId(entry.id);
    const group = entry.group.toLowerCase();
    const categoryId = group && group !== UNDEFINED_GROUP ? group : '';
    const category = categoryId ? categoryNames.get(categoryId) ?? '' : '';

    if (categoryId) {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }

    channels.push({
      id: entry.id,
      name: entry.name,
      url: entry.url,
      image: entry.logo,
      country: countryNames.get(countryCode) ?? '',
      countryCode,
      // The M3U carries no language per entry. The type stays honest and
      // the field stays empty rather than being invented.
      language: '',
      category,
      categoryId,
      isPlayable: true,
      // The headers the playlist declared for this stream, when it
      // declared any.
      ...(entry.headers ? {headers: entry.headers} : {}),
    });
  }

  const categories: IPTVCategory[] = [];
  for (const [id, name] of categoryNames) {
    categories.push({id, name, channelCount: counts.get(id) ?? 0});
  }

  return {channels, categories};
}

/** What a scope narrows the catalogue by. */
export interface IPTVScope {
  /** The category id (`news`). Empty/null = every category. */
  categoryId?: string | null;
  /** The search term. Matched against the name, the country and the category. */
  term?: string;
}

/**
 * Narrow the catalogue to a scope.
 *
 * Pure, and the ONE owner of "what a Live TV scope means". The category
 * is matched by its ID — the source's own vocabulary — and the term is
 * matched case-insensitively against the channel's name, its country and
 * its category, which is what the old adapter did over the JSON.
 */
export function filterIPTVChannels(
  channels: IPTVChannelResult[],
  scope: IPTVScope,
): IPTVChannelResult[] {
  const categoryId = (scope.categoryId ?? '').trim().toLowerCase();
  const term = (scope.term ?? '').trim().toLowerCase();

  if (!categoryId && !term) return channels;

  return channels.filter(channel => {
    if (categoryId && channel.categoryId.toLowerCase() !== categoryId) {
      return false;
    }
    if (!term) return true;
    return (
      channel.name.toLowerCase().includes(term) ||
      channel.country.toLowerCase().includes(term) ||
      channel.category.toLowerCase().includes(term)
    );
  });
}
