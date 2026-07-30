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
import {selectAlbumTracks} from '../../store/slices/mediaSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SimbaStatusBar} from '../../components/StatusBar';
import {radius} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
type AlbumDetailScreenProps = RootStackScreenProps<'AlbumDetail'>;

type Props = AlbumDetailScreenProps;

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export const AlbumDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {albumTitle, artistName} = route.params;
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const tracks = useAppSelector(state =>
    selectAlbumTracks(state, albumTitle, artistName),
  );

  const totalDuration = useMemo(
    () => tracks.reduce((sum, t) => sum + t.duration, 0),
    [tracks],
  );

  const sortedTracks = useMemo(
    () => [...tracks].sort((a, b) => a.trackNumber - b.trackNumber),
    [tracks],
  );

  const handlePlayAll = () => {
    if (sortedTracks.length > 0) {
      (navigation as any).navigate('AudioPlayer', {
        fileUri: sortedTracks[0].uri,
        fileTitle: sortedTracks[0].title,
      });
    }
  };

  const handlePlayTrack = (uri: string, title: string) => {
    (navigation as any).navigate('AudioPlayer', {fileUri: uri, fileTitle: title});
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: Platform.OS === 'android' ? 16 : 4,
          paddingBottom: 12,
          gap: 12,
        },
        backBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 104,
        },
        albumHeader: {
          alignItems: 'center',
          paddingVertical: 24,
          gap: 8,
        },
        artLarge: {
          width: 160,
          height: 160,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        },
        albumName: {
          fontWeight: '700',
          textAlign: 'center',
        },
        artistLink: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        statsRow: {
          flexDirection: 'row',
          gap: 12,
          marginTop: 4,
        },
        playAllBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          borderRadius: radius.md,
          gap: 8,
          marginBottom: 20,
        },
        trackItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.sm,
          marginBottom: 4,
        },
        trackNum: {
          width: 28,
          textAlign: 'center',
        },
        trackInfo: {
          flex: 1,
          marginLeft: 10,
        },
        trackDuration: {
          minWidth: 40,
          textAlign: 'right',
        },
        glowWarm: {
          position: 'absolute',
          top: -120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
        },
      }),
    [colors, insets, isDark],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.22 : 0.12,
          },
        ]}
        pointerEvents="none"
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary">
          Album
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* ── Album header ── */}
        <View style={styles.albumHeader}>
          <View
            style={[
              styles.artLarge,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <SvgIcon name="listMusic" size={48} color={colors.accent.gold} />
          </View>
          <AppText variant="h1" color="primary" style={styles.albumName}>
            {albumTitle}
          </AppText>
          <TouchableOpacity
            style={styles.artistLink}
            activeOpacity={0.7}
            onPress={() =>
              navigation.push('ArtistDetail', {artistName})
            }>
            <AppText variant="body2" color="accent">
              {artistName}
            </AppText>
            <SvgIcon
              name="chevronUp"
              size={14}
              color={colors.accent.gold}
              style={{transform: [{rotate: '90deg'}]}}
            />
          </TouchableOpacity>
          <View style={styles.statsRow}>
            <AppText variant="caption" color="tertiary">
              {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </AppText>
            {totalDuration > 0 && (
              <AppText variant="caption" color="tertiary">
                {formatTotalDuration(totalDuration)}
              </AppText>
            )}
          </View>
        </View>

        {/* ── Play All button ── */}
        {sortedTracks.length > 0 && (
          <TouchableOpacity
            style={[
              styles.playAllBtn,
              {backgroundColor: colors.accent.gold},
            ]}
            activeOpacity={0.8}
            onPress={handlePlayAll}>
            <SvgIcon name="play" size={18} color={colors.background.primary} />
            <AppText
              variant="body2"
              style={{color: colors.background.primary, fontWeight: '600'}}>
              Play All
            </AppText>
          </TouchableOpacity>
        )}

        {/* ── Track listing ── */}
        {sortedTracks.map((track, idx) => (
          <TouchableOpacity
            key={track.uri}
            style={[
              styles.trackItem,
              {backgroundColor: colors.background.elevated},
            ]}
            activeOpacity={0.7}
            onPress={() => handlePlayTrack(track.uri, track.title)}>
            <AppText
              variant="caption"
              color="tertiary"
              style={styles.trackNum}>
              {track.trackNumber > 0 ? track.trackNumber : idx + 1}
            </AppText>
            <View style={styles.trackInfo}>
              <AppText variant="body2" color="primary" numberOfLines={1}>
                {track.title}
              </AppText>
            </View>
            <AppText
              variant="caption"
              color="tertiary"
              style={styles.trackDuration}>
              {formatDuration(track.duration)}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
