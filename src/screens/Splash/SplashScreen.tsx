// ────────────────────────────────────────────────────────
// Simba Player — Animated JS Splash (v7)
//
// Plays after the native Android-12+ system splash
// (windowSplashScreen* attributes on @style/SplashTheme) or
// the SplashActivity. Sequence:
//
//   0-600ms  Lion mark: scale 0.6 → 1.0, opacity 0 → 1 (ease-out)
//   400-900ms  Wordmark "Simba" (Allura): scale 0.95 → 1.0,
//              opacity 0 → 1 (delay 400ms, 500ms ease-out)
//   800-1200ms  Tagline "Your media, your way" (Cormorant):
//              opacity 0 → 0.7 (delay 800ms, 400ms)
//   0-end     Gold pulse loop: opacity 0 → 0.3 → 0, 1.5s,
//              Animated.loop on a gold ring around the lion
//   0-end     Progress ring: 0 → 100% while
//              state.auth.isRestoring === true
//   ≥1500ms   Handoff to RootNavigator
//             (Splash → Login if not authed, Home if authed)
//
// Reduce-motion: skip scale transforms, keep opacity fades,
// extend minimum duration to 1800ms.
//
// All transforms / opacities use `useNativeDriver: true`.
// The progress ring is JS-driven (SVG stroke-dashoffset
// interpolation). The pulse loop runs on the native driver.
// ────────────────────────────────────────────────────────

import React, {useEffect, useMemo, useRef} from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import {useAppDispatch, useAppSelector} from '../../store';
import {markLaunched} from '../../store/slices/settingsSlice';
import {selectIsAuthenticated, selectIsRestoring} from '../../store/slices/authSlice';
import type {RootStackParamList} from '../../navigation/types';
import {SvgIcon} from '../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../theme';
import {useAccessibility} from '../../hooks/useAccessibility';
import {AppText} from '../../components/core/AppText/AppText';
import {BRAND} from '../../constants/brand';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Animation timing (ms) — matches spec §15.
const TIMING = {
  lion: {duration: 600, delay: 0},
  wordmark: {duration: 500, delay: 400},
  tagline: {duration: 400, delay: 800},
  pulse: {duration: 1500, loop: true},
  // The progress ring is driven by auth rehydration; it
  // interpolates 0→1 over the rehydration window, then
  // holds at 1 until handoff.
} as const;

