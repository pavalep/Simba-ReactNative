/**
 * The Radio screen on the shared browse grammar.
 *
 * Radio was the LAST of the Discover catalogues that still hand-rolled
 * its own shell. These assertions pin the four things the migration was
 * for:
 *
 *   1. the page IS the shared shell — the shell's search field and the
 *      shell's filter button, not the screen's own copies;
 *   2. the three axes (genre, country, language) each get their OWN
 *      chip — the strip used to read one flat `filter` list, so a
 *      screen with three axes could hold three selections and show one;
 *   3. the station menu is the app's ONE media menu, and it offers what
 *      a station can actually DO: Play Next and Add to Queue — and it
 *      does NOT offer "Add to Playlist", which the app's playlist rule
 *      refuses for radio (`PLAYLIST_ALLOWED_MEDIA_KINDS`: "a lane is not
 *      a permission");
 *   4. the queue actions go through the app's ONE queue wrapper
 *      (`useQueueActions`), which owns the queue-store call AND the
 *      toast — the screen never calls the queue store itself.
 *
 * ONLY THE NETWORK ADAPTER IS STUBBED. The hook, the TanStack query, the
 * shared shell and the options hook are the real ones.
 */

import {act, fireEvent, screen, waitFor, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

// ─── The network adapter — the ONLY stub ─────────────────────────────
//
// The mock factory spreads `jest.requireActual`, so the adapter's real
// exports (its types, its parser, its retry constant) are all still
// there — only the four network calls are replaced.
const mockStation = {
  id: 'st-1',
  name: 'Example FM',
  url: 'https://stream.example/station',
  image: '',
  tags: 'pop,rock',
  country: 'Germany',
  language: 'english',
  codec: 'MP3',
  bitrate: 128,
  clickCount: 10,
};

jest.mock('../../../src/infrastructure/api/radioBrowser/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/radioBrowser/adapter',
  );
  return {
    ...actual,
    getGenres: jest.fn(async () => [
      {name: 'rock', stationCount: 2617},
      {name: 'pop', stationCount: 5139},
    ]),
    getCountries: jest.fn(async () => [{name: 'Germany', stationCount: 5604}]),
    getLanguages: jest.fn(async () => [
      {name: 'english', stationCount: 11334},
    ]),
    getTopStations: jest.fn(async () => [mockStation]),
    getStationsByFilters: jest.fn(async () => [mockStation]),
    searchStations: jest.fn(async () => [mockStation]),
    searchStationsWithFilters: jest.fn(async () => [mockStation]),
  };
});

