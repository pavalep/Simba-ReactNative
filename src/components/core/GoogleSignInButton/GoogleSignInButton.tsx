import React, {useMemo} from 'react';
import {TouchableOpacity, View, StyleSheet} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {useTheme} from '../../../theme';
import type {ColorTokens} from '../../../theme/tokens';
import {AppText} from '../AppText/AppText';
import {ActivityOrb} from '../../feedback/ActivityOrb/ActivityOrb';

export interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const GoogleColorIcon = ({size = 20}: {size?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <Path fill="none" d="M0 0h48v48H0z"/>
  </Svg>
);

/**
 * Branded Google Sign-In button.
 * Styled to match the app's premium aesthetic with the official colored G logo.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
}) => {
  const isDisabled = disabled || loading;
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      accessibilityState={{disabled: isDisabled}}>
      {loading ? (
        <ActivityOrb size={20} color={colors.accent.gold} />
      ) : (
        <View style={styles.content}>
          <GoogleColorIcon size={22} />
          <AppText style={styles.label}>Sign in with Google</AppText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.elevated,
      borderColor: colors.border.subtle,
      borderWidth: 1,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      minWidth: 260,
      // Shadow
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    label: {
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
  });
