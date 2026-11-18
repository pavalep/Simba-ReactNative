/**
 * The Shows screen follows the browse grammar.
 *
 * ## What this pins
 *
 * The Shows screen used to be a browse page of its own: its own
 * `InternalHeader`, its own `SearchBar`, its own "Search / Browse"
 * `FilterChips` row, its own `Placeholder` states, its own second list for
 * "Airing Today", and inline `StyleSheet.create` objects in the
 * component. It is now the shared browse shell, with ONE scope-driven
 * query and ONE list.
 *
 * The claims under test:
 *
 *   1. THE SCREEN IS A BROWSE SCREEN. It renders the shared shell's
 *      search field and its filter button — the same affordances the
 *      Music, Movies, Podcasts and Audiobooks screens have — instead of
 *      its own.
 *   2. THE SCOPE IS ONE THING AT A TIME. A term makes the feed answer
 *      the term; the "Airing today" scope makes it answer the schedule;
 *      the catalogue is what it answers when the user has done neither.
 *      TVMaze cannot do two of them in one request, so the hook asks for
 *      exactly one.
 *   3. THE "AIRING TODAY" RAIL IS THE LIST'S HEADER. It lives in the
 *      FlatList's header slot, so it scrolls WITH the catalogue and the
 *      shell still hosts ONE list. It is drawn in the catalogue scope
 *      only: the term scope answers a different question, and the today
 *      scope's list IS the schedule.
 *   4. THE CATALOGUE PAGES. The old rule stopped the list after the
 *      FIRST page — TVMaze returns 235-250 shows per page, so "shorter
 *      than 250" was true on page 1 (245 shows) — while the footer said
 *      "You're all caught up." The next page is asked for by the ID
 *      WINDOW now.
 *   5. A PAGE PAST THE END OF THE CATALOGUE IS THE END, NOT AN ERROR.
 *      TVMaze answers it with HTTP 404.
 *   6. THE LEGACY TAB NAMES STILL MEAN SOMETHING. `initialTab: 'today'`
 *      opens the Airing today scope; `initialTab: 'browse'` opens the
 *      catalogue.
 *   7. THE ROW CARRIES NO MEDIA MENU. A show is a SERIES, not a playable
 *      file: there is nothing in the app to queue, so "Play Next" and
 *      "Add to Queue" must not be offered.
 *
 * The REAL hook, the REAL TanStack query and the REAL `usePullToRefresh`
 * are used — only the TVMaze adapter is stubbed, so the scope and the
 * pagination are driven exactly as the app drives them.
 */

import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {ThemeProvider} from '../../../src/theme';
import {useShowsScreen} from '../../../src/screens/ShowsScreen/hooks/useShowsScreen';
import {ShowsScreen} from '../../../src/screens/ShowsScreen';
import {ShowRow} from '../../../src/screens/ShowsScreen/components/ShowRow';
import type {TVMazeShow} from '../../../src/types/api';

// TVMaze is the network. The adapter is stubbed so the scope and the
// pagination can be driven on purpose.
jest.mock('../../../src/infrastructure/api/tvmaze/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/tvmaze/adapter',
  );
  return {
    ...actual,
    searchShows: jest.fn(),
    getShowsPage: jest.fn(),
    getSchedule: jest.fn(),
  };
});

const {searchShows: mockSearch} = jest.requireMock(
  '../../../src/infrastructure/api/tvmaze/adapter',
) as {searchShows: jest.Mock};
const {getShowsPage: mockShows} = jest.requireMock(
  '../../../src/infrastructure/api/tvmaze/adapter',
) as {getShowsPage: jest.Mock};
const {getSchedule: mockSchedule} = jest.requireMock(
  '../../../src/infrastructure/api/tvmaze/adapter',
) as {getSchedule: jest.Mock};

function makeShow(id: number, name = `Show ${id}`): TVMazeShow {
  return {
    id,
    name,
    summary: '',
    image: null,
    genres: [],
    status: 'Running',
    premiered: '2020-01-01',
    rating: {average: 7.5},
    runtime: 45,
    network: {name: 'BBC'},
    type: 'Scripted',
  };
}

/** One schedule entry — TVMaze's `/schedule` answers EPISODES. */
function makeScheduleEntry(show: TVMazeShow) {
  return {
    id: show.id * 10,
    name: 'Episode 1',
    season: 1,
    number: 1,
    airdate: '2026-11-18',
    show,
  };
}

/**
 * The hook's state, rendered as text so the test can read it.
 *
 * The scope is changed from INSIDE the harness, because the scope is the
 * harness's own state — the same way the screen changes it: the shell
 * pushes the scope group and the search field down into the provider,
 * and the provider hands them to the hook.
 */
