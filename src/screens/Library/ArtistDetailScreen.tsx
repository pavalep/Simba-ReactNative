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
import {selectArtistDiscography} from '../../store/slices/mediaSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import AudioWaveform from '../../components/player/AudioWaveform/AudioWaveform';
import {SimbaStatusBar} from '../../components/StatusBar';
import {radius} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
type ArtistDetailScreenProps = RootStackScreenProps<'ArtistDetail'>;

type Props = ArtistDetailScreenProps;

export const ArtistDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {artistName} = route.params;
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const currentFile = useAppSelector(state => state.player.currentFile);
  const playbackState = useAppSelector(state => state.player.playbackState);
  const tracks = useAppSelector(state =>
    selectArtistDiscography(state, artistName),
  );

  // Derive discography (unique albums sorted by year desc)
  const discography = useMemo(() => {
    const map = new Map<
      string,
      {title: string; year: number; trackCount: number}
    >();
    for (const t of tracks) {
      const key = t.album;
      const existing = map.get(key);
      if (!existing || t.year > existing.year) {
        map.set(key, {
          title: t.album,
          year: t.year,
          trackCount: (existing?.trackCount ?? 0) + 1,
        });
      } else {
        existing.trackCount += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [tracks]);

  const allTracks = useMemo(
    () =>
      [...tracks].sort((a, b) => {
        if (a.album !== b.album) return a.album.localeCompare(b.album);
        return a.trackNumber - b.trackNumber;
      }),
    [tracks],
  );

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
        artistHeader: {
          alignItems: 'center',
          paddingVertical: 24,
          gap: 8,
        },
        avatarLarge: {
          width: 80,
          height: 80,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        },
        artistNameText: {
          fontWeight: '700',
        },
        statsRow: {
          flexDirection: 'row',
          gap: 16,
        },
        stat: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        bioCard: {
          padding: 16,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: 20,
        },
        sectionTitle: {
          fontWeight: '600',
          marginBottom: 12,
        },
        albumCard: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          marginBottom: 8,
        },
        albumArtSmall: {
          width: 44,
          height: 44,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        },
        glowWarm: {
          position: 'absolute',
          top: -120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
        },
        trackItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        trackNum: {
          width: 28,
          textAlign: 'center',
        },
        trackInfo: {
          flex: 1,
          marginLeft: 8,
        },
        playIcon: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [insets],
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

      {/* ── Header with back ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, {backgroundColor: colors.background.elevated}]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <SvgIcon name="chevronDown" size={18} color={colors.text.primary} />
        </TouchableOpacity>
        <AppText variant="h2" color="primary">
          Artist
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* ── Artist header ── */}
        <View style={styles.artistHeader}>
          <View
            style={[
              styles.avatarLarge,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <SvgIcon name="headphones" size={36} color={colors.accent.gold} />
          </View>
          <AppText
            variant="h1"
            color="primary"
            style={styles.artistNameText}>
            {artistName}
          </AppText>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <AppText variant="body2" color="accent">
                {discography.length}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {discography.length === 1 ? 'album' : 'albums'}
              </AppText>
            </View>
            <View style={styles.stat}>
              <AppText variant="body2" color="accent">
                {tracks.length}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {tracks.length === 1 ? 'track' : 'tracks'}
              </AppText>
            </View>
          </View>
        </View>

        {/* ── Bio placeholder ── */}
        <View
          style={[
            styles.bioCard,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
            },
          ]}>
          <AppText variant="body2" color="secondary">
            Artist information is not yet available. Metadata will be enriched
            as more files are scanned.
          </AppText>
        </View>

        {/* ── Discography ── */}
        <AppText variant="h3" color="primary" style={styles.sectionTitle}>
          Discography
        </AppText>
        {discography.map(album => (
          <TouchableOpacity
            key={album.title}
            style={[
              styles.albumCard,
              {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
            ]}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('AlbumDetail', {
                albumTitle: album.title,
                artistName,
              })
            }>
            <View
              style={[
                styles.albumArtSmall,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <SvgIcon
                name="listMusic"
                size={20}
                color={colors.accent.gold}
              />
            </View>
            <View style={{flex: 1}}>
              <AppText variant="body2" color="primary" numberOfLines={1}>
                {album.title}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {album.year > 0 ? `${album.year} · ` : ''}
                {album.trackCount}{' '}
                {album.trackCount === 1 ? 'track' : 'tracks'}
              </AppText>
            </View>
            <SvgIcon
              name="chevronUp"
              size={16}
              color={colors.text.tertiary}
              style={{transform: [{rotate: '90deg'}]}}
            />
          </TouchableOpacity>
        ))}

        {/* ── All tracks ── */}
        <AppText
          variant="h3"
          color="primary"
          style={[styles.sectionTitle, {marginTop: 20}]}>
          All Tracks
        </AppText>
        {allTracks.map((track, idx) => {
          const isCurrentTrack = currentFile?.uri === track.uri;
          const isTrackPlaying = isCurrentTrack && playbackState === 'playing';
          return (
          <TouchableOpacity
            key={track.uri}
            style={[
              styles.trackItem,
              {borderBottomColor: colors.border.subtle},
              isCurrentTrack && {backgroundColor: 'rgba(201,168,76,0.08)'},
              idx === allTracks.length - 1 && {borderBottomWidth: 0},
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
              <AppText variant="caption" color="tertiary">
                {track.album}
              </AppText>
            </View>
            <View
              style={[
                styles.playIcon,
                {backgroundColor: isCurrentTrack ? 'rgba(201,168,76,0.2)' : colors.accent.goldDim},
              ]}>
              {isTrackPlaying ? (
                <AudioWaveform isPlaying={true} color="#C9A84C" size={18} barWidth={2} barGap={2} />
              ) : (
                <SvgIcon name={isCurrentTrack ? 'volume' : 'play'} size={14} color={isCurrentTrack ? colors.accent.gold : colors.accent.gold} />
              )}
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};
