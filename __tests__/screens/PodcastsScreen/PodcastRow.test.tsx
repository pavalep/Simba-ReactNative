/**
 * `PodcastRow` — the catalogue's row.
 *
 * The row carries three things: the podcast's own artwork, its title
 * and its author. It used to carry a fourth — an "{n} ep." badge —
 * which could never render on this screen: the catalogue's two
 * endpoints (`/podcasts/trending` and `/search/byterm`) do not send
 * `episodeCount` at all, and the badge was gated on that field.
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {PodcastRow} from '../../../src/screens/PodcastsScreen/components/PodcastRow';
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

async function renderRow(item: PodcastResult = PODCAST) {
  await render(
    <ThemeProvider>
      <PodcastRow item={item} onPress={jest.fn()} />
    </ThemeProvider>,
  );
}

describe('PodcastRow — the catalogue row', () => {
  it('shows the title and the author', async () => {
    await renderRow();

    expect(screen.getByText('The Big Story | WIRED')).toBeOnTheScreen();
    expect(screen.getByText('WIRED')).toBeOnTheScreen();
  });

  it('never shows an episode count — the catalogue endpoints do not send one', async () => {
    // The episode count is real data here (the detail endpoint sends
    // it) — the badge simply does not belong on this row.
    await renderRow();

    expect(screen.queryByText(/22 ep/)).toBeNull();
    expect(screen.queryByText(/22 episodes/)).toBeNull();
  });
});
