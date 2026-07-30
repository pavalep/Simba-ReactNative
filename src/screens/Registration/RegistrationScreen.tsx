import React, {useCallback} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {AppButton} from '../../components/core/AppButton/AppButton';
import {useRegistrationScreen} from './hooks/useRegistrationScreen';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'Registration'>;

const {width} = Dimensions.get('window');
const ORB_SIZE = width * 0.9;

export const RegistrationScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
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
    error,
    handleRegister,
  } = useRegistrationScreen();

  const orbScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const orbOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.16],
  });

  const handleSignInLink = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Logo area */}
            <View style={styles.logoArea}>
              <AppText
                variant="display"
                color="primary"
                style={styles.logoText}>
                SIMBA
              </AppText>
              <AppText
                variant="body1"
                style={[styles.tagline, {color: colors.text.secondary}]}>
                Create your account
              </AppText>
            </View>

            {/* Form fields */}
            <View style={styles.form}>
              {/* Name field */}
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
                ]}>
                <TextInput
                  style={[styles.input, {color: colors.text.primary}]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.text.tertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                />
              </View>

              {/* Email field */}
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
                ]}>
                <TextInput
                  style={[styles.input, {color: colors.text.primary}]}
                  placeholder="Email"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                />
              </View>

              {/* Password field */}
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
                ]}>
                <TextInput
                  style={[styles.input, {color: colors.text.primary}]}
                  placeholder="Password"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                  returnKeyType="next"
                />
              </View>

              {/* Confirm Password field */}
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
                ]}>
                <TextInput
                  style={[styles.input, {color: colors.text.primary}]}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.text.tertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>

              {/* Error message */}
              {error ? (
                <AppText
                  variant="caption"
                  style={[styles.errorText, {color: colors.semantic.error}]}>
                  {error}
                </AppText>
              ) : null}
            </View>

            {/* Bottom section */}
            <View
              style={[
                styles.bottomSection,
                {paddingBottom: insets.bottom + 24},
              ]}>
              <AppButton
                title="Create Account"
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                size="lg"
              />

              <TouchableOpacity
                onPress={handleSignInLink}
                activeOpacity={0.7}
                disabled={isLoading}
                hitSlop={{top: 12, bottom: 12, left: 24, right: 24}}>
                <AppText
                  variant="bodySmall"
                  style={[styles.signInLink, {color: colors.text.secondary}]}>
                  Already have an account?{' '}
                  <AppText
                    variant="bodySmall"
                    color="accent"
                    style={styles.signInAccent}>
                    Sign In
                  </AppText>
                </AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default RegistrationScreen;

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
    paddingHorizontal: 32,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 48,
  },
  logoText: {
    marginBottom: 8,
    letterSpacing: 6,
  },
  tagline: {
    textAlign: 'center',
  },
  form: {
    paddingHorizontal: 0,
    gap: 12,
    marginTop: 40,
  },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
    height: '100%',
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
  },
  errorText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  signInLink: {
    textAlign: 'center',
  },
  signInAccent: {
    fontWeight: '600',
  },
});
