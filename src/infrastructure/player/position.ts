/**
 * V21 W7 P26 — Resume-position unit conversion.
 *
 * The app's MMKV-backed stores (bookmarks, history) persist
 * playback positions in **seconds** (e.g. `Bookmark.position` in
 * `src/state/bookmarksStore.ts:49` is documented "Position in
 * seconds at the time of save."; `RecentHistoryEntry.position`
 * uses the same convention — it's formatted with `formatDuration`
 * from `src/utils/timeAgo.ts:30` which expects seconds).
 *
 * The player module's `OpenPlayerOptions.startPositionMs` field
 * (see `node_modules/@simba-dev/react-native-media-player/src/hooks/usePlayerActivity.ts:21-22`)
 * expects **milliseconds**. The two units differ by 1000x, so a
 * naive `startPositionMs: position` call from the history store
 * would seek to ~60ms when the user expected ~60s.
 *
 * `secondsToMs` is the single conversion point. The hook in
 * `src/infrastructure/player/index.ts` (`usePlayWithResume`) is
 * the only consumer; keeping the helper as a top-level export
 * means the test (`__tests__/infrastructure/player/position.test.ts`)
 * can verify the conversion in isolation without rendering React.
 */

/**
 * Convert a seconds-precision position to a milliseconds-precision
 * position for the bridge. Returns `undefined` for non-positive or
 * non-finite inputs so the caller can omit `startPositionMs` from
 * the `openPlayer` call (which makes the bridge start from the
 * beginning instead of seeking to 0).
 *
 * Rounds to the nearest millisecond. A 60.0004-second bookmark
 * (likely from a network-saved play checkpoint) becomes 60000 ms;
 * a 0.5-second "you just started" position becomes 500 ms.
 */
export function secondsToMs(positionSec: number): number | undefined {
  if (!Number.isFinite(positionSec) || positionSec <= 0) return undefined;
  return Math.round(positionSec * 1000);
}
