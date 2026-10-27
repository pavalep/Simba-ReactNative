/**
 * The Home FAB's FUNCTION: pick a local file and play it.
 *
 * ## The two defects this pins
 *
 * **The lane.** A picked file's URI is a `content://` URI with no
 * extension in it — `content://com.android.providers.media.documents/
 * document/audio%3A1000000064`. The old code classified it with
 * `getMediaType(file.uri)`, which reads the extension out of the URI,
 * found nothing, and fell through to its `'video'` default. So every
 * picked AUDIO file was launched in the VIDEO lane. The picker already
 * reports the file's MIME type; that is the signal the URI cannot carry.
 *
 * **The silence.** `openPlayer` is async and it rejects when the launch
 * fails. The old call was fire-and-forget, so the rejection never
 * reached the `catch` — it surfaced as an unhandled promise rejection,
 * and the user who tapped the button saw nothing at all. A failed
 * launch now says so.
 *
 * The picker itself is NOT mocked: the repo's global
 * `@react-native-documents/picker` mock is driven from here, so the real
 * `pickMediaFile()` and the real `classifyPickedMedia()` run in this
 * test. Only the seams behind them are.
 */

import {renderHook, act, waitFor} from '@testing-library/react-native';
import {pick} from '@react-native-documents/picker';

const mockOpenPlayer = jest.fn();
const mockToastShow = jest.fn();

jest.mock('../../../src/infrastructure/player', () => ({
  getMpvPlayerModule: () => ({grantPersistablePermission: jest.fn()}),
  // The real one maps a content kind to a lane; for the two kinds this
  // test produces, 'audio' and 'video', it is the identity.
  resolveStreamType: (kind: string) => kind,
  useResumeAwareLaunch: () => ({openPlayer: mockOpenPlayer}),
}));
jest.mock('../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: mockToastShow, hide: jest.fn()}),
}));
jest.mock('../../../src/components/core/Dialog', () => ({
  useConfirmDialog: () => ({confirm: jest.fn()}),
}));
jest.mock('../../../src/theme', () => ({
  useTheme: () => ({
    colors: {accent: {gold: '#c9a84c'}, text: {inverse: '#000000'}},
  }),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({user: null}),
}));
jest.mock('../../../src/hooks/useWeather', () => ({
  useWeather: () => ({snapshot: null, isFirstLoad: false}),
}));
jest.mock('../../../src/features/bookmarks', () => ({
  useBookmarks: () => ({allBookmarks: [], remove: jest.fn()}),
}));
jest.mock('../../../src/features/playlists', () => ({
  usePlaylists: () => ({list: []}),
}));
jest.mock('../../../src/features/followedPodcasts', () => ({
  useFollowedPodcasts: () => ({list: []}),
}));
jest.mock('../../../src/features/recentHistory', () => ({
  useRecentHistory: () => ({list: [], removeRecent: jest.fn()}),
}));
jest.mock('../../../src/state', () => ({
  useMediaStore: (selector: (s: {tracks: unknown[]; isScanning: boolean}) => unknown) =>
    selector({tracks: [], isScanning: false}),
}));

import {useHomeScreen} from '../../../src/screens/Home/hooks/useHomeScreen';

const mockPick = pick as unknown as jest.Mock;

const CONTENT_AUDIO_URI =
  'content://com.android.providers.media.documents/document/audio%3A1000000064';
const CONTENT_VIDEO_URI =
  'content://com.android.providers.media.documents/document/video%3A1000000123';

function fakeNavigation() {
  return {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  } as never;
}

async function renderHome() {
  const view = await renderHook(() => useHomeScreen(fakeNavigation()));
  return view;
}

describe('useHomeScreen — the FAB opens a picked file in the right lane', () => {
  beforeEach(() => {
    mockPick.mockReset();
    mockOpenPlayer.mockReset();
    mockToastShow.mockReset();
    mockOpenPlayer.mockResolvedValue(true);
  });

  it('launches a picked AUDIO file in the audio lane, not the video lane', async () => {
    mockPick.mockResolvedValue([
      {
        uri: CONTENT_AUDIO_URI,
        name: 'Field Recording.mp3',
        type: 'audio/mpeg',
        size: 1024,
      },
    ]);

    const {result} = await renderHome();
    await act(async () => {
      await result.current.handleOpenMedia();
    });

    await waitFor(() => expect(mockOpenPlayer).toHaveBeenCalledTimes(1));
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({uri: CONTENT_AUDIO_URI, type: 'audio'}),
    );
  });

  it('launches a picked VIDEO file in the video lane', async () => {
    mockPick.mockResolvedValue([
      {
        uri: CONTENT_VIDEO_URI,
        name: 'Clip.mp4',
        type: 'video/mp4',
        size: 2048,
      },
    ]);

    const {result} = await renderHome();
    await act(async () => {
      await result.current.handleOpenMedia();
    });

    await waitFor(() => expect(mockOpenPlayer).toHaveBeenCalledTimes(1));
    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({uri: CONTENT_VIDEO_URI, type: 'video'}),
    );
  });

  it('says so when the launch fails, instead of failing silently', async () => {
    mockPick.mockResolvedValue([
      {uri: CONTENT_AUDIO_URI, name: 'Field Recording.mp3', type: 'audio/mpeg', size: 1},
    ]);
    mockOpenPlayer.mockRejectedValue(new Error('no surface'));

    const {result} = await renderHome();
    await act(async () => {
      await result.current.handleOpenMedia();
    });

    await waitFor(() =>
      expect(mockToastShow).toHaveBeenCalledWith('Could not open that file', 'error'),
    );
  });

  it('says so when the launch reports that nothing was attempted', async () => {
    mockPick.mockResolvedValue([
      {uri: CONTENT_AUDIO_URI, name: 'Field Recording.mp3', type: 'audio/mpeg', size: 1},
    ]);
    mockOpenPlayer.mockResolvedValue(false);

    const {result} = await renderHome();
    await act(async () => {
      await result.current.handleOpenMedia();
    });

    await waitFor(() =>
      expect(mockToastShow).toHaveBeenCalledWith('Could not open that file', 'error'),
    );
  });

  it('stays quiet when the user cancels the picker', async () => {
    mockPick.mockRejectedValue(Object.assign(new Error('cancelled'), {code: 'OPERATION_CANCELED'}));

    const {result} = await renderHome();
    await act(async () => {
      await result.current.handleOpenMedia();
    });

    expect(mockOpenPlayer).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });
});
