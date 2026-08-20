// ─── Music — TrackCard styles ───────────────────────────────────────
// Row-card variant for Music (the only variant — Jamendo tracks render
// as horizontal rows with thumb + meta + play button, never as a grid).
// Thumb is 52×52 with rounded corners; play button is 32×32.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';

export const createTrackCardStyles = () =>
  StyleSheet.create({
    trackCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
    },
    thumbWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.sm,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbImage: {
      width: 52,
      height: 52,
    },
    thumbPlaceholder: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.4,
    },
    trackInfo: {
      flex: 1,
      marginLeft: spacing.md,
      gap: 1,
    },
    trackName: {
      fontWeight: '600',
      lineHeight: 18,
    },
    trackRight: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    playButton: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
