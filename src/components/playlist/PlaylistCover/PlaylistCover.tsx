/**
 * `PlaylistCover` — ONE owner for a playlist's artwork.
 *
 * ## Why this exists
 *
 * A playlist's artwork was drawn TWICE, by two different pieces of code:
 * `PlaylistCard` drew a 2 × 2 collage, and `AllPlaylistsScreen` drew a
 * generic `listMusic` icon box for the SAME playlist. Two renderings of
 * one object is two chances to drift — and it is why the management page
 * and the Library show the same playlist as two different things.
 *
 * This component owns the ARTWORK. The chrome around it — a wide card, a
 * list row, a rail tile — belongs to the caller: pass the box the
 * artwork is drawn into, and the artwork is the same everywhere
 * (spec §4.2). One renderer, three chromes.
 *
 * ## The collage
 *
 * The playlist's FIRST FOUR items: 2 × 2, and one large cell when the
 * playlist holds a single item. An empty playlist draws the `listMusic`
 * glyph on `accent.goldSoft`.
 *
 * The collage draws CATALOGUE artwork only. A `PlaylistItem` carries
 * `thumbnailPath` and NO `resumeThumbnailPath`: a playlist item is a
 * thing you put in a list, not a position you were at — so the captured
 * frame belongs to the bookmark and the history entry, which have their
 * own field for it.
 *
 * ## The pin badge
 *
 * The badge belongs to the COVER, not to the card: it is positioned over
 * the artwork, and it says the pinned state on EVERY surface a playlist
 * is drawn (spec §4.3). Living here is what makes that true by
 * construction — a surface that draws a `PlaylistCover` cannot forget
 * the badge.
 *
 * The badge is a STATE, not a button (D-P8): a browsing card carries no
 * pin button, and the pin ACTION lives in the playlist's menu. So the
 * badge is decorative, and the SURFACE's own accessibility label is what
 * says ", pinned" (spec §4.13).
 *
 * ## The motion
 *
 * The badge fades and scales in on `motion.fast` (150 ms) — spec §4.12.
 * It is the ONLY thing in this feature that animates: the kind badge is
 * a label, and a pin toggle moves nothing but the badge itself.
 */

import React, {useEffect, useMemo, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import {MediaImage} from '../../utility/MediaImage';
import {SvgIcon} from '../../utility/SvgIcon';
import {useTheme} from '../../../theme';
import {motion, radius, spacing} from '../../../theme/tokens';
import {useAccessibility} from '../../../hooks/useAccessibility';
import {fadeIn, scaleIn} from '../../../utils/animations';
import type {Playlist} from '../../../types/playlist';

/**
 * The badge's test id.
 *
 * The badge is DECORATIVE: it is not an accessibility ELEMENT
 * (`accessible={false}` on iOS, `importantForAccessibility="no"` on
 * Android), so a screen reader never announces the glyph on its own —
 * the SURFACE says ", pinned" in its own label (spec §4.13). The
 * `accessibilityLabel` below names the badge for the tree, not for the
 * user; a test that wants to look at the badge can ask for it by id.
 */
export const PLAYLIST_PIN_BADGE_TEST_ID = 'playlist-pin-badge';

/**
 * The badge's scale BEFORE it lands — the "scale in" half of the
 * entrance. The fade and the scale run together on `motion.fast`.
 */
const PIN_BADGE_SCALE_FROM = 0.85;

export interface PlaylistCoverProps {
  /** The playlist whose artwork this is. */
  playlist: Playlist;
  /**
   * The CHROME: the box the artwork is drawn into. The caller owns the
   * geometry — a wide 16:9 card, a 44 px list row, a 32 px rail tile.
   * The ARTWORK is the same everywhere.
   */
  style?: StyleProp<ViewStyle>;
}

export const PlaylistCover: React.FC<PlaylistCoverProps> = ({playlist, style}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();

  // The FIRST FOUR items, and only those: a cover is a sample of the
  // playlist, not an inventory of it.
  const coverItems = useMemo(() => playlist.items.slice(0, 4), [playlist.items]);

  const pinOpacity = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(PIN_BADGE_SCALE_FROM)).current;

  useEffect(() => {
    if (!playlist.pinned) {
      // Reset, so a RE-PIN fades in again instead of appearing already
      // faded out from the last time it was pinned.
      pinOpacity.setValue(0);
      pinScale.setValue(PIN_BADGE_SCALE_FROM);
      return;
    }
    if (reduceMotion) {
      pinOpacity.setValue(1);
      pinScale.setValue(1);
      return;
    }
    // The badge is the ONLY thing that animates in this feature
    // (spec §4.12): a fade and a scale, on `motion.fast` (150 ms).
    const animation = Animated.parallel([
      fadeIn(pinOpacity, motion.duration.fast),
      scaleIn(pinScale, motion.duration.fast),
    ]);
    animation.start();
    return () => animation.stop();
  }, [playlist.pinned, reduceMotion, pinOpacity, pinScale]);

  const oneItem = coverItems.length === 1;

  return (
    <View
      testID="playlist-cover"
      style={[styles.cover, {backgroundColor: colors.background.floating}, style]}>
      {coverItems.length === 0 ? (
        <View
          testID="playlist-cover-empty"
          style={[styles.empty, {backgroundColor: colors.accent.goldSoft}]}>
          <SvgIcon name="listMusic" size={24} color={colors.accent.gold} />
        </View>
      ) : (
        <View style={styles.collage}>
          {coverItems.map((item, index) => (
            <View
              key={item.id}
              testID="playlist-cover-cell"
              style={[styles.cell, oneItem && styles.cellFull]}>
              {item.thumbnailPath ? (
                <MediaImage
                  testID="playlist-cover-art"
                  source={item.thumbnailPath}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <SvgIcon
                  name={index % 2 === 0 ? 'music' : 'headphones'}
                  size={14}
                  color={colors.text.tertiary}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/*
        The pin badge. It MIRRORS the kind badge on the OTHER side of the
        cover (spec §4.3) — the same 22 px box, `left` instead of `right`
        — so the two never overlap.

        It is a STATE, not a button: a browsing surface carries no pin
        button (D-P8), so the badge only says what is true, and the
        SURFACE's own label says it out loud for a screen reader.
      */}
      {playlist.pinned ? (
        <Animated.View
          testID={PLAYLIST_PIN_BADGE_TEST_ID}
          style={[
            styles.pinBadge,
            {backgroundColor: colors.background.scrimStrong},
            {opacity: pinOpacity, transform: [{scale: pinScale}]},
          ]}
          accessible={false}
          accessibilityLabel="Pinned"
          importantForAccessibility="no">
          <SvgIcon name="pinFilled" size={14} color={colors.accent.gold} />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  cover: {
    // The badge is positioned against THIS box, so the cover is the
    // containing block — not the card around it.
    position: 'relative',
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collage: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cellFull: {
    width: '100%',
    height: '100%',
  },
  pinBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
