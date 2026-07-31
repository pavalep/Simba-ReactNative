import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {Avatar} from '../../core/Avatar/Avatar';
import {SvgIcon} from '../../utility/SvgIcon';
import {useAuth} from '../../../hooks/useAuth';
import {navigate} from '../../../navigation/navigationHelper';

/**
 * Account section shown in Settings.
 * Displays user avatar + info when signed in, or a "Sign In" CTA when not.
 */
export const AccountSection: React.FC = () => {
  const {colors} = useTheme();
  const {user, isAuthenticated, isLoading, signIn} = useAuth();

  const openProfile = () => {
    // 42.1: account card opens the full Profile screen
    navigate('Profile');
  };

  if (isLoading) {
    return (
      <View style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        <AppText
          variant="caption"
          style={{color: colors.text.secondary, textAlign: 'center'}}>
          Loading...
        </AppText>
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <TouchableOpacity
        style={[styles.card, {backgroundColor: colors.background.elevated}]}
        onPress={openProfile}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Profile for ${user.name}`}>
        <View style={styles.row}>
          <Avatar uri={user.photo} name={user.name} size={44} />
          <View style={styles.info}>
            <AppText variant="body2" color="primary">
              {user.name}
            </AppText>
            <AppText
              variant="caption"
              style={{color: colors.text.secondary}}>
              {user.email}
            </AppText>
          </View>
          <AppText
            variant="caption"
            style={{color: colors.accent.gold}}>
            View Profile
          </AppText>
        </View>
      </TouchableOpacity>
    );
  }

  // Not authenticated — show Sign In CTA
  return (
    <TouchableOpacity
      style={[styles.card, {backgroundColor: colors.background.elevated}]}
      onPress={signIn}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google">
      <View style={styles.row}>
        <View
          style={[
            styles.placeholderAvatar,
            {backgroundColor: colors.border.subtle},
          ]}>
          {/* 42.2: icon fallback instead of the old "?" placeholder */}
          <SvgIcon name="lion" size={22} color={colors.accent.gold} />
        </View>
        <View style={styles.info}>
          <AppText variant="body2" color="primary">
            Sign In
          </AppText>
          <AppText
            variant="caption"
            style={{color: colors.text.secondary}}>
            Sign in with Google to sync your library
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  placeholderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
