// Simba Player — GenreScreen (Phase 20 / P41)
// P41.1/41.2: local library + Jamendo streaming for the genre.
// V18.11.4: converted from the v3-v9 4-tab pattern
// (local / streaming / moods / radio) to the v10+ "single content
// stream + FAB" pattern. The Moods tab was a unique feature but
// added significant complexity for a single FAB; deferred to a
// future Moods entry point. The Radio tab duplicates
// RadioScreenNew; the user can navigate there from the Library tab.

import React, {useCallback} from 'react';
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
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {ErrorState} from '../../../components/feedback/ErrorState/ErrorState';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {StreamingRow} from '../../../components/media/StreamingRow/StreamingRow';
import {resolveStreamType, usePlayerActivity} from '../../../infrastructure/player';
import type {GenreScreenProps} from '../types';
import type {JamendoTrackResult} from '../../../types/api';
import {useGenreScreen} from '../hooks/useGenreScreen';

function formatDuration(sec: number): string {
  if (sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Source toggle (replaces the 4-tab chip row) ──

const SOURCE_TOGGLE: Array<{id: 'local' | 'streaming'; label: string}> = [
  {id: 'local', label: 'My Library'},
  {id: 'streaming', label: 'Streaming'},
];

export const GenreScreen: React.FC<GenreScreenProps> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {openPlayer} = usePlayerActivity();
  const {genre: routeGenre, initialTab} = route.params ?? {};
  const genre = routeGenre ?? '';

  const {
    source,
    setSource,
    localTracks,
    streamingTracks,
    streamingLoading,
    streamingFailed,
    retryStreaming,
  } = useGenreScreen(genre, initialTab === 'streaming' ? 'streaming' : 'local');

  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(localTracks.length, 20),
    {staggerDelay: 40, direction: 'up', duration: 300},
  );

  const handlePlayTrack = useCallback(
    (uri: string, title: string) => {
      openPlayer({uri, title, type: resolveStreamType('music')});
    },
    [openPlayer],
  );

  const handlePlayStreaming = useCallback(
    (track: JamendoTrackResult) => {
      openPlayer({uri: track.audioUrl, title: track.name, type: resolveStreamType('music')});
    },
    [openPlayer],
  );

  const heroCaption: string =
    source === 'local'
      ? `${localTracks.length} ${localTracks.length === 1 ? 'track' : 'tracks'} in your library`
      : streamingLoading
      ? 'Loading streaming catalog…'
      : streamingFailed
      ? 'Streaming catalog unavailable'
      : `${streamingTracks.length} tracks on Jamendo`;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

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

        {/* Source toggle (replaces 4-tab chip row) */}
        <FlatList
          horizontal
          data={SOURCE_TOGGLE}
          keyExtractor={t => t.id}
          renderItem={({item: t}) => {
            const isActive = source === t.id;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSource(t.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? colors.accent.gold : colors.background.elevated,
                    borderColor: isActive ? colors.accent.gold : colors.border.subtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{selected: isActive}}>
                <AppText
                  variant="button"
                  style={[
                    styles.chipText,
                    {
                      color: isActive ? colors.text.inverse : colors.text.secondary,
                    },
                  ]}>
                  {t.label}
                </AppText>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.tabScroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={SOURCE_TOGGLE.length}
          windowSize={5}
          maxToRenderPerBatch={12}
        />

        {source === 'local' ? (
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
        ) : streamingLoading ? (
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
  headerTitle: {flex: 1},
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
  genreName: {fontWeight: '700', textAlign: 'center'},
  tabScroll: {gap: spacing.sm, paddingBottom: spacing.md},
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {fontSize: 13, fontWeight: '700'},
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
  trackInfo: {flex: 1},
});
