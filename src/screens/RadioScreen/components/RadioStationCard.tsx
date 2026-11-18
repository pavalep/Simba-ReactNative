// ─── Radio Station Card ──────────────────────────────────────────────
// The browse row and the favourites row share this one card.
//
//   a 48 × 48 favicon (with the app's own headphones tile until the
//   image decodes), the station name, a "country · tag" subtitle, a
//   codec + bitrate line, and a play glyph.
//
// The row is the play action — the whole card is one TouchableOpacity —
// so the trailing glyph is a MARK, not a button.
//
// The trailing BOOKMARK glyph is gone. It showed the FAVOURITE state
// with another feature's icon, while the app's own favourite language
// is a heart (`heartPulse`, which the Radio header uses for the
// favourites screen). Two concepts, one glyph, and a screen-reader user
// could not tell a favourite station from an ordinary one: the row's
// accessible name was the station name and nothing else.

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createRadioStationCardStyles} from '../styles';
import type {StationRow} from '../related/stationRow';

export {toRow, favToRow, stationQueueItem, type StationRow} from '../related/stationRow';

interface RadioStationCardProps {
  row: StationRow;
  isFavorite: boolean;
  onPress: (row: StationRow) => void;
  onLongPress: (row: StationRow) => void;
}

export const RadioStationCard: React.FC<RadioStationCardProps> = React.memo(
  ({row, isFavorite, onPress, onLongPress}) => {
    const {colors} = useTheme();
    const styles = useMemo(() => createRadioStationCardStyles(colors), [colors]);

    // The thumb's tile — what the user sees while the favicon is on the
    // wire, and what stays if it never arrives. The same tile is the
    // fallback for a station that carries no favicon at all.
    const thumbTile = (
      <View style={styles.thumbTile} testID="radio-artwork-placeholder">
        <SvgIcon name="headphones" size={22} color={colors.accent.gold} />
      </View>
    );

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={
          isFavorite ? `${row.name}, favorite` : row.name
        }
        accessibilityHint="Long press for more actions"
        style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <MediaImage
              source={row.image}
              style={styles.thumb}
              resizeMode="cover"
              placeholder={thumbTile}
              testID="radio-artwork-image"
            />
          ) : (
            thumbTile
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.name}
          </AppText>
          {row.subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
          {row.codec || row.bitrate ? (
            <View style={styles.metaRow}>
              {row.codec ? (
                <View
                  style={[styles.metaBadge, {backgroundColor: colors.accent.goldDim}]}>
                  <AppText
                    variant="caption"
                    style={[styles.metaBadgeText, {color: colors.accent.gold}]}>
                    {row.codec}
                  </AppText>
                </View>
              ) : null}
              {row.bitrate ? (
                <AppText variant="caption" color="tertiary">
                  {row.bitrate} kbps
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
        {isFavorite ? (
          <SvgIcon name="heart" size={16} color={colors.accent.gold} />
        ) : null}
        <View style={styles.playButton}>
          <SvgIcon name="play" size={16} color={colors.accent.gold} />
        </View>
      </TouchableOpacity>
    );
  },
);
