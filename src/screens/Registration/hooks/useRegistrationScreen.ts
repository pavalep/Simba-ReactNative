import {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, Easing} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  setLoading,
  setUser,
  setError,
  selectAuthLoading,
  selectAuthError,
} from '../../../store/slices/authSlice';
import {registerWithEmail} from '../../../services/authService';

/**
 * Registration screen hook — manages form state, animated background pulse,
 * and registration flow.
 */
export function useRegistrationScreen() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

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

  const displayError = localError ?? error;

  const handleRegister = useCallback(async () => {
    // Client-side validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setLocalError('Please enter your name.');
      return;
    }
    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setLocalError(null);
    dispatch(setError(null));
    dispatch(setLoading(true));

    try {
      const {user} = await registerWithEmail(trimmedName, trimmedEmail, password);
      dispatch(setUser(user));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Registration failed';
      dispatch(setError(message));
    }
  }, [name, email, password, confirmPassword, dispatch]);

  return {
    pulseAnim,
    fadeAnim,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    error: displayError,
    handleRegister,
  };
}
