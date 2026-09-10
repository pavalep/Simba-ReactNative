// ─── W7 P25 — NowPlaying screen (live player state) ──────────
//
// **W7 P25 audit (closes D-023 / D-026 partly):** the V11/V12 screen
// carried 6 placeholder `useState` calls (isLoading / error /
// refreshing / isPlaying / position / duration) and 4 placeholder
// handlers that only mutated local state. The screen was a
// *launch pad* for the dedicated `PlayerActivity` (per the
// W2.x header) but its UI controls did not actually drive
// playback — tapping play/pause/prev/next/seek only updated
// local state, which the bridge never read.
//
// P25 fix: drop the local `useState` for player state, read
// the live state from the V21 player facade (`usePlayer` for
// isPlaying + commands, `usePlayerProgress` for position /
// duration / buffering). The 4 transport handlers now call
// the bridge-backed commands. The 3 dead UI-feedback states
// (isLoading / error / refreshing) had no async source, so
// `isLoading` is now wired to `progress.isBuffering` (a real
// signal) and `error` / `refreshing` are removed (the
// `<RefreshControl>` had no data to refresh).
//
// The screen still works as a deep-link target for the legacy
// `simbaplayer://now-playing?fileUri=...&fileTitle=...` route
// (Phase 47 deletion is still pending — see the V12 deprecation
// audit). When a file is loaded in the player, this screen now
// reflects the live state instead of a static placeholder.

import React, {useMemo, useCallback} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  type GestureResponderEvent,
} from 'react-native';
import {Placeholder} from '../../../components/feedback/Placeholder';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {useToast} from '../../../components/feedback/Toast';
import {
  usePlayer,
  usePlayerProgress,
  usePlay,
  isNetworkError,
  isUnsupportedError,
  isExpiredError,
  isBlockedError,
} from '../../../infrastructure/player';
import type {NowPlayingScreenProps} from '../types';

import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';

// ─── Constants ───────────────────────────────────────────────

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const ART_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

type Props = NowPlayingScreenProps;

// ─── Component ───────────────────────────────────────────────

export const NowPlayingScreen: React.FC<Props> = ({route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // W7 P25: live player state + commands come from the facade.
  // `usePlayer` returns the full state (isPlaying / title / etc.)
  // + the bridge-backed commands. `usePlayerProgress` is a
  // separate context (split so progress consumers don't
  // re-render on every volume / speed change — see
  // `node_modules/@simba-dev/react-native-media-player/src/types/player.ts:103-110`).
  const {state, commands} = usePlayer();
  const progress = usePlayerProgress();
  // W7 P28: typed `play()` for the "Open Full Player" affordance.
  // Returns `Result<PlaybackId, StreamError>` so the toast can
  // branch on the 4 variants.
  const play = usePlay();

  // ── Derived view state (no local useState) ──
  const isPlaying = state.isPlaying;
  const positionSec = Math.floor(progress.positionMs / 1000);
  const durationSec = Math.floor(progress.durationMs / 1000);
  // W7 P25: `isLoading` was a dead placeholder (`_setIsLoading`
  // was never called). Wire it to the bridge's `isBuffering`
  // signal so the loading spinner actually fires.
  const isLoading = progress.isBuffering;

  const fileUri = route.params?.fileUri;
  const fileTitle = route.params?.fileTitle;

  const positionPct =
    progress.durationMs > 0
      ? Math.min(progress.positionMs / progress.durationMs, 1)
      : 0;

  const currentTime = useMemo(() => {
    const m = Math.floor(positionSec / 60);
    const s = positionSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [positionSec]);

  const totalTime = useMemo(() => {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [durationSec]);

  // W7 P25: transport handlers now call the bridge-backed
  // commands. The V12 `previous()` / `next()` walk the
  // module's internal playlist (no-op for a single-file
  // launch via the deep link, real for `useOpenPlaylist`).
  const handlePlayPause = useCallback(() => {
    commands.togglePlayPause();
  }, [commands]);

  const handlePrev = useCallback(() => {
    commands.previous();
  }, [commands]);

  const handleNext = useCallback(() => {
    commands.next();
  }, [commands]);

  const handleSeek = useCallback(
    (e: GestureResponderEvent) => {
      const x = e.nativeEvent.locationX;
      const trackWidth = SCREEN_WIDTH - 32;
      const pct = Math.max(0, Math.min(1, x / trackWidth));
      commands.seek(Math.round(pct * progress.durationMs));
    },
    [commands, progress.durationMs],
  );

  const handleOpenFullPlayer = useCallback(() => {
    if (!fileUri) {
      toast.show('No media is available to open.', 'error');
      return;
    }
    // W7 P28: typed Result<PlaybackId, StreamError> — branch on
    // the 4 variants. The V12 bridge currently maps all failures
    // to NetworkStreamError; the W22 follow-up (native bridge
    // update + Result-returning usePlayWithResume) lets each
    // variant show a distinct message.
    void play({
      uri: fileUri,
      title: fileTitle ?? 'Now Playing',
      mediaType: 'audio',
    }).then(r => {
      if (r.ok) return;
      if (isNetworkError(r.error)) {
        toast.show('No connection. Open Full Player will launch when online.', 'warning');
      } else if (isUnsupportedError(r.error)) {
        toast.show('This file format is not supported by the full player.', 'error');
      } else if (isExpiredError(r.error)) {
        toast.show('Sign in expired. Please sign in again.', 'warning');
      } else if (isBlockedError(r.error)) {
        toast.show('This content is not available in your region.', 'error');
      } else {
        toast.show('Could not open the full player.', 'error');
      }
    });
  }, [fileTitle, fileUri, play, toast]);

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
        // (Replaced by the shared <Placeholder> component.)
      }),
    [colors, insets.top],
  );

  const handleEmptyState = useCallback(() => {
    if (!fileUri) {
      return (
        <Placeholder
          variant="empty"
          anchor="center"
          icon="music"
          title="No Track Playing"
          message="Open a file from the player or search to start listening."
        />
      );
    }
    return null;
  }, [fileUri]);

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
        <Placeholder variant="loading" anchor="center" />
      ) : fileUri ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
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
