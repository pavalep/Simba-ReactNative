/**
 * The app's CURATED podcast genres and their Podcast Index ids.
 *
 * Ten of the twelve ids this catalogue used to carry pointed at a
 * DIFFERENT genre than the label said — id 10 is Careers, not Music;
 * id 55 is News, not Sports — so the app asked Podcast Index for one
 * thing and showed the user another. The mapping below is measured
 * against the live `/categories/list` taxonomy (2026-11-13, 112
 * items) and is pinned here so it cannot rot again.
 */

import {
  PODCAST_CATEGORIES,
  type PodcastCategory,
} from '../../src/constants/podcastCategories';

/** The curated set, with the ids the live taxonomy uses. */
const EXPECTED: Array<[number | 'all', string]> = [
  ['all', 'All'],
  [1, 'Arts'],
  [53, 'Music'],
  [9, 'Business'],
  [16, 'Comedy'],
  [20, 'Education'],
  [29, 'Health'],
  [102, 'Technology'],
  [28, 'History'],
  [55, 'News'],
  [67, 'Science'],
  [86, 'Sports'],
];

describe('PODCAST_CATEGORIES — the curated genre set', () => {
  it('maps every genre to the Podcast Index id that really is that genre', () => {
    const actual = PODCAST_CATEGORIES.map(
      (c: PodcastCategory) => [c.id, c.name] as [number | 'all', string],
    );

    expect(actual).toEqual(EXPECTED);
  });

  it('puts "All" first — it is the unfiltered catalogue', () => {
    expect(PODCAST_CATEGORIES[0].id).toBe('all');
  });

  it('carries a glyph for every genre', () => {
    for (const category of PODCAST_CATEGORIES) {
      expect(category.icon).toBeTruthy();
    }
  });

  it('carries a cover plate for every genre that has one', () => {
    const withPlate = PODCAST_CATEGORIES.filter(c => !!c.image);
    const withoutPlate = PODCAST_CATEGORIES.filter(c => !c.image);

    // Science and Sports have no plate of their own — the shelf draws
    // the app's `goldSoft` plate with the glyph badge on top for them,
    // rather than pointing at another genre's picture.
    expect(withoutPlate.map(c => c.name)).toEqual(['Science', 'Sports']);
    expect(withPlate).toHaveLength(PODCAST_CATEGORIES.length - 2);
  });

  it('does not offer TV & Film — the API splits it into TV and Film', () => {
    expect(
      PODCAST_CATEGORIES.some(c => c.name === 'TV & Film'),
    ).toBe(false);
  });

  it('has no duplicate ids', () => {
    const ids = PODCAST_CATEGORIES.map(c => String(c.id));

    expect(new Set(ids).size).toBe(ids.length);
  });
});
