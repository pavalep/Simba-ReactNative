import React, {useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {selectAlbumTracks} from '../../store/slices/mediaSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BackButton} from '../../components/utility/BackButton/BackButton';
import {SimbaStatusBar} from '../../components/StatusBar';
import FastImage from 'react-native-fast-image';
import {radius} from '../../theme/tokens';
import {useCachedArt} from '../../hooks/useCachedArt';
import {useMoreFromArtist} from '../../hooks/useMoreFromArtist';
import {StreamingRow} from '../../components/media/StreamingRow/StreamingRow';
import {useAlbumEnrichment} from './hooks/useAlbumEnrichment';
import type {JamendoTrackResult} from '../../types/api';
import type {RootStackScreenProps} from '../../navigation/types';
type AlbumDetailScreenProps = RootStackScreenProps<'AlbumDetail'>;
import {shareContent} from '../../services/shareService';
import {usePlaybackCommands} from '../../modules/playback';

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
  const {albumTitle, artistName, musicBrainzReleaseId} = route.params;
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const {openPlayer} = usePlaybackCommands();

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

  // P39.3: MusicBrainz release-group metadata + local-track matching
  const enrichment = useAlbumEnrichment(
    musicBrainzReleaseId,
    albumTitle,
    artistName,
  );
  // P39.5: streaming "more from this artist" rows
  const more = useMoreFromArtist(artistName);
  // P39.2: CAA cover resolved through the Phase 33 art cache
  const cachedCover = useCachedArt(enrichment.releaseGroup?.coverArtUrl);

  const handlePlayAll = () => {
    const firstTrack = sortedTracks[0];
    if (firstTrack) {
      openPlayer({
        uri: firstTrack.uri,
        title: firstTrack.title,
        duration: firstTrack.duration,
        source: 'local',
        type: 'music',
        mediaType: 'audio',
      });
    }
  };

  const handlePlayTrack = (uri: string, title: string) => {
    openPlayer({
      uri,
      title,
      duration: 0,
      source: 'local',
      type: 'music',
      mediaType: 'audio',
    });
  };

  // P39.5: streaming rows play directly
  const handleStreamingPlay = useCallback(
    (track: JamendoTrackResult) => {
      openPlayer({
        uri: track.audioUrl,
        title: track.name,
        duration: 0,
        artworkUri: track.imageUrl || undefined,
        source: 'api',
        type: 'music',
        mediaType: 'audio',
        provider: 'jamendo',
      });
    },
    [openPlayer],
  );

  // 56.4: share the album via deep link + https fallback
  const handleShare = useCallback(() => {
    shareContent({
      route: 'AlbumDetail',
      params: {albumTitle, artistName},
      title: albumTitle,
      subtitle: artistName,
    });
  }, [albumTitle, artistName]);

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
        shareBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
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
          overflow: 'hidden',
        },
        artLargeImage: {
          width: '100%',
          height: '100%',
          borderRadius: 12,
        },
        metaChips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          marginTop: 4,
        },
        metaChip: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.pill,
        },
        matchBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: radius.sm,
          marginBottom: 16,
        },
        sectionTitle: {
          fontWeight: '600',
          marginBottom: 12,
        },
        sectionTitleSpaced: {
          marginTop: 20,
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

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton />
        <AppText variant="displaySans" color="primary">
          Album
        </AppText>
        <TouchableOpacity
          style={[styles.shareBtn, {backgroundColor: colors.background.elevated}]}
          onPress={handleShare}
          activeOpacity={0.7}
          accessibilityLabel="Share album"
          accessibilityRole="button">
          <SvgIcon name="share" size={18} color={colors.text.primary} />
        </TouchableOpacity>
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
            {cachedCover ? (
              <FastImage
                source={{uri: cachedCover}}
                style={styles.artLargeImage}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <SvgIcon name="listMusic" size={48} color={colors.accent.gold} />
            )}
          </View>
          <AppText variant="displaySerif" color="primary" style={styles.albumName}>
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

          {/* P39.3: MusicBrainz release metadata chips */}
          {enrichment.releaseGroup ? (
            <View style={styles.metaChips}>
              {enrichment.releaseGroup.date ? (
                <View
                  style={[styles.metaChip, {backgroundColor: colors.background.elevated}]}>
                  <AppText variant="caption" color="secondary">
                    {enrichment.releaseGroup.date.slice(0, 4)}
                  </AppText>
                </View>
              ) : null}
              {enrichment.releaseGroup.primaryType ? (
                <View
                  style={[styles.metaChip, {backgroundColor: colors.background.elevated}]}>
                  <AppText variant="caption" color="secondary">
                    {enrichment.releaseGroup.primaryType}
                  </AppText>
                </View>
              ) : null}
              <View
                style={[styles.metaChip, {backgroundColor: colors.background.elevated}]}>
                <AppText variant="caption" color="secondary">
                  MusicBrainz
                </AppText>
              </View>
            </View>
          ) : null}
        </View>

        {/* P39.3: local-library match count */}
        {enrichment.releaseGroup &&
        enrichment.releaseGroup.recordings.length > 0 ? (
          <View
            style={[styles.matchBanner, {backgroundColor: colors.accent.goldDim}]}>
            <SvgIcon name="music" size={16} color={colors.accent.gold} />
            <AppText variant="caption" style={{color: colors.accent.gold}}>
              {enrichment.matchedCount} of{' '}
              {enrichment.releaseGroup.recordings.length} tracks matched to
              your library
            </AppText>
          </View>
        ) : null}

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

        {/* P39.5: more from this artist (streaming) */}
        {more.tracks.length > 0 ? (
          <>
            <AppText
              variant="displaySans"
              color="primary"
              style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              More From {artistName}
            </AppText>
            {/* 59.1: virtualized instead of .map */}
            <FlatList
              data={more.tracks}
              keyExtractor={track => String(track.id)}
              renderItem={({item: track}) => (
                <StreamingRow
                  track={track}
                  onPlay={handleStreamingPlay}
                />
              )}
              scrollEnabled={false}
              initialNumToRender={more.tracks.length}
            />
          </>
        ) : null}

        {/* ── Track listing (59.1: virtualized instead of .map) ── */}
        <FlatList
          data={sortedTracks}
          keyExtractor={track => track.uri}
          renderItem={({item: track, index: idx}) => (
            <TouchableOpacity
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
          )}
          scrollEnabled={false}
          initialNumToRender={sortedTracks.length}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
