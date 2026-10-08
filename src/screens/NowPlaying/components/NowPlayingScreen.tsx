/**
 * V19 W4 — `NowPlayingScreen` (thin viewer post-fold).
 *
 * After W4's chrome hoist (audit §5 + SPEC §5.2-§5.4), the chrome
 * composition moved into VideoPlayer at the App.tsx shell. The
 * NowPlayingScreen route is now a thin viewer: all visual chrome
 * lives in VideoPlayer, and the route itself has no body.
 *
 * ## Why there is no presentation effect here any more
 *
 * W4 gave this route a mount/unmount effect that wrote the
 * presentation mode: `setMode('expanded')` on mount, `setMode('mini')`
 * on unmount. W6.0 removed the whole idea, and with it this effect.
 *
 * The mode is a function of WHERE THE MEDIA IS, not of a screen
 * transition: playback happens in `PlayerActivity`, and
 * `usePresentation()` derives `'expanded'` from
 * `useIsPlayerActivity()`. So the effect was not just redundant, it
 * was actively wrong in both directions:
 *
 *   - On mount it forced `'expanded'` even in the `MainActivity`
 *     tree, where there is no player surface for a chrome to sit on.
 *   - On unmount it forced `'mini'` regardless of which activity was
 *     actually hosting. Nothing in the app ever navigates to this
 *     route (its only entry point is the `simba://now-playing` deep
 *     link), so the mount path effectively never ran and the unmount
 *     path could fire at any arbitrary time — including while the
 *     player was fully expanded.
 *
 * Keeping it would have meant reintroducing exactly the cross-root
 * write that shipped a black player screen: `mode` written into a
 * process-global zustand store by every mounted React root at once.
 * See `src/state/usePresentationStore.ts` for that failure.
 *
 * Why a no-op route at all:
 *   - The route exists in the navigation stack so deep-link
 *     navigation (`Linking.openURL('simba://player/...')`) still
 *     resolves to a known screen.
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
import type {NowPlayingScreenProps} from '../types';

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = () => {
  // All chrome primitives live in VideoPlayer at the shell, and
  // the presentation mode is derived from the host activity. There is
  // nothing for this route to do.
  return null;
};

export default NowPlayingScreen;
