import React, {useMemo, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Constants ───────────────────────────────────────────────

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SEEK_BAR_HEIGHT = 16;

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

export interface PlayerControlsProps {
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
}: {
  icon: string;
  onPress?: () => void;
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
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <AppText style={styles.icon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

function PlayBtn({
  icon,
  onPress,
}: {
  icon: string;
  onPress?: () => void;
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
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <AppText style={styles.icon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

function MenuBtn({
  icon,
  active,
  onPress,
}: {
  icon: string;
  active?: boolean;
  onPress?: () => void;
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
      onPress={onPress}>
      <AppText style={styles.icon}>{icon}</AppText>
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────────────

export const PlayerControls: React.FC<PlayerControlsProps> = ({
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

  const positionPct = duration > 0 ? Math.min(position / duration, 1) : 0;

  const handleSeekPress = useCallback(
    (e: any) => {
      const x = e.nativeEvent.locationX;
      // The seek track occupies: SCREEN_WIDTH - 16(pl) - 16(pr) - 40(timeLabel) - 8(divider) - 40(timeLabel)
      const trackWidth = SCREEN_WIDTH - 16 - 16 - 40 - 8 - 40;
      const pct = Math.max(0, Math.min(1, x / trackWidth));
      onSeek(pct);
    },
    [onSeek],
  );

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
        // ── Seek bar ──
        seekRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 6,
        },
        seekTrack: {
          flex: 1,
          height: SEEK_BAR_HEIGHT,
          justifyContent: 'center',
          position: 'relative',
        },
        seekTrackBg: {
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.text.tertiary,
        },
        seekTrackFill: {
          position: 'absolute',
          left: 0,
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
          borderWidth: 1.5,
          borderColor: colors.accent.gold,
          marginLeft: -7,
        },
        chapterMark: {
          position: 'absolute',
          width: 3,
          height: 12,
          backgroundColor: colors.text.primary,
          opacity: 0.5,
          borderRadius: 1,
        },
        timeLabel: {
          minWidth: 40,
          textAlign: 'center',
        },
        timeDivider: {
          width: 1,
          height: 14,
          backgroundColor: colors.border.subtle,
          opacity: 0.3,
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

  let chapterMarks: React.ReactNode = null;
  try {
    chapterMarks = Array.from(chapters ?? []).map((ch, i) => {
      const pct = duration > 0 ? (ch.startTime / duration) * 100 : 0;
      return (
        <View
          key={i}
          style={[
            styles.chapterMark,
            {left: `${pct}%`, marginLeft: -1.5, top: 2},
          ]}
        />
      );
    });
  } catch (mapErr) {
    console.error('chapters.map error:', mapErr, chapters?.length, JSON.stringify(chapters?.slice(0, 2)));
  }

  let testGroup = null;

  try {
    testGroup = (
      <View>
        <TransportBtn icon="⏮" onPress={onPrev} />
        <PlayBtn icon={isPlaying ? '⏸' : '▶'} onPress={onPlayPause} />
        <TransportBtn icon="⏭" onPress={onNext} />
        <MenuBtn icon={volume === 0 ? '🔇' : '🔊'} onPress={onVolumeChange} />
        <MenuBtn icon="⚙" active={eqEnabled} onPress={onToggleEqPanel} />
        <MenuBtn icon="☰" active={playlistLength > 0} onPress={onTogglePlaylistPanel} />
        <MenuBtn icon="🔀" active={shuffle} onPress={onToggleShuffle} />
        <MenuBtn icon="🔁" active={loopMode === 'playlist'} onPress={onToggleLoop} />
        <MenuBtn icon="📷" onPress={onScreenshot} />
        <MenuBtn icon="CC" active={activeSubtitle !== null} onPress={onToggleSubtitles} />
        <MenuBtn icon="🎵" active={activeAudioTrack !== null} onPress={onToggleAudioPanel} />
        <TransportBtn icon="⛶" onPress={() => {}} />
      </View>
    );
  } catch (groupErr) {
    console.error('testGroup render error:', groupErr, (groupErr as Error)?.stack);
  }

  // ── Part A: seek bar structure (TouchableOpacity + seek track) ──
  let seekBarEl: React.ReactNode = null;
  let seekBarErr: string | null = null;
  try {
    seekBarEl = (
      <TouchableOpacity
        style={styles.seekRow}
        activeOpacity={1}
        onPress={handleSeekPress}>
        <View style={styles.seekTrack} pointerEvents="none">
          <View style={styles.seekTrackBg} />
          <View
            style={[
              styles.seekTrackFill,
              {width: `${positionPct * 100}%`, top: 6},
            ]}
          />
          {chapterMarks}
          <View
            style={[
              styles.seekThumb,
              {left: `${positionPct * 100}%`, top: 1},
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  } catch (errA) {
    seekBarErr = (errA as Error)?.message;
    console.error('seekBarEl error:', errA, (errA as Error)?.stack);
  }

  // ── Part B: time labels ──
  let timeLabelsEl: React.ReactNode = null;
  let timeLabelsErr: string | null = null;
  try {
    timeLabelsEl = (
      <>
        <AppText
          variant="caption"
          color="primary"
          style={styles.timeLabel}>
          {currentTime}
        </AppText>
        <View style={styles.timeDivider} />
        <AppText
          variant="caption"
          color="primary"
          style={styles.timeLabel}>
          {totalTime}
        </AppText>
      </>
    );
  } catch (errB) {
    timeLabelsErr = (errB as Error)?.message;
    console.error('timeLabelsEl error:', errB, (errB as Error)?.stack);
  }

  try {
    return (
      <View style={[styles.container, {paddingBottom: bottomInset + 8}]}>
        {/* Sheen overlay */}
        <View style={styles.sheenOverlay} pointerEvents="none" />

        {/* Seek bar */}
        <TouchableOpacity
          style={styles.seekRow}
          activeOpacity={1}
          onPress={handleSeekPress}>
          <View style={styles.seekTrack} pointerEvents="none">
            <View style={styles.seekTrackBg} />
            <View
              style={[
                styles.seekTrackFill,
                {width: `${positionPct * 100}%`, top: 6},
              ]}
            />
            {chapterMarks}
            <View
              style={[
                styles.seekThumb,
                {left: `${positionPct * 100}%`, top: 1},
              ]}
            />
          </View>
          <AppText
            variant="caption"
            color="primary"
            style={styles.timeLabel}>
            {currentTime}
          </AppText>
          <View style={styles.timeDivider} />
          <AppText
            variant="caption"
            color="primary"
            style={styles.timeLabel}>
            {totalTime}
          </AppText>
        </TouchableOpacity>

        {/* Transport row */}
        {testGroup}
      </View>
    );
  } catch (e) {
    console.error('PlayerControls render error:', e, 'seekBarErr:', seekBarErr, 'timeLabelsErr:', timeLabelsErr, (e as Error)?.stack, JSON.stringify({controlsVisible, position, duration, isPlaying, volume, chaptersLength: chapters?.length, currentTime, totalTime}));
    return (
      <View style={[styles.container, {paddingBottom: bottomInset + 8}]}>
        <AppText style={{color: 'red', padding: 20}}>Render Error</AppText>
      </View>
    );
  }
};