// Minimum splash duration — the spec says "1.2–1.8 s before
// handoff". 1500ms is the sweet spot: long enough for the full
// visual sequence, short enough that authed users don't feel
// held up. Reduce-motion bumps it to 1800ms.
const MIN_SPLASH_MS = 1500;
const MIN_SPLASH_MS_REDUCE = 1800;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen: React.FC = () => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isRestoring = useAppSelector(selectIsRestoring);
  const {reduceMotion} = useAccessibility();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();

  // ── Progress ring geometry ──
  // Sized to sit just outside the lion mark, like a halo.
  const RING_RADIUS = 100;
  const RING_STROKE = 3;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // ── Animated values ──
  const lionOpacity = useRef(new Animated.Value(0)).current;
  const lionScale = useRef(new Animated.Value(0.6)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkScale = useRef(new Animated.Value(0.95)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  // Pulse loop — opacity 0 → 0.3 → 0 on the gold ring
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  // Progress ring — 0 = full empty, 1 = full complete.
  // We map `progress` to `strokeDashoffset` (0 = full drawn,
  // circumference = fully hidden) so the ring fills clockwise.
  const progress = useRef(new Animated.Value(0)).current;

  // Reduce-motion flag captured in a ref so the long-lived
  // animation effects (pulse + handoff timer) can read the
  // value at mount-time without re-triggering.
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  const goldColor = colors.accent.gold;
  const parchmentColor = colors.background.primary;
  const isDark = colors.background.primary !== '#F5F0E8'; // heuristic: not parchment

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: parchmentColor,
          justifyContent: 'center',
          alignItems: 'center',
        },
        content: {
          flex: 1,
          paddingHorizontal: 32,
        },
        logoArea: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        logoStack: {
          width: 280,
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // The lion + gold ring + wordmark + tagline all sit
        // in this single column. The gold ring is an
        // absolutely-positioned SVG circle behind the lion.
        logoColumn: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        lionWrap: {
          width: 96,
          height: 96,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // v7: wordmark uses the brandScript typography token
        // (Allura, 48px by default). Optical marginTop so
        // the script sits comfortably under the lion.
        wordmark: {
          marginTop: 14,
        },
        // v7: tagline in Cormorant (displaySerif).
        taglineWrap: {
          marginTop: 2,
          alignItems: 'center',
        },
        tagline: {
          textAlign: 'center',
        },
      }),
    [parchmentColor],
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (reduceMotionRef.current) {
      // Reduce-motion: skip transforms, keep fades. Everything
      // is fully visible at the end. We let the handoff timer
      // drive exit.
      Animated.parallel([
        Animated.timing(lionOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(taglineOpacity, {
          toValue: 0.7,
          duration: 400,
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    // ── Full animation sequence ──
    Animated.parallel([
      // Lion: fade-in + scale-up (0-600ms)
      Animated.parallel([
        Animated.timing(lionOpacity, {
          toValue: 1,
          duration: TIMING.lion.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(lionScale, {
          toValue: 1,
          duration: TIMING.lion.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // Wordmark: fade-in + slight scale-up (400-900ms)
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: TIMING.wordmark.duration,
          delay: TIMING.wordmark.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkScale, {
          toValue: 1,
          duration: TIMING.wordmark.duration,
          delay: TIMING.wordmark.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // Tagline: fade-in (800-1200ms)
      Animated.timing(taglineOpacity, {
        toValue: 0.7,
        duration: TIMING.tagline.duration,
        delay: TIMING.tagline.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // Progress ring fills as auth rehydrates. The duration
      // is a soft cap — if rehydration finishes before this,
      // we cap at 1.5s; if it takes longer, the ring stays
      // at the in-progress value and the splash waits.
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Gold pulse loop — runs forever until the splash unmounts
    // on handoff. Each pulse is 1.5s. The opacity oscillates
    // 0 → 0.3 → 0.
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [
    lionOpacity,
    lionScale,
    wordmarkOpacity,
    wordmarkScale,
    taglineOpacity,
    pulseOpacity,
    progress,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ── Progress ring driver ──
  // When `isRestoring` flips false, snap the progress to 1
  // (we know we're done rehydrating). When isRestoring is
  // still true at handoff, the ring is whatever value the
  // current animation has reached.
  useEffect(() => {
    if (!isRestoring) {
      Animated.timing(progress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  }, [isRestoring, progress]);

  // ── Handoff ──
  // Wait for the minimum splash duration AND for auth
  // rehydration to complete, then navigate to Login or Home.
  // Reduce-motion uses a longer minimum.
  useEffect(() => {
    const minMs = reduceMotionRef.current
      ? MIN_SPLASH_MS_REDUCE
      : MIN_SPLASH_MS;

    const t = setTimeout(() => {
      dispatch(markLaunched());
      navigation.reset({
        index: 0,
        routes: [{name: isAuthenticated ? 'Home' : 'Login'}],
      });
    }, minMs);

    return () => clearTimeout(t);
  }, [dispatch, isAuthenticated, navigation]);

  // Stroke offset for the progress ring. When `progress` is 0
  // the ring is fully hidden; when 1, fully drawn.
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <View style={[styles.content, {paddingTop: insets?.top}]}>
        <View style={styles.logoArea}>
          {/* Logo stack */}
          <View style={styles.logoStack}>
            {/* Pulse ring — absolute SVG circle behind the lion,
                looping gold opacity */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {alignItems: 'center', justifyContent: 'center', opacity: pulseOpacity},
              ]}
              pointerEvents="none">
              <Svg
                width={RING_RADIUS * 2 + RING_STROKE * 2}
                height={RING_RADIUS * 2 + RING_STROKE * 2}>
                <Circle
                  cx={RING_RADIUS + RING_STROKE}
                  cy={RING_RADIUS + RING_STROKE}
                  r={RING_RADIUS}
                  stroke={goldColor}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
              </Svg>
            </Animated.View>

            {/* Lion mark + wordmark + tagline as a centered
                column. The whole column animates in together
                (lion first, then wordmark, then tagline). */}
            <View style={styles.logoColumn}>
              <Animated.View
                style={[
                  styles.lionWrap,
                  {opacity: lionOpacity, transform: [{scale: lionScale}]},
                ]}>
                <SvgIcon name="lion" size={96} color="#5C3A1E" />
              </Animated.View>

              <Animated.View
                style={{
                  opacity: wordmarkOpacity,
                  transform: [{scale: wordmarkScale}],
                }}>
                <AppText
                  variant="brandScript"
                  style={[styles.wordmark, {color: '#5C3A1E'}]}>
                  {BRAND.name}
                </AppText>
              </Animated.View>

              <Animated.View
                style={[styles.taglineWrap, {opacity: taglineOpacity}]}>
                <AppText
                  variant="displaySerif"
                  style={[styles.tagline, {color: '#6B4226'}]}>
                  {BRAND.tagline}
                </AppText>
              </Animated.View>
            </View>
          </View>

          {/* Progress ring — sits below the logo stack, fills
              as auth rehydrates. SVG circle with animated
              stroke-dashoffset. */}
          <View style={{marginTop: 48, alignItems: 'center'}}>
            <Svg
              width={RING_RADIUS * 2 + RING_STROKE * 2}
              height={RING_RADIUS * 2 + RING_STROKE * 2}>
              <Defs>
                <LinearGradient id="progressGold" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={goldColor} stopOpacity="0.6" />
                  <Stop offset="1" stopColor={goldColor} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              {/* Track — light parchment-tinted ring */}
              <Circle
                cx={RING_RADIUS + RING_STROKE}
                cy={RING_RADIUS + RING_STROKE}
                r={RING_RADIUS}
                stroke={goldColor}
                strokeWidth={RING_STROKE}
                strokeOpacity={0.15}
                fill="none"
              />
              {/* Foreground — animated gold ring */}
              <AnimatedCircle
                cx={RING_RADIUS + RING_STROKE}
                cy={RING_RADIUS + RING_STROKE}
                r={RING_RADIUS}
                stroke="url(#progressGold)"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRCUMFERENCE}, ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                // Rotate -90° so the fill starts at 12 o'clock
                // and sweeps clockwise
                originX={RING_RADIUS + RING_STROKE}
                originY={RING_RADIUS + RING_STROKE}
                rotation={-90}
              />
            </Svg>
          </View>
        </View>
      </View>
    </View>
  );
};
