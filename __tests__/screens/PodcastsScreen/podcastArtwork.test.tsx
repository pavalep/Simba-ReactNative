/**
 * The podcast artwork surfaces — the one defect, four places.
 *
 * ## The bug
 *
 * A remote artwork is a FETCH. React Native's `Image` draws nothing until
 * the bytes arrive, and nothing at all if the fetch fails — so a podcast
 * whose cover was still on the wire left an INVISIBLE HOLE where the
 * artwork belonged.
 *
 * It was reported as "the internal page, image not loading" on the
 * Podcast detail screen (a 120 x 120 dp hole), and it carried forward:
 * following a podcast while its cover was still loading left the Home
 * shelf's circle and the "My Podcasts" row empty as well. The stored
 * record was never the problem — the persisted URL is complete and
 * correct — so the hole was purely a missing rendering state.
 *
 * ## The contract
 *
 * Every surface that draws a podcast's artwork shows its OWN tile —
 * the hero's gold cover tile, the row's glyph, the shelf's circle —
 * while the artwork is arriving and if it never arrives. The tile is
 * the app's existing "no artwork yet" vocabulary, not a new affordance:
 * Apple Music, Plex and YouTube Music all show a placeholder tile until
 * the cover decodes.
 *
 * These assertions are the regression: before the fix, a podcast WITH an
 * image rendered no tile at all.
 */

import React from 'react';
import {screen, act, render} from '@testing-library/react-native';

import {ThemeProvider} from '../../../src/theme';
import {HeroSection} from '../../../src/screens/PodcastDetailScreen/components/HeroSection';
import {PodcastRow} from '../../../src/screens/PodcastsScreen/components/PodcastRow';
import {FollowedPodcastsShelf} from '../../../src/screens/Home/components/FollowedPodcastsShelf';
import type {PodcastResult} from '../../../src/types/api';
import type {FollowedPodcast} from '../../../src/features/followedPodcasts';

const ARTWORK = 'https://example.test/cover.jpg';

const PODCAST: PodcastResult = {
  id: 6279364,
  title: 'The Hot Tub Podcast',
  author: 'Stingray Podcast Network',
  description: "It's everyone's favourite #1 radio show!",
  image: ARTWORK,
  feedUrl: 'https://example.test/feed.xml',
  episodeCount: 380,
  categories: {},
};

const FOLLOWED: FollowedPodcast = {
  id: PODCAST.id,
  title: PODCAST.title,
  author: PODCAST.author,
  image: ARTWORK,
  feedUrl: PODCAST.feedUrl,
  episodeCount: PODCAST.episodeCount,
  followedAt: '2026-11-13T17:26:53.411Z',
};

async function renderHero() {
  await render(
    <ThemeProvider>
      <HeroSection
        podcast={PODCAST}
        isFollowed={false}
        isDescriptionExpanded={false}
        onToggleDescription={jest.fn()}
        onToggleFollow={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('The podcast artwork surfaces', () => {
  it('the detail hero shows its tile while the cover is still arriving', async () => {
    await renderHero();

    // The cover HAS a URL, so before the fix this screen showed a bare
    // hole: the artwork was requested and nothing was drawn until it
    // decoded.
    expect(screen.getByTestId('podcast-artwork-image')).toBeOnTheScreen();
    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
  });

  it('the detail hero keeps its tile when the cover fails to load', async () => {
    await renderHero();

    const artwork = screen.getByTestId('podcast-artwork-image');
    await act(async () => {
      (artwork.props.onError as () => void)();
    });

    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
  });

  it('the catalogue row shows its tile while the cover is still arriving', async () => {
    await render(
      <ThemeProvider>
        <PodcastRow item={PODCAST} onPress={jest.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('podcast-artwork-image')).toBeOnTheScreen();
    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
  });

  it('the catalogue row keeps its tile when the cover fails to load', async () => {
    await render(
      <ThemeProvider>
        <PodcastRow item={PODCAST} onPress={jest.fn()} />
      </ThemeProvider>,
    );

    const artwork = screen.getByTestId('podcast-artwork-image');
    await act(async () => {
      (artwork.props.onError as () => void)();
    });

    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
  });

  it('the Home shelf shows its tile while the cover is still arriving', async () => {
    // This is the surface the report called "the home page list": a
    // podcast followed while its cover was loading left an empty circle
    // here that never filled in.
    await render(
      <ThemeProvider>
        <FollowedPodcastsShelf
          items={[FOLLOWED]}
          onPodcastPress={jest.fn()}
          onSeeAll={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('podcast-artwork-image')).toBeOnTheScreen();
    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
  });

  it('the Home shelf keeps its tile when the cover fails to load', async () => {
    await render(
      <ThemeProvider>
        <FollowedPodcastsShelf
          items={[FOLLOWED]}
          onPodcastPress={jest.fn()}
          onSeeAll={jest.fn()}
        />
      </ThemeProvider>,
    );

    const artwork = screen.getByTestId('podcast-artwork-image');
    await act(async () => {
      (artwork.props.onError as () => void)();
    });

    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
  });

  it('a podcast with no artwork still shows its tile, and no empty image', async () => {
    // The other half of the contract: a feed that carries no artwork at
    // all must not mount an image with an empty source.
    await render(
      <ThemeProvider>
        <PodcastRow
          item={{...PODCAST, image: ''}}
          onPress={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('podcast-artwork-placeholder')).toBeOnTheScreen();
    expect(screen.queryByTestId('podcast-artwork-image')).toBeNull();
  });
});
