/**
 * V22 W22 (2026-10-27) — the video picture's lib-boundary wrapper.
 *
 * ## Why this file exists
 *
 * `scripts/check-import-boundaries.js` enforces the PLAYER RULE (rule 2):
 * only `src/infrastructure/player/**` may import from
 * `@simba-dev/react-native-media-player`. `VideoSurface` renders the
 * native video picture, so it needs `<SimbaVideo>` — but it lives in
 * `src/components/`, so the lib import has to sit behind this layer.
 * Before this wrapper, `VideoSurface.tsx` imported the package directly
 * and the boundary checker failed on it.
 *
 * ## Why it is NOT re-exported from the app barrel
 *
 * `src/infrastructure/player/index.ts` re-exports `VideoPlayer` (a
 * VALUE) from `src/components/player/video/VideoPlayer`, and
 * `VideoPlayer` imports `VideoSurface`. A component importing the whole
 * app barrel would therefore close the loop
 * `VideoSurface → barrel → VideoPlayer → VideoSurface`. This module is
 * deliberately lib-only, so its edge stays a leaf and no new cycle is
 * introduced.
 *
 * Junior-dev rule: 1 import + 1 wrapper.
 */

export {
  SimbaVideo,
  type SimbaVideoProps,
  type SimbaVideoResizeMode,
} from '@simba-dev/react-native-media-player';
