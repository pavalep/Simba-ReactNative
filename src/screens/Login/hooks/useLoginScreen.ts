import {useCallback, useEffect, useRef} from 'react';
import {Animated, Easing} from 'react-native';
import {useAuth} from '../../../hooks/useAuth';
import {useAccessibility} from '../../../hooks/useAccessibility';

/**
 * Login screen hook — manages animated background pulse and auth flow.
 */
export function useLoginScreen() {
  const {user, isAuthenticated, isLoading, error, errorKind, signIn} = useAuth();
  const {reduceMotion} = useAccessibility();

  // Animated values for the background orb pulse
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // 59.7: reduced motion — render fully visible, orb at a static mid state
      fadeAnim.setValue(1);
      pulseAnim.setValue(0.5);
      return;
    }
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
  }, [pulseAnim, fadeAnim, reduceMotion]);

  const handleSignIn = useCallback(() => {
    signIn();
  }, [signIn]);

  return {
    pulseAnim,
    fadeAnim,
    isLoading,
    error,
    errorKind,
    handleSignIn,
    // Expose auth state so LoginScreen can react
    isAuthenticated,
    user,
  };
}
