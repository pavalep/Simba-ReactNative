import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, useWindowDimensions} from 'react-native';
import {darkColors as cinemaColors} from '../../../../../theme/tokens';
import type {VideoV3PresentationMode} from './VideoV3PresentationTypes';

export interface VideoV3PresentationShellProps {
  readonly presentation: VideoV3PresentationMode;
  readonly children: React.ReactNode;
  readonly fullChrome: React.ReactNode;
  readonly miniChrome: React.ReactNode;
}

const MINI_WIDTH_MARGIN = 12;
const MINI_BOTTOM_MARGIN = 12;
const MINI_HEIGHT = 112;
const MINI_RADIUS = 14;
const TRANSITION_DURATION_MS = 280;

/**
 * Animates the projection container, never the native surface instance. Both
 * chrome projections remain mounted during the transition, while only the
 * target projection receives pointer events. An interrupted transition starts
 * from the current animated value and invalidates the old completion callback.
 */
export function VideoV3PresentationShell({
  presentation,
  children,
  fullChrome,
  miniChrome,
}: VideoV3PresentationShellProps) {
  const {width: viewportWidth, height: viewportHeight} = useWindowDimensions();
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
      useNativeDriver: false,
    }).start(({finished}) => {
      if (!finished || transitionGeneration.current !== generation) return;
    });
  }, [presentation, progress, target]);

  useEffect(() => () => {
    transitionGeneration.current += 1;
    progress.stopAnimation();
  }, [progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(0, viewportWidth - (MINI_WIDTH_MARGIN * 2)), viewportWidth],
  });
  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MINI_HEIGHT, viewportHeight],
  });
  const left = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MINI_WIDTH_MARGIN, 0],
  });
  const bottom = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MINI_BOTTOM_MARGIN, 0],
  });
  const radius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [MINI_RADIUS, 0],
  });
  const fullOpacity = progress;
  const miniOpacity = progress.interpolate({inputRange: [0, 1], outputRange: [1, 0]});

  return (
    <Animated.View
      style={[styles.shell, {width, height, left, bottom, borderRadius: radius}]}
      pointerEvents="box-none"
    >
      {children}
      <Animated.View
        pointerEvents={presentation === 'full' ? 'box-none' : 'none'}
        style={[styles.chromeProjection, {opacity: fullOpacity}]}
      >
        {fullChrome}
      </Animated.View>
      <Animated.View
        pointerEvents={presentation === 'mini' ? 'box-none' : 'none'}
        style={[styles.chromeProjection, styles.miniProjection, {opacity: miniOpacity}]}
      >
        {miniChrome}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: cinemaColors.background.surfaceDark,
  },
  chromeProjection: {
    ...StyleSheet.absoluteFill,
  },
  miniProjection: {
    justifyContent: 'flex-end',
  },
});
