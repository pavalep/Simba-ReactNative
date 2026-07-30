// ────────────────────────────────────────────────────────
// Simba Player — AlbumActionRow Component (Phase 17.5)
// Play All · Shuffle · Add to Playlist
// ────────────────────────────────────────────────────────

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppButton} from '../../../components/core/AppButton/AppButton';

interface AlbumActionRowProps {
  onPlayAll: () => void;
  onShuffle: () => void;
  /** Disabled when album has no tracks */
  disabled?: boolean;
}

export const AlbumActionRow: React.FC<AlbumActionRowProps> = ({
  onPlayAll,
  onShuffle,
  disabled = false,
}) => {
  const {colors} = useTheme();

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <AppButton
        title="Play All"
        variant="primary"
        size="md"
        onPress={onPlayAll}
        disabled={disabled}
        style={styles.btn}
        icon={<SvgIcon name="play" size={16} color={colors.text.primary} />}
      />
      <AppButton
        title="Shuffle"
        variant="secondary"
        size="md"
        onPress={onShuffle}
        disabled={disabled}
        style={styles.btn}
        icon={<SvgIcon name="shuffle" size={16} color={colors.accent.gold} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  btn: {
    flex: 1,
  },
});
