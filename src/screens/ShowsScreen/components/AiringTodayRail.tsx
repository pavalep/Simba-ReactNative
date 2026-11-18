// ─── Shows — "Airing Today" rail ───────────────────────────────────────
//
// WHERE IT LIVES AND WHY
// ----------------------
// The rail is the FlatList's `ListHeaderComponent`, not a second list
// beside the catalogue. The shell has ONE content slot, and a header is
// exactly what a block of content that belongs to the list's top but is
// not the list's data is for: the rail scrolls WITH the catalogue, and
// the shell still hosts ONE list.
//
// It is a separate horizontal FlatList inside that header — the same
// shape as every other "row of things" rail in the app (the Home
// shelves, the playlist rails).
//
// WHAT IT IS
// ----------
// TVMaze's `/schedule` — the shows with an episode on today. It is a
// DIFFERENT list from the catalogue, not a scope of it: it is another
// endpoint, it answers EPISODES (measured 2026-11-18: 94 entries for 89
// shows), it cannot be paged and it cannot be filtered by anything.
//
// So the rail belongs to the CATALOGUE scope — the list you are browsing
// — and it is NOT drawn in the other two scopes:
//   • the term scope answers a question ("shows called X"), and today's
//     schedule is not part of that answer;
//   • the today scope's LIST is the schedule itself, so a rail of it
//     above the list would be the same shows twice.
//
// The rail is silent while it loads and silent if it fails: it is a
// bonus on top of the catalogue, and a missing rail is not an error the
// user has to read about.

import React, {useMemo} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {createShowsScreenStyles} from '../styles';
import text from '../related/textContent.json';
import type {TVMazeShow} from '../../../types/api';

interface Props {
  items: TVMazeShow[];
  onPress: (show: TVMazeShow) => void;
}

/** One poster in the rail. */
const RailCard: React.FC<{
  show: TVMazeShow;
  onPress: (show: TVMazeShow) => void;
}> = ({show, onPress}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createShowsScreenStyles(colors), [colors]);

  const poster = show.image?.medium ?? '';
  const posterTile = (
    <View style={styles.railPosterPlaceholder}>
      <SvgIcon name="video" size={22} color={colors.accent.gold} />
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(show)}
      accessibilityRole="button"
      accessibilityLabel={text.rail.openA11y.replace('{title}', show.name)}
      style={styles.railCard}>
      <View style={styles.railPosterWrap}>
        {poster ? (
          <MediaImage
            source={poster}
            style={styles.railPoster}
            resizeMode="cover"
            placeholder={posterTile}
            accessibilityIgnoresInvertColors
            testID="shows-rail-artwork-image"
          />
        ) : (
          posterTile
        )}
      </View>
      <AppText
        variant="caption"
        color="secondary"
        numberOfLines={2}
        style={styles.railName}>
        {show.name}
      </AppText>
    </TouchableOpacity>
  );
};

export const AiringTodayRail: React.FC<Props> = ({items, onPress}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createShowsScreenStyles(colors), [colors]);

  return (
    <View style={styles.railWrap} testID="shows-airing-today-rail">
      <AppText variant="overline" color="accent" style={styles.railTitle}>
        {text.rail.title}
      </AppText>
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => `today-${item.id}`}
        renderItem={({item}) => <RailCard show={item} onPress={onPress} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      />
    </View>
  );
};
