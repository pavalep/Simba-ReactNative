import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, useWindowDimensions, View} from 'react-native';
import type {VideoPresentationMode} from './VideoPresentationTypes';
import {
  computeMiniSlot,
  MINI_RADIUS,
  TRANSITION_DURATION_MS,
} from './videoShellConstants';

export interface VideoPresentationShellProps {
  readonly presentation: VideoPresentationMode;
  readonly children: React.ReactNode;
  readonly fullChrome: React.ReactNode;
  readonly miniChrome: React.ReactNode;
  /** v11 T7.1: optional testID for the outer shell container. Useful
   *  for instrumentation + tests; production hosts can omit it. */
  readonly testID?: string;
  /**
   * V12 Phase 8: when `true`, the shell's background is transparent
   * so the underlying native SurfaceView (mounted at the activity
   * root in `PlayerActivity`) shows through the React tree.
   *
   * Production hosts should set this `true` only when the shell is
   * rendering inside `PlayerActivity`; the mini-player host on the
   * home screen MUST stay opaque (its opaque background is what hides
   * the home-screen content beneath it).
   *
   * Default: `false` (opaque `SHELL_BACKGROUND`).
   */
  readonly transparentRoot?: boolean;
}

/**
 * v11 T7.1 — Animates the projection container, never the native
 * surface instance. The outer shell is a STATIC `View` whose size
 * matches the TARGET presentation immediately on every change. The
 * transition between mini and full is a pure visual scale + opacity
 * on an inner `Animated.View` "transform layer" (native driver).
 *
 * Why two layers:
 *   - The outer shell's width/height/left/bottom change ONCE per
 *     presentation flip, not on every progress tick. This damps
 *     the size-change storm the v10 shell had (T7.1 error fix).
 *   - The transform layer scales a single full-viewport "content
 *     frame" down to mini proportions. The surface (mounted once
 *     inside the content frame) is re-laid by the native bridge
 *     exactly once per `surfacePresentation` change — never on
 *     progress ticks. The mini→full during an active seek no
 *     longer drops the seek because the surface's session is
 *     read-only from the host's perspective.
 *
 * Both chrome projections stay mounted during the transition; one
 * fades in via the transform layer's opacity, the other fades out.
 * An interrupted transition starts from the current animated value
 * and invalidates the old completion callback via the
 * `transitionGeneration` ref.
 */
