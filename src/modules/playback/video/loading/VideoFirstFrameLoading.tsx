import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {darkColors as cinemaColors} from '../../../../../theme/tokens';
import type {VideoV3SessionSnapshot} from '../domain/VideoV3Types';

export interface VideoV3FirstFrameLoadingProps {
  readonly session: VideoV3SessionSnapshot;
}

const REVEAL_DELAY_MS = 180;
const FADE_DURATION_MS = 220;

/**
 * First-frame gate for V3. The native surface remains mounted underneath; this
 * layer only controls what the user sees before mpv confirms the first frame.
 */
export function VideoV3FirstFrameLoading({session}: VideoV3FirstFrameLoadingProps) {
  const [revealed, setRevealed] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const generation = session.generation;
  const hasFirstFrame = session.hasFirstFrame;
  const isActive = session.phase !== 'idle' && session.source !== null;
  const isError = session.phase === 'error';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRevealed(false);
    opacity.stopAnimation();
    opacity.setValue(1);
    if (isActive && !hasFirstFrame) {
      timer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [generation, hasFirstFrame, isActive, opacity]);

  useEffect(() => {
    if (!hasFirstFrame) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [hasFirstFrame, opacity]);

  if (!isActive || (!revealed && !hasFirstFrame)) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.root, {opacity}]}>
      <View style={styles.center}>
        <View style={styles.brandMark}><View style={styles.brandMarkInner} /></View>
        <Text style={styles.title}>{isError ? 'Unable to start video' : 'Preparing video'}</Text>
        <Text style={styles.subtitle}>
          {isError ? session.error?.message ?? 'Try again from the player controls.' : 'Starting the first frame…'}
        </Text>
        {!isError ? <ActivityIndicator color={cinemaColors.accent.gold} size="small" /> : null}
      </View>
      {!isError && session.cacheFill > 0 ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${Math.round(session.cacheFill * 100)}%`}]} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: cinemaColors.background.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    width: '84%',
    alignItems: 'center',
  },
  brandMark: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderColor: cinemaColors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  brandMarkInner: {
    width: 13,
    height: 13,
    backgroundColor: cinemaColors.accent.gold,
    transform: [{rotate: '45deg'}],
  },
  title: {
    color: cinemaColors.text.bright,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: cinemaColors.text.onMediaMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  progressTrack: {
    position: 'absolute',
    left: 26,
    right: 26,
    bottom: 22,
    height: 3,
    backgroundColor: cinemaColors.text.tertiary,
  },
  progressFill: {
    height: 3,
    backgroundColor: cinemaColors.accent.gold,
  },
});
