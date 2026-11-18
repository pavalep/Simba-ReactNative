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
 * The hook-level half of this defect lives in `radioScopeState.test.ts`
 * (the hook owns `hasLoaded`).
 *
 * ONLY THE NETWORK ADAPTER IS STUBBED: the request fails at the source,
 * and everything above it — the hook, the TanStack query, the shared
 * shell — is the real thing.
 */

import {screen, fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

jest.mock('../../../src/infrastructure/api/radioBrowser/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/radioBrowser/adapter',
  );
  const failure = new Error('The network request failed.');
  return {
    ...actual,
    getGenres: jest.fn(async () => []),
    getCountries: jest.fn(async () => []),
    getLanguages: jest.fn(async () => []),
    getTopStations: jest.fn(async () => {
      throw failure;
    }),
    getStationsByFilters: jest.fn(async () => {
      throw failure;
    }),
    searchStations: jest.fn(async () => {
      throw failure;
    }),
    searchStationsWithFilters: jest.fn(async () => {
      throw failure;
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

// The queue wrapper reaches into the media-lib's queue store, which a
// screen test has no business bringing up. The row menu is exercised in
// `radioBrowseGrammar.test.tsx`.
jest.mock('../../../src/hooks/useQueueActions', () => {
  const mock = {playNext: jest.fn(), addToQueue: jest.fn()};
  return {__mock: mock, useQueueActions: () => mock};
});

import * as radioBrowserAdapter from '../../../src/infrastructure/api/radioBrowser/adapter';
import {RadioScreen} from '../../../src/screens/RadioScreen';

const adapter = radioBrowserAdapter as unknown as {
  getTopStations: jest.Mock;
};

async function renderScreen() {
  return await renderWithProviders(RadioScreen, {
    routeName: 'RadioScreen',
  });
}

/**
 * Wait for a piece of copy.
 *
 * The query RETRIES twice before it gives up (`RADIO_BROWSER_RETRIES`),
 * and TanStack backs off between the attempts — so the failure takes a
 * few seconds to surface. That is the app's real behaviour, and the
 * test waits for it rather than pretending it is instant.
 */
async function findText(text: string) {
  await waitFor(() => expect(screen.getByText(text)).toBeTruthy(), {
    timeout: 15000,
  });
}

describe('RadioScreen — a page-1 failure says so', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the error card, not an empty list', async () => {
    await renderScreen();

    await findText('Could not load stations');
  });

  it('says why it could not load', async () => {
    await renderScreen();

    await findText('We could not reach the station directory.');
  });

  it('names the reason under the friendly copy', async () => {
    await renderScreen();

    // The raw reason goes UNDER the message, so the user can report it.
    await findText('The network request failed.');
  });

  it('offers a retry that actually retries', async () => {
    await renderScreen();

    await waitFor(() => expect(screen.getByLabelText('Retry')).toBeTruthy(), {
      timeout: 15000,
    });
    const retry = screen.getByLabelText('Retry');
    const before = adapter.getTopStations.mock.calls.length;

    fireEvent.press(retry);

    // The retry button is wired to the query's own refetch — it used to
    // be absent altogether, and the copy named a control that did not
    // exist.
    await waitFor(() =>
      expect(adapter.getTopStations.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('does not show the empty state when the load failed', async () => {
    await renderScreen();

    // The empty copy must not appear: a failure is not "no stations".
    await findText('Could not load stations');
    expect(screen.queryByText('No stations found.')).toBeNull();
  });
});
