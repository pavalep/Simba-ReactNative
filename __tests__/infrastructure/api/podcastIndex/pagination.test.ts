/**
 * The Podcast Index pagination contract.
 *
 * The Podcast Index has NO offset pagination — `max` is a LIMIT, not a
 * window — so the app grows the limit and concatenates the pages. That
 * only works if the pages are de-duplicated when they are concatenated:
 * `max=50` re-sends the first 25 rows of `max=25` verbatim.
 *
 * Measured on the live API (2026-11-13):
 *
 *   the catalogue  → 174 rows flattened for 99 unique podcasts
 *   one podcast    → 52 rows flattened for 22 unique episodes
 *
 * Both numbers are reproduced here, because a de-dupe that is right for
 * one list and wrong for the other is the failure this module exists
 * to prevent.
 */

import {
  flattenUniqueById,
  nextPageMax,
} from '../../../../src/infrastructure/api/podcastIndex/pagination';

interface Row {
  id: number;
}

/** `n` rows with ids 1…n — what the API returns for `max=n`. */
function page(n: number): Row[] {
  return Array.from({length: n}, (_, i) => ({id: i + 1}));
}

describe('Podcast Index — the growing-`max` window', () => {
  it('doubles the window while the page is full', () => {
    expect(nextPageMax(25, 25, 100)).toBe(50);
    expect(nextPageMax(50, 50, 100)).toBe(100);
  });

  it('stops on a short page — the result set is exhausted', () => {
    expect(nextPageMax(25, 12, 100)).toBeUndefined();
  });

  it('stops on an empty page', () => {
    expect(nextPageMax(25, 0, 100)).toBeUndefined();
  });

  it('stops at the endpoint ceiling', () => {
    expect(nextPageMax(100, 100, 100)).toBeUndefined();
    // The episode feed's own ceiling is higher.
    expect(nextPageMax(500, 500, 1000)).toBe(1000);
  });
});

describe('Podcast Index — de-duplicating the nested pages', () => {
  it('keeps one row per id and preserves the API order', () => {
    const rows = flattenUniqueById([
      [{id: 3}, {id: 1}],
      [{id: 2}, {id: 1}],
    ]);

    expect(rows.map(r => r.id)).toEqual([3, 1, 2]);
  });

  it('renders 99 podcasts where the raw pages carried 174 rows', () => {
    // The catalogue: max 25 → 50 → 100 (99 feeds).
    const pages = [page(25), page(50), page(99)];
    const raw = pages.flat();

    expect(raw).toHaveLength(174);
    expect(flattenUniqueById(pages)).toHaveLength(99);
  });

  it('renders 22 episodes where the raw pages carried 52 rows', () => {
    // One podcast's feed: max 10 → 20 → 40 (22 episodes).
    const pages = [page(10), page(20), page(22)];
    const raw = pages.flat();

    expect(raw).toHaveLength(52);
    expect(flattenUniqueById(pages)).toHaveLength(22);
  });

  it('gives every row a unique id — the React key the list renders on', () => {
    const rows = flattenUniqueById([page(25), page(50), page(99)]);
    const ids = new Set(rows.map(r => r.id));

    expect(ids.size).toBe(rows.length);
  });

  it('leaves an empty page list empty', () => {
    expect(flattenUniqueById([])).toEqual([]);
  });
});
