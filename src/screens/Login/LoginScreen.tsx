import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
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

export const LoginScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {pulseAnim, fadeAnim, isLoading, error, handleSignIn} =
    useLoginScreen();

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
          <AppText variant="display" color="primary" style={styles.logoText}>
            SIMBA
          </AppText>
          <AppText
            variant="body1"
            style={[styles.tagline, {color: colors.text.secondary}]}>
            Your media, your way
          </AppText>
        </View>

        {/* Bottom section */}
        <View style={[styles.bottomSection, {paddingBottom: insets.bottom + 24}]}>
          <GoogleSignInButton onPress={handleSignIn} loading={isLoading} />

          {error ? (
            <AppText
              style={[styles.errorText, {color: colors.semantic.error}]}>
              {error}
            </AppText>
          ) : null}
        </View>
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
});
