import React, {useMemo, useState, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {SimbaStatusBar} from '../../components/StatusBar';
import type {NowPlayingScreenProps} from '../../navigation/types';

// ─── Constants ───────────────────────────────────────────────

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ART_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

type Props = NowPlayingScreenProps;

// ─── Component ───────────────────────────────────────────────

export const NowPlayingScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  // Local UI state (placeholder — will come from Redux later)
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration] = useState(243); // placeholder 4:03

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
    (e: any) => {
      const x = e.nativeEvent.locationX;
      const trackWidth = SCREEN_WIDTH - 32;
      const pct = Math.max(0, Math.min(1, x / trackWidth));
      setPosition(Math.round(pct * duration));
    },
    [duration],
  );

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
        backButton: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
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
      }),
    [colors, insets.top],
  );

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={
          [colors.background.primary, colors.background.primary]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <AppText style={styles.transportIcon}>{'←'}</AppText>
        </TouchableOpacity>
        <AppText variant="h3" color="primary" style={styles.headerTitle}>
          Now Playing
        </AppText>
      </View>

      {/* Content */}
      <View style={styles.scrollContent}>
        {/* Album art placeholder */}
        <View style={styles.artContainer}>
          <AppText style={styles.artPlaceholder}>{'♫'}</AppText>
        </View>

        {/* Title */}
        <AppText variant="h2" color="primary" style={styles.title}>
          Unknown Track
        </AppText>

        {/* Artist / file info */}
        <AppText variant="body2" color="secondary" style={styles.artist}>
          Unknown Artist
        </AppText>

        {/* Seek bar */}
        <TouchableOpacity
          style={styles.seekRow}
          activeOpacity={1}
          onPress={handleSeek}>
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
            onPress={handlePrev}>
            <AppText style={styles.transportIcon}>{'◀◀'}</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playBtn}
            onPress={handlePlayPause}>
            <AppText style={styles.playIcon}>
              {isPlaying ? '⏸' : '▶'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.transportBtn}
            onPress={handleNext}>
            <AppText style={styles.transportIcon}>{'▶▶'}</AppText>
          </TouchableOpacity>
        </View>

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
      </View>
    </View>
  );
};
