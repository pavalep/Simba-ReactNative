/**
 * The Live TV screen's own rules.
 *
 * These are the screen's rules, and they were broken in ways a reader
 * could not see.
 *
 * 1. THE PAGE NEVER LOADED. The adapter read `api/channels.json` and
 *    demanded a stream URL from every record — a field that file does not
 *    have (measured: 31,843 records, 0 occurrences of `url`). The whole
 *    batch was rejected, so the screen showed the error card for every
 *    channel, forever. The catalogue is now the playlist the source
 *    publishes for players (`index.category.m3u`), fetched ONCE.
 *
 * 2. THE LIST WAS NOT ALWAYS A LIST. The screen used to return the
 *    loading state INSTEAD of the `FlatList`, and the error state replaced
 *    it too — so there was no list, and so no pull-to-refresh, while the
 *    first page was loading, and none after a failed first load either.
 *    The gesture the user reaches for was not there. The list is now
 *    always mounted and the states live inside it.
 *
 * 3. THE CATEGORY SPOKE TWO LANGUAGES. The filter held the category's
 *    NAME, while the deep link carried its ID and the source's own
 *    group-title is the ID — so a deep link's id had to be translated
 *    into a name before it could match anything, and the sheet's rows
 *    were keyed by the name. Both sides speak the ID now; the NAME is
 *    only ever displayed.
 *
 * The REAL hook, the REAL TanStack query and the REAL scope are used —
 * only the IPTV ADAPTER is stubbed.
 */

import {screen, waitFor, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

jest.mock('../../../src/infrastructure/api/iptv/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/iptv/adapter',
  );
  return {
    ...actual,
    getIPTVCatalogue: jest.fn(),
  };
});

const {getIPTVCatalogue: mockCatalogue} = jest.requireMock(
  '../../../src/infrastructure/api/iptv/adapter',
) as {getIPTVCatalogue: jest.Mock};

// The player launch needs a mounted player, which a screen test has no
// business bringing up.
//
// (The LIB, not the facade: requiring the facade from inside a mock
// factory pulls the video-player component chain in, and the facade's
// circular re-export of that chain reads an uninitialised binding.)
jest.mock('../../../src/infrastructure/player', () => {
  const lib = jest.requireActual('@simba-dev/react-native-media-player');
  return {
    resolveStreamType: lib.resolveStreamType,
    useResumeAwareLaunch: () => ({openPlayer: jest.fn()}),
    useQueue: lib.useQueue,
  };
});

jest.mock('../../../src/infrastructure/player/miniPlayerChrome', () => ({
  useBottomChromeInset: () => 0,
}));

import {LiveTVScreen} from '../../../src/screens/LiveTVScreen';
import type {IPTVCatalogue} from '../../../src/infrastructure/api/iptv/adapter';

const CATALOGUE: IPTVCatalogue = {
  channels: [
    {
      id: 'chan-news',
      name: 'Sky News',
      url: 'https://example.test/sky-news.m3u8',
      image: '',
      country: 'United Kingdom',
      countryCode: 'gb',
      language: '',
      category: 'News',
      categoryId: 'news',
      isPlayable: true,
    },
  ],
  categories: [{id: 'news', name: 'News', channelCount: 1}],
};

describe('LiveTVScreen — the list is always a list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the list mounted while the first page loads', async () => {
    // The catalogue never settles inside this test.
    mockCatalogue.mockImplementation(() => new Promise(() => {}));

    await renderWithProviders(LiveTVScreen, {routeName: 'LiveTVScreen'});

    // The list is mounted, so the pull-to-refresh control exists —
    // the gesture is available even while the page is loading.
    expect(screen.getByTestId('section-LiveTVScreen-list')).toBeTruthy();
  });

  it('shows the ONE loading component of the browse family', async () => {
    mockCatalogue.mockImplementation(() => new Promise(() => {}));

    await renderWithProviders(LiveTVScreen, {routeName: 'LiveTVScreen'});

    // The shared pill — `browse-loading-state` is the shared component's
    // own testID, so this asserts the SHARED one and not a local copy.
    await waitFor(() =>
      expect(screen.getByTestId('browse-loading-state')).toBeTruthy(),
    );
    expect(screen.getByText('Loading channels…')).toBeTruthy();
  });

  it('does not show the empty state while it is loading', async () => {
    mockCatalogue.mockImplementation(() => new Promise(() => {}));

    await renderWithProviders(LiveTVScreen, {routeName: 'LiveTVScreen'});

    await waitFor(() =>
      expect(screen.getByTestId('browse-loading-state')).toBeTruthy(),
    );
    expect(screen.queryByText('No channels found.')).toBeNull();
  });

  it('keeps the list mounted after a failed first load', async () => {
    mockCatalogue.mockRejectedValue(new Error('The network request failed.'));

    await renderWithProviders(LiveTVScreen, {routeName: 'LiveTVScreen'});

    // The catalogue hook retries twice (`IPTV_RETRIES`), so the error
    // card arrives a few seconds after the first attempt.
    await waitFor(
      () => expect(screen.getByText("Couldn't load channels.")).toBeTruthy(),
      {timeout: 20000},
    );

    // The list is still there — the error state lives INSIDE it.
    expect(screen.getByTestId('section-LiveTVScreen-list')).toBeTruthy();
  });
});

describe('LiveTVScreen — the category speaks one language', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCatalogue.mockResolvedValue(CATALOGUE);
  });

  it('shows the category NAME on the chip, not its id', async () => {
    await renderWithProviders(LiveTVScreen, {
      routeName: 'LiveTVScreen',
      initialParams: {categoryId: 'news'},
    });

    // The filter holds the id (`news`); the chip reads the name. The
    // chip is found inside the shell's chip strip, so the filter SHEET's
    // own row with the same word cannot be mistaken for it.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('browse-active-filters')).getByText('News'),
      ).toBeTruthy(),
    );
    expect(
      within(screen.getByTestId('browse-active-filters')).queryByText('news'),
    ).toBeNull();
  });
});
