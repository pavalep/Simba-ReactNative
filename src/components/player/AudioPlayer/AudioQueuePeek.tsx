import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';
import type {ColorTokens} from '../../../theme/tokens';

// ─── Types ──────────────────────────────────────────────────

interface AudioQueuePeekProps {
  colors: ColorTokens;
  currentIndex: number;
  queue: PlaylistEntry[];
  currentTitle: string;
  currentArtist: string;
  onTap: () => void;
}

// ─── Component ──────────────────────────────────────────────

export const AudioQueuePeek: React.FC<AudioQueuePeekProps> = ({
  colors,
  currentIndex,
  queue,
  currentArtist,
  onTap,
}) => {
  const nextTrack = queue[currentIndex + 1];

  if (!nextTrack) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.background.glass,
          borderColor: colors.border.subtle,
        },
      ]}
      onPress={onTap}
      activeOpacity={0.7}
      accessibilityLabel="View queue"
      accessibilityRole="button">
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <AppText variant="caption" color="secondary" style={styles.upNextLabel}>
            Up Next
          </AppText>
          <SvgIcon name="chevronDown" size={14} color={colors.text.secondary} />
        </View>
        <AppText variant="bodySmall" color="primary" numberOfLines={1}>
          {nextTrack.title || 'Unknown Track'}
          <AppText variant="bodySmall" color="secondary">
            {' — '}
            {currentArtist}
          </AppText>
        </AppText>
      </View>
    </TouchableOpacity>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  upNextLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default AudioQueuePeek;
