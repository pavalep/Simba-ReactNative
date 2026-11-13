// ─── Is the list at its end? ──────────────────────────────────────────
//
// WHY THIS EXISTS
// ---------------
// The browse shell floats a filter button over the list's bottom-right
// corner. When the list is FINISHED and the user is sitting at its end,
// that button is the only thing left in that corner — it sits in the
// space the "You're all caught up" line leaves, and the bottom of the
// screen reads as clutter rather than as the end of a list.
//
// The owner's call (2026-11-13): when there is nothing further to load
// and the user is at the bottom, the button gets out of the way. It comes
// back the moment the user scrolls up — the button is the list's filter
// affordance, and removing it from the whole screen would remove the
// action.
//
// ONE OWNER
// ---------
// The three browse lists (Music, Movies, Podcasts) all need the same
// answer, and all three used to work it out for themselves. This hook is
// the one place that knows how far down the list is.
//
// THE MEASUREMENT
// --------------
// "At the bottom" is the scroll distance from the end of the CONTENT:
//
//     distance = contentSize.height - (contentOffset.y + layoutMeasurement.height)
//
// which is 0 when the last pixel of the content is at the bottom edge of
// the viewport. The tolerance is a few dp, because a list that is
// shorter than the viewport is at its end with a negative distance.

import {useCallback, useEffect, useRef, useState} from 'react';
import type {NativeScrollEvent, NativeSyntheticEvent} from 'react-native';

/**
 * How close to the end counts as "at the bottom" (dp).
 *
 * Small: the point is "the user is looking at the end of the list", not
 * "the user has stopped scrolling".
 */
const AT_BOTTOM_TOLERANCE = 8;

export interface ListEndState {
  /** True when the list is scrolled to its end. */
  atBottom: boolean;
  /** The FlatList's `onScroll`. */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** The FlatList's `onContentSizeChange`. */
  onContentSizeChange: (width: number, height: number) => void;
}

/**
 * Track whether the list is scrolled to its end, and report it.
 *
 * @param report Called with `true` when the list is BOTH finished and at
 *   its end. The shell owns the button; the list owns the scroll.
 * @param complete True when the source has nothing further to give.
 */
export function useListEnd(
  report: ((atEnd: boolean) => void) | undefined,
  complete: boolean,
): ListEndState {
  const [atBottom, setAtBottom] = useState(false);
  const atBottomRef = useRef(false);
  // The last known scroll offset and viewport height. `onContentSizeChange`
  // carries no offset, so the two are kept to recompute the distance when
  // the content grows under the user's thumb.
  const scrollRef = useRef({offsetY: 0, viewportHeight: 0});

  const applyDistance = useCallback((distanceFromEnd: number) => {
    const next = distanceFromEnd <= AT_BOTTOM_TOLERANCE;
    if (next === atBottomRef.current) return;
    atBottomRef.current = next;
    setAtBottom(next);
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
      scrollRef.current = {
        offsetY: contentOffset.y,
        viewportHeight: layoutMeasurement.height,
      };
      applyDistance(
        contentSize.height - (contentOffset.y + layoutMeasurement.height),
      );
    },
    [applyDistance],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const {offsetY, viewportHeight} = scrollRef.current;
      applyDistance(height - (offsetY + viewportHeight));
    },
    [applyDistance],
  );

  useEffect(() => {
    report?.(complete && atBottom);
  }, [complete, atBottom, report]);

  return {atBottom, onScroll, onContentSizeChange};
}
