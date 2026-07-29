import React from 'react';
import {TouchableOpacity, ActivityIndicator, View, StyleSheet} from 'react-native';
import {AppText} from '../AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';

export interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Branded Google Sign-In button with official Google branding.
 * White bg, G logo, dark text — standard Google identity.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
}) => {
  const isDisabled = disabled || loading;

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
        <ActivityIndicator size="small" color="#5F6368" />
      ) : (
        <View style={styles.content}>
          <SvgIcon name="google" size={20} color="#4285F4" />
          <AppText style={styles.label}>Sign in with Google</AppText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 260,
    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: '#5F6368',
    fontSize: 16,
    fontWeight: '600',
  },
});
