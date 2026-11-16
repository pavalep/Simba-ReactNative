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
 */

import React from 'react';
import {screen, render} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {toRadioTagRow} from '../../../src/screens/RadioScreenNew/related/stationRow';
import {stationSubtitle} from '../../../src/screens/RadioScreenNew/related/stationRow';

describe('Radio — the filter rows carry a real key', () => {
  it('keys a tag by its NAME', () => {
    // The live shape: the tag has a name and a station count, and NO id.
    const row = toRadioTagRow({name: 'pop', stationCount: 5139});

    expect(row.key).toBe('pop');
    expect(row.label).toBe('pop');
  });

  it('never produces an undefined key', () => {
    const rows = [
      {name: 'pop', stationCount: 5139},
      {name: 'rock', stationCount: 2617},
      {name: 'news', stationCount: 2691},
    ].map(toRadioTagRow);

    for (const row of rows) {
      expect(typeof row.key).toBe('string');
      expect(row.key.length).toBeGreaterThan(0);
    }
    // Every chip in a group must have its OWN key — the sheet renders
    // them with `key={row.key || \`${group.id}-empty\`}`.
    expect(new Set(rows.map(r => r.key)).size).toBe(rows.length);
  });

  it('is the same name the source filters on', () => {
    // The adapter sends `params.tag = filters.genre`, and
    // `getChannelsByCategory`-style matching compares against the NAME.
    const row = toRadioTagRow({name: 'Sports', stationCount: 10});
    expect(row.key).toBe('Sports');
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
