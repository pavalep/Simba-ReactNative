// Simba Player — GenreScreen (Phase 20 / P41)
// P41.1/41.2/41.3: full genre browse — local library tracks,
// Jamendo streaming catalog, mood collections (real tag queries),
// and live radio stations for the genre.
// ────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {BackButton} from '../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {ErrorState} from '../../components/feedback/ErrorState/ErrorState';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import {SimbaStatusBar} from '../../components/StatusBar';
import {MediaTile} from '../../components/utility/MediaTile/MediaTile';
import {StreamingRow} from '../../components/media/StreamingRow/StreamingRow';
import type {RootStackScreenProps} from '../../navigation/types';
import type {RadioStationResult} from '../../types/api';
import {useGenreScreen, type GenreBrowseTab} from './useGenreScreen';

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Browse tabs ──

const TABS: Array<{id: GenreBrowseTab; label: string}> = [
  {id: 'local', label: 'My Library'},
  {id: 'streaming', label: 'Streaming'},
  {id: 'moods', label: 'Moods'},
  {id: 'radio', label: 'Radio'},
];

// ── Radio station row (P41.4: genre detail keeps radio-by-genre) ──

const StationRow: React.FC<{
  station: RadioStationResult;
  onPlay: (station: RadioStationResult) => void;
}> = React.memo(({station, onPlay}) => {
  const {colors} = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.stationRow,
        {backgroundColor: colors.background.elevated},
      ]}
      activeOpacity={0.7}
      onPress={() => onPlay(station)}
      accessibilityRole="button">
      <View style={[styles.stationThumb, {backgroundColor: colors.accent.goldDim}]}>
        {station.favicon ? (
          <FastImage
            source={{uri: station.favicon}}
            style={styles.stationThumb}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <SvgIcon name="headphones" size={20} color={colors.accent.gold} />
        )}
      </View>
      <View style={styles.stationInfo}>
        <AppText variant="body2" color="primary" numberOfLines={1}>
          {station.name}
        </AppText>
        <AppText variant="caption" color="tertiary" numberOfLines={1}>
          {[station.country, station.tags].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={[styles.stationPlay, {backgroundColor: colors.accent.goldDim}]}>
        <SvgIcon name="play" size={14} color={colors.accent.gold} />
      </View>
    </TouchableOpacity>
  );
});

// ── Screen ──

export const GenreScreen: React.FC<
  RootStackScreenProps<'GenreScreen'>
> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    genre,
    tab,
    setTab,
    localTracks,
    streamingTracks,
    streamingLoading,
    streamingFailed,
    retryStreaming,
    moods,
    selectedMoodId,
    selectMood,
    moodTracks,
    moodLoading,
    radioStations,
    radioLoading,
    radioFailed,
    retryRadio,
    handlePlayTrack,
    handlePlayStreaming,
    handlePlayStation,
  } = useGenreScreen();
  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(localTracks.length, 20),
    {
      staggerDelay: 40,
      direction: 'up',
      duration: 300,
    },
  );

  const heroCaption: string =
    tab === 'local'
      ? `${localTracks.length} ${localTracks.length === 1 ? 'track' : 'tracks'} in your library`
      : tab === 'streaming'
      ? streamingLoading
        ? 'Loading streaming catalog…'
        : streamingFailed
        ? 'Streaming catalog unavailable'
        : `${streamingTracks.length} tracks on Jamendo`
      : tab === 'moods'
      ? 'Mood collections from live Jamendo genre queries'
      : radioLoading
      ? 'Loading stations…'
      : radioFailed
      ? 'Radio unavailable'
      : `${radioStations.length} live stations`;

  const selectedMood = moods.find(m => m.id === selectedMoodId) ?? null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton />
        <AppText variant="displaySans" color="primary" style={styles.headerTitle} numberOfLines={1}>
          {genre}
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 40,
        }}>
        {/* ── Genre Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.genreIcon, {backgroundColor: colors.accent.goldDim}]}>
            <SvgIcon name="music" size={36} color={colors.accent.gold} />
          </View>
          <AppText variant="displaySerif" color="primary" style={styles.genreName}>
            {genre}
          </AppText>
          <AppText variant="caption" color="tertiary">
            {heroCaption}
          </AppText>
        </View>

        {/* ── Tab chips (P41.1) ── */}
        <FlatList
          horizontal
          data={TABS}
          keyExtractor={t => t.id}
          renderItem={({item: t}) => {
            const isActive = tab === t.id;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTab(t.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.accent.gold
                      : colors.background.elevated,
                    borderColor: isActive
                      ? colors.accent.gold
                      : colors.border.subtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{selected: isActive}}>
                <AppText
                  variant="button"
                  style={[
                    styles.chipText,
                    {
                      color: isActive
                        ? colors.text.inverse
                        : colors.text.secondary,
                    },
                  ]}>
                  {t.label}
                </AppText>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.tabScroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={TABS.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />

        {/* ── Tab content ── */}
        {tab === 'local' ? (
          localTracks.length === 0 ? (
            <EmptyState
              icon="music"
              title="No Tracks Found"
              description={`No tracks found in the "${genre}" genre.`}
            />
          ) : (
            <FlatList
              data={localTracks}
              keyExtractor={track => track.uri}
              renderItem={({item: track, index}) => (
                <TouchableOpacity
                  style={[
                    styles.trackItem,
                    {backgroundColor: colors.background.elevated},
                    animStyles[index] || {},
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handlePlayTrack(track.uri, track.title)}>
                  <View
                    style={[
                      styles.trackNumber,
                      {backgroundColor: colors.accent.goldDim},
                    ]}>
                    <AppText variant="caption" color="secondary">
                      {index + 1}
                    </AppText>
                  </View>
                  <View style={styles.trackInfo}>
                    <AppText variant="body2" color="primary" numberOfLines={1}>
                      {track.title}
                    </AppText>
                    <AppText variant="caption" color="tertiary" numberOfLines={1}>
                      {track.artist}
                    </AppText>
                  </View>
                  <AppText variant="caption" color="tertiary">
                    {formatDuration(track.duration)}
                  </AppText>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              initialNumToRender={localTracks.length}
            />
          )
        ) : tab === 'streaming' ? (
          streamingLoading ? (
            <Placeholder
              variant="loading"
              anchor="top-third"
              title="Loading streaming catalog…"
            />
          ) : streamingFailed ? (
            <ErrorState
              title="Couldn't load streaming tracks"
              message={`Jamendo is unreachable for "${genre}". Check your connection and retry.`}
              onRetry={retryStreaming}
              retryLabel="Retry"
            />
          ) : streamingTracks.length === 0 ? (
            <EmptyState
              icon="music"
              title="No Streaming Tracks"
              description={`No Jamendo tracks found for the "${genre}" tag.`}
            />
          ) : (
            <FlatList
              data={streamingTracks}
              keyExtractor={t => String(t.id)}
              renderItem={({item: t}) => (
                <StreamingRow track={t} onPlay={handlePlayStreaming} />
              )}
              scrollEnabled={false}
              initialNumToRender={streamingTracks.length}
            />
          )
        ) : tab === 'moods' ? (
          <>
            <FlatList
              horizontal
              data={moods}
              keyExtractor={m => m.id}
              renderItem={({item: m}) => (
                <View style={styles.moodTileWrap}>
                  <MediaTile
                    title={m.name}
                    icon={m.icon}
                    size={104}
                    selected={m.id === selectedMoodId}
                    onPress={() => selectMood(m.id)}
                  />
                </View>
              )}
              contentContainerStyle={styles.moodRail}
              showsHorizontalScrollIndicator={false}
              initialNumToRender={moods.length}
              windowSize={5}
              maxToRenderPerBatch={12}
            />
            <AppText variant="overline" color="accent" style={styles.moodSectionTitle}>
              {selectedMood
                ? `${selectedMood.name} · ${moodTracks.length} tracks from Jamendo`
                : 'Pick a mood'}
            </AppText>
            {moodLoading ? (
              <Placeholder
                variant="loading"
                anchor="top-third"
                title="Curating mood tracks…"
              />
            ) : moodTracks.length === 0 ? (
              <EmptyState
                icon="music"
                title="No Tracks for This Mood"
                description="The genre tags behind this mood returned nothing — try another mood."
              />
            ) : (
              <FlatList
                data={moodTracks}
                keyExtractor={t => String(t.id)}
                renderItem={({item: t}) => (
                  <StreamingRow track={t} onPlay={handlePlayStreaming} />
                )}
                scrollEnabled={false}
                initialNumToRender={moodTracks.length}
              />
            )}
          </>
        ) : radioLoading ? (
          <Placeholder
            variant="loading"
            anchor="top-third"
            title="Loading stations…"
          />
        ) : radioFailed ? (
          <ErrorState
            title="Couldn't load stations"
            message={`Radio Browser is unreachable for "${genre}". Check your connection and retry.`}
            onRetry={retryRadio}
            retryLabel="Retry"
          />
        ) : radioStations.length === 0 ? (
          <EmptyState
            icon="headphones"
            title="No Stations Found"
            description={`No live radio stations tagged "${genre}".`}
          />
        ) : (
          <FlatList
            data={radioStations}
            keyExtractor={s => s.stationuuid}
            renderItem={({item: s}) => (
              <StationRow station={s} onPlay={handlePlayStation} />
            )}
            scrollEnabled={false}
            initialNumToRender={radioStations.length}
          />
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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  genreIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  genreName: {
    fontWeight: '700',
    textAlign: 'center',
  },
  tabScroll: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  trackNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  // (Replaced by the shared <Placeholder> component.)
  moodRail: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  moodTileWrap: {
    marginRight: spacing.md,
  },
  moodSectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  stationThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stationInfo: {
    flex: 1,
  },
  stationPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
