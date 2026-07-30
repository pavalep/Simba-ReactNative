import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {selectAllTracks} from '../../store/slices/mediaSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SimbaStatusBar} from '../../components/StatusBar';
import {radius} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'GenreScreen'>;

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GenreScreen: React.FC<Props> = ({navigation, route}) => {
  const {genre} = route.params;
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  const tracks = useAppSelector(state =>
    selectAllTracks(state).filter(
      t => t.genre.toLowerCase() === genre.toLowerCase(),
    ),
  );

  const sortedTracks = useMemo(() => [...tracks].sort((a, b) => a.title.localeCompare(b.title)), [tracks]);

  const handlePlayTrack = (uri: string, title: string) => {
    navigation.navigate('AudioPlayer', {fileUri: uri, fileTitle: title});
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient colors={[colors.background.primary, colors.background.elevated]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowWarm, {backgroundColor: colors.accent.gold, opacity: isDark ? 0.22 : 0.12}]} pointerEvents="none" />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary">Genre</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: insets.bottom + 40}}>
        <View style={{alignItems: 'center', paddingVertical: 24, gap: 4}}>
          <View style={[styles.genreIcon, {backgroundColor: colors.accent.goldDim}]}>
            <SvgIcon name="music" size={32} color={colors.accent.gold} />
          </View>
          <AppText variant="h1" color="primary" style={{fontWeight: '700', marginTop: 8}}>
            {genre}
          </AppText>
          <AppText variant="caption" color="tertiary">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</AppText>
        </View>

        {sortedTracks.map(track => (
          <TouchableOpacity
            key={track.uri}
            style={[styles.trackItem, {backgroundColor: colors.background.elevated}]}
            activeOpacity={0.7}
            onPress={() => handlePlayTrack(track.uri, track.title)}>
            <View style={[styles.artSmall, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="music" size={18} color={colors.accent.gold} />
            </View>
            <View style={{flex: 1, marginLeft: 12}}>
              <AppText variant="body2" color="primary" numberOfLines={1}>{track.title}</AppText>
              <AppText variant="caption" color="tertiary" numberOfLines={1}>{track.artist}</AppText>
            </View>
            <AppText variant="caption" color="tertiary">{formatDuration(track.duration)}</AppText>
          </TouchableOpacity>
        ))}

        {tracks.length === 0 && (
          <AppText variant="body2" color="tertiary" style={{textAlign: 'center', marginTop: 40}}>
            No tracks found in this genre.
          </AppText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  glowWarm: {
    position: 'absolute', top: -120, left: -80,
    width: 280, height: 280, borderRadius: 140,
  },
  genreIcon: {width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center'},
  trackItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: radius.sm, marginBottom: 4,
  },
  artSmall: {width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
});
