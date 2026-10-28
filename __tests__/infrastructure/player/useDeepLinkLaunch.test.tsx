/**
 * V22 W33 (2026-10-28) — the APP's deep-link launcher.
 *
 * ## Why this test exists
 *
 * A deep link used to be opened by the **LIB's** `useOpenFromUrl()`, which
 * forwards to `usePlayerActivity().openPlayer()` → the bridge. The bridge
 * asks `isSurfaceMounted()` before it will open a video, and that always
 * answers `false` (the surface registry is never populated), so **a
 * deep-linked video never played at all**.
 *
 * The lib's path also bypassed the app's `useResumeAwareLaunch` seam, and
 * with it the now-playing entry, the history checkpoint, the dock and the
 * resume prompt. Audio deep links *did* play — but the app never knew
 * what was playing.
 *
 * ## What these tests pin
 *
 *   1. A VIDEO deep link RECORDS a now-playing session. The lib's hook
 *      records nothing, so this is the assertion that fails if the hook
 *      is ever reverted to the lib's.
 *   2. An AUDIO deep link goes out through the app's seam, carrying the
 *      uri as the resume key.
 *   3. A URI the app does not handle is REFUSED, and nothing launches.
 *   4. The title and the lane are derived from the URI.
 *
 * A test that cannot fail is a comment with a `.test.tsx` extension.
 */
import {renderHook} from '@testing-library/react-native';

// Typed with their parameters so the assertions can read the options that
// were actually sent. A zero-arg `jest.fn` types `calls[0]` as an empty
// tuple, which makes every `calls[0][0]` a compile error and tempts an
// author into asserting on something weaker instead.
const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);
// The LIB's `usePlayerActivity` also returns an `openPlayer`. It has to be
// modelled, or a regression that routes back to the lib hook fails on
// `undefined is not a function` instead of on the missing session — which
// would prove nothing about the contract.
const mockLibOpenPlayer = jest.fn(async () => true);

jest.mock('@simba-dev/react-native-media-player', () => ({
  useOpenWithResume: () => mockOpenWithResume,
  usePlayerActivity: () => ({
    openPlayer: mockLibOpenPlayer,
  }),
}));

import {useDeepLinkLaunch} from '../../../src/infrastructure/player/useDeepLinkLaunch';
import {useBookmarksStore} from '../../../src/state/bookmarksStore';
import {useRecentHistoryStore} from '../../../src/state/recentHistoryStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';

const VIDEO_URI = 'file:///movies/namus-kanla-yazilir.mkv';
const AUDIO_URI = 'file:///podcasts/can-ai.mp3';
const CONTENT_URI =
  'content://com.android.providers.media.documents/document/video%3A1000000064';

describe('useDeepLinkLaunch', () => {
  beforeEach(() => {
    mockOpenWithResume.mockClear();
    mockLibOpenPlayer.mockClear();
    // The session and the resume stores are module-global, so a test that
    // reads what a launch RECORDED needs a clean one to read.
    useNowPlayingStore.getState().reset();
    useBookmarksStore.getState().reset();
    useRecentHistoryStore.getState().reset();
  });

  it('records a VIDEO deep link as now playing, through the app seam', async () => {
    const {result} = await renderHook(() => useDeepLinkLaunch());

    await expect(result.current(VIDEO_URI)).resolves.toBe(true);

    // The app seam's job. The lib's hook records NO session, so this
    // assertion is the one that fails if the deep link goes back to it.
    expect(useNowPlayingStore.getState().current).toMatchObject({
      uri: VIDEO_URI,
      mediaLane: 'video',
      startPositionMs: 0,
    });
    expect(useNowPlayingStore.getState().current?.title).toBe(
      'namus-kanla-yazilir',
    );

    // The lib's path would have asked the bridge, and the bridge asks
    // `isSurfaceMounted()` — which is always false. This is the call the
    // dead deep-link path made.
    expect(mockLibOpenPlayer).not.toHaveBeenCalled();
  });

  it('sends an AUDIO deep link out through the app seam, with the resume key', async () => {
    const {result} = await renderHook(() => useDeepLinkLaunch());

    await expect(result.current(AUDIO_URI)).resolves.toBe(true);

    expect(mockOpenWithResume).toHaveBeenCalledTimes(1);
    expect(mockOpenWithResume).toHaveBeenCalledWith({
      uri: AUDIO_URI,
      title: 'can-ai',
      type: 'audio',
      startPositionMs: 0,
      resumeId: AUDIO_URI,
    });
    expect(useNowPlayingStore.getState().current?.mediaLane).toBe('audio');
  });

  it('accepts a shared content:// URI', async () => {
    const {result} = await renderHook(() => useDeepLinkLaunch());

    await expect(result.current(CONTENT_URI)).resolves.toBe(true);

    // A `content://` share-sheet URI carries no filename — its last
    // segment is a provider id — so the derived title is that id. It is
    // still a video, which is what the lane decision needs.
    expect(useNowPlayingStore.getState().current?.mediaLane).toBe('video');
  });

  it('refuses a URI the app does not handle, and launches nothing', async () => {
    const {result} = await renderHook(() => useDeepLinkLaunch());

    // A remote URL is a web page or a stream, and the screen that owns it
    // opens it — not the share sheet.
    await expect(result.current('https://example.test/movie.mp4')).resolves.toBe(
      false,
    );
    await expect(result.current('')).resolves.toBe(false);

    expect(mockOpenWithResume).not.toHaveBeenCalled();
    expect(mockLibOpenPlayer).not.toHaveBeenCalled();
    expect(useNowPlayingStore.getState().current).toBeNull();
  });
});
