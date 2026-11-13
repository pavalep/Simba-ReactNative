/**
 * `HeroSection` — the detail screen's follow action.
 *
 * The follow button used to carry the BOOKMARK glyph, which belongs
 * to the app's separate Bookmarks feature, and it read "Following" in
 * the same gold-outline style as "Follow" — nothing on screen said
 * whether the podcast was followed.
 *
 * It is a STATE PILL now: outlined "Follow" until the podcast is
 * followed, then a solid gold "✓ Following".
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {HeroSection} from '../../../src/screens/PodcastDetailScreen/components/HeroSection';
import type {PodcastResult} from '../../../src/types/api';

const PODCAST: PodcastResult = {
  id: 8048224,
  title: 'The Big Story | WIRED',
  author: 'WIRED',
  description: 'Big stories.',
  image: '',
  feedUrl: 'https://example.test/feed.xml',
  episodeCount: 22,
  categories: {},
};

async function renderHero(isFollowed: boolean) {
  await render(
    <ThemeProvider>
      <HeroSection
        podcast={PODCAST}
        isFollowed={isFollowed}
        isDescriptionExpanded={false}
        onToggleDescription={jest.fn()}
        onToggleFollow={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('HeroSection — the follow pill', () => {
  it('offers an outlined "Follow" when the podcast is not followed', async () => {
    await renderHero(false);

    expect(screen.getByText('Follow')).toBeOnTheScreen();
    expect(screen.queryByText('Following')).toBeNull();
    expect(screen.getByLabelText('Follow podcast')).toBeOnTheScreen();
  });

  it('says "Following" when the podcast is followed', async () => {
    await renderHero(true);

    expect(screen.getByText('Following')).toBeOnTheScreen();
    expect(screen.queryByText('Follow')).toBeNull();
    expect(screen.getByLabelText('Unfollow podcast')).toBeOnTheScreen();
  });

  it('marks the followed state for a screen reader', async () => {
    await renderHero(true);

    expect(
      screen.getByLabelText('Unfollow podcast').props.accessibilityState,
    ).toEqual({selected: true});
  });
});
