import React, {useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Easing,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {useAccessibility} from '../../../hooks/useAccessibility';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import {GoogleSignInButton} from '../../../components/core/GoogleSignInButton/GoogleSignInButton';
import {useLoginScreen} from '../hooks/useLoginScreen';
import type {AuthErrorKind} from '../../../store/slices/authSlice';
import type {LoginScreenProps} from '../types';
import {navigationRef} from '../../../navigation/navigationHelper';
import {BRAND} from '../../../constants/brand';

type Props = LoginScreenProps;

const {width} = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.72, 320);

/** 43.3: tailored copy per failure category — the button itself is the retry. */
const ERROR_COPY: Record<AuthErrorKind, string> = {
  cancelled: 'Sign-in was cancelled. Tap the button to try again.',
  play_services: "Google Play Services aren't available. Update them, then try again.",
  offline: "You're offline. Connect to the internet and try again.",
  session_expired: 'Your session expired. Please sign in again.',
  unknown: '', // falls back to the raw error message
};

export const LoginScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {pulseAnim, fadeAnim, isLoading, error, errorKind, handleSignIn, isAuthenticated} =
    useLoginScreen();
  const {reduceMotion} = useAccessibility();

  // ── Auto-navigate to Home once authenticated ──
  // Navigation is now driven from useAuth.signIn() so the redirect races
  // correctly with the RootNavigator `key` remount; this effect only
  // handles the edge case where auth flips in via silent restore.
  useEffect(() => {
    if (isAuthenticated && navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
          },
        ],
      });
    }
  }, [isAuthenticated]);

  // ── Stagger Entrance Animation ──
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoscale = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (reduceMotion) {
      // 59.7: reduced motion — render everything fully visible, skip stagger
      logoOpacity.setValue(1);
      logoscale.setValue(1);
      taglineOpacity.setValue(1);
      taglineTranslateY.setValue(0);
      buttonOpacity.setValue(1);
      buttonScale.setValue(1);
      return;
    }
    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {toValue: 1, duration: 500, useNativeDriver: true}),
        Animated.spring(logoscale, {toValue: 1, friction: 6, tension: 60, useNativeDriver: true}),
      ]).start();
    }, 0);

    const t2 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        Animated.timing(taglineTranslateY, {toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      ]).start();
    }, 200);

    const t3 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, {toValue: 1, duration: 400, useNativeDriver: true}),
        Animated.spring(buttonScale, {toValue: 1, friction: 7, tension: 80, useNativeDriver: true}),
      ]).start();
    }, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [logoOpacity, logoscale, taglineOpacity, taglineTranslateY, buttonOpacity, buttonScale, reduceMotion]);

  const orbScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const orbOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.16],
  });

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      {/* Content */}
      <Animated.View
        style={[styles.content, {opacity: fadeAnim, paddingTop: insets.top}]}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoStack}>
            {/* Pulsing orb glow anchored behind the logo */}
            <Animated.View
              style={[
                styles.orb,
                {
                  backgroundColor: colors.accent.gold,
                  opacity: orbOpacity,
                  transform: [{scale: orbScale}],
                },
              ]}
              pointerEvents="none"
            />
            {/* Lion logo + wordmark + tagline perfectly centered as one block */}
            <Animated.View
              style={[
                styles.logoWrap,
                {opacity: logoOpacity, transform: [{scale: logoscale}]},
              ]}>
              <SvgIcon name="lion" size={96} color="#5C3A1E" />
              <AppText
                variant="brandScript"
                style={[styles.logoText, {color: '#5C3A1E'}]}>
                {BRAND.name}
              </AppText>
              <Animated.View
                style={[
                  styles.taglineWrap,
                  {opacity: taglineOpacity, transform: [{translateY: taglineTranslateY}]},
                ]}>
                <AppText
                  variant="displaySerif"
                  style={[styles.tagline, {color: '#6B4226'}]}>
                    {BRAND.tagline}
                  </AppText>
              </Animated.View>
            </Animated.View>
          </View>
        </View>

        {/* Bottom section */}
        <Animated.View style={[styles.bottomSection, {paddingBottom: insets.bottom + 16, opacity: buttonOpacity}]}>
          <Animated.View style={[styles.buttonWrap, {transform: [{scale: buttonScale}]}]}>
            <GoogleSignInButton
              onPress={handleSignIn}
              loading={isLoading}
              disabled={isAuthenticated}
            />

            {error ? (
              <View style={styles.errorWrap}>
                <AppText
                  style={[styles.errorText, {color: colors.semantic.error}]}>
                  {errorKind && ERROR_COPY[errorKind]
                    ? ERROR_COPY[errorKind]
                    : error}
                </AppText>
                {errorKind !== 'cancelled' ? (
                  <TouchableOpacity
                    onPress={handleSignIn}
                    activeOpacity={0.7}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel={isLoading ? 'Signing in' : 'Try signing in again'}
                    accessibilityState={{disabled: isLoading}}
                    hitSlop={{top: 12, bottom: 12, left: 24, right: 24}}>
                    <AppText
                      variant="bodySmall"
                      color="accent"
                      style={styles.retryText}>
                      Try Again
                    </AppText>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </Animated.View>

          {/* 51.2: legal links — open the in-app Privacy / Terms screens */}
          <View style={styles.legalRow}>
            <TouchableOpacity
              onPress={() => navigationRef.navigate('Settings', {screen: 'Privacy'})}
              activeOpacity={0.7}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              accessibilityRole="link"
              accessibilityLabel="Privacy Policy">
              <AppText variant="caption" color="tertiary" style={styles.legalLink}>
                Privacy Policy
              </AppText>
            </TouchableOpacity>
            <View style={[styles.legalDot, {backgroundColor: colors.text.tertiary}]} />
            <TouchableOpacity
              onPress={() => navigationRef.navigate('Settings', {screen: 'Terms'})}
              activeOpacity={0.7}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              accessibilityRole="link"
              accessibilityLabel="Terms of Service">
              <AppText variant="caption" color="tertiary" style={styles.legalLink}>
                Terms of Service
              </AppText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  logoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -40, // Nudge up slightly so it feels perfectly balanced
  },
  logoStack: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // v7: wordmark uses the brandScript typography token
  // (Allura, 48px by default). We add a small optical
  // marginTop so the script sits comfortably under the lion.
  logoText: {
    marginTop: 14,
  },
  taglineWrap: {
    marginTop: 2,
    alignItems: 'center',
  },
  tagline: {
    textAlign: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
  buttonWrap: {
    marginBottom: 24, // Keep the button well above the legal links
    alignItems: 'center',
    minHeight: 80, // Reserve space for potential error text
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  errorWrap: {
    alignItems: 'center',
    gap: 6,
  },
  retryText: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
  legalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
