import type {ViewStyle} from 'react-native';

/**
 * v11 T7.1 — Shared geometry constants for the video player shell.
 *
 * Before T7.1 these constants were duplicated in three places:
 *   - `VideoPresentationShell.tsx` (mini margin / height / radius)
 *   - `VideoHost.tsx` (mini width margin / height / bottom margin)
 *   - the native `setPresentation` effect (mini geometry rectangle)
 *
 * The duplication drifted at least once (W5.2 lowered the mini from
 * 112 px to 86 px but only updated the shell; the host's constant
 * was stale for a few commits). Centralising here means the
 * projection, the surface slot, and the native bridge all read
 * the same numbers.
 *
 * Reuse from the React layer (shell / host) and the Android `MainActivity`
 * reflection: the constants here are the single source of truth for
 * JS-side geometry. The native side reads them from a parallel
 * constant pool so the two stay in sync at compile time.
 */
export const MINI_WIDTH_MARGIN = 12;
export const MINI_BOTTOM_MARGIN = 12;
// W5.2: the mini player was 112 px tall but the actual mini chrome
// (title + progress rail + play/expand/close buttons) only needs
// ~86 px. The 26 px of slack was empty margin at the bottom. Bringing
// the mini down to 86 px also makes the mini↔full animation more
// graceful (smaller scale delta means less visual "pop").
export const MINI_HEIGHT = 86;
export const MINI_RADIUS = 14;
export const TRANSITION_DURATION_MS = 280;

/**
 * Compute the mini slot rectangle for a given viewport. Returns the
 * same shape the host passes to `MpvPlayer.setPresentation`.
 *
 * v11 T7.1: pulled out so the shell and the host can both read the
 * same numbers without duplicating the math.
 */
export function computeMiniSlot(viewportWidth: number, viewportHeight: number) {
  const width = Math.max(0, viewportWidth - MINI_WIDTH_MARGIN * 2);
  const height = MINI_HEIGHT;
  return {
    x: MINI_WIDTH_MARGIN,
    y: viewportHeight - MINI_HEIGHT - MINI_BOTTOM_MARGIN,
    width,
    height,
  };
}

/**
 * v11 T7.1: the transform layer that the shell animates. The outer
 * shell container snaps to the target size on every presentation
 * change, but the inner content (a single full-viewport "transform
 * layer" containing the surface + chrome) is scaled + translated
 * from mini-proportions to full-proportions. The scale + translate
 * are native-driver friendly (transform + opacity), so the
 * transition hits 60 fps without round-tripping through the JS
 * bridge for layout.
 */
export interface ShellTransformLayerStyle extends ViewStyle {
  position: 'absolute';
  left: 0;
  top: 0;
  width: number;
  height: number;
  transform: Array<
    | {translateX: number}
    | {translateY: number}
    | {scaleX: number}
    | {scaleY: number}
  >;
}
