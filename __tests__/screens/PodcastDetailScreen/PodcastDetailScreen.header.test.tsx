/**
 * `PodcastDetailScreen` — the header and the share sheet.
 *
 * The screen is about ONE podcast, and it used to say "Podcast
 * Details" in its header and share that same constant as the shared
 * link's title. The podcast's own name was available — the loaded
 * podcast carries it — and neither the header nor the share sheet
 * reached for it.
 *
 * The hero is mocked out here on purpose: it has always carried the
 * podcast's title, so leaving it in would make the header's copy
 * indistinguishable from the hero's.
 */

import {screen, fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';

jest.mock('../../../src/screens/PodcastDetailScreen/hooks/usePodcastDetailScreen', () => ({
  usePodcastDetailScreen: jest.fn(),
}));

jest.mock('../../../src/screens/PodcastDetailScreen/components/HeroSection', () => ({
  HeroSection: () => null,
}));

jest.mock('../../../src/screens/PodcastDetailScreen/hooks/useEpisodeActions', () => ({
  useEpisodeActions: () => ({
    menuEpisode: null,
    episodeMenuVisible: false,
    setEpisodeMenuVisible: jest.fn(),
    sheetItem: null,
    setSheetItem: jest.fn(),
    handleEpisodePress: jest.fn(),
    handleEpisodeLongPress: jest.fn(),
    handleEpisodeMenuSelect: jest.fn(),
  }),
}));

jest.mock('../../../src/services/shareService', () => ({
  shareContent: jest.fn(),
}));

import {shareContent} from '../../../src/services/shareService';
import {usePodcastDetailScreen} from '../../../src/screens/PodcastDetailScreen/hooks/usePodcastDetailScreen';
import {PodcastDetailScreen} from '../../../src/screens/PodcastDetailScreen';

const mockedHook = usePodcastDetailScreen as jest.MockedFunction<
  typeof usePodcastDetailScreen
>;
const mockedShare = shareContent as jest.MockedFunction<typeof shareContent>;

const PODCAST_TITLE = 'The Big Story | WIRED';

function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    podcast: {
      id: 8048224,
      title: PODCAST_TITLE,
      author: 'WIRED',
      description: 'Big stories.',
      image: '',
      feedUrl: 'https://example.test/feed.xml',
      episodeCount: 22,
      categories: {},
    },
    episodes: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    pageError: null,
    hasLoaded: true,
    hasMore: false,
    loadMore: jest.fn(),
    retry: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePodcastDetailScreen>;
}

async function renderScreen() {
  return await renderWithProviders(PodcastDetailScreen, {
    routeName: 'PodcastDetail',
    initialParams: {podcastId: 8048224},
  });
}

describe('PodcastDetailScreen — the header carries the podcast’s name', () => {
  beforeEach(() => {
    mockedHook.mockReset();
    mockedShare.mockReset();
  });

  it('names the podcast in the header', async () => {
    mockedHook.mockReturnValue(hookReturn());
    await renderScreen();

    expect(screen.getByText(PODCAST_TITLE)).toBeOnTheScreen();
  });

  it('never says the constant "Podcast Details" once the podcast is loaded', async () => {
    mockedHook.mockReturnValue(hookReturn());
    await renderScreen();

    expect(screen.queryByText('Podcast Details')).toBeNull();
  });

  it('falls back to the generic title until the podcast has loaded', async () => {
    mockedHook.mockReturnValue(hookReturn({podcast: null, isLoading: true}));
    await renderScreen();

    expect(screen.getByText('Podcast Details')).toBeOnTheScreen();
  });

  it('shares the podcast’s own name, not the constant', async () => {
    mockedHook.mockReturnValue(hookReturn());
    await renderScreen();

    fireEvent.press(screen.getByLabelText('Share podcast'));

    expect(mockedShare).toHaveBeenCalledWith(
      expect.objectContaining({title: PODCAST_TITLE}),
    );
  });
});
