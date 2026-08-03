// ────────────────────────────────────────────────────────
// Simba Player — JS Fallback Splash Screen
//
// Google Maps / Swiggy-style animated splash for devices
// without native SplashActivity support (< Android 12).
// Also handles first-launch → scan prompt flow.
// ────────────────────────────────────────────────────────

import React, {useEffect, useRef, useMemo} from 'react';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppDispatch} from '../../store';
import {markLaunched} from '../../store/slices/settingsSlice';
import type {RootStackParamList} from '../../navigation/types';
import {SvgIcon} from '../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../theme';
import {useAuth} from '../../hooks/useAuth';
import {useAccessibility} from '../../hooks/useAccessibility';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {AppText} from '../../components/core/AppText/AppText';

const ANIMATION_DURATION = 1500;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen: React.FC = () => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();
  const {isAuthenticated} = useAuth();
  const {reduceMotion} = useAccessibility();
  const insets = useSafeAreaInsets();

  // Animated values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoscale = useRef(new Animated.Value(0.85)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

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
          flex: 1,
          paddingHorizontal: 32,
        },
        logoArea: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: -40,
        },
        logoStack: {
          width: 280,
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoWrap: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoText: {
          marginTop: 14,
          letterSpacing: 10,
          fontSize: 32,
          lineHeight: 36,
          fontWeight: '900',
        },
        taglineWrap: {
          marginTop: 2,
          alignItems: 'center',
        },
        tagline: {
          textAlign: 'center',
        },
      }),
    [colors],
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (reduceMotion) {
      // 59.7: reduced motion — render everything fully visible, skip entrance
      logoOpacity.setValue(1);
      logoscale.setValue(1);
      subtitleOpacity.setValue(1);
    } else {
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
    }

    // ── Navigate after full animation ──
    const timer = setTimeout(() => {
      dispatch(markLaunched());
      navigation.reset({
        index: 0,
        routes: [{name: isAuthenticated ? 'MainTabs' : 'Login'}],
      });
    }, ANIMATION_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, [reduceMotion, dispatch, isAuthenticated, navigation]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.content, {paddingTop: insets?.top}]}>
        <View style={styles.logoArea}>
          {/* Logo stack */}
          <View style={styles.logoStack}>
            {/* ActivityOrb behind the lion icon */}
            <ActivityOrb size={280} />
            {/* Lion logo + wordmark + tagline perfectly centered as one block */}
            <Animated.View
              style={[
                styles.logoWrap,
                {opacity: logoOpacity, transform: [{scale: logoscale}]},
              ]}>
              <SvgIcon name="lion" size={96} color="#5C3A1E" />
              <AppText style={[styles.logoText, {color: '#5C3A1E'}]}>
                SIMBA
              </AppText>
              <Animated.View style={{opacity: subtitleOpacity}}>
                <AppText variant="body1" style={[styles.tagline, {color: '#6B4226'}]}>
                  Your media, your way
                </AppText>
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};


