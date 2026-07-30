import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {useTheme} from '../../../theme';

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

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 50,
  },
  replayBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  replayIcon: {
    fontSize: 32,
    color: '#000',
    fontWeight: '700',
  },
  replayLabel: {
    fontSize: 11,
    color: '#000',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default ReplayButton;
