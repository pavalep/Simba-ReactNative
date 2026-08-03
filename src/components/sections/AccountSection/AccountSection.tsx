import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {Avatar} from '../../core/Avatar/Avatar';
import {useAuth} from '../../../hooks/useAuth';
import {navigate} from '../../../navigation/navigationHelper';

/**
 * Account section shown in Settings.
 * Displays user avatar + info.
 */
export const AccountSection: React.FC = () => {
  const {colors} = useTheme();
  const {user, isLoading} = useAuth();

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

  if (!user) return null;

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
