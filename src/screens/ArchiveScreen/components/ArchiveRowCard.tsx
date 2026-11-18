// ─── Archive Screen — ArchiveRowCard ───────────────────────────────────
// One row of the archive list.
//
// THE ROW IS A COLLECTION, NOT A FILE
// -----------------------------------
// An Internet Archive item is a collection — a radio show, an album, a
// record — and the row opens THAT collection's page. The row therefore
// carries no play affordance and NO MENU: there is no single playable
// URI for a collection (the search result's `streamingUrl` is the
// collection's DIRECTORY url, `https://archive.org/download/{id}/`), and
// the playlist kinds refuse archive items outright —
// `PLAYLIST_ALLOWED_MEDIA_KINDS` (`src/types/playlist.ts`) holds
// 'audio' / 'music' / 'podcast' and 'video' / 'movie', and 'archive-audio'
// and 'archive-video' are in NEITHER list. Every action the app's one
// media menu offers would be refused, so the menu is a control that
// cannot act, and a control that cannot act must not occupy space.
//
// The actions that CAN act live one screen deeper, where they belong:
// `ArchiveItemDetailScreen` lists the collection's tracks and owns the
// queue / playlist / bookmark / share actions FOR THE TRACKS.

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useTheme} from '../../../theme';
import {createArchiveRowStyles} from '../styles';
import text from '../related/textContent.json';
import type {ArchiveRowCardProps} from '../types';

export const ArchiveRowCard: React.FC<ArchiveRowCardProps> = React.memo(
  ({row, scope, onPress}) => {
    const {colors} = useTheme();
    const styles = useMemo(() => createArchiveRowStyles(colors), [colors]);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={text.row.openA11y.replace('{title}', row.title)}>
        <View style={styles.thumb}>
          {row.image ? (
            <MediaImage
              source={row.image}
              style={styles.thumb}
              resizeMode="cover"
            />
          ) : (
            <SvgIcon
              name={scope === 'video' ? 'video' : 'headphones'}
              size={22}
              color={colors.accent.gold}
            />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.title}
          </AppText>
          {row.creator ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.creator}
            </AppText>
          ) : null}
          {row.subtitle ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>
        <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
      </TouchableOpacity>
    );
  },
);
