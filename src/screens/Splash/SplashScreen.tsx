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
import {useAuth} from '../../hooks/useAuth';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {AppText} from '../../components/core/AppText/AppText';

const ANIMATION_DURATION = 1500;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen: React.FC = () => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const {isAuthenticated} = useAuth();

  // Animated values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoscale = useRef(new Animated.Value(0.85)).current;
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
        logoWrap: {
          width: 96,
          height: 96,
          alignItems: 'center',
          justifyContent: 'center',
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

  /* eslint-disable react-hooks/exhaustive-deps */
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

    // ── Subtitle: fade-in with delay (900-1300ms) ──
    Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 400,
      delay: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // ── Navigate after full animation ──
    const timer = setTimeout(() => {
      setShowPrompt(true);
      // Show prompt with fade-in
      Animated.timing(promptOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, ANIMATION_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleScan = () => {
    dispatch(markLaunched());
    // First-time users must authenticate before entering the app
    navigation.reset({
      index: 0,
      routes: [{name: isAuthenticated ? 'MainTabs' : 'Login'}],
    });
  };

  const handleSkip = () => {
    dispatch(markLaunched());
    navigation.reset({
      index: 0,
      routes: [{name: isAuthenticated ? 'MainTabs' : 'Login'}],
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.content}>
        {/* Logo stack */}
        <View style={styles.logoStack}>
          {/* ActivityOrb behind the lion icon */}
          <ActivityOrb size={220} />
          {/* Lion logo */}
          <Animated.View
            style={[
              styles.logoWrap,
              {opacity: logoOpacity, transform: [{scale: logoscale}]},
            ]}>
            <SvgIcon name="lion" size={96} color={colors.accent.gold} />
          </Animated.View>
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, {opacity: subtitleOpacity}]}>
          Simba Player
        </Animated.Text>

        {/* Scan prompt (appears after animation) */}
        {showPrompt && (
          <Animated.View style={[styles.prompt, {opacity: promptOpacity}]}>
            <AppText style={styles.promptTitle}>Welcome to Simba Player</AppText>
            <AppText style={styles.promptBody}>
              Scan your media library to discover videos and music. Or skip and
              browse later.
            </AppText>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScan}
              activeOpacity={0.8}>
              <SvgIcon name="folder" size={20} color={colors.text.inverse} />
              <AppText style={styles.scanButtonText}>Scan Media Library</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              hitSlop={{top: 12, bottom: 12, left: 24, right: 24}}>
              <AppText style={styles.skipText}>Skip for now</AppText>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
};


