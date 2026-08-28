import React, {useEffect, useMemo, useRef} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import strings from '../../../../constants/strings';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import type {VideoLoadingState} from '../domain/VideoTypes';
import {useVideoPresentationGeometry} from './useVideoPresentationGeometry';

const PILL_TOP_OFFSET = 56;
const PULSE_DURATION_MS = 1200;
const SLIDE_IN_DURATION_MS = 200;
const LABEL_FADE_DURATION_MS = 120;

export interface VideoStatusPillProps {
  readonly loadingState: VideoLoadingState;
  readonly onRetry?: () => void;
  /**
   * Style override for tests / previews. The pill's positioning is
   * already absolute; callers can tweak `top` if they need to.
   */
  readonly style?: ViewStyle;
}

/**
 * v11: the player's **only** loading surface (spec §4.4). Renders one
 * of six kinds — `idle` returns null and the pill is hidden.
 *
 * Visibility is governed by `loadingState.kind`. Non-error kinds use
 * `pointerEvents: 'none'` so the pill never eats the frame's tap
 * target; the `error` kind switches to `pointerEvents: 'auto'` and
 * makes the whole pill a retry button.
 *
 * Animations are native-driver-only (Rule 11): the slide-in uses
 * `translateY` + `opacity`; the dot pulse is a `Animated.loop` of
 * opacity; the label crossfade is a key change.
 */
export function VideoStatusPill({
  loadingState,
  onRetry,
  style,
}: VideoStatusPillProps) {
  const geometry = useVideoPresentationGeometry();
  const kind = loadingState.kind;

  // Slide-in animation: runs once when the pill first becomes visible
  // (transitions from `idle` to any other kind).
  const slideProgress = useRef(new Animated.Value(0)).current;
  const isActive = kind !== 'idle';
  useEffect(() => {
    if (isActive) {
      slideProgress.setValue(0);
      Animated.timing(slideProgress, {
        toValue: 1,
        duration: SLIDE_IN_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // Snap back to 0 so the next activation animates from the
      // same starting position.
      slideProgress.setValue(0);
    }
  }, [isActive, slideProgress]);

  // Dot pulse: only runs while the pill is active. The pulse is a
  // 0.4 ↔ 1.0 loop on opacity, native driver.
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!isActive) {
      pulse.stopAnimation();
      pulse.setValue(0.4);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, pulse]);

  // Live-region announcement on every kind change. TalkBack reads the
  // label out automatically via `accessibilityLiveRegion: 'polite'`,
  // but a direct announcement guarantees the transition is heard on
  // devices that don't pick up the live-region signal.
  const prevKind = useRef<VideoLoadingState['kind']>(kind);
  useEffect(() => {
    if (prevKind.current === kind) return;
    prevKind.current = kind;
    if (kind === 'idle') return;
    AccessibilityInfo.announceForAccessibility(labelFor(loadingState));
  }, [kind, loadingState]);

  // Memoize the label so the Animated wrapping is stable across renders.
  const label = useMemo(() => labelFor(loadingState), [loadingState]);

  if (kind === 'idle') return null;

  const slideTranslateY = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });
  const slideOpacity = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const isError = kind === 'error';
  const dotColor = isError ? cinemaColors.semantic.error : cinemaColors.accent.gold;
  const fillPercent = kind === 'buffering' ? Math.round(loadingState.cacheFill * 100) : 0;

  const wrapperStyle: Animated.WithAnimatedValue<ViewStyle> = {
    top: geometry.topContentInset + PILL_TOP_OFFSET,
    opacity: slideOpacity,
    transform: [{translateY: slideTranslateY}],
  };

  // The wrapper never eats taps in non-error kinds; the inner Pill is
  // also `none` in those states. The error pill is the one affordance
  // the user can press to retry.
  const wrapperPointerEvents: 'box-none' | 'box-none' = 'box-none';

  const inner = (
    <Animated.View
      style={[
        styles.pill,
        {borderColor: dotColor},
        isError && styles.pillError,
      ]}
      pointerEvents={isError ? 'auto' : 'none'}
    >
      <Animated.View
        style={[styles.mark, {backgroundColor: dotColor, opacity: pulse}]}
      />
      {/* Key by label so React reconciles a fresh Text node on kind
          change; the parent slide-in animation is the visible crossfade. */}
      <Text
        key={label}
        style={styles.label}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
      {kind === 'buffering' && fillPercent > 0 ? (
        <View
          style={styles.progressTrack}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <View
            style={[
              styles.progressFill,
              {width: `${fillPercent}%`},
            ]}
          />
        </View>
      ) : null}
    </Animated.View>
  );

  return (
    <Animated.View
      pointerEvents={wrapperPointerEvents}
      style={[styles.wrapper, wrapperStyle, style]}
      accessibilityLiveRegion="polite"
    >
      {isError && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={strings.videoPillRetryLabel}
          accessibilityHint={strings.videoPillRetryHint}
          style={styles.pressable}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </Animated.View>
  );
}

function labelFor(state: VideoLoadingState): string {
  switch (state.kind) {
    case 'preparing':
      return strings.videoPillPreparing;
    case 'buffering':
      return strings.videoPillBuffering.replace('{pct}', String(Math.round(state.cacheFill * 100)));
    case 'seeking':
      return strings.videoPillSeeking;
    case 'reconnecting':
      return strings.videoPillReconnecting;
    case 'error':
      return state.message || strings.videoPillErrorWatchdog;
    case 'idle':
    default:
      return '';
  }
}

const PILL_BG = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: PILL_BG,
    borderWidth: StyleSheet.hairlineWidth,
    // Pill can grow wide on long error messages; cap it so it doesn't
    // bleed past the safe area on narrow screens.
    maxWidth: '92%',
  },
  pillError: {
    // Slight emphasis on the error pill: a soft errorDim tint behind
    // the border. Keeps it within the cinema palette (semantic.error
    // + semantic.errorDim — both already in tokens).
    backgroundColor: 'rgba(40,12,12,0.78)',
  },
  mark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 9,
  },
  label: {
    // spec §4.4: "bodySmall 700". The v8 architecture encodes weight
    // in the family key (see FONT_FAMILY.inter.bold → Inter-Bold.ttf
    // on Android; on iOS the name table resolves cleanly). No
    // `fontWeight` field — that field biases Android's picker toward
    // Bold for weights > 500 (see v8 architecture notes).
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 14,
    lineHeight: 20,
    color: cinemaColors.text.bright,
  },
  progressTrack: {
    // 3 px inner bar, full pill width minus horizontal padding.
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginTop: 6,
    alignSelf: 'stretch',
  },
  progressFill: {
    height: '100%',
    backgroundColor: cinemaColors.accent.gold,
  },
});