const Harness: React.FC = () => {
  const [scope, setScope] = useState('');
  const [searchTerm, setTerm] = useState('');
  const {
    items,
    todayItems,
    scopeKind,
    hasNextPage,
    fetchNextPage,
    refreshing,
    refresh,
  } = useShowsScreen({scope, searchTerm});
  return (
    <View>
      <Text testID="scopeKind">{scopeKind}</Text>
      <Text testID="count">{String(items.length)}</Text>
      <Text testID="todayCount">{String(todayItems.length)}</Text>
      <Text testID="hasNextPage">{String(hasNextPage)}</Text>
      <Text testID="refreshing">{String(refreshing)}</Text>
      <Pressable testID="set-term" onPress={() => setTerm('batman')} />
      <Pressable testID="set-today" onPress={() => setScope('today')} />
      <Pressable testID="load-more" onPress={() => fetchNextPage()} />
      <Pressable
        testID="pull"
        onPress={() => {
          refresh().catch(() => {});
        }}
      />
    </View>
  );
};

function stateOf(testID: string): string {
  return screen.getByTestId(testID).props.children as string;
}

describe('the Shows screen — the browse grammar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue([]);
    mockShows.mockResolvedValue([]);
    mockSchedule.mockResolvedValue([]);
  });

  it('asks for the CATALOGUE when there is neither a term nor a scope', async () => {
    mockShows.mockResolvedValue([makeShow(250), makeShow(499)]);
    mockSchedule.mockResolvedValue([
      makeScheduleEntry(makeShow(900, 'Today Show')),
    ]);

    await renderWithProviders(Harness, {routeName: 'ShowsScreen'});

    await waitFor(() => expect(stateOf('count')).toBe('2'));
    expect(stateOf('scopeKind')).toBe('catalogue');
    // The catalogue is asked for by PAGE, from page 1.
    expect(mockShows).toHaveBeenCalledTimes(1);
    expect(mockShows.mock.calls[0][0]).toBe(1);
    // The search endpoint is not.
    expect(mockSearch).not.toHaveBeenCalled();
    // The schedule is fetched too — it is the rail.
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(stateOf('todayCount')).toBe('1'));
  });

  it('asks for the TERM when there is a term, and nothing else', async () => {
    mockShows.mockResolvedValue([makeShow(250)]);
    mockSchedule.mockResolvedValue([
      makeScheduleEntry(makeShow(900, 'Today Show')),
    ]);

    await renderWithProviders(Harness, {routeName: 'ShowsScreen'});
    await waitFor(() => expect(stateOf('count')).toBe('1'));
    // The opening scope already asked for the catalogue and the
    // schedule — forget that, so the assertions below are about the scope
    // change and nothing else.
    mockShows.mockClear();
    mockSchedule.mockClear();

    await act(async () => {
      fireEvent.press(screen.getByTestId('set-term'));
    });

    await waitFor(() => expect(stateOf('scopeKind')).toBe('term'));
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch.mock.calls[0][0]).toBe('batman');
    // The catalogue is NOT asked for while a term is on screen, and
    // neither is the schedule — the term scope draws no rail.
    expect(mockShows).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('asks for the SCHEDULE when the scope is "Airing today"', async () => {
    mockShows.mockResolvedValue([makeShow(250, 'Catalogue Show')]);
    mockSchedule.mockResolvedValue([
      makeScheduleEntry(makeShow(900, 'Today Show')),
    ]);

    await renderWithProviders(Harness, {routeName: 'ShowsScreen'});
    await waitFor(() => expect(stateOf('count')).toBe('1'));
    mockShows.mockClear();

    await act(async () => {
      fireEvent.press(screen.getByTestId('set-today'));
    });

    await waitFor(() => expect(stateOf('scopeKind')).toBe('today'));
    // The list IS the schedule now.
    expect(stateOf('count')).toBe('1');
    // The catalogue is not asked for in the today scope.
    expect(mockShows).not.toHaveBeenCalled();
  });

  it('pages the catalogue on the ID WINDOW, not on the page count', async () => {
    // TVMaze's `/shows` returns 235-250 shows per page (the gaps are
    // deleted ids), so a page shorter than 250 says NOTHING about
    // whether another page exists. The old rule stopped here — on page
    // 1, 245 shows in — while the footer said "You're all caught up."
    //
    // Page 1 carries the ids 250-499, so the window's TOP id (499) is
    // present and there IS a next page.
    mockShows.mockResolvedValue([makeShow(250), makeShow(499)]);

    await renderWithProviders(Harness, {routeName: 'ShowsScreen'});
    await waitFor(() => expect(stateOf('hasNextPage')).toBe('true'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('load-more'));
    });

    await waitFor(() => expect(mockShows).toHaveBeenCalledTimes(2));
    expect(mockShows.mock.calls[1][0]).toBe(2);
  });

  it('stops paging when the window\'s top id is missing', async () => {
    // The LAST page of the catalogue: its window's top id (499) is gone,
    // so there is no page after it. (Measured on the live endpoint: page
    // 382 is the last populated page and page 383 answers HTTP 404.)
    mockShows.mockResolvedValue([makeShow(250), makeShow(498)]);

    await renderWithProviders(Harness, {routeName: 'ShowsScreen'});
    await waitFor(() => expect(stateOf('count')).toBe('2'));
    expect(stateOf('hasNextPage')).toBe('false');
  });

  it('treats a page past the end of the catalogue as the end, not an error', async () => {
    // TVMaze answers a page past the end with HTTP 404. That is the end
    // of the list, not a failure, so it must not raise the error card.
    const notFound = Object.assign(new Error('Page not found.'), {
      status: 404,
    });
    mockShows.mockRejectedValue(notFound);

    await renderWithProviders(ShowsScreen, {routeName: 'ShowsScreen'});

    await waitFor(() =>
      expect(screen.getByText('No shows found.')).toBeTruthy(),
    );
    expect(screen.queryByText("Couldn't load shows.")).toBeNull();
  });

  it('renders the shared shell — the search field and the filter button', async () => {
    await renderWithProviders(ShowsScreen, {routeName: 'ShowsScreen'});

    // The shared shell's search field, with THIS screen's placeholder.
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search shows…')).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(screen.getByLabelText('Filter TV Shows options')).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('TV Shows')).toBeTruthy();
  });

  it('puts the "Airing Today" rail in the LIST\'s header slot', async () => {
    mockSchedule.mockResolvedValue([
      makeScheduleEntry(makeShow(900, 'Today Show')),
    ]);

    await renderWithProviders(ShowsScreen, {routeName: 'ShowsScreen'});

    await waitFor(() =>
      expect(screen.getByTestId('shows-airing-today-rail')).toBeTruthy(),
    );
    expect(screen.getByText('Airing Today')).toBeTruthy();

    // The rail is INSIDE the list — it is the list's header, so it
    // scrolls with the catalogue and the shell still hosts ONE list.
    const list = screen.getByTestId('section-ShowsScreen-list');
    expect(within(list).getByTestId('shows-airing-today-rail')).toBeTruthy();
  });

  it("honours the legacy 'today' tab as the Airing today scope", async () => {
    mockShows.mockResolvedValue([makeShow(250, 'Catalogue Show')]);
    mockSchedule.mockResolvedValue([
      makeScheduleEntry(makeShow(900, 'Today Show')),
    ]);

    await renderWithProviders(ShowsScreen, {
      routeName: 'ShowsScreen',
      initialParams: {initialTab: 'today'},
    });

    // The schedule is the LIST in the today scope, so the rail is not
    // drawn — the same shows twice would be noise.
    await waitFor(() => expect(screen.getByText('Today Show')).toBeTruthy());
    expect(screen.queryByTestId('shows-airing-today-rail')).toBeNull();
    // The catalogue was never asked for.
    expect(mockShows).not.toHaveBeenCalled();
  });

  it("honours the legacy 'browse' tab as the catalogue", async () => {
    mockShows.mockResolvedValue([makeShow(250, 'Catalogue Show')]);

    await renderWithProviders(ShowsScreen, {
      routeName: 'ShowsScreen',
      initialParams: {initialTab: 'browse'},
    });

    await waitFor(() =>
      expect(screen.getByText('Catalogue Show')).toBeTruthy(),
    );
    expect(mockShows).toHaveBeenCalledTimes(1);
    expect(mockShows.mock.calls[0][0]).toBe(1);
  });

  it('pull-to-refresh actually refetches', async () => {
    mockShows.mockResolvedValue([makeShow(250)]);

    await renderWithProviders(Harness, {routeName: 'ShowsScreen'});
    await waitFor(() => expect(stateOf('count')).toBe('1'));
    expect(mockShows).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('pull'));
    });

    // The gesture ran the query again.
    await waitFor(() => expect(mockShows).toHaveBeenCalledTimes(2));
    expect(stateOf('refreshing')).toBe('false');
  });

  it('the show row carries NO media menu — a show is not a playable file', async () => {
    const onPress = jest.fn();
    const view = await render(
      <ThemeProvider>
        <ShowRow item={makeShow(1, 'Downton Abbey')} onPress={onPress} />
      </ThemeProvider>,
    );

    await fireEvent(view.getByText('Downton Abbey'), 'longPress');

    // There is nothing in the app to queue for a series, so the app's
    // one media menu must not open here.
    expect(view.queryByText('Play Next')).toBeNull();
    expect(view.queryByText('Add to Queue')).toBeNull();

    // A tap still opens the show's own page.
    await fireEvent.press(view.getByText('Downton Abbey'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
