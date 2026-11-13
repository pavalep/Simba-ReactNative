/**
 * `FollowedPodcastsScreen` — "My Podcasts".
 *
 * ## Why this page exists
 *
 * The Home page's "Followed Podcasts" rail carried a "See All" link that
 * pointed at `PodcastsScreen` — the CATALOGUE, which filters and searches
 * the Podcast Index and does not list the podcasts the user follows. The
 * link answered a question the page could not answer.
 *
 * These three assertions pin the page that can answer it:
 *
 *   1. It lists what the user follows.
 *   2. It says so when they follow nothing — an empty PAGE says so
 *      (an empty ROW is not drawn; a page with nothing on it must).
 *   3. A row can unfollow — the action the page exists for.
 */

import {screen, fireEvent} from '@testing-library/react-native';
import {StyleSheet} from 'react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

/** The styles of an element, flattened into one object. */
function flattenStyle(style: unknown): Record<string, unknown> {
  return (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
}

// The list is a module-level `let` so each test can hand the screen a
// different library. The mock factory only creates a closure — it reads
// `mockList` when the hook is CALLED, which is at render time.
let mockList: FollowedPodcast[] = [];
const mockUnfollow = jest.fn();

jest.mock('../../../src/features/followedPodcasts', () => ({
  useFollowedPodcasts: () => ({
    list: mockList,
    items: mockList,
    count: mockList.length,
    unfollow: mockUnfollow,
  }),
}));

import {FollowedPodcastsScreen} from '../../../src/screens/FollowedPodcasts/components/FollowedPodcastsScreen';
import type {FollowedPodcast} from '../../../src/features/followedPodcasts';

function makePodcast(overrides: Partial<FollowedPodcast> = {}): FollowedPodcast {
  return {
    id: 1,
    title: 'The Show',
    author: 'The Host',
    image: '',
    feedUrl: 'https://example.test/feed.xml',
    episodeCount: 12,
    followedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

async function renderScreen() {
  return await renderWithProviders(FollowedPodcastsScreen, {
    routeName: 'FollowedPodcasts',
  });
}

describe('FollowedPodcastsScreen — My Podcasts', () => {
  beforeEach(() => {
    mockList = [];
    mockUnfollow.mockReset();
  });

  it('lists the podcasts the user follows', async () => {
    mockList = [makePodcast({id: 7, title: 'The Show', author: 'The Host'})];
    await renderScreen();

    expect(screen.getByText('The Show')).toBeOnTheScreen();
    expect(screen.getByText('The Host')).toBeOnTheScreen();
  });

  it('says so when nothing is followed', async () => {
    await renderScreen();

    expect(screen.getByText('No podcasts followed yet')).toBeOnTheScreen();
  });

  it('unfollows from the row', async () => {
    mockList = [makePodcast({id: 7, title: 'The Show'})];
    await renderScreen();

    fireEvent.press(screen.getByLabelText('Unfollow The Show'));

    expect(mockUnfollow).toHaveBeenCalledWith(7);
  });

  it('gives the row the podcast’s identity, so a screen reader says who it is', async () => {
    // The press itself navigates to `PodcastDetail`, and the PARAMETERS
    // of that navigation are pinned by the type system
    // (`podcastId` is the only param, so a missing one is a compile
    // error). What is worth pinning here is the ROW: it must carry the
    // podcast's identity in its own label, or a screen-reader user
    // hears "button" eight times in a row.
    mockList = [makePodcast({id: 7, title: 'The Show', author: 'The Host'})];
    await renderScreen();

    expect(screen.getByLabelText('Open podcast The Show by The Host')).toBeOnTheScreen();
  });

  it('uses the catalogue’s row grammar — art, title and author, and no episode count', async () => {
    // The Home rail shows title + author; this page used to add the
    // episode count as well, so the same podcast showed two different
    // amounts of information on two screens a swipe apart.
    mockList = [makePodcast({id: 7, title: 'The Show', author: 'The Host', episodeCount: 12})];
    await renderScreen();

    expect(screen.getByText('The Show')).toBeOnTheScreen();
    expect(screen.getByText('The Host')).toBeOnTheScreen();
    expect(screen.queryByText(/12 episodes/)).toBeNull();
  });

  it('gives the Unfollow action a real touch target', async () => {
    mockList = [makePodcast({id: 7, title: 'The Show'})];
    await renderScreen();

    const unfollow = screen.getByLabelText('Unfollow The Show');
    const style = flattenStyle(unfollow.props.style);

    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
  });
});
