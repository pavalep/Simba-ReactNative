import React, {useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Easing,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {GoogleSignInButton} from '../../components/core/GoogleSignInButton/GoogleSignInButton';
import {useLoginScreen} from './hooks/useLoginScreen';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'Login'>;

const {width} = Dimensions.get('window');
const ORB_SIZE = width * 0.9;

export const LoginScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {pulseAnim, fadeAnim, isLoading, error, handleSignIn} =
    useLoginScreen();

  // ── Stagger Entrance Animation ──
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoscale = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
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
  }, [logoOpacity, logoscale, taglineOpacity, taglineTranslateY, buttonOpacity, buttonScale]);

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
      {/* Animated background orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            backgroundColor: colors.accent.gold,
            opacity: orbOpacity,
            transform: [{scale: orbScale}],
          },
        ]}
        pointerEvents="none"
      />

      {/* Content */}
      <Animated.View
        style={[styles.content, {opacity: fadeAnim, paddingTop: insets.top}]}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <Animated.View style={{opacity: logoOpacity, transform: [{scale: logoscale}]}}>
            <AppText variant="display" color="primary" style={styles.logoText}>
              SIMBA
            </AppText>
          </Animated.View>
          <Animated.View style={{opacity: taglineOpacity, transform: [{translateY: taglineTranslateY}]}}>
            <AppText
              variant="body1"
              style={[styles.tagline, {color: colors.text.secondary}]}>
              Your media, your way
            </AppText>
          </Animated.View>
        </View>

        {/* Bottom section */}
        <Animated.View style={[styles.bottomSection, {paddingBottom: insets.bottom + 24, opacity: buttonOpacity, transform: [{scale: buttonScale}]}]}>
          <GoogleSignInButton onPress={handleSignIn} loading={isLoading} />

          {error ? (
            <AppText
              style={[styles.errorText, {color: colors.semantic.error}]}>
              {error}
            </AppText>
          ) : null}

          {/* Create account link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Registration')}
            activeOpacity={0.7}
            disabled={isLoading}
            hitSlop={{top: 12, bottom: 12, left: 24, right: 24}}>
            <AppText
              variant="bodySmall"
              style={[styles.signUpLink, {color: colors.text.secondary}]}>
              Don't have an account?{' '}
              <AppText
                variant="bodySmall"
                color="accent"
                style={styles.signUpAccent}>
                Create One
              </AppText>
            </AppText>
          </TouchableOpacity>
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
    top: '15%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  logoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    marginBottom: 8,
    letterSpacing: 6,
  },
  tagline: {
    textAlign: 'center',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  signUpLink: {
    textAlign: 'center',
  },
  signUpAccent: {
    fontWeight: '600',
  },
});
