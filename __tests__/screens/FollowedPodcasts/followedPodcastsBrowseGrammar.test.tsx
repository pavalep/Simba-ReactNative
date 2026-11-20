/**
 * The "My Podcasts" page follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. **THE PAGE IS A BROWSE PAGE.** It renders the shared shell's
 *    header — instead of a `ScreenContainer` with an `InternalHeader`
 *    inside it.
 * 2. **THE PAGE HAS NO SEARCH AND NO FILTER BUTTON.** The page
 *    declares neither, so the shell draws neither. That is a decision,
 *    not an omission: Apple Podcasts' "Following" and Pocket Casts'
 *    list of followed podcasts are plain lists with no search field,
 *    and the page never had one.
 */

import {screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {FollowedPodcastsScreen} from '../../../src/screens/FollowedPodcasts';
import type {FollowedPodcast} from '../../../src/state';

const mockList: FollowedPodcast[] = [
  {
    id: 7,
    title: 'The Show',
    author: 'The Host',
    image: '',
    feedUrl: 'https://example.test/feed.xml',
    episodeCount: 12,
    followedAt: '2026-11-01T10:00:00.000Z',
  },
];

jest.mock('../../../src/features/followedPodcasts', () => ({
  useFollowedPodcasts: () => ({
    list: mockList,
    items: mockList,
    count: mockList.length,
    unfollow: jest.fn(),
  }),
}));

describe('the "My Podcasts" page — the browse grammar', () => {
  it('renders the shared shell — the header and the row', async () => {
    await renderWithProviders(FollowedPodcastsScreen, {
      routeName: 'FollowedPodcasts',
    });

    // The shared shell's header.
    await waitFor(() => expect(screen.getByText('My Podcasts')).toBeTruthy());
    // The page's own row.
    expect(screen.getByText('The Show')).toBeTruthy();
  });

  it('draws NO search field and NO filter button', async () => {
    await renderWithProviders(FollowedPodcastsScreen, {
      routeName: 'FollowedPodcasts',
    });

    await waitFor(() => expect(screen.getByText('My Podcasts')).toBeTruthy());
    expect(screen.queryByTestId('browse-active-filters')).toBeNull();
    expect(screen.queryByLabelText('Filter My Podcasts options')).toBeNull();
  });
});
