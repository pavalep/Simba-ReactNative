/**
 * Podcast Index — the pagination contract.
 *
 * The Podcast Index has NO offset pagination. `max` is a LIMIT, not a
 * window: `max=50` returns the TOP 50 by the endpoint's own ordering,
 * so the first 25 rows of that response are byte-identical to the
 * `max=25` response. Measured 2026-11-13 against the live endpoints:
 *
 *     first 25 of max=50  === max=25   → true
 *     first 50 of max=100 === max=50   → true
 *
 * Growing the limit is therefore the only pagination the API offers —
 * and it only works if the pages are DE-DUPLICATED when they are
 * concatenated. Without that step every page re-sends the rows the
 * previous page already had:
 *
 *     the catalogue  → 174 rows flattened for 99 unique podcasts
 *     one podcast    → 52 rows flattened for 22 unique episodes
 *
 * and React renders them under duplicate keys ("Encountered two
 * children with the same key").
 *
 * This module is the ONE owner of that contract, shared by the
 * catalogue (`usePodcastsScreen`) and the detail screen
 * (`usePodcastDetailScreen`), so the two cannot drift apart again.
 */

/** The smallest shape the de-dupe needs: an id to key on. */
export interface PodcastPageItem {
  id: number;
}

/**
 * The next `max` window, or `undefined` when the stream is exhausted.
 *
 * The API returns `max` items while more are available and fewer when
 * the result set is exhausted, so a SHORT page ends the stream. The
 * window doubles, capped at the endpoint's ceiling.
 *
 * @param currentMax  the `max` the last page was fetched with
 * @param pageLength  how many rows that page actually carried
 * @param maxResults  the endpoint's ceiling (100 for the catalogue,
 *                    1000 for a feed's episodes)
 */
export function nextPageMax(
  currentMax: number,
  pageLength: number,
  maxResults: number,
): number | undefined {
  if (pageLength === 0) return undefined;
  if (currentMax >= maxResults) return undefined;
  if (pageLength < currentMax) return undefined;
  return Math.min(currentMax * 2, maxResults);
}

/**
 * Flatten growing-limit pages into ONE list with no duplicate ids.
 *
 * Order is preserved (first sighting wins), so the API's own ranking
 * survives the de-dupe.
 */
export function flattenUniqueById<T extends PodcastPageItem>(
  pages: readonly (readonly T[])[],
): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
