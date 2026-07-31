import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';
import type {ColorTokens} from '../../../theme/tokens';

interface ReplayButtonProps {
  visible: boolean;
  onReplay: () => void;
}

/**
 * End-of-video overlay with a centered "Replay" button.
 * Shown when `showReplay` is true (video has ended).
 */
export const ReplayButton: React.FC<ReplayButtonProps> = ({
  visible,
  onReplay,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.replayBtn, {backgroundColor: colors.accent.gold}]}
        onPress={onReplay}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Replay video">
        <AppText style={styles.replayIcon}>{'\u21BB'}</AppText>
        <AppText style={styles.replayLabel}>Replay</AppText>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.scrim,
      zIndex: 50,
    },
    replayBtn: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    replayIcon: {
      fontSize: 32,
      color: colors.text.inverse,
      fontWeight: '700',
    },
    replayLabel: {
      fontSize: 11,
      color: colors.text.inverse,
      fontWeight: '600',
      marginTop: 2,
    },
  });

export default ReplayButton;
