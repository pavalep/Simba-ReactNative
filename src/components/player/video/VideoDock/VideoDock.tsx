/**
 * V22 W22 (2026-10-21) — `VideoDock`: the video lane's mini presentation.
 *
 * ## Why this component exists
 *
 * This used to be the `MiniPlayer` — ONE component that rendered the dock
 * for BOTH lanes, and that took turns with the full player: when the
 * video lane expanded, the dock unmounted; when it collapsed, the dock
 * mounted. Two components taking turns is SPEC decision D9's "presentation
 * is style, not component identity" in reverse, and it is what the user
 * noticed: the app had a mini player that was a separate UI from the
 * player it minimised.
 *
 * So the dock became a PART of the video lane instead of a rival to it.
 * It is mounted inside `VideoLane`, always, and the presentation decides
 * whether it is visible.
 *
 * ## The picture is never remounted
 *
 * This is the part that must not regress. The lib's `attachSurfaceLocked`
 * rebinds the mpv surface on every `setNativePtr`, so a SECOND
 * `<SimbaVideo>` view would STEAL the surface from the first — two owners
 * of one picture, which is the defect D9 exists to remove. The picture
 * lives in `VideoLane`, outside this component, and this component never
 * renders one.
 *
 * ## The hole, and why it is still measured
 *
 * The picture is a native view in this tree and the dock is a React
 * overlay, so every opaque React pixel between the camera and the video
 * HIDES it. The dock is therefore transparent and rebuilt from three
 * opaque plates around a transparent rectangle exactly where the video
 * is.
 *
 * Both the hole and the rect published for the picture come from ONE
 * `measureInWindow` pass, which is the property that matters: they cannot
 * disagree, so the video cannot land beside its own hole. Constants
 * computed from the stylesheet would be one refactor away from silently
 * drifting.
 *
 * ## Always mounted, so there is no flash
 *
 * The dock is laid out at all times and only its OPACITY changes. That
 * is deliberate: the slot's window rect is therefore already published
 * when the user taps minimise, so the picture moves into the dock in the
 * SAME commit that flips the presentation. When the dock used to mount
 * on demand, its rect arrived one render later and the picture was still
 * fullscreen for a frame — a visible jump on every minimise.
 *
 * The trade is that an invisible bar sits over the bottom of the window
 * in the expanded presentation. It is `pointerEvents="none"` there, so it
 * cannot swallow a tap meant for the transport bar.
 *
 * ## Square corners, deliberately
 *
 * The video is a rectangle and the artwork beside it is rounded, so
 * rounding the hole without rounding the video would be a frame drawn
 * around a rectangle that does not fit it.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing} from '../../../../theme/tokens';
import {usePresentation, useTransport} from '../../../../infrastructure/player';
import {useClosePlayback} from '../../../../infrastructure/player/useClosePlayback';
import {useNowPlayingStore} from '../../../../state/nowPlayingStore';
import {PlayerControl} from '../PlayerControl/PlayerControl';
import {
  MINI_PLAYER_ART_SIZE,
  MINI_PLAYER_HEIGHT,
  MINI_PLAYER_PROGRESS_HEIGHT,
  MINI_PLAYER_ROW_PADDING,
} from '../../../../infrastructure/player/miniPlayerChrome';

const ART_SIZE = MINI_PLAYER_ART_SIZE;
const PROGRESS_HEIGHT = MINI_PLAYER_PROGRESS_HEIGHT;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const VideoDock: React.FC = () => {
  const {colors} = useTheme();
  const {state, commands} = useTransport();
  const nowPlaying = useNowPlayingStore(s => s.current);
  const {isMini, setVideoMiniRect, setVideoPresentation} = usePresentation();
  const closePlayback = useClosePlayback();

  const rootRef = useRef<View>(null);
  const slotRef = useRef<View>(null);
  const [hole, setHole] = useState<Rect | null>(null);

  /**
   * Measure the leading square and the bar in the same pass.
   *
   * The bar's rect is measured too, even though the picture only needs the
   * slot, because the plates are positioned against the bar. One pass means
   * one consistent set of numbers; measuring them at different moments
   * during a rotation could capture a bar and a slot that disagree.
   *
   * Zero-size results mean "not laid out yet" and are ignored rather than
   * published: a 0x0 picture is an invalid libmpv render target, so
   * publishing one would trade a layout timing question for a broken
   * render.
   */
  const publishGeometry = useCallback(() => {
    const root = rootRef.current;
    const slot = slotRef.current;
    if (root == null || slot == null) return;

    root.measureInWindow((rootX, rootY, rootW, rootH) => {
      if (rootW <= 0 || rootH <= 0) return;
      slot.measureInWindow((slotX, slotY, slotW, slotH) => {
        if (slotW <= 0 || slotH <= 0) return;
        // WINDOW pixels, matching `VideoMiniRect`'s unit. `VideoLane`
        // reads it (`presentation.videoMiniRect`) and turns it into the
        // dock placement with `dockStyleFor(...)`, so the picture's box
        // and this hole come from one measurement.
        setVideoMiniRect({x: slotX, y: slotY, width: slotW, height: slotH});
        // The same rectangle, relative to the bar, for the plates.
        setHole({
          x: slotX - rootX,
          y: slotY - rootY,
          width: slotW,
          height: slotH,
        });
      });
    });
  }, [setVideoMiniRect]);

  // Re-measure whenever the bar itself lays out. The bar is
  // `left: 0, right: 0`, so its width changes on rotation and split-screen
  // resizes — which is exactly when the slot's window rect moves.
  //
  // Deliberately NOT the slot's own `onLayout`: the slot is a fixed-size
  // square, so its layout does not change on rotation and `onLayout` would
  // not fire. Watching the element that actually moves is what makes the
  // surface follow the screen instead of staying at portrait coordinates.
  const onBarLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      publishGeometry();
    },
    [publishGeometry],
  );

  useEffect(() => {
    publishGeometry();
  }, [publishGeometry]);

  // Leaving the video lane must retract the published rect, or a later
  // audio session would leave a video rect sitting in the store.
  useEffect(
    () => () => {
      setHole(null);
      setVideoMiniRect(null);
    },
    [setVideoMiniRect],
  );

  const onExpand = useCallback(() => {
    // Minimise and expand are two values of one request; nothing touches
    // an Activity, and playback is never interrupted by either.
    setVideoPresentation('expanded');
  }, [setVideoPresentation]);

  const hasDuration = state.durationMs > 0;
  const ratio =
    hasDuration && state.positionMs > 0
      ? Math.max(0, Math.min(1, state.positionMs / state.durationMs))
      : 0;

  const title = nowPlaying?.title ?? state.title;
  const artist = state.artist;

  const plate = {
    backgroundColor: colors.background.onMediaSheet,
  };

  return (
    <View
      ref={rootRef}
      onLayout={onBarLayout}
      // Transparent for video so the plates can carve out the hole.
      style={[styles.root, isMini ? null : styles.rootHidden]}
      // While hidden the bar must not eat a tap meant for the transport
      // bar underneath it.
      pointerEvents={isMini ? 'auto' : 'none'}
      testID="video-dock">
      <View
        style={[
          styles.progressTrack,
          {backgroundColor: colors.background.seekTrack.empty},
        ]}>
        <View
          style={[
            styles.progressFill,
            {width: `${ratio * 100}%`, backgroundColor: colors.accent.gold},
          ]}
        />
      </View>

      {hole != null ? (
        <>
          {/* The bar, rebuilt around a transparent rectangle. Until the
              first measurement lands there is no hole and no video rect
              yet, so the plates are skipped and the frame stays
              transparent rather than flashing an opaque slab over a
              surface that has not been told where to go. */}
          <View
            pointerEvents="none"
            style={[styles.plateTop, plate, {height: hole.y}]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.plateBottom,
              plate,
              {top: hole.y + hole.height},
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.plateRight,
              plate,
              {left: hole.x + hole.width, top: hole.y, height: hole.height},
            ]}
          />
        </>
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={onExpand}
          accessibilityRole="button"
          accessibilityLabel={`Open player for ${title}`}
          style={styles.expandTarget}>
          {/* The hole. No background, no children — every pixel here has
              to stay see-through or the video is covered. */}
          <View
            ref={slotRef}
            style={styles.videoSlot}
            testID="video-dock-slot"
          />

          <View style={styles.text}>
            <Text
              style={[styles.title, {color: colors.text.onMediaSoft}]}
              numberOfLines={1}>
              {title}
            </Text>
            {artist ? (
              <Text
                style={[styles.artist, {color: colors.text.onMediaMuted}]}
                numberOfLines={1}>
                {artist}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Siblings of the Pressable, not children: a tap on play must
            not also expand the bar. */}
        <View style={styles.actions}>
          <PlayerControl
            icon={state.isPlaying ? 'pause' : 'play'}
            accessibilityLabel={state.isPlaying ? 'Pause' : 'Play'}
            onPress={commands.togglePlayPause}
            testID="video-dock-playpause"
          />
          <PlayerControl
            icon="close"
            accessibilityLabel="Close player and stop playback"
            onPress={closePlayback}
            testID="video-dock-close"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    // Docked to the bottom of the screen, above whatever screen the user
    // is on. Absolutely positioned on purpose: in normal flow this would
    // be laid out AFTER the navigator, which already fills the screen,
    // and so would sit below the visible area.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    // The dock's height is DECLARED, not emergent: it is the same number
    // every screen uses to clear it, so the band the dock paints and the
    // band the app reserves cannot drift apart.
    height: MINI_PLAYER_HEIGHT,
    paddingBottom: MINI_PLAYER_ROW_PADDING,
  },
  // The dock is always laid out — only its visibility changes. That is
  // what lets the slot's window rect be published BEFORE the user taps
  // minimise, so the picture moves into the dock in the same commit that
  // flips the presentation.
  rootHidden: {
    opacity: 0,
  },
  plateTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  plateBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  plateRight: {
    position: 'absolute',
    right: 0,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    width: '100%',
  },
  progressFill: {
    height: PROGRESS_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: MINI_PLAYER_ROW_PADDING,
  },
  expandTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // 44 tall: the artwork itself is 44, so the row meets the same
    // target floor the artwork does.
    minHeight: ART_SIZE,
  },
  videoSlot: {
    width: ART_SIZE,
    height: ART_SIZE,
    // Deliberately square and deliberately without a background. See the
    // module docblock: a rounded frame drawn around a rectangular video
    // would be a lie, and any fill here hides the frame entirely.
  },
  text: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  artist: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});
