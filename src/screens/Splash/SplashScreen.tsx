// ────────────────────────────────────────────────────────
// Simba Player — JS Fallback Splash Screen
//
// Google Maps / Swiggy-style animated splash for devices
// without native SplashActivity support (< Android 12).
// Also handles first-launch → scan prompt flow.
// ────────────────────────────────────────────────────────

import React, {useEffect, useRef, useState, useMemo} from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAppDispatch} from '../../store';
import {markLaunched} from '../../store/slices/settingsSlice';
import type {RootStackParamList} from '../../navigation/types';
import {SvgIcon} from '../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../theme';

const ANIMATION_DURATION = 1500;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen: React.FC = () => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();

  // Animated values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoscale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const promptOpacity = useRef(new Animated.Value(0)).current;

  const [showPrompt, setShowPrompt] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        content: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoStack: {
          width: 220,
          height: 220,
          alignItems: 'center',
          justifyContent: 'center',
        },
        glow: {
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: colors.accent.goldDim,
          opacity: 0.15,
        },
        logoWrap: {
          width: 96,
          height: 96,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ringWrap: {
          position: 'absolute',
          width: 130,
          height: 130,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ringTrack: {
          width: 130,
          height: 130,
          borderRadius: 65,
          borderWidth: 3,
          borderColor: colors.accent.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ringFill: {
          width: 130,
          height: 130,
          borderRadius: 65,
          borderWidth: 3,
          borderColor: 'transparent',
          borderTopColor: colors.accent.gold,
          position: 'absolute',
        },
        subtitle: {
          color: colors.accent.gold,
          fontSize: 14,
          letterSpacing: 2,
          marginTop: 24,
          fontWeight: '500',
        },
        prompt: {
          alignItems: 'center',
          marginTop: 64,
          paddingHorizontal: 40,
        },
        promptTitle: {
          color: colors.text.primary,
          fontSize: 22,
          fontWeight: '700',
          marginBottom: 12,
        },
        promptBody: {
          color: colors.text.secondary,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: 32,
        },
        scanButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.accent.gold,
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderRadius: 12,
        },
        scanButtonText: {
          color: colors.text.inverse,
          fontSize: 15,
          fontWeight: '700',
        },
        skipText: {
          color: colors.text.tertiary,
          fontSize: 13,
          marginTop: 20,
          textDecorationLine: 'underline',
        },
      }),
    [colors],
  );

  useEffect(() => {
    // ── Logo: fade-in + scale-up (0-600ms) ──
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(logoscale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // ── Ring: fade-in with delay (500-900ms) ──
    Animated.timing(ringOpacity, {
      toValue: 1,
      duration: 400,
      delay: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // ── Subtitle: fade-in with delay (900-1300ms) ──
    Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 400,
      delay: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // ── Rotation loop for loading ring ──
    const rotationLoop = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotationLoop.start();

    // ── Glow pulse loop ──
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.7,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    // ── Navigate after full animation ──
    const timer = setTimeout(() => {
      setShowPrompt(true);
      // Stop loops on prompt
      rotationLoop.stop();
      glowLoop.stop();
      // Show prompt with fade-in
      Animated.timing(promptOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, ANIMATION_DURATION);

    return () => {
      clearTimeout(timer);
      rotationLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const handleScan = () => {
    dispatch(markLaunched());
    // Navigate to library tab so user can set up folders
    navigation.reset({index: 0, routes: [{name: 'MainTabs'}]});
  };

  const handleSkip = () => {
    dispatch(markLaunched());
    navigation.reset({index: 0, routes: [{name: 'MainTabs'}]});
  };

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.content}>
        {/* Logo stack */}
        <View style={styles.logoStack}>
          {/* Gold glow */}
          <Animated.View style={[styles.glow, {opacity: glowOpacity}]} />
          {/* Lion logo */}
          <Animated.View
            style={[
              styles.logoWrap,
              {opacity: logoOpacity, transform: [{scale: logoscale}]},
            ]}>
            <SvgIcon name="lion" size={96} color={colors.accent.gold} />
          </Animated.View>
          {/* Loading ring */}
          <Animated.View
            style={[
              styles.ringWrap,
              {opacity: ringOpacity, transform: [{rotate: spin}]},
            ]}>
            <View style={styles.ringTrack}>
              <View style={styles.ringFill} />
            </View>
          </Animated.View>
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, {opacity: subtitleOpacity}]}>
          Simba Player
        </Animated.Text>

        {/* Scan prompt (appears after animation) */}
        {showPrompt && (
          <Animated.View style={[styles.prompt, {opacity: promptOpacity}]}>
            <Text style={styles.promptTitle}>Welcome to Simba Player</Text>
            <Text style={styles.promptBody}>
              Scan your media library to discover videos and music. Or skip and
              browse later.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScan}
              activeOpacity={0.8}>
              <SvgIcon name="folder" size={20} color={colors.text.inverse} />
              <Text style={styles.scanButtonText}>Scan Media Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              hitSlop={{top: 12, bottom: 12, left: 24, right: 24}}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
};


