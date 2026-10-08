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
 * that into VideoPlayer at the App.tsx shell.
 *
 * W6.0 — the route's remaining "job" (write `expanded` on mount,
 * `mini` on unmount) was removed too, because the presentation mode
 * is now DERIVED from the host activity rather than commanded by a
 * route. That effect was actively harmful: nothing in the app ever
 * navigates to this route, so the mount path effectively never ran,
 * while the unmount path could force `'mini'` at an arbitrary moment
 * — including over a fully expanded player. It was also a second
 * writer to a process-global store shared by both activity React
 * roots, which is the defect behind the black player screen. See
 * `src/state/usePresentationStore.ts`.
 */

import {screen} from '@testing-library/react-native';
import {renderWithProviders} from '../helpers/renderWithProviders';
import {NowPlayingScreen} from '../../src/screens/NowPlaying';
import type {RootStackParamList} from '../../src/navigation/types';

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
      isPip: false,
      isExpanded: true,
      setPipActive: jest.fn(),
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

  it('writes no presentation state on mount or unmount', async () => {
    // W6.0: the route used to `setMode('expanded')` on mount and
    // `setMode('mini')` on unmount. Both are gone. The mode is derived
    // from which activity hosts this React tree, so a route has
    // nothing to say about it — and a route that COULD say so would be
    // a second writer to a value shared by both activity roots.
    //
    // This asserts the absence, because the presence of such a write
    // is exactly the defect: nothing navigates to `NowPlaying` in
    // normal use, so its mount effect never ran while its unmount
    // effect could fire at any moment.
    const store = jest.requireActual(
      '../../src/state/usePresentationStore',
    ).usePresentationStore;
    store.setState({pipActive: false});

    await renderWithProviders(NowPlayingScreen, {
      routeName: 'NowPlaying',
    });
    expect(store.getState().pipActive).toBe(false);
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
