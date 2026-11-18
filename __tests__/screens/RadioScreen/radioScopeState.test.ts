/**
 * The Radio hook's scope state.
 *
 * `hasLoaded` used to mean "the query settled" — `!!data || !!error`.
 *
 * That is wrong, and the error case is the one that matters: when the
 * FIRST page failed there is no data, so `hasLoaded` was true anyway.
 * Both of the screen's failure branches tested `!hasLoaded`, so a
 * page-1 failure fell through every branch and rendered an EMPTY LIST
 * — no message, no spinner, no retry, and the failure toast never
 * fired either.
 *
 * `hasLoaded` now means "the query settled WITH DATA":
 *
 *   hasLoaded: !!query.data
 *
 * This file pins that. The screen's half of the defect is in
 * `radioFailureState.test.tsx`.
 */

import {renderHook} from '@testing-library/react-native';

interface StationsQuery {
  data: {pages: unknown[]} | undefined;
  error: Error | null;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  isFetchNextPageError: boolean;
  fetchNextPage: jest.Mock;
  refetch: jest.Mock;
}

// The name must start with `mock` — babel's jest-hoist plugin refuses
// to let a mock factory close over anything else.
const mockStations: StationsQuery = {
  data: undefined,
  error: null,
  isFetching: false,
  isFetchingNextPage: false,
  hasNextPage: undefined,
  isFetchNextPageError: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
};

jest.mock('../../../src/hooks/useApiQuery', () => ({
  useApiQuery: () => ({
    data: undefined,
    error: null,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: undefined,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  }),
  useInfiniteApiQuery: () => mockStations,
}));

jest.mock('../../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({isOnline: true}),
}));

import {
  useRadioScreen,
  EMPTY_RADIO_SCOPE,
} from '../../../src/screens/RadioScreen/hooks/useRadioScreen';

describe('useRadioScreen — the scope state', () => {
  beforeEach(() => {
    mockStations.data = undefined;
    mockStations.error = null;
    mockStations.isFetching = false;
    mockStations.isFetchingNextPage = false;
    mockStations.hasNextPage = undefined;
    mockStations.isFetchNextPageError = false;
  });

  it('is NOT loaded when the first page failed', async () => {
    mockStations.error = new Error('The network request failed.');

    const {result} = await renderHook(() => useRadioScreen(EMPTY_RADIO_SCOPE));

    // The whole defect in one line: a failed first page used to set
    // this to TRUE, which skipped every failure branch on the screen.
    expect(result.current.hasLoaded).toBe(false);
  });

  it('still reports the error', async () => {
    mockStations.error = new Error('The network request failed.');

    const {result} = await renderHook(() => useRadioScreen(EMPTY_RADIO_SCOPE));

    expect(result.current.error).toBe('The network request failed.');
  });

  it('is loaded when data arrived', async () => {
    mockStations.data = {pages: [[{id: 'a', name: 'A', url: 'http://a'}]]};

    const {result} = await renderHook(() => useRadioScreen(EMPTY_RADIO_SCOPE));

    expect(result.current.hasLoaded).toBe(true);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("reports the source's own hasMore, not a re-derived guess", async () => {
    mockStations.data = {pages: [[{id: 'a'}]]};
    mockStations.hasNextPage = false;

    const {result} = await renderHook(() => useRadioScreen(EMPTY_RADIO_SCOPE));

    // The screen used to re-derive this from a SECOND copy of the page
    // size, so "maybe more" showed whenever the loaded count happened
    // to be a multiple of 30 — and the footer's retry button did
    // nothing.
    expect(result.current.hasMore).toBe(false);
  });

  it('keeps the FIRST page failure and the LOAD-MORE failure apart', async () => {
    // ONE FAILURE, ONE MESSAGE. The list's error is the error card's
    // business; the footer's copy is only for a failed load-more.
    mockStations.data = {pages: [[{id: 'a'}]]};
    mockStations.error = new Error('The network request failed.');
    mockStations.isFetchNextPageError = true;

    const {result} = await renderHook(() => useRadioScreen(EMPTY_RADIO_SCOPE));

    expect(result.current.pageError).toBe('The network request failed.');
  });
});
