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
 */

import {screen} from '@testing-library/react-native';
import {renderWithProviders} from '../helpers/renderWithProviders';
import {NowPlayingScreen} from '../../src/screens/NowPlaying';
import type {RootStackParamList} from '../../src/navigation/types';

describe('NowPlayingScreen (smoke — renderWithProviders proof)', () => {
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

  it('renders the fileTitle when initialParams.fileTitle is provided', async () => {
    // The screen reads `route.params?.fileTitle` and renders
    // it as the <AppText> heading. We pass it via initialParams
    // and assert it reaches the screen body.
    const initialParams: RootStackParamList['NowPlaying'] = {
      fileUri: 'file:///music/song.mp3',
      fileTitle: 'Test Song Title',
    };
    await renderWithProviders(NowPlayingScreen, {
      routeName: 'NowPlaying',
      initialParams,
    });
    expect(screen.getByText('Test Song Title')).toBeTruthy();
  });

  it('falls back to "Unknown Track" when fileTitle is missing', async () => {
    // Pre-W22 fallback: `fileTitle || 'Unknown Track'`. The
    // helper passes the route params through React Navigation's
    // `initialParams`, so the screen sees the same shape it
    // gets in production.
    const initialParams: RootStackParamList['NowPlaying'] = {
      fileUri: 'file:///music/song.mp3',
    };
    await renderWithProviders(NowPlayingScreen, {
      routeName: 'NowPlaying',
      initialParams,
    });
    expect(screen.getByText('Unknown Track')).toBeTruthy();
  });
});
