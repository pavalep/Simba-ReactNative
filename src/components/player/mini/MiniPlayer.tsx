/**
 * V21 F4 — the mini player dock. One component, both lanes.
 *
 * ## Shape, and where it comes from
 *
 * Plex's and Jellyfin's mini player, Spotify's, YouTube Music's: a bar
 * docked above the content with artwork, title/artist, and play/pause,
 * tappable to open the full player, with a hairline progress line along its
 * top edge.
 *
 * It is a React overlay in the `MainActivity` tree, NOT a window operation.
 * Minimise and expand are two values of one request; nothing touches an
 * Activity, playback is never interrupted by either. That is the entire
 * reason audio stopped opening a window, and the reason video can now
 * minimise at all.
 *
 * ## Why there is only ONE of these, and why the video lane has a hole
 *
 * Before F4 the answer to "what does the dock look like for video" was
 * "nothing" — `AudioMiniBar` returned null for a video session, and back
 * from a video stopped playback outright. Two components would now mean two
 * copies of play/pause, close and the progress hairline to keep in step, so
 * there is one component and the lanes differ only in what occupies the
 * leading square: artwork for audio, live video for video.
 *
 * The hole is the load-bearing part, and it exists for a physical reason.
 * `PlayerSurface.mount` adds the `MpvRenderView` at index 0 of
 * `android.R.id.content`, i.e. beneath the entire React tree, and a
 * `SurfaceView` with default z-order is a separate SurfaceFlinger layer
 * composited BEHIND the window. So **every opaque React pixel between the
 * camera and the video hides it**, and reordering the view hierarchy cannot
 * change that. `setZOrderMediaOverlay` could lift it, and is forbidden:
 * PiP's VRI compositor samples the activity window and would no longer see
 * the video — the documented reason the view keeps default z-order.
 *
 * The bar is therefore transparent and rebuilt from three opaque plates
 * around a transparent rectangle exactly where the video is. Both the hole
 * and the rect handed to `setVideoBounds` come from ONE `measureInWindow`
 * pass, which is the property that matters: they cannot disagree, so the
 * video cannot land beside its own hole. Constants computed from the
 * stylesheet would be one refactor away from silently drifting.
 *
 * ## Square corners, deliberately
 *
 * The video is a rectangle because a `SurfaceView` cannot round its own
 * corners; the artwork beside it is rounded. Rounding the hole without
 * rounding the video would be a frame drawn around a rectangle that does not
 * fit it. A `TextureView` would allow both, and is rejected for the reason
 * already recorded on `MpvRenderView`: PiP shows black for it.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {usePresentation, useTransport} from '../../../infrastructure/player';
import {useNowPlayingStore} from '../../../state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../state/useAudioPresentationStore';
import {PlayerControl} from '../video/PlayerControl/PlayerControl';

const ART_SIZE = 44;
const PROGRESS_HEIGHT = 2;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiniPlayerProps {
  /** Stop playback and tear down the service. The X verb. */
  readonly onClose: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({onClose}) => {
  const {colors} = useTheme();
  const expandAudio = useAudioPresentationStore(s => s.expand);
  const nowPlaying = useNowPlayingStore(s => s.current);
  const {state, commands} = useTransport();
  const {setVideoPresentation, setVideoMiniRect} = usePresentation();

  const isVideo = nowPlaying?.streamType === 'video';

  const rootRef = useRef<View>(null);
  const slotRef = useRef<View>(null);
  const [hole, setHole] = useState<Rect | null>(null);

  /**
   * Measure the leading square and the bar in the same pass.
   *
   * The bar's rect is measured too, even though the surface only needs the
   * slot, because the plates are positioned against the bar. One pass means
   * one consistent set of numbers; measuring them at different moments
   * during a rotation could capture a bar and a slot that disagree.
   *
   * Zero-size results mean "not laid out yet" and are ignored rather than
   * published: a 0x0 rect would make `setVideoBounds` refuse, and the
   * refusal log would describe a layout bug that does not exist.
   */
  const publishGeometry = useCallback(() => {
    const root = rootRef.current;
    const slot = slotRef.current;
    if (root == null || slot == null) return;

    root.measureInWindow((rootX, rootY, rootW, rootH) => {
      if (rootW <= 0 || rootH <= 0) return;
      slot.measureInWindow((slotX, slotY, slotW, slotH) => {
        if (slotW <= 0 || slotH <= 0) return;
        // WINDOW pixels — the space `setVideoBounds` now takes, so this is
        // a pass-through with no coordinate translation in the middle.
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
      if (isVideo) publishGeometry();
    },
    [isVideo, publishGeometry],
  );

  // Leaving the video lane must retract the published rect, or a later
  // audio session would leave a video rect sitting in the store.
  useEffect(() => {
    if (!isVideo) {
      setHole(null);
      setVideoMiniRect(null);
      return;
    }
    publishGeometry();
  }, [isVideo, publishGeometry, setVideoMiniRect]);

  const onExpand = useCallback(() => {
    // One verb, chosen by lane: audio has its own presentation store, video
    // writes the request that `useVideoSurface` reads to re-fill the window.
    if (isVideo) {
      setVideoPresentation('expanded');
      return;
    }
    expandAudio();
  }, [isVideo, setVideoPresentation, expandAudio]);

  const hasDuration = state.durationMs > 0;
  const ratio =
    hasDuration && state.positionMs > 0
      ? Math.max(0, Math.min(1, state.positionMs / state.durationMs))
      : 0;

  const title = nowPlaying?.title ?? state.title;
  const artist = state.artist;
  const artwork = nowPlaying?.thumbnailPath;

  const plate = {
    backgroundColor: colors.background.onMediaSheet,
  };

  return (
    <View
      ref={rootRef}
      onLayout={onBarLayout}
      // Transparent for video so the plates can carve out the hole. Opaque
      // for audio, where nothing needs to show through and a transparent
      // bar would let the content behind it bleed into the title.
      style={[
        styles.root,
        isVideo ? styles.rootVideo : {...plate, borderTopColor: colors.border.subtle},
      ]}
      testID="mini-player">
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

      {isVideo && hole != null ? (
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
          {isVideo ? (
            // The hole. No background, no children — every pixel here has
            // to stay see-through or the video is covered.
            <View
              ref={slotRef}
              style={styles.videoSlot}
              testID="mini-video-slot"
            />
          ) : artwork ? (
            <Image
              source={{uri: artwork}}
              style={[styles.artwork, {backgroundColor: colors.background.elevated}]}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={[
                styles.artwork,
                styles.artworkEmpty,
                {
                  backgroundColor: colors.background.elevated,
                  borderColor: colors.border.subtle,
                },
              ]}
            />
          )}

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
            testID="mini-playpause"
          />
          <PlayerControl
            icon="close"
            accessibilityLabel="Close player and stop playback"
            onPress={onClose}
            testID="mini-close"
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.xs,
  },
  // No hairline border for the video lane: it would draw an opaque line
  // across the top of the plates and reintroduce a seam the hole is meant
  // to avoid.
  rootVideo: {
    borderTopWidth: 0,
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
    paddingTop: spacing.xs,
  },
  expandTarget: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // 44 tall: the artwork itself is 44, so the row meets the same
    // target floor the artwork does.
    minHeight: ART_SIZE,
  },
  artwork: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: spacing.sm,
  },
  artworkEmpty: {
    borderWidth: StyleSheet.hairlineWidth,
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