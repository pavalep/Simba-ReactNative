/**
 * The Radio screen's own rules.
 *
 * Two of them were broken in ways a reader could not see:
 *
 * 1. The Genre / Country / Language filters could NEVER be applied.
 *    `toRadioTagRow` read `.id` off a tag that has no `id` — the live
 *    endpoint returns `{name, stationcount}` and the adapter maps it to
 *    `{name, stationCount}` — behind an `as unknown[]` cast. So every
 *    chip's key was `undefined`: the chips collapsed onto one React key,
 *    the selection was never marked, and the chosen value was thrown
 *    away before the request was built. The sheet was inert.
 *
 * 2. A page-1 failure rendered a BLANK LIST. `hasLoaded` meant "the
 *    query settled" (`!!data || !!error`), and the screen's failure
 *    branches tested `!hasLoaded` — so on a failure every branch was
 *    skipped and the user got an empty list with no message, no spinner,
 *    no button, and no toast.
 *
 * The tag → option mapping moved to `related/browseConfig.ts` when the
 * screen moved onto the shared browse shell: a tag is a FILTER OPTION,
 * not a station row, and the option model is built where the config is
 * built.
 */

import {toRadioTagOption} from '../../../src/screens/RadioScreen/related/browseConfig';
import {
  stationSubtitle,
  stationQueueItem,
} from '../../../src/screens/RadioScreen/related/stationRow';

describe('Radio — the filter options carry a real key', () => {
  it('keys a tag by its NAME', () => {
    // The live shape: the tag has a name and a station count, and NO id.
    const option = toRadioTagOption({name: 'pop', stationCount: 5139});

    expect(option.key).toBe('pop');
    expect(option.label).toBe('pop');
  });

  it('never produces an undefined key', () => {
    const options = [
      {name: 'pop', stationCount: 5139},
      {name: 'rock', stationCount: 2617},
      {name: 'news', stationCount: 2691},
    ].map(toRadioTagOption);

    for (const option of options) {
      expect(typeof option.key).toBe('string');
      expect(option.key.length).toBeGreaterThan(0);
    }
    // Every chip in a group must have its OWN key.
    expect(new Set(options.map(o => o.key)).size).toBe(options.length);
  });

  it('is the same name the source filters on', () => {
    // The adapter sends `params.tag = filters.genre`, and the radio
    // browser filters on the tag's NAME.
    const option = toRadioTagOption({name: 'Sports', stationCount: 10});
    expect(option.key).toBe('Sports');
  });
});

describe('Radio — one subtitle rule', () => {
  it('is the country and the FIRST tag', () => {
    expect(stationSubtitle({country: 'Germany', tags: 'pop,rock,news'})).toBe(
      'Germany · pop',
    );
  });

  it('copes with a missing half', () => {
    expect(stationSubtitle({country: 'Germany'})).toBe('Germany');
    expect(stationSubtitle({tags: 'pop'})).toBe('pop');
    expect(stationSubtitle({})).toBe('');
  });
});

describe('Radio — a station is classified truthfully', () => {
  it('is an API stream on the audio lane, and its KIND is radio', () => {
    const item = stationQueueItem({
      url: 'https://stream.example/station',
      name: 'Example FM',
    });

    expect(item.uri).toBe('https://stream.example/station');
    expect(item.title).toBe('Example FM');
    expect(item.source).toBe('api');
    // The KIND — the app has a label for it (`src/types/media.ts`:
    // radio → 'Radio'), and the lane is DERIVED from it.
    expect(item.type).toBe('radio');
    expect(item.mediaType).toBe('audio');
    // The provider is the ADAPTER's name, not the kind again.
    expect(item.provider).toBe('radioBrowser');
  });
});
