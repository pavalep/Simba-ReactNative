/**
 * MediaRailCard — one 16:9 artwork card in a horizontal library rail.
 *
 * ## THE GRAMMAR (V2)
 *
 * The artwork is WHOLE and the text is UNDERNEATH it.
 *
 * V1 laid the title and the position line over the picture on a scrim.
 * That covered the bottom half of the artwork and made the type fight
 * the image — the picture was the least readable thing on the card.
 * V2 gives the picture its full frame and puts the type on the page's
 * background, where it is always legible and the picture is always the
 * picture.
 *
 * Apple Music, Spotify, Plex, Jellyfin and the Apple TV app all draw
 * their rails this way, and it is the reason the page reads as one
 * screen instead of four widgets.
 *
 * The progress bar rides the artwork's bottom edge — the app's own
 * place for it — inset by the corner radius so it does not poke out
 * past the rounded corners.
 *
 * ## Why this component exists
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
import {MediaImage} from '../utility/MediaImage';
import {useTheme} from '../../theme';
import {spacing} from '../../theme/tokens';
import {toRenderableImageUri} from '../../utils/mediaUri';
import {AppText} from '../core/AppText/AppText';
import {SvgIcon} from '../utility/SvgIcon';
import {FONT_FAMILY} from '../../constants/fontFamily';
import {
  RAIL_CARD_WIDTH,
  RAIL_MEDIA_ARTWORK_HEIGHT,
  RAIL_MEDIA_CARD_HEIGHT,
} from './railMetrics';
import type {MediaLane} from '../../types/media';

/**
 * Card geometry.
 *
 * The numbers live in `railMetrics.ts` — the ONE owner of the page's card
 * pitch. They used to be written out here, in `CategoryCard`, in the
 * playlist tile, in the podcast tile and in the rail's snap interval: five
 * copies of "160", and a change to one of them would have left the page
 * with two different pitches.
 */
const CARD_WIDTH = RAIL_CARD_WIDTH;
const THUMB_HEIGHT = RAIL_MEDIA_ARTWORK_HEIGHT;
/** The corner radius — also the progress bar's inset from each side. */
const CARD_RADIUS = 12;

export interface MediaRailCardProps {
  /** Readable name of the item. Under the artwork. */
  title: string;
  /** Drives the placeholder glyph. */
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
      style={styles.card}>
      <View style={[styles.thumbnailContainer, {backgroundColor: colors.background.elevated}]}>
        {imageUri ? (
          <MediaImage
            // A captured resume frame is a LOCAL path, and a local path
            // is not a URI — an image loader reads `/data/user/0/…` as a
            // scheme-less URI and fails, so the card fell back to its
            // grey placeholder while holding a perfectly good frame.
            // Catalogue artwork is a remote URL and must be left alone.
            source={toRenderableImageUri(imageUri)!}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <SvgIcon name={glyph} size={24} color={colors.text.tertiary} />
          </View>
        )}

        {/* The progress bar rides the artwork's bottom edge, inset by the
            corner radius so it never pokes past the rounded corners. */}
        {progress > 0 ? (
          <View
            style={[
              styles.progressBarTrack,
              {backgroundColor: colors.background.highlightStrong},
            ]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, progress * 100)}%`,
                  backgroundColor: colors.accent.gold,
                },
              ]}
            />
          </View>
        ) : null}
      </View>

      <AppText variant="bodySmall" numberOfLines={1} style={styles.cardTitle}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          variant="caption"
          color="secondary"
          numberOfLines={1}
          style={styles.cardMeta}>
          {subtitle}
        </AppText>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: RAIL_MEDIA_CARD_HEIGHT,
    marginRight: spacing.md,
  },
  thumbnailContainer: {
    width: '100%',
    height: THUMB_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  cardTitle: {
    // The card's title is Inter SemiBold 14/20 — the `bodySmall`
    // metrics with the semibold family. The weight lives in the FAMILY
    // key (the app's weight-intent rule): no `fontWeight` here, because
    // on Android the family string is what selects the file.
    marginTop: 8,
    fontFamily: FONT_FAMILY.inter.semibold,
  },
  cardMeta: {
    marginTop: 2,
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: CARD_RADIUS,
    right: CARD_RADIUS,
    height: 3,
    zIndex: 3,
  },
  progressBarFill: {
    height: '100%',
  },
});
