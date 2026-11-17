/**
 * WAVE B13.1 — the catalogue: the domain, and the scope.
 *
 * The catalogue is the whole directory as the app understands it. Two
 * facts the measurements forced, and that these assertions pin:
 *
 *   - the category COUNT is the app's own — `/api/categories.json` does
 *     not serve one (measured: 30 records, 0 occurrences of
 *     `channel_count`), so the count is computed from the rows the app
 *     holds;
 *   - the `Undefined` group (1,558 rows) is NOT a category — it is a
 *     channel with no category.
 */

import {
  buildIPTVCatalogue,
  filterIPTVChannels,
} from '../../../../src/infrastructure/api/iptv/catalogue';
import type {IPTVM3UEntry} from '../../../../src/infrastructure/api/iptv/m3u';

const CATEGORY_NAMES = new Map([
  ['animation', 'Animation'],
  ['news', 'News'],
  ['xxx', 'XXX'],
]);

const COUNTRY_NAMES = new Map([
  ['us', 'United States'],
  ['sg', 'Singapore'],
]);

function entry(over: Partial<IPTVM3UEntry> = {}): IPTVM3UEntry {
  return {
    id: '3ABNKids.us@SD',
    name: '3ABN Kids',
    url: 'https://example.com/kids.m3u8',
    logo: 'https://example.com/kids.png',
    group: 'Animation',
    ...over,
  };
}

describe('iptv catalogue — the build', () => {
  it('resolves the category NAME and the country NAME', () => {
    const {channels} = buildIPTVCatalogue(
      [entry()],
      CATEGORY_NAMES,
      COUNTRY_NAMES,
    );

    expect(channels[0]).toEqual({
      id: '3ABNKids.us@SD',
      name: '3ABN Kids',
      url: 'https://example.com/kids.m3u8',
      image: 'https://example.com/kids.png',
      country: 'United States',
      countryCode: 'us',
      // The playlist carries no language per entry. The field stays
      // empty rather than being invented.
      language: '',
      category: 'Animation',
      categoryId: 'animation',
      isPlayable: true,
    });
  });

  it('counts the channels per category', () => {
    const {categories} = buildIPTVCatalogue(
      [
        entry(),
        entry({id: 'B.us@SD', name: 'B'}),
        entry({id: 'C.sg@SD', name: 'C', group: 'News'}),
      ],
      CATEGORY_NAMES,
      COUNTRY_NAMES,
    );

    const byId = new Map(categories.map(c => [c.id, c]));
    expect(byId.get('animation')?.channelCount).toBe(2);
    expect(byId.get('news')?.channelCount).toBe(1);
    // The category the source serves but that has no channels at all.
    expect(byId.get('xxx')?.channelCount).toBe(0);
  });

  it('gives a channel with no category no category', () => {
    // The `Undefined` group is 1,558 rows of channels the source has no
    // category for. It is not a category called "Undefined".
    const {channels, categories} = buildIPTVCatalogue(
      [entry({group: 'Undefined'})],
      CATEGORY_NAMES,
      COUNTRY_NAMES,
    );

    expect(channels[0].category).toBe('');
    expect(channels[0].categoryId).toBe('');
    expect(categories.map(c => c.id)).not.toContain('undefined');
  });

  it('leaves the country empty when the code is unknown', () => {
    const {channels} = buildIPTVCatalogue(
      [entry({id: 'X.zz@SD'})],
      CATEGORY_NAMES,
      COUNTRY_NAMES,
    );

    expect(channels[0].country).toBe('');
    expect(channels[0].countryCode).toBe('zz');
  });
});

describe('iptv catalogue — the scope', () => {
  const {channels} = buildIPTVCatalogue(
    [
      entry({id: 'A.us@SD', name: 'Alpha News', group: 'News'}),
      entry({id: 'B.sg@SD', name: 'Beta', group: 'News'}),
      entry({id: 'C.us@SD', name: 'Gamma', group: 'Animation'}),
    ],
    CATEGORY_NAMES,
    COUNTRY_NAMES,
  );

  it('returns everything for an empty scope', () => {
    expect(filterIPTVChannels(channels, {})).toHaveLength(3);
    expect(filterIPTVChannels(channels, {categoryId: null, term: ''})).toHaveLength(
      3,
    );
  });

  it('filters by the category ID', () => {
    const filtered = filterIPTVChannels(channels, {categoryId: 'news'});
    expect(filtered.map(c => c.name)).toEqual(['Alpha News', 'Beta']);
  });

  it('matches the category ID case-insensitively', () => {
    // The deep link may carry "News"; the source's id is "news".
    expect(filterIPTVChannels(channels, {categoryId: 'NEWS'})).toHaveLength(2);
  });

  it('matches the term against the name, the country and the category', () => {
    expect(filterIPTVChannels(channels, {term: 'alpha'}).map(c => c.name)).toEqual(
      ['Alpha News'],
    );
    expect(
      filterIPTVChannels(channels, {term: 'singapore'}).map(c => c.name),
    ).toEqual(['Beta']);
    expect(filterIPTVChannels(channels, {term: 'animation'}).map(c => c.name)).toEqual(
      ['Gamma'],
    );
  });

  it('applies the category AND the term together', () => {
    const filtered = filterIPTVChannels(channels, {
      categoryId: 'news',
      term: 'alpha',
    });
    expect(filtered.map(c => c.name)).toEqual(['Alpha News']);
  });

  it('answers nothing for a term that matches nothing', () => {
    expect(filterIPTVChannels(channels, {term: 'zzz-nothing'})).toEqual([]);
  });
});
