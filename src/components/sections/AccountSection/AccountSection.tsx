import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {Avatar} from '../../core/Avatar/Avatar';
import {useAuth} from '../../../hooks/useAuth';

/**
 * Account section shown in Settings.
 * Displays user avatar + info when signed in, or a "Sign In" CTA when not.
 */
export const AccountSection: React.FC = () => {
  const {colors} = useTheme();
  const {user, isAuthenticated, isLoading, signIn, signOut} = useAuth();

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
        onPress={signOut}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Sign out">
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
            style={{color: colors.semantic.error}}>
            Sign Out
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
          <AppText
            variant="body1"
            style={{color: colors.text.secondary}}>
            ?
          </AppText>
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
