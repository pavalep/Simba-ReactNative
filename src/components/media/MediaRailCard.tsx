/**
 * MediaRailCard — one 16:9 card in a horizontal library rail.
 *
 * ## Why this exists
 *
 * Home had three shelves ("Recently Played", "Bookmarks", "Followed
 * Podcasts") and the first two each carried their OWN copy of the same
 * 200-line card, plus their own copy of the section header, their own
 * collapse state, and their own `formatTime`. Bookmarks had drifted into
 * a vertical list with a different aspect ratio and a different
 * thumbnail treatment, which is why the two shelves did not look like
 * they belonged to the same screen.
 *
 * Two rules kept the copies in step for a while and then didn't:
 * widening the Recently Played card to show a "time left" badge, and
 * switching its image precedence to prefer a captured frame over poster
 * artwork. Bookmarks had to be changed the same day. This is the
 * extraction that makes "the same day" automatic.
 *
 * ## Presentational only
 *
 * The card takes strings and a 0…1 fraction. It does not know about
 * stores, resume policy, or what a bookmark is — each shelf decides
 * those and passes the result. A component that computed its own
 * subtitle would be the second implementation of every rule it guessed
 * at, which is the defect this file exists to remove.
 */

import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {AppText} from '../core/AppText/AppText';
import {SvgIcon} from '../utility/SvgIcon';
import type {MediaLane} from '../../types/media';

/** Card geometry. Shared so every rail in the app scrolls identically. */
export const MEDIA_RAIL_CARD_WIDTH = 160;
const THUMB_HEIGHT = 90; // 16:9 at the width above.

export interface MediaRailCardProps {
  /** Readable name of the item. Overlaid on the thumbnail. */
  title: string;
  /** Drives the placeholder glyph and the corner type badge. */
  lane: MediaLane;
  /**
   * The image to draw.
   *
   * Callers resolve the precedence themselves, but the rule is uniform:
   * a frame captured at the resume position wins over poster artwork,
   * because it is the picture of *where you left off*, which is what a
   * continue-watching rail is selling. Artwork is the fallback.
   */
  imageUri?: string;
  /** Small line under the title. Omitted entirely when empty. */
  subtitle?: string;
  /** 0…1. Omit or pass 0 for no bar. */
  progress?: number;
  onPress: () => void;
  /**
   * Long-press. Material, Plex, Kodi and YouTube all put secondary and
   * destructive actions behind long-press rather than on a permanent
   * control — a permanently visible ✕ on every card in a rail is a
   * mis-tap waiting to happen, and it costs the poster its own space.
   */
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export const MediaRailCard: React.FC<MediaRailCardProps> = ({
  title,
  lane,
  imageUri,
  subtitle,
  progress = 0,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
}: MediaRailCardProps) => {
  const {colors} = useTheme();
  const glyph = lane === 'audio' ? 'music' : 'video';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      // Material's guidance: a long-press that opens a menu needs a
      // hint, or it is undiscoverable by definition.
      accessibilityHint={
        accessibilityHint ??
        (onLongPress ? 'Long press for more actions' : undefined)
      }
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, {shadowColor: colors.shadow}]}>
      <View
        style={[styles.thumbnailContainer, {backgroundColor: colors.background.elevated}]}>
        {imageUri ? (
          <FastImage
            source={{uri: imageUri}}
            style={StyleSheet.absoluteFill}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={styles.placeholder}>
            <SvgIcon name={glyph} size={24} color={colors.text.tertiary} />
          </View>
        )}

        <View style={[styles.typeBadge, {backgroundColor: colors.background.scrim}]}>
          <SvgIcon name={glyph} size={12} color={colors.text.bright} />
        </View>

        <LinearGradient
          colors={['transparent', colors.background.scrimSoft, colors.background.scrim]}
          style={styles.overlayGradient}
        />

        <View style={styles.bottomStrip}>
          <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.background.scrim}]} />
          <View style={styles.overlayContent}>
            <AppText
              variant="bodySmall"
              numberOfLines={1}
              style={[
                styles.cardTitleOverlay,
                {color: colors.text.bright, textShadowColor: colors.background.scrimMid},
              ]}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText
                variant="caption"
                style={[
                  styles.cardSubtitleOverlay,
                  {color: colors.text.onMediaSoft, textShadowColor: colors.background.scrim},
                ]}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        </View>

        {progress > 0 ? (
          <View
            style={[
              styles.progressBarTrack,
              {backgroundColor: colors.background.highlightStrong},
            ]}>
            <View
              style={[
                styles.progressBarFill,
                {width: `${Math.min(100, progress * 100)}%`, backgroundColor: colors.accent.gold},
              ]}
            />
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: MEDIA_RAIL_CARD_WIDTH,
    marginRight: spacing.md,
    elevation: 4,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: '100%',
    height: THUMB_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  bottomStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  overlayContent: {
    padding: spacing.sm,
    paddingBottom: spacing.xs + 4,
  },
  cardTitleOverlay: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
    marginBottom: 2,
  },
  cardSubtitleOverlay: {
    fontSize: 10,
    fontWeight: '600',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  typeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 3,
  },
  progressBarFill: {
    height: '100%',
  },
});
