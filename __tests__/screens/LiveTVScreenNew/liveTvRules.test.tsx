/**
 * WAVE B13.1 — the Live TV screen's own rules.
 *
 * Three of them were broken in ways a reader could not see.
 *
 * 1. THE PAGE NEVER LOADED. The adapter read `api/channels.json` and
 *    demanded a stream URL from every record — a field that file does
 *    not have (measured: 31,843 records, 0 occurrences of `url`). The
 *    whole batch was rejected, so the screen showed the error card for
 *    every channel, forever.
 *
 * 2. THE LIST WAS NOT ALWAYS A LIST. The screen returned the loading
 *    state INSTEAD of the `FlatList`, and the error state replaced it
 *    too — so there was no list, and so no pull-to-refresh, while the
 *    first page was loading, and none after a failed first load either.
 *    The gesture the user reaches for was not there. The list is now
 *    always mounted and the states live inside it, the way Music, Movies
 *    and Podcasts do it.
 *
 * 3. THE CATEGORY SPOKE TWO LANGUAGES. The filter held the category's
 *    NAME, while the deep link carried its ID and the source's own
 *    group-title is the ID — so a deep link's id had to be translated
 *    into a name before it could match anything, and the sheet's rows
 *    were keyed by the name. Both sides speak the ID now; the NAME is
 *    only ever displayed.
 */

import React from 'react';
import {screen, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

// ─── The hook is the seam ────────────────────────────────────────
//
// The mutable state lives INSIDE the mock factory. A module-scope `const`
// would be in the temporal dead zone when the factory runs (babel hoists
// `jest.mock` above the imports), so the mock reads its state through
// this handle instead.
jest.mock('../../../src/screens/LiveTVScreenNew/hooks/useLiveTVBrowser', () => {
  const mock = {
    scope: {
      items: [] as unknown[],
      hasLoaded: false,
      isLoading: false,
      isLoadingMore: false,
      error: null as string | null,
    },
    filters: {category: null as string | null},
    categoryName: '',
    isOnline: true,
    hasMore: false,
    retry: jest.fn(),
  };
  return {
    __mock: mock,
    useLiveTVBrowser: () => ({
      filters: mock.filters,
      setFilter: jest.fn(),
      resetFilters: jest.fn(),
      activeFilterCount: mock.filters.category ? 1 : 0,
      categoryName: mock.categoryName,
      searchQuery: '',
      setSearchQuery: jest.fn(),
      setSearchTerm: jest.fn(),
      isSearchActive: false,
      isOnline: mock.isOnline,
      getScope: () => mock.scope,
      loadMore: jest.fn(),
      retry: mock.retry,
      refreshing: false,
      handleRefresh: jest.fn(),
      hasMore: mock.hasMore,
      tags: {
        categories: [
          {id: 'news', name: 'News', channelCount: 1000},
          {id: 'animation', name: 'Animation', channelCount: 900},
        ],
      },
      tagsLoaded: true,
      isFavoriteId: () => false,
      toggleFavorite: jest.fn(),
    }),
  };
});

// The player and the mini-player dock need a mounted player, which a
// screen test has no business bringing up.
jest.mock('../../../src/infrastructure/player', () => ({
  resolveStreamType: (kind: string) =>
    kind === 'live-tv' ? 'video' : 'audio',
  useResumeAwareLaunch: () => ({openPlayer: jest.fn()}),
}));

jest.mock('../../../src/infrastructure/player/miniPlayerChrome', () => ({
  useBottomChromeInset: () => 0,
}));

jest.mock('../../../src/hooks/useKeyboard', () => ({
  useKeyboard: () => ({keyboardVisible: false}),
}));

import * as liveTvHook from '../../../src/screens/LiveTVScreenNew/hooks/useLiveTVBrowser';
import {LiveTVScreenNew} from '../../../src/screens/LiveTVScreenNew/components/LiveTVContent';

interface MockHandle {
  scope: {
    items: unknown[];
    hasLoaded: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
  };
  filters: {category: string | null};
  categoryName: string;
  isOnline: boolean;
  hasMore: boolean;
  retry: jest.Mock;
}

const mock = (liveTvHook as unknown as {__mock: MockHandle}).__mock;

async function renderScreen() {
  return await renderWithProviders(LiveTVScreenNew, {
    routeName: 'LiveTVScreen',
  });
}

describe('LiveTVScreen — the list is always a list', () => {
  beforeEach(() => {
    mock.retry.mockReset();
    mock.isOnline = true;
    mock.hasMore = false;
    mock.filters = {category: null};
    mock.categoryName = '';
    mock.scope = {
      items: [],
      hasLoaded: false,
      isLoading: false,
      isLoadingMore: false,
      error: null,
    };
  });

  it('keeps the list mounted while the first page loads', async () => {
    mock.scope.isLoading = true;
    await renderScreen();

    // The list is mounted, so the pull-to-refresh control exists —
    // the gesture is available even while the page is loading.
    expect(screen.getByTestId('section-LiveTVScreen-list')).toBeTruthy();
  });

  it('keeps the list mounted after a failed first load', async () => {
    mock.scope.error = 'The network request failed.';
    await renderScreen();

    expect(screen.getByTestId('section-LiveTVScreen-list')).toBeTruthy();
    expect(screen.getByText('Could not load channels')).toBeTruthy();
  });

  it('shows the ONE loading component of the browse family', async () => {
    mock.scope.isLoading = true;
    await renderScreen();

    // The shared pill — `browse-loading-state` is the shared component's
    // own testID, so this asserts the SHARED one and not a local copy.
    expect(screen.getByTestId('browse-loading-state')).toBeTruthy();
    expect(screen.getByText('Loading channels…')).toBeTruthy();
  });

  it('does not show the empty state while it is loading', async () => {
    mock.scope.isLoading = true;
    await renderScreen();

    expect(screen.queryByText('No channels found.')).toBeNull();
  });
});

describe('LiveTVScreen — the category speaks one language', () => {
  beforeEach(() => {
    mock.retry.mockReset();
    mock.isOnline = true;
    mock.hasMore = false;
    mock.filters = {category: 'news'};
    mock.categoryName = 'News';
    mock.scope = {
      items: [],
      hasLoaded: true,
      isLoading: false,
      isLoadingMore: false,
      error: null,
    };
  });

  it('shows the category NAME on the chip, not its id', async () => {
    await renderScreen();

    // The filter holds the id (`news`); the chip reads the name. The
    // chip is found through its OWN accessible label, because the
    // filter sheet draws the same word on its row.
    const chip = screen.getByLabelText('Clear News filter');
    expect(within(chip).getByText('News')).toBeTruthy();
  });

  it('names the category in the chip\'s own accessible label', async () => {
    await renderScreen();

    expect(
      screen.getByLabelText('Clear News filter'),
    ).toBeTruthy();
  });
});
