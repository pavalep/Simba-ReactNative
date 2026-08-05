import React, {useMemo, useState, useCallback} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  type GestureResponderEvent,
} from 'react-native';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SimbaStatusBar} from '../../components/StatusBar';
import type {RootStackScreenProps} from '../../navigation/types';
type NowPlayingScreenProps = RootStackScreenProps<'NowPlaying'>;
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';

// ─── Constants ───────────────────────────────────────────────

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ART_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

type Props = NowPlayingScreenProps;

// ─── Component ───────────────────────────────────────────────

export const NowPlayingScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  // ── Edge case states ──
  const [isLoading, _setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Local UI state (placeholder — will come from Redux later)
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, _setDuration] = useState(0);
  const fileUri = route.params?.fileUri;
  const fileTitle = route.params?.fileTitle;

  const positionPct = duration > 0 ? Math.min(position / duration, 1) : 0;

  const currentTime = useMemo(() => {
    const m = Math.floor(position / 60);
    const s = Math.floor(position % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [position]);

  const totalTime = useMemo(() => {
    const m = Math.floor(duration / 60);
    const s = Math.floor(duration % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [duration]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handlePrev = useCallback(() => {
    setPosition(0);
  }, []);

  const handleNext = useCallback(() => {
    setPosition(0);
  }, []);

  const handleSeek = useCallback(
    (e: GestureResponderEvent) => {
      const x = e.nativeEvent.locationX;
      const trackWidth = SCREEN_WIDTH - 32;
      const pct = Math.max(0, Math.min(1, x / trackWidth));
      setPosition(Math.round(pct * duration));
    },
    [duration],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Simulate refresh — add real data-fetching logic here later
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to load now playing.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  const handleOpenFullPlayer = useCallback(() => {
    (navigation.navigate as any)('AudioPlayer', {
      fileUri: route.params?.fileUri,
      fileTitle: route.params?.fileTitle,
    });
  }, [navigation, route.params]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top,
          height: 48 + insets.top,
        },
        headerTitle: {
          flex: 1,
          textAlign: 'center',
          marginRight: 36,
        },
        scrollContent: {
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 32,
        },
        // ── Album art ──
        artContainer: {
          width: ART_SIZE,
          height: ART_SIZE,
          borderRadius: 12,
          backgroundColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 24,
          marginBottom: 32,
        },
        artPlaceholder: {
          fontSize: 48,
          color: colors.text.tertiary,
        },
        // ── Title / Info ──
        title: {
          marginBottom: 4,
        },
        artist: {
          marginBottom: 40,
        },
        // ── Seek bar ──
        seekRow: {
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          paddingHorizontal: 16,
          marginBottom: 24,
        },
        seekTrack: {
          flex: 1,
          height: 24,
          justifyContent: 'center',
        },
        seekTrackBg: {
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.border.subtle,
        },
        seekTrackFill: {
          position: 'absolute',
          left: 0,
          top: 10,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.accent.gold,
        },
        seekThumb: {
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: colors.accent.gold,
          marginLeft: -7,
          top: 5,
        },
        timeRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
          paddingHorizontal: 16,
          marginTop: -16,
          marginBottom: 32,
        },
        // ── Transport controls ──
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 32,
        },
        transportBtn: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
        playBtn: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.accent.gold,
          alignItems: 'center',
          justifyContent: 'center',
        },
        transportIcon: {
          fontSize: 22,
          color: colors.text.primary,
        },
        playIcon: {
          fontSize: 28,
          color: colors.background.primary,
        },
        // ── Volume indicator ──
        volumeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 32,
        },
        volumeIcon: {
          fontSize: 14,
          color: colors.text.secondary,
        },
        volumeLabel: {
          minWidth: 60,
          textAlign: 'center',
        },
        volumeTrack: {
          width: 120,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.border.subtle,
          overflow: 'hidden',
        },
        volumeFill: {
          height: '100%',
          borderRadius: 4,
          backgroundColor: colors.accent.gold,
        },
        fullPlayerBtn: {
          alignSelf: 'center',
          paddingHorizontal: 24,
          paddingVertical: 10,
          borderRadius: radius.sm,
          marginBottom: 16,
        },
        centerContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        retryButton: {
          marginTop: spacing.md,
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 10,
          backgroundColor: colors.accent.goldDim,
        },
      }),
    [colors, insets.top],
  );

  const handleEmptyState = useCallback(() => {
    if (!fileUri) {
      return (
        <View style={[styles.scrollContent, {justifyContent: 'center', alignItems: 'center'}]}>
          <AppText variant="h3" color="tertiary" style={{marginBottom: 8}}>
            No Track Playing
          </AppText>
          <AppText variant="body2" color="tertiary" style={{textAlign: 'center', paddingHorizontal: 32}}>
            Open a file from the player or search to start listening.
          </AppText>
        </View>
      );
    }
    return null;
  }, [fileUri, styles]);

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={
          [colors.background.primary, colors.background.primary]
        }
        style={StyleSheet.absoluteFill}
      />

      <InternalHeader title="Now Playing" />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityOrb size={48} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AppText
            variant="body1"
            color="error"
            style={{textAlign: 'center', marginBottom: spacing.sm}}>
            {error}
          </AppText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading">
            <AppText variant="button" color="accent">
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      ) : fileUri ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }>
          {/* Album art placeholder */}
          <View style={styles.artContainer}>
            <AppText style={styles.artPlaceholder}>{'♫'}</AppText>
          </View>

          {/* Title */}
          <AppText
            variant="h2"
            color="primary"
            style={styles.title}
            accessibilityLabel={`Now playing: ${fileTitle || 'Unknown Track'}`}>
            {fileTitle || 'Unknown Track'}
          </AppText>

          {/* Artist / file info */}
          <AppText variant="body2" color="secondary" style={styles.artist}>
            Unknown Artist
          </AppText>

          {/* Seek bar */}
          <TouchableOpacity
            style={styles.seekRow}
            activeOpacity={1}
            onPress={handleSeek}
            accessibilityRole="adjustable"
            accessibilityLabel={`Seek position, ${Math.round(positionPct * 100)} percent`}>
            <View style={styles.seekTrack} pointerEvents="none">
              <View style={styles.seekTrackBg} />
              <View
                style={[
                  styles.seekTrackFill,
                  {width: `${positionPct * 100}%`},
                ]}
              />
              <View
                style={[
                  styles.seekThumb,
                  {left: `${positionPct * 100}%`},
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Time labels */}
          <View style={styles.timeRow}>
            <AppText variant="caption" color="secondary">
              {currentTime}
            </AppText>
            <AppText variant="caption" color="secondary">
              {totalTime}
            </AppText>
          </View>

          {/* Transport controls */}
          <View style={styles.transportRow}>
            <TouchableOpacity
              style={styles.transportBtn}
              onPress={handlePrev}
              accessibilityLabel="Previous track"
              accessibilityRole="button">
              <AppText style={styles.transportIcon}>{'◀◀'}</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playBtn}
              onPress={handlePlayPause}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              accessibilityRole="button">
              <AppText style={styles.playIcon}>
                {isPlaying ? '⏸' : '▶'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transportBtn}
              onPress={handleNext}
              accessibilityLabel="Next track"
              accessibilityRole="button">
              <AppText style={styles.transportIcon}>{'▶▶'}</AppText>
            </TouchableOpacity>
          </View>

          {/* Full Player button */}
          <TouchableOpacity
            style={[styles.fullPlayerBtn, {backgroundColor: colors.accent.goldDim}]}
            onPress={handleOpenFullPlayer}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open full player">
            <AppText variant="body2" color="accent">
              Open Full Player
            </AppText>
          </TouchableOpacity>

          {/* Volume indicator */}
          <View style={styles.volumeRow}>
            <AppText style={styles.volumeIcon}>{'🔈'}</AppText>
            <View style={styles.volumeTrack}>
              <View
                style={[
                  styles.volumeFill,
                  {width: '70%'},
                ]}
              />
            </View>
            <AppText variant="caption" color="secondary" style={styles.volumeLabel}>
              70%
            </AppText>
          </View>
        </ScrollView>
      ) : (
        handleEmptyState()
      )}
    </View>
  );
};
