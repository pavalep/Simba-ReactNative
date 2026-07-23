import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import SeekBar from '../../../components/player/SeekBar/SeekBar';

// ─── Helpers ────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerControlsProps {
  controlsVisible: boolean;
  position: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  chapters: Array<{startTime: number; title?: string}>;
  currentTime: string;
  totalTime: string;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (pct: number) => void;
  onVolumeChange: () => void;
  onScreenshot: () => void;
  onToggleEqPanel: () => void;
  onTogglePlaylistPanel: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onToggleSubtitles: () => void;
  onToggleAudioPanel: () => void;
  eqEnabled: boolean;
  shuffle: boolean;
  loopMode: string;
  playlistLength: number;
  activeSubtitle: number | null;
  activeAudioTrack: number | null;
  bottomInset: number;
}

// ─── Sub-components ─────────────────────────────────────────

function TransportBtn({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const {colors} = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
        },
        icon: {
          fontSize: 18,
          color: colors.text.primary,
        },
      }),
    [colors],
  );
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <AppText style={styles.icon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

function PlayBtn({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const {colors} = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        icon: {
          fontSize: 22,
          color: colors.text.primary,
        },
      }),
    [colors],
  );
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <AppText style={styles.icon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

function MenuBtn({
  icon,
  active,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  active?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const {colors} = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
        },
        btnActive: {
          backgroundColor: 'rgba(255,255,255,0.06)',
        },
        icon: {
          fontSize: 14,
          color: colors.text.primary,
        },
      }),
    [colors],
  );
  return (
    <TouchableOpacity
      style={[styles.btn, active && styles.btnActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <AppText style={styles.icon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────────────

export const VideoPlayerControls: React.FC<VideoPlayerControlsProps> = ({
  controlsVisible,
  position,
  duration,
  isPlaying,
  volume,
  chapters = [],
  currentTime,
  totalTime,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onScreenshot,
  onToggleEqPanel,
  onTogglePlaylistPanel,
  onToggleShuffle,
  onToggleLoop,
  onToggleSubtitles,
  onToggleAudioPanel,
  eqEnabled,
  shuffle,
  loopMode,
  playlistLength,
  activeSubtitle,
  activeAudioTrack,
  bottomInset,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background.floating,
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          zIndex: 15,
        },
        sheenOverlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.background.floating,
        },
        // ── Transport controls ──
        transportRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          paddingHorizontal: 20,
          paddingBottom: 8,
          flexWrap: 'wrap',
        },
        btnGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        separator: {
          width: 1,
          height: 20,
          backgroundColor: colors.border.subtle,
        },
      }),
    [colors],
  );

  if (!controlsVisible) {
    return null;
  }

  return (
    <View style={[styles.container, {paddingBottom: bottomInset + 8}]}>
      {/* Sheen overlay */}
      <View style={styles.sheenOverlay} pointerEvents="none" />

      {/* Seek bar */}
      <SeekBar
        position={position}
        duration={duration}
        chapters={chapters}
        onSeek={onSeek}
      />

      {/* Transport row */}
      <View style={styles.transportRow}>
        <View style={styles.btnGroup}>
          <TransportBtn icon="⏮" onPress={onPrev} accessibilityLabel="Previous track" />
        </View>
        <PlayBtn icon={isPlaying ? '⏸' : '▶'} onPress={onPlayPause} accessibilityLabel={isPlaying ? 'Pause' : 'Play'} />
        <View style={styles.btnGroup}>
          <TransportBtn icon="⏭" onPress={onNext} accessibilityLabel="Next track" />
        </View>
        <View style={styles.separator} />
        <View style={styles.btnGroup}>
          <MenuBtn icon={volume === 0 ? '🔇' : '🔊'} onPress={onVolumeChange} accessibilityLabel="Toggle volume" />
          <MenuBtn icon="⚙" active={eqEnabled} onPress={onToggleEqPanel} accessibilityLabel="Equalizer" />
          <MenuBtn icon="☰" active={playlistLength > 0} onPress={onTogglePlaylistPanel} accessibilityLabel="Playlist" />
          <MenuBtn icon="🔀" active={shuffle} onPress={onToggleShuffle} accessibilityLabel="Shuffle" />
          <MenuBtn icon="🔁" active={loopMode === 'playlist'} onPress={onToggleLoop} accessibilityLabel="Loop" />
          <MenuBtn icon="📷" onPress={onScreenshot} accessibilityLabel="Screenshot" />
          <MenuBtn icon="CC" active={activeSubtitle !== null} onPress={onToggleSubtitles} accessibilityLabel="Subtitles" />
          <MenuBtn icon="🎵" active={activeAudioTrack !== null} onPress={onToggleAudioPanel} accessibilityLabel="Audio track" />
          <TransportBtn icon="⛶" onPress={() => {}} accessibilityLabel="Expand player" />
        </View>
      </View>
    </View>
  );
};
