/**
 * THE APP'S TOUCH-TARGET FLOOR.
 *
 * A control's TARGET is the area a finger has to hit — not the glyph it
 * draws. The app states the floor in ONE place and applies it in the
 * places that own a control:
 *
 *   • `PlayerControl.CONTROL_TARGET` — the player's control surface
 *     ("44 × 44 — the hit area for every control. Never smaller.");
 *   • `BrowseListFooter`'s retry pill;
 *   • the shared `FilterChips` pill;
 *   • the `FilterSheet` chip.
 *
 * It used to live ONLY in the player's control system, which is exactly
 * why it was applied nowhere else: a number that lives in one
 * component's folder is not an app-wide rule, it is that component's
 * private number, and the app's own comments cited it as if it were
 * the app's. This file is the app-wide owner; the player derives its
 * export from it so the two can never disagree.
 *
 * 44 is the number both the Material and the Apple accessibility
 * guidance name, and it is the number the app's own comments had
 * already been quoting.
 */

/** The minimum touch target, in dp. Never smaller. */
export const TOUCH_TARGET = 44;

/**
 * How far a control's touch area has to REACH beyond its drawn edge to
 * meet the floor.
 *
 * A control whose DRAWN size is below the floor cannot always grow into
 * the space around it: a chip in a stacked row would push its neighbours
 * apart and change the rhythm of the surface it sits on, and a chip in a
 * row whose parent is exactly as tall as the chip has no room to grow
 * into at all. Those controls extend their touch area instead.
 *
 * The number is per side, and it is the number the caller has to
 * RESERVE: React Native clips a touch area at its parent's bounds, so
 * the space the reach uses has to exist inside the parent.
 *
 * @param drawnHeight the control's drawn height in dp
 * @returns how far the touch area reaches past each edge, in dp
 */
export function touchTargetReach(drawnHeight: number): number {
  return Math.max(0, Math.ceil((TOUCH_TARGET - drawnHeight) / 2));
}
