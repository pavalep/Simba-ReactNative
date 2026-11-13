// ─── Cover Shelf — the grid of cover plates ─────────────────────────────
//
// The Podcasts filter's category group is a grid of the app's own
// cover plates — the `CategoryCard` grammar (the plate WHOLE, the
// glyph badge ON the plate, the name UNDERNEATH it), at tile size.
//
// A chip rail can carry a handful of genres before it becomes a
// scrolling strip of words; a grid of plates shows the whole curated
// set at once, with the artwork that makes the feature feel curated.
// Apple Podcasts' category browse and Spotify's browse spine both work
// this way.
//
// THE TILE
//   plate    88 × 88 dp, the app's own category artwork
//   badge    32 dp disc, centred on the plate, the genre's glyph in gold
//   label    caption 13 / 18, semibold, UNDER the plate
//   ring     2 dp gold, on the selected tile
//
// A genre with no plate of its own (Science, Sports) draws the app's
// `goldSoft` plate with the badge on top — the Local Files card's
// existing grammar. A plate that is not a photograph of a genre is
// still a plate; the shelf reads as one system.

import React, {useCallback} from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';
import {AppText} from '../../core/AppText/AppText';

/** The tile — four across the sheet, nine dp between them. */
const TILE_SIZE = 88;
const TILE_GAP = 9;
/** The badge disc on the plate. */
const BADGE_SIZE = 32;
/** The glyph inside the disc. */
const GLYPH_SIZE = 24;

export interface CoverTile {
  key: string;
  label: string;
  icon?: string;
  image?: ImageSourcePropType;
}

interface Props {
  tiles: CoverTile[];
  /** The keys the group has applied (the default folded in). */
  selectedKeys: string[];
  /** The group's EXPLICIT selection, without the default folded in. */
  explicitKeys: string[];
  /** The key that means "no category" — tapping it clears the group. */
  clearKey: string;
  onChange: (keys: string[]) => void;
}

export const CoverGrid: React.FC<Props> = React.memo(
  ({tiles, selectedKeys, explicitKeys, clearKey, onChange}) => {
    const {colors} = useTheme();

    const handlePress = useCallback(
      (key: string) => {
        // The "All" tile is the group's DEFAULT, not a selection of its
        // own: tapping it clears the group, so the catalogue goes back
        // to the unfiltered stream and the sheet's RESET footer does
        // not offer to undo a filter the user never set.
        if (key === clearKey) {
          onChange([]);
          return;
        }
        // Single-select: tapping the selected tile clears it (the group
        // falls back to its default); tapping another one replaces it.
        onChange(explicitKeys[0] === key ? [] : [key]);
      },
      [clearKey, explicitKeys, onChange],
    );

    return (
      <View style={styles.grid}>
        {tiles.map(tile => {
          const selected = selectedKeys.includes(tile.key);
          return (
            <TouchableOpacity
              key={tile.key}
              activeOpacity={0.85}
              onPress={() => handlePress(tile.key)}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              accessibilityLabel={tile.label}
              testID={`filter-cover-tile-${tile.key}`}
              style={styles.tile}>
              <View style={styles.plate}>
                {tile.image ? (
                  <Image
                    source={tile.image}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.plateFallback,
                      {backgroundColor: colors.accent.goldSoft},
                    ]}
                  />
                )}

                {/* The badge is CENTRED on the plate — the same badge the
                    app's own category cards carry. */}
                <View
                  style={[
                    styles.badge,
                    {backgroundColor: colors.background.scrimDim},
                  ]}>
                  <SvgIcon
                    name={(tile.icon ?? 'micVocal') as never}
                    size={GLYPH_SIZE}
                    color={colors.accent.gold}
                  />
                </View>

                {selected ? (
                  <View
                    testID={`filter-cover-tile-ring-${tile.key}`}
                    style={[styles.ring, {borderColor: colors.accent.gold}]}
                  />
                ) : null}
              </View>

              <AppText
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.label,
                  {color: selected ? colors.accent.gold : colors.text.primary},
                ]}>
                {tile.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: TILE_GAP,
    rowGap: spacing.md,
  },
  tile: {
    width: TILE_SIZE,
  },
  plate: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateFallback: {
    width: '100%',
    height: '100%',
  },
  badge: {
    // The badge is CENTRED on the plate — the plate's box minus the
    // disc, halved (the `CategoryCard` badge's arithmetic).
    position: 'absolute',
    top: (TILE_SIZE - BADGE_SIZE) / 2,
    left: (TILE_SIZE - BADGE_SIZE) / 2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  label: {
    // caption 13 / 18, semibold — the weight lives in the FAMILY key,
    // never in a `fontWeight` prop (see `constants/fontFamily.ts`).
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
});
