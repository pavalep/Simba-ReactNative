/**
 * The Live TV screen follows the browse grammar.
 *
 * ## What this pins
 *
 * 1. THE SCREEN IS A BROWSE SCREEN. It renders the shared shell's search
 *    field and its filter button — the same affordances the Music, Movies,
 *    Podcasts, Audiobooks and Radio screens have — instead of its own.
 *
 * 2. THE CATEGORY AXIS GETS A CHIP. The sheet's selection is drawn in the
 *    shell's chip strip, and the chip reads the category's NAME ("News"),
 *    never its id ("news").
 *
 * 3. THE DEEP LINK SEEDS THE SCOPE. `tv/:categoryId?` asks for a
 *    category, and the category must reach BOTH the chip strip and the
 *    list — on a COLD start, when the catalogue has not arrived yet and the
 *    option list is therefore empty. That is the whole reason the config
 *    factory puts the seed's own value in the option list up front.
 *
 * 4. THE ROW MENU IS THE APP'S MENU. It offers Play Next and Add to
 *    Queue — a channel IS a playable stream URL — and it does NOT offer
 *    "Add to Playlist", which the app's playlist rule refuses for live TV
 *    (`PLAYLIST_ALLOWED_MEDIA_KINDS`).
 *
 * 5. THE QUEUE ACTION GOES THROUGH `useQueueActions`. The queue wrapper
 *    owns the queue-store call AND the toast (with its Undo), so this
 *    screen never calls the queue store directly.
 *
 * The REAL hook, the REAL TanStack query and the REAL `useQueueActions` are
 * used — only the IPTV ADAPTER is stubbed, so the scope is driven exactly
 * as the app drives it.
 */

import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import {useQueue, useQueueItems} from '@simba-dev/react-native-media-player';

import {renderWithProviders} from '../../helpers/renderWithProviders';

// The IPTV adapter is the network. It is stubbed so the scope can be
// driven on purpose; everything else — the catalogue hook, the in-memory
// scope, the query — is the real thing.
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
// business bringing up. The facade is replaced, but the LIB is not: the
// queue hook above all stays real, because the row's queue action must be
// the real `useQueueActions` writing to the real queue store.
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
    {
      id: 'chan-animation',
      name: 'Cartoon Network',
      url: 'https://example.test/cartoon.m3u8',
      image: '',
      country: 'United States',
      countryCode: 'us',
      language: '',
      category: 'Animation',
      categoryId: 'animation',
      isPlayable: true,
    },
  ],
  categories: [
    {id: 'news', name: 'News', channelCount: 1},
    {id: 'animation', name: 'Animation', channelCount: 1},
  ],
};

/** The queue store is a module singleton — each test starts empty. */
async function clearQueue(): Promise<void> {
  const {result} = await renderHook(() => useQueue());
  await act(async () => {
    result.current.clearQueue();
  });
}

async function readQueue() {
  const {result} = await renderHook(() => useQueueItems());
  return result.current;
}

describe('LiveTVScreen — the browse grammar', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCatalogue.mockResolvedValue(CATALOGUE);
    await clearQueue();
  });

  it('renders the shared shell — the search field and the filter button', async () => {
    await renderWithProviders(LiveTVScreen, {routeName: 'LiveTVScreen'});

    // The shared shell's search field, with THIS screen's placeholder.
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('Search channels…'),
      ).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(screen.getByLabelText('Filter Live TV options')).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('Live TV')).toBeTruthy();
  });

  it('gives the category axis a chip, and the chip reads the NAME', async () => {
    await renderWithProviders(LiveTVScreen, {
      routeName: 'LiveTVScreen',
      initialParams: {categoryId: 'news'},
    });

    // The chip strip is the shell's, and the chip is the category's NAME.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('browse-active-filters')).getByText('News'),
      ).toBeTruthy(),
    );
    // The id is the filter's vocabulary, never the chip's.
    expect(
      within(screen.getByTestId('browse-active-filters')).queryByText('news'),
    ).toBeNull();
  });

  it('seeds the scope from the deep link — on a COLD start', async () => {
    // The catalogue has NOT arrived yet when the options are first read:
    // this is the case the config factory's seed exists for.
    let release: (value: IPTVCatalogue) => void = () => {};
    mockCatalogue.mockImplementation(
      () =>
        new Promise<IPTVCatalogue>(resolve => {
          release = resolve;
        }),
    );

    await renderWithProviders(LiveTVScreen, {
      routeName: 'LiveTVScreen',
      initialParams: {categoryId: 'news'},
    });

    // The chip is there before the catalogue arrives — the seed's own
    // value is in the option list from the start.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('browse-active-filters')).getByText('news'),
      ).toBeTruthy(),
    );

    release(CATALOGUE);

    // The catalogue arrives and the chip upgrades to the source's NAME.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('browse-active-filters')).getByText('News'),
      ).toBeTruthy(),
    );

    // And the CONTENT read the seed: the list answers the news category.
    await waitFor(() => expect(screen.getByText('Sky News')).toBeTruthy());
    expect(screen.queryByText('Cartoon Network')).toBeNull();
  });

  it('opens the app media menu on a long press — with the queue actions', async () => {
    const view = await renderWithProviders(LiveTVScreen, {
      routeName: 'LiveTVScreen',
    });

    await waitFor(() => expect(view.getByText('Sky News')).toBeTruthy());

    // Nothing is open until the row is long-pressed.
    expect(view.queryByText('Play Next')).toBeNull();

    await fireEvent(view.getByText('Sky News'), 'longPress');

    // The app's ONE media menu.
    expect(view.getByText('Play Next')).toBeOnTheScreen();
    expect(view.getByText('Add to Queue')).toBeOnTheScreen();

    // "Add to Playlist" is GONE: the app's playlist rule refuses live TV,
    // so the action could only ever open a sheet that refuses the channel.
    expect(view.queryByText('Add to Playlist')).toBeNull();

    // The actions that were there before are still there.
    expect(view.getByText('Add to Favorites')).toBeOnTheScreen();
    expect(view.getByText('Bookmark')).toBeOnTheScreen();
    expect(view.getByText('Share')).toBeOnTheScreen();
  });

  it('queues the channel through useQueueActions — the toast and the item', async () => {
    const view = await renderWithProviders(LiveTVScreen, {
      routeName: 'LiveTVScreen',
    });

    await waitFor(() => expect(view.getByText('Sky News')).toBeTruthy());
    await fireEvent(view.getByText('Sky News'), 'longPress');
    await fireEvent.press(view.getByText('Add to Queue'));

    // The toast is `useQueueActions`' job — the queue wrapper, not the
    // store. It is what makes the action visible to the user.
    expect(view.getByText('Added to queue')).toBeOnTheScreen();

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      uri: 'https://example.test/sky-news.m3u8',
      title: 'Sky News',
      source: 'api',
      type: 'live-tv',
      mediaType: 'video',
      provider: 'iptv',
    });
  });

  it('plays the channel NEXT from the same menu', async () => {
    const view = await renderWithProviders(LiveTVScreen, {
      routeName: 'LiveTVScreen',
    });

    await waitFor(() => expect(view.getByText('Sky News')).toBeTruthy());
    await fireEvent(view.getByText('Sky News'), 'longPress');
    await fireEvent.press(view.getByText('Play Next'));

    expect(view.getByText('Playing next')).toBeOnTheScreen();

    const queue = await readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      uri: 'https://example.test/sky-news.m3u8',
      type: 'live-tv',
      mediaType: 'video',
      provider: 'iptv',
    });
  });
});