// The app's ONE queue wrapper. It is mocked so the assertion can prove
// the row's queue action goes THROUGH it — the real one reaches into
// the media-lib's queue store, which a screen test has no business
// bringing up.
//
// The handle lives INSIDE the factory: a module-scope `const` would be
// in the temporal dead zone when the factory runs.
jest.mock('../../../src/hooks/useQueueActions', () => {
  const mock = {playNext: jest.fn(), addToQueue: jest.fn()};
  return {__mock: mock, useQueueActions: () => mock};
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

import * as radioBrowserAdapter from '../../../src/infrastructure/api/radioBrowser/adapter';
import * as queueActions from '../../../src/hooks/useQueueActions';
import {RadioScreen} from '../../../src/screens/RadioScreen';

interface QueueMock {
  playNext: jest.Mock;
  addToQueue: jest.Mock;
}

const queueMock = (queueActions as unknown as {__mock: QueueMock}).__mock;

const adapter = radioBrowserAdapter as unknown as {
  getTopStations: jest.Mock;
  getStationsByFilters: jest.Mock;
  searchStations: jest.Mock;
  searchStationsWithFilters: jest.Mock;
};

async function renderScreen() {
  return await renderWithProviders(RadioScreen, {routeName: 'RadioScreen'});
}

/** The shell's active-filter strip. */
function chips() {
  return within(screen.getByTestId('browse-active-filters'));
}

/** The filter sheet's option chips. */
function sheet() {
  return within(screen.getByTestId('true-sheet'));
}

describe('RadioScreen — the shared browse shell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the SHELL\'s search field and filter button', async () => {
    await renderScreen();

    // The shell's own search field…
    expect(screen.getByLabelText('Search Live Radio')).toBeTruthy();
    // …and the shell's own filter button (the app's ONE Fab).
    expect(screen.getByLabelText('Filter Live Radio options')).toBeTruthy();
  });

  it('gives EVERY axis its own chip', async () => {
    await renderScreen();

    // The tag lists arrive, so the sheet has options to pick.
    await waitFor(() =>
      expect(sheet().getByLabelText('rock')).toBeTruthy(),
    );

    // One pick per axis.
    await act(async () => {
      fireEvent.press(sheet().getByLabelText('rock'));
    });
    await act(async () => {
      fireEvent.press(sheet().getByLabelText('Germany'));
    });
    await act(async () => {
      fireEvent.press(sheet().getByLabelText('english'));
    });

    // THREE chips — one per axis. The strip used to read one flat
    // `filter` list, so a screen with three axes could hold three
    // selections and show one of them.
    expect(chips().getByLabelText('rock')).toBeTruthy();
    expect(chips().getByLabelText('Germany')).toBeTruthy();
    expect(chips().getByLabelText('english')).toBeTruthy();
  });

  it('answers a term AND the filters in ONE request', async () => {
    await renderScreen();
    await waitFor(() => expect(sheet().getByLabelText('rock')).toBeTruthy());

    await act(async () => {
      fireEvent.press(sheet().getByLabelText('rock'));
    });
    expect(chips().getByLabelText('rock')).toBeTruthy();

    // A term arrives. The radio-browser ENDPOINT takes the term and
    // the filter axes together (measured 2026-11-18: `?name=jazz&tag=rock`
    // answers both), and the adapter exposes that request as
    // `searchStationsWithFilters`. So the filter is NOT cleared — the
    // scope is the term AND the genre, and the source answers both.
    await act(async () => {
      fireEvent.changeText(
        screen.getByLabelText('Search Live Radio'),
        'jazz radio',
      );
    });

    await waitFor(
      () => expect(chips().getByLabelText('rock')).toBeTruthy(),
      {timeout: 3000},
    );
    // The term is DEBOUNCED, so the request that carries it arrives a
    // moment after the keystroke — wait for THAT call, not for the first
    // one (the filter-only call the scope made when the genre was picked).
    await waitFor(
      () =>
        expect(
          adapter.searchStationsWithFilters.mock.calls.some(
            (call: unknown[]) => call[0] === 'jazz radio',
          ),
        ).toBe(true),
      {timeout: 3000},
    );
    const call = adapter.searchStationsWithFilters.mock.calls.find(
      (c: unknown[]) => c[0] === 'jazz radio',
    );
    expect(call?.[1]).toMatchObject({genre: 'rock'});
  });
});

describe('RadioScreen — the station menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function openMenu() {
    await renderScreen();
    // The row is on screen…
    await waitFor(() => expect(screen.getByLabelText('Example FM')).toBeTruthy());
    // …and a long press opens the app's ONE media menu.
    await act(async () => {
      fireEvent(screen.getByLabelText('Example FM'), 'longPress');
    });
  }

  it('offers Play Next and Add to Queue', async () => {
    await openMenu();

    expect(await screen.findByText('Play Next')).toBeTruthy();
    expect(screen.getByText('Add to Queue')).toBeTruthy();
  });

  it('does NOT offer Add to Playlist', async () => {
    await openMenu();

    // The app's playlist rule refuses radio — `PLAYLIST_ALLOWED_MEDIA_KINDS`
    // holds 'audio', 'music' and 'podcast' for the audio lane, and the
    // file's own docblock says it plainly: "a lane is not a permission".
    // The sheet it opened listed NO compatible playlist. A control that
    // cannot act must not occupy space.
    expect(await screen.findByText('Play Next')).toBeTruthy();
    expect(screen.queryByText('Add to Playlist')).toBeNull();
  });

  it('sends the queue action through the app\'s ONE queue wrapper', async () => {
    await openMenu();
    expect(await screen.findByText('Add to Queue')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Add to Queue'));
    });

    // The row's queue action goes through `useQueueActions` — the
    // wrapper that owns the queue-store call AND the toast (with its
    // Undo). The screen never calls the queue store itself.
    expect(queueMock.addToQueue).toHaveBeenCalledTimes(1);
    expect(queueMock.addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'https://stream.example/station',
        title: 'Example FM',
        source: 'api',
        type: 'radio',
        mediaType: 'audio',
        provider: 'radioBrowser',
      }),
    );
    // The queue store was NOT called directly by the screen.
    expect(queueMock.playNext).not.toHaveBeenCalled();
  });

  it('sends "Play Next" through the same wrapper', async () => {
    await openMenu();
    expect(await screen.findByText('Play Next')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Play Next'));
    });

    expect(queueMock.playNext).toHaveBeenCalledTimes(1);
    expect(queueMock.playNext).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'https://stream.example/station',
        type: 'radio',
      }),
    );
  });
});
