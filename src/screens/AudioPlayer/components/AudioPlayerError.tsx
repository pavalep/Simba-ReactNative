import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

interface Props {
  message: string;
  onRetry: () => void;
  colors: ColorTokens;
}

export const AudioPlayerError: React.FC<Props> = ({message, onRetry, colors}) => {
  return (
    <View style={styles.errorContainer}>
      <AppText variant="body1" color="error">{message}</AppText>
      <TouchableOpacity
        style={[styles.retryBtn, {backgroundColor: colors.accent.gold}]}
        onPress={onRetry}
        activeOpacity={0.7}>
        <AppText variant="body2" color="primary">Retry</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
});
