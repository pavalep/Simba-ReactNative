import {useCallback, useEffect, useRef} from 'react';
import {Animated, Easing} from 'react-native';
import {useAuth} from '../../../hooks/useAuth';

/**
 * Login screen hook — manages animated background pulse and auth flow.
 */
export function useLoginScreen() {
  const {user, isAuthenticated, isLoading, error, signIn} = useAuth();

  // Animated values for the background orb pulse
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance: fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Continuous pulse loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim, fadeAnim]);

  const handleSignIn = useCallback(() => {
    signIn();
  }, [signIn]);

  return {
    pulseAnim,
    fadeAnim,
    isLoading,
    error,
    handleSignIn,
    // Expose auth state so LoginScreen can react
    isAuthenticated,
    user,
  };
}
