// ─── Shows — ShowRow ────────────────────────────────────────────────────
// The catalogue row: a poster, the show's name, its meta line and the
// chevron that says "this opens a page".
//
// The row OPENS the show's page. It carries NO play action and NO
// long-press menu, and that is deliberate:
//
//   • A SHOW is not a playable file. It is a SERIES, and the only thing
//     this app can play is a local file matched to an episode by name
//     (see `ShowDetailScreen`). "Play Next" and "Add to Queue" would
//     have nothing to queue.
//   • The playlist rule refuses a show anyway — the playlist lane takes
//     'audio', 'music' and 'podcast' on the audio side and 'video' and
//     'movie' on the video side, and a TVMaze show is neither: it is
//     metadata about a series, with no file of its own. A row whose only
//     secondary action would be refused is a control that cannot act, and
//     a control that cannot act must not occupy space.
//
// The actions that CAN act on a show — bookmarking it, sharing it,
// playing a matched episode — are on the show's own page, which is where
// the Music, Movie, Podcast and Audiobook rows send the user too.

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createShowRowStyles} from '../styles';
import text from '../related/textContent.json';
import type {TVMazeShow} from '../../../types/api';

interface Props {
  item: TVMazeShow;
  onPress: (item: TVMazeShow) => void;
}

/**
 * The show's meta line: its status, its network and its rating.
 *
 * Every part is optional in TVMaze's payload, so the line is built from
 * the parts that are there — a show with no network and no rating says
 * "Running" and nothing else.
 */
function showMeta(show: TVMazeShow): string {
  const parts: string[] = [];
  if (show.status) parts.push(show.status);
  if (show.network?.name) parts.push(show.network.name);
  if (show.rating?.average != null) {
    parts.push(`★ ${show.rating.average.toFixed(1)}`);
  }
  return parts.join(' · ');
}

export const ShowRow: React.FC<Props> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createShowRowStyles(colors), [colors]);

  const poster = item.image?.medium ?? '';
  const meta = showMeta(item);

  const posterTile = (
    <View style={styles.posterPlaceholder} testID="show-artwork-placeholder">
      <SvgIcon name="video" size={20} color={colors.accent.gold} />
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={text.row.openA11y.replace('{title}', item.name)}
      style={styles.showRow}>
      <View style={styles.posterWrap}>
        {poster ? (
          <MediaImage
            source={poster}
            style={styles.poster}
            resizeMode="cover"
            placeholder={posterTile}
            accessibilityIgnoresInvertColors
            testID="show-artwork-image"
          />
        ) : (
          posterTile
        )}
      </View>

      <View style={styles.info}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.title}>
          {item.name}
        </AppText>
        {meta ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {meta}
          </AppText>
        ) : null}
      </View>

      <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});
