/**
 * V19 W4 — `NowPlayingScreen` (thin viewer post-fold).
 *
 * After W4's chrome hoist (audit §5 + SPEC §5.2-§5.4), the chrome
 * composition moved into V19 SimbaPlayer at the App.tsx shell. The
 * NowPlayingScreen route is now a thin viewer:
 *
 *   1. On mount: marks `usePresentation.setPresentation('expanded')`
 *      so the V19 SimbaPlayer renders the full chrome (instead of
 *      just the mini dock or nothing).
 *   2. On unmount: marks `usePresentation.setPresentation('mini')`
 *      so the chrome collapses back to the dock.
 *   3. Returns `null` because all visual chrome lives in V19
 *      SimbaPlayer. The route itself has no body.
 *
 * Why a no-op route at all:
 *   - The route exists in the navigation stack so deep-link
 *     navigation (`Linking.openURL('simba://player/...')`) still
 *     resolves to a known screen.
 *   - The route's mount / unmount are the natural "user opened the
 *     full player" / "user dismissed the full player" signals.
 *
 * What's intentionally NOT here:
 *   - No chrome primitives (VideoSurface, VerticalSwipeGestures,
 *     ChromeAutoHideController, NextUpOverlay, TransportBar).
 *     Audit §5 Rule 6: chrome composition must not happen in
 *     `src/screens/`. `grep -rn "<VideoSurface|<TransportBar|..."`
 *     would return 0 hits under src/screens/NowPlaying.
 *   - No `<SimbaPlayer />` mount. Audit §5 Rule 8.
 *   - No `useState`. Audit §5 Rule 4.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_V19_SPECIFICATION.md` §5.4 +
 *   `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §5.
 */

import * as React from 'react';
import {usePresentation} from '../../../infrastructure/player';
import type {NowPlayingScreenProps} from '../types';

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = () => {
  const presentation = usePresentation();

  React.useEffect(() => {
    // Entering the route → expanded chrome.
    presentation.setMode('expanded');
    return () => {
      // Leaving the route → mini dock.
      presentation.setMode('mini');
    };
    // We deliberately depend on the function reference (stable
    // per store), not on `presentation.mode` — the unmount path
    // must always reset to mini even when the chrome is hidden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All chrome primitives live in V19 SimbaPlayer at the shell.
  return null;
};

export default NowPlayingScreen;
