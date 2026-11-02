/// <reference types="node" />
/**
 * V19 W7.6 — `More`: the single entry point to the player's secondary sheet.
 *
 * Source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §1.4.
 *
 * ## Why this file replaced `MoreSheet.test.tsx`
 *
 * `TransportBar/MoreSheet.tsx` was the W3.4 secondary surface. W3.5.6
 * replaced it with `VideoMoreSheet` and re-pointed `More` at that, but
 * the old component was never deleted — so there were two full
 * implementations of "the more menu" and a suite testing the one
 * nothing renders. That is a trap: the green suite gave no evidence
 * about the surface the user actually sees.
 *
 * The old component is gone (W7.6) and its four direct-render tests
 * went with it. What survives here is the part that is still real: the
 * `More` button, and the four library actions it reaches.
 *
 * ## The share test is the one that changed meaning
 *
 * It previously asserted `shareContent({route: 'SongScreen',
 * params: {}, …})` — from the VIDEO player, whose own fixture is a
 * `.mp4`. `SongScreen` is an audio route, so sharing a movie produced a
 * deep link into the receiver's song screen with no file identity at
 * all. The test pinned the defect. W7.4 corrected it to the
 * lane-agnostic `NowPlaying` route with the real `fileUri`.
 */

import * as React from 'react';
import {act, fireEvent} from '@testing-library/react-native';
import {renderChrome} from '../../../../helpers/renderChrome';
import {More} from '../../../../../src/components/player/video/TransportBar/More';
import {useNowPlayingStore} from '../../../../../src/state/nowPlayingStore';

jest.mock('../../../../../src/theme', () => {
  const actual = jest.requireActual('../../../../../src/theme/tokens');
  const tokens = actual.darkTokens;
  return {
    useTheme: () => ({
      theme: 'dark',
      tokens,
      colors: tokens.colors,
      spacing: tokens.spacing,
      typography: tokens.typography,
      radius: tokens.radius,
      legacy: actual.legacyFromTokens(tokens),
      // `Toast` reads `colors.semantic.*` when it renders a banner.
      // Save / Add-to-playlist report through `useToast`, so a test that
      // triggers them mounts a real Toast and the mock must carry these.
      semantic: tokens.colors.semantic,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../../../src/services/shareService', () => ({
  shareContent: jest.fn().mockResolvedValue(undefined),
}));

const shareService = require('../../../../../src/services/shareService');

// Save performs a REAL download, so the service is mocked and asserted
// on rather than letting a filesystem write happen in a unit test.
jest.mock('../../../../../src/services/downloadService', () => ({
  startDownload: jest.fn().mockResolvedValue(undefined),
}));
const downloadService = require('../../../../../src/services/downloadService');

// NB: the variable name must start with `mock` — jest's hoisting plugin
// rejects any other out-of-scope reference inside a `jest.mock` factory.
//
// The store is a zustand hook, so it is CALLED as one — the transport
// reads the app's RUN through it — and it also carries `getState`, which
// is how the sheet appends to the run.
jest.mock('../../../../../src/state/playerStore', () => {
  const actual = jest.requireActual('../../../../../src/state/playerStore');
  const mockUsePlayerStore = Object.assign(
    (selector: (state: unknown) => unknown) =>
      selector({playlist: [], currentIndex: -1}),
    {getState: () => ({addToPlaylist: mockAddToPlaylist})},
  );
  // Everything else stays REAL — `runNeighbours` is the ONE rule for
  // "what plays next", and a mock of it would be a mock of the rule
  // rather than of the state it reads.
  return {...actual, usePlayerStore: mockUsePlayerStore};
});
const mockAddToPlaylist = jest.fn();
const playerStore = {addToPlaylist: mockAddToPlaylist};

// The lib's own playlist is EMPTY in this app — `loadfile` replaces
// mpv's playlist with exactly one entry, and the app never calls
// `commands.loadPlaylist` — so it carries no next-track metadata and
// no current-file identity. That is why the current URI is read from
// the SESSION instead (B-046), and why the mocked lib state below has
// no playlist at all.
jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayer: () => ({
    state: {
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
    },
    commands: {},
  }),
  usePlayerProgress: () => ({positionMs: 0, durationMs: 0, isBuffering: false}),
  // The transport reaches the launch seam through the lane handover, and
  // the seam asks the lib for these two. Without them the seam throws the
  // moment the transport renders.
  useOpenWithResume: () => mockOpenWithResume,
  resolveStreamType: (mediaType?: string) =>
    mediaType === 'video' ? 'video' : 'audio',
}));
const mockOpenWithResume = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);

describe('More (button + sheet integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    shareService.shareContent.mockClear();
    // What is PLAYING is the SESSION's URI — the launch seam records it
    // on every launch, for both lanes. Save / Share / Add-to-playlist
    // act on that value, so the session has to carry it. (It used to
    // come from the lib's playlist, which is empty in this app, so
    // every one of those rows answered "Nothing to …" — B-046.)
    useNowPlayingStore.getState().begin({
      uri: 'https://cdn.test/stairway.mp4',
      title: 'Stairway to Heaven',
      startPositionMs: 0,
      streamType: 'video',
    });
  });

  it('renders the button + opens the sheet on tap', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    // Awaited act(): the press flips `sheetOpen`, and RNTL 14's async
    // act needs the re-render flushed before the Modal's rows are
    // queryable.
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    expect(getByTestId('legacy-save')).toBeTruthy();
    expect(getByTestId('legacy-share')).toBeTruthy();
  });

  // Without `fileUri` in the params the receiver opens a player with
  // nothing to play, so both assertions below are load-bearing.
  it('Share deep-links to the player with the current FILE, not to an audio song screen', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-share'));
    expect(shareService.shareContent).toHaveBeenCalledWith({
      route: 'NowPlaying',
      params: {
        fileUri: 'https://cdn.test/stairway.mp4',
        fileTitle: 'Stairway to Heaven',
      },
      title: 'Stairway to Heaven',
      subtitle: 'Led Zeppelin',
    });
  });

  it('Share does not deep-link to the audio SongScreen route', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-share'));
    const call = (shareService.shareContent as jest.Mock).mock.calls[0][0];
    expect(call.route).not.toBe('SongScreen');
  });

  it('Save starts a real download for the current track URI', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-save'));
    expect(downloadService.startDownload).toHaveBeenCalledWith(
      expect.objectContaining({uri: 'https://cdn.test/stairway.mp4'}),
    );
  });

  it('Add to playlist really appends to the player queue', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-add-to-playlist'));
    expect(playerStore.addToPlaylist).toHaveBeenCalledWith(
      expect.objectContaining({uri: 'https://cdn.test/stairway.mp4'}),
    );
  });
});
