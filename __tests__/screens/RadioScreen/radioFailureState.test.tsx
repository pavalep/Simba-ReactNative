/**
 * The Radio screen's failure state.
 *
 * A page-1 failure used to render a BLANK LIST.
 *
 * `hasLoaded` meant "the query settled" (`!!data || !!error`), and the
 * screen's failure branches tested `!hasLoaded` — so on a failure every
 * branch was skipped: no message, no spinner, no button, and the
 * "Could not load stations." toast never fired either. The user got an
 * empty screen with nothing on it.
 *
 * These assertions are the regression. The error card is the app's own
 * `ErrorState`, and it owns the retry button — the copy that used to sit
 * in a `Placeholder` ("Use Retry at the bottom of the screen to try
 * again.") named a control that did not exist.
 *
 * The hook-level half of this defect lives in
 * `radioScopeState.test.ts` (the hook owns `hasLoaded`).
 */

import React from 'react';
import {screen, fireEvent, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

// ─── The hook is the seam ────────────────────────────────────────
//
// The mutable state lives INSIDE the mock factory. A module-scope
// `const` would be in the temporal dead zone when the factory runs
// (babel hoists `jest.mock` above the imports), so the mock reads
// its state through this handle instead.
jest.mock('../../../src/screens/RadioScreen/hooks/useRadioBrowser', () => {
  const mock = {
    scope: {
      items: [] as unknown[],
      hasLoaded: false,
      isLoading: false,
      isLoadingMore: false,
      error: null as string | null,
    },
    isOnline: true,
    hasMore: false,
    retry: jest.fn(),
  };
  return {
    __mock: mock,
    useRadioBrowser: () => ({
      filters: {genre: null, country: null, language: null},
      setFilter: jest.fn(),
      resetFilters: jest.fn(),
      activeFilterCount: 0,
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
      tags: {genres: [], countries: [], languages: []},
      tagsLoaded: true,
      tagsReady: {genres: true, countries: true, languages: true},
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

import * as radioBrowserHook from '../../../src/screens/RadioScreen/hooks/useRadioBrowser';
import {RadioScreen} from '../../../src/screens/RadioScreen/components/RadioContent';

interface MockHandle {
  scope: {
    items: unknown[];
    hasLoaded: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
  };
  isOnline: boolean;
  hasMore: boolean;
  retry: jest.Mock;
}

const mock = (radioBrowserHook as unknown as {__mock: MockHandle}).__mock;

async function renderScreen() {
  return await renderWithProviders(RadioScreen, {
    routeName: 'RadioScreen',
  });
}

/**
 * Walk up from a node until an ancestor also contains a "Retry" label.
 *
 * That ancestor is the error card — the toast is a SIBLING of the
 * screen, so it is never on this path.
 */
function ancestorWithRetry(node: {
  parent: unknown;
}): ReturnType<typeof screen.getByText> | null {
  let current = node.parent as ReturnType<typeof screen.getByText> | null;
  while (current) {
    if (within(current).queryAllByText('Retry').length > 0) return current;
    current = current.parent as ReturnType<typeof screen.getByText> | null;
  }
  return null;
}

describe('RadioScreen — a page-1 failure says so', () => {
  beforeEach(() => {
    mock.retry.mockReset();
    mock.isOnline = true;
    mock.hasMore = false;
    mock.scope = {
      items: [],
      hasLoaded: false,
      isLoading: false,
      isLoadingMore: false,
      error: 'The network request failed.',
    };
  });

  it('shows the error card, not an empty list', async () => {
    await renderScreen();

    expect(screen.getByText('Could not load stations')).toBeTruthy();
  });

  it('says why it could not load', async () => {
    await renderScreen();

    expect(
      screen.getByText('We could not reach the station directory.'),
    ).toBeTruthy();
  });

  it('names the reason under the friendly copy', async () => {
    await renderScreen();

    // The raw reason goes UNDER the message, so the user can report it.
    expect(screen.getByText('The network request failed.')).toBeTruthy();
  });

  it('offers a retry that actually retries', async () => {
    await renderScreen();

    // The failure ALSO raises a toast, and the toast carries its own
    // "Retry" action — so the label is not unique on screen. Scope the
    // press to the ERROR CARD: it is the one that owns the button, and
    // it is the one that used to be missing.
    //
    // (RNTL's role queries cannot be used here: the error card's root
    // is a plain `View` with `accessibilityRole="alert"` and no
    // `accessible` prop, which RNTL does not treat as an accessibility
    // element — so `getByRole('alert')` finds nothing.)
    const card = ancestorWithRetry(screen.getByText('Could not load stations'));
    expect(card).toBeTruthy();

    fireEvent.press(within(card as never).getByText('Retry'));
    expect(mock.retry).toHaveBeenCalled();
  });

  it('announces the failure in a toast as well', async () => {
    await renderScreen();

    // The toast was unreachable too: it was gated on `!hasLoaded`,
    // which a failed first page made false.
    expect(screen.getByText('Could not load stations.')).toBeTruthy();
  });

  it('says it is offline when it is offline', async () => {
    mock.isOnline = false;
    await renderScreen();

    expect(screen.getByText("You're offline")).toBeTruthy();
    expect(
      screen.getByText('Check your connection and try again.'),
    ).toBeTruthy();
  });

  it('does not show the empty state when the load failed', async () => {
    await renderScreen();

    // The empty copy must not appear: a failure is not "no stations".
    expect(screen.queryByText('No stations found.')).toBeNull();
  });

  it('shows the error card even when the query calls itself loaded', async () => {
    // The ADVERSARIAL state: the query settled, it carries an error, and
    // it reports itself as "loaded".
    //
    // That is exactly what the old hook produced on a failed first page
    // (`!!data || !!error`), and the old screen branch tested
    // `!hasLoaded` — so it rendered a BLANK LIST.
    //
    // The screen's error branch must therefore NOT depend on
    // `hasLoaded`. An error with no rows is an error, full stop.
    mock.scope.hasLoaded = true;
    await renderScreen();

    expect(screen.getByText('Could not load stations')).toBeTruthy();
    expect(screen.queryByText('No stations found.')).toBeNull();
  });
});
