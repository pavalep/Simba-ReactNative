/**
 * V21 W22 F/U #3 — NowPlayingScreen smoke test using the
 * centralized `renderWithProviders` helper.
 *
 * The point of THIS test is NOT to cover NowPlayingScreen
 * exhaustively (P25 already did the player-state audit
 * manually; the hook layer is covered by 73+ Jest tests
 * for the player facade). The point is to PROVE the
 * `renderWithProviders` helper works end-to-end on a real
 * screen with real route + navigation props, so future
 * screen tests (BookmarksScreen, HistoryScreen, QueueScreen,
 * AboutScreen, etc.) can be a 2-line setup.
 *
 * If this test passes, the helper is wired correctly. If it
 * crashes, the helper is broken — the failure is the recipe
 * for whatever extra provider / mock is needed.
 *
 * W4 note — this route used to render the chrome itself
 * (a `<Placeholder>` empty state, the `fileTitle` heading and
 * an `Unknown Track` fallback). W4's chrome hoist moved ALL of
 * that into V19 SimbaPlayer at the App.tsx shell, and the route
 * became a thin viewer whose only job is the presentation
 * signal: mount → `expanded`, unmount → `mini`. So the two
 * title assertions are gone, replaced by the contract the
 * route actually owns now.
 */

import {screen} from '@testing-library/react-native';
import {renderWithProviders} from '../helpers/renderWithProviders';
import {NowPlayingScreen} from '../../src/screens/NowPlaying';
import type {RootStackParamList} from '../../src/navigation/types';

const mockSetMode = jest.fn();

jest.mock('../../src/infrastructure/player', () => {
  // Spread the facade SUBMODULES, not the barrel — Jest is mid-mock on
  // the barrel, so its re-export getters would read a half-initialised
  // namespace.
  const actual = {
    ...jest.requireActual('../../src/infrastructure/player/useTransport'),
    ...jest.requireActual('../../src/infrastructure/player/usePresentation'),
  };
  return {
    ...actual,
    usePresentation: () => ({
      mode: 'expanded',
      setMode: mockSetMode,
      togglePip: jest.fn(),
    }),
  };
});

describe('NowPlayingScreen (smoke — renderWithProviders proof)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen root when no media is loaded', async () => {
    // The screen body shows a <Placeholder> when `fileUri` is
    // missing — that's the W7 P25 empty state. The header
    // (InternalHeader with title "Now Playing") is always
    // rendered. We assert the root mounts without throwing —
    // that's the proof of life that the provider tree is
    // wired correctly.
    await renderWithProviders(NowPlayingScreen, {
      routeName: 'NowPlaying',
    });
    expect(screen.root).toBeTruthy();
  });

  it('marks the presentation expanded on mount so the shell chrome shows', async () => {
    // W4: the chrome lives in V19 SimbaPlayer at the App shell, so
    // this route's ONLY output is the presentation signal. Without it
    // the shell would stay collapsed on the mini dock while the user
    // believes they opened the full player.
    await renderWithProviders(NowPlayingScreen, {
      routeName: 'NowPlaying',
    });
    expect(mockSetMode).toHaveBeenCalledWith('expanded');
  });

  it('renders no body of its own (chrome is owned by the App shell)', async () => {
    // The W4 thin-viewer contract: no Visual Surface, no TransportBar,
    // no title, no empty-state placeholder. The route body is `null`,
    // so not even the params it was handed reach the tree — which is
    // exactly what distinguishes "moved to the shell" from "dropped".
    const initialParams: RootStackParamList['NowPlaying'] = {
      fileUri: 'file:///music/song.mp3',
      fileTitle: 'Test Song Title',
    };
    await renderWithProviders(NowPlayingScreen, {
      routeName: 'NowPlaying',
      initialParams,
    });
    expect(screen.root).toBeTruthy();
    expect(screen.queryByText('Test Song Title')).toBeNull();
    expect(screen.queryByText('Unknown Track')).toBeNull();
  });
});
