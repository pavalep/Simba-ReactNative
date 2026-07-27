import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';

interface HomeErrorStateProps {
  message?: string;
  onRetry: () => void;
  colors: any; // ColorTokens
}

export const HomeErrorState: React.FC<HomeErrorStateProps> = ({
  message,
  onRetry,
  colors,
}) => {
  return (
    <View style={styles.container}>
      <SvgIcon name="alertCircle" size={48} color={colors.semantic.error} />

      <AppText
        variant="h3"
        style={[styles.title, {color: colors.text.primary}]}>
        {message || 'Something went wrong'}
      </AppText>

      <AppText variant="bodySmall" color="secondary">
        Tap below to retry
      </AppText>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRetry}
        style={[styles.retryButton, {backgroundColor: colors.accent.gold}]}>
        <AppText
          variant="button"
          style={{color: colors.background.primary}}>
          Try Again
        </AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
  },
});