export function VideoPresentationShell({
  presentation,
  children,
  fullChrome,
  miniChrome,
  testID,
  transparentRoot = false,
}: VideoPresentationShellProps) {
  const {width: viewportWidth, height: viewportHeight} = useWindowDimensions();
  // Native-driver `Animated.Value` (only transform + opacity go
  // through the native driver; layout is decoupled and snaps).
  const progress = useRef(new Animated.Value(presentation === 'full' ? 1 : 0)).current;
  const transitionGeneration = useRef(0);
  const target = presentation === 'full' ? 1 : 0;

  useEffect(() => {
    const generation = transitionGeneration.current + 1;
    transitionGeneration.current = generation;
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: target,
      duration: TRANSITION_DURATION_MS,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (!finished || transitionGeneration.current !== generation) return;
    });
  }, [presentation, progress, target]);

  useEffect(
    () => () => {
      transitionGeneration.current += 1;
      progress.stopAnimation();
    },
    [progress],
  );

  // T7.1: outer shell snaps to the TARGET size on every presentation
  // change (no animation). The transform layer inside handles the
  // visual transition.
  const miniSlot = computeMiniSlot(viewportWidth, viewportHeight);
  const isFull = presentation === 'full';
  const shellWidth = isFull ? viewportWidth : miniSlot.width;
  const shellHeight = isFull ? viewportHeight : miniSlot.height;
  const shellLeft = isFull ? 0 : miniSlot.x;
  const shellTop = isFull ? 0 : miniSlot.y;
  const shellRadius = isFull ? 0 : MINI_RADIUS;

  // T7.1: transform math. The inner content is always rendered at
  // FULL viewport size; the transform layer scales + translates it
  // from mini-proportions to full-proportions as `progress` goes
  // 0 → 1.
  //
  // At progress=0 the scaled content's box is (miniW × miniH) and
  // its center sits at (fullW/2, fullH/2). We translate it so the
  // box's top-left lands at (miniSlot.x, miniSlot.y).
  const miniScaleX = miniSlot.width / Math.max(1, viewportWidth);
  const miniScaleY = miniSlot.height / Math.max(1, viewportHeight);
  const scaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [miniScaleX, 1],
  });
  const scaleY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [miniScaleY, 1],
  });
  // Translate the scaled content so its (miniW × miniH) box lands
  // at (miniSlot.x, miniSlot.y). The transform origin is the
  // content's center (default), so the math is:
  //   translateX = miniSlot.x - ((fullW - miniW) / 2)
  //   translateY = miniSlot.y - ((fullH - miniH) / 2)
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      miniSlot.x - (viewportWidth - miniSlot.width) / 2,
      0,
    ],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [
      miniSlot.y - (viewportHeight - miniSlot.height) / 2,
      0,
    ],
  });
  // Opacity is shared between the two chrome projections: full
  // chrome fades in as progress → 1, mini chrome fades out.
  const fullOpacity = progress;
  const miniOpacity = progress.interpolate({inputRange: [0, 1], outputRange: [1, 0]});

  return (
    <View
      testID={testID}
      style={[
        styles.shell,
        {
          width: shellWidth,
          height: shellHeight,
          left: shellLeft,
          top: shellTop,
          borderRadius: shellRadius,
        },
        // V12 Phase 8: when the shell is rendering inside
        // `PlayerActivity`, drop the opaque background so the
        // SurfaceView mounted at content-root index 0 shows
        // through. Mini-player hosts (on the home screen) keep the
        // opaque `SHELL_BACKGROUND` to mask home-screen bleed.
        transparentRoot ? styles.shellTransparent : styles.shellOpaque,
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.transformLayer,
          {
            width: viewportWidth,
            height: viewportHeight,
            transform: [{translateX}, {translateY}, {scaleX}, {scaleY}],
          },
        ]}
        pointerEvents="box-none"
      >
        {children}
        <Animated.View
          pointerEvents={isFull ? 'box-none' : 'none'}
          style={[styles.chromeProjection, {opacity: fullOpacity}]}
        >
          {fullChrome}
        </Animated.View>
        <Animated.View
          pointerEvents={!isFull ? 'box-none' : 'none'}
          style={[styles.chromeProjection, styles.miniProjection, {opacity: miniOpacity}]}
        >
          {miniChrome}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// FIX (v11 hotfix): `background.surfaceDark` is rgba(18,18,22,0.92) — the
// 8% alpha let the home screen bleed through the player. The shell must be
// an opaque cinema surface; same rgb, alpha 1.
const SHELL_BACKGROUND = '#121216';

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    overflow: 'hidden',
  },
  // V12 Phase 8: opaque (default) — masks home-screen content beneath
  // the mini player (v11 hotfix behaviour). Used by the inline
  // MainActivity host.
  shellOpaque: {
    backgroundColor: SHELL_BACKGROUND,
  },
  // V12 Phase 8: transparent — used by the PlayerActivity host so the
  // SurfaceView at content-root index 0 (mounted by `PlayerActivity`)
  // shows through. `overflow: 'hidden'` (in `shell`) still clips the
  // transform layer so the mini/full chrome projections can't paint
  // outside the shell box.
  shellTransparent: {
    backgroundColor: 'transparent',
  },
  // T7.1: the transform layer is the "single full-viewport content
  // frame" that the shell animates. The surface + both chrome
  // projections live inside it. Its native-driver transform
  // (translate + scale) is what produces the mini↔full visual
  // transition.
  transformLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  chromeProjection: {
    ...StyleSheet.absoluteFill,
  },
  miniProjection: {
    justifyContent: 'flex-end',
  },
});
