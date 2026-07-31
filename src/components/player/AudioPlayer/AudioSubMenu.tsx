import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Share,
  Platform,
  Animated,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {SvgIcon} from '../../utility/SvgIcon';
import {AppText} from '../../core/AppText/AppText';
import {radius, spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';
import type {TrackMetadata} from '../../../services/metadataService';
import {navigate} from '../../../navigation/navigationHelper';
import {useAppDispatch, useAppSelector} from '../../../store';
import {setPlaybackSpeed, setSleepTimer} from '../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../native';

// ─── Types ──────────────────────────────────────────────────

interface AudioSubMenuProps {
  visible: boolean;
  onClose: () => void;
  colors: ColorTokens;
  title: string;
  artist: string;
  album: string;
  albumArtUri: string;
  fileUri: string;
  metadata: TrackMetadata;
  bookmarkCount: number;
  liked: boolean;
  onLike: () => void;
  onAddToPlaylist: () => void;
  onBookmark: () => void;
}

// ─── Sleep Timer Picker ─────────────────────────────────────

const SLEEP_TIMER_OPTIONS = [15, 30, 45, 60] as const;
const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

const formatRemaining = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SleepTimerSection: React.FC<{
  onSelect: (minutes: number) => void;
  onCancel: () => void;
  activeEndTime: number | null;
  colors: ColorTokens;
}> = ({onSelect, onCancel, activeEndTime, colors}) => {
  const [expanded, setExpanded] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Live countdown while the section is open
  useEffect(() => {
    if (!expanded || activeEndTime === null) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expanded, activeEndTime]);

  const remainingMs = activeEndTime !== null ? Math.max(0, activeEndTime - nowTick) : 0;
  const active = activeEndTime !== null && remainingMs > 0;

  return (
    <>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}>
        <SvgIcon name="sliders" size={20} color="#EDEDED" />
        <AppText variant="body2" color="primary" style={styles.actionLabel}>
          {active ? `Sleep Timer (${formatRemaining(remainingMs)} left)` : 'Sleep Timer'}
        </AppText>
        <AppText variant="caption" color="secondary">
          {expanded ? '−' : '+'}
        </AppText>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.timerOptions}>
          {SLEEP_TIMER_OPTIONS.map(min => (
            <TouchableOpacity
              key={min}
              style={[
                styles.timerChip,
                active && Math.ceil(remainingMs / 60000) === min && {
                  backgroundColor: 'rgba(201,168,76,0.15)',
                  borderColor: '#C9A84C',
                },
              ]}
              onPress={() => {
                onSelect(min);
                setExpanded(false);
              }}
              activeOpacity={0.7}>
              <AppText
                variant="caption"
                color="primary"
                style={
                  active && Math.ceil(remainingMs / 60000) === min
                    ? {color: '#C9A84C'}
                    : undefined
                }>
                {min} min
              </AppText>
            </TouchableOpacity>
          ))}
          {active && (
            <TouchableOpacity
              style={[styles.timerChip, {borderColor: colors.border.subtle}]}
              onPress={() => {
                onCancel();
                setExpanded(false);
              }}
              activeOpacity={0.7}>
              <AppText variant="caption" color="secondary">
                Cancel
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
};

// ─── Playback Speed Picker ──────────────────────────────────

const SpeedSection: React.FC<{
  currentSpeed: number;
  onSelect: (speed: number) => void;
}> = ({currentSpeed, onSelect}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}>
        <SvgIcon name="maximize" size={20} color="#EDEDED" />
        <AppText variant="body2" color="primary" style={styles.actionLabel}>
          Playback Speed
        </AppText>
        <AppText variant="caption" color="secondary">
          {currentSpeed.toFixed(2).replace(/\.?0+$/, '')}× {expanded ? '−' : '+'}
        </AppText>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.timerOptions}>
          {SPEED_OPTIONS.map(spd => (
            <TouchableOpacity
              key={spd}
              style={[
                styles.timerChip,
                currentSpeed === spd && {
                  backgroundColor: 'rgba(201,168,76,0.15)',
                  borderColor: '#C9A84C',
                },
              ]}
              onPress={() => {
                onSelect(spd);
                setExpanded(false);
              }}
              activeOpacity={0.7}>
              <AppText
                variant="caption"
                color="primary"
                style={currentSpeed === spd ? {color: '#C9A84C'} : undefined}>
                {spd}×
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
};

// ─── Audio Quality Info Card ────────────────────────────────

const AudioQualityCard: React.FC<{
  metadata: TrackMetadata;
}> = ({metadata}) => {
  const raw = metadata.raw || {};

  const qualityRows: {label: string; value: string}[] = [
    {label: 'Codec', value: raw.codec || raw.audio_codec || '—'},
    {label: 'Bitrate', value: raw['audio-bitrate'] || raw.bitrate || '—'},
    {label: 'Sample Rate', value: raw['sample-rate'] || raw.sample_rate || '—'},
    {label: 'Channels', value: raw.channels || raw.channel_count || '—'},
  ];

  const hasData = qualityRows.some(r => r.value !== '—');

  return (
    <View style={styles.qualityCard}>
      <AppText variant="caption" color="secondary" style={styles.qualityTitle}>
        Audio Quality
      </AppText>
      {hasData ? (
        qualityRows.map(row => (
          <View key={row.label} style={styles.qualityRow}>
            <AppText variant="caption" color="tertiary" style={styles.qualityLabel}>
              {row.label}
            </AppText>
            <AppText variant="caption" color="primary" style={styles.qualityValue}>
              {row.value}
            </AppText>
          </View>
        ))
      ) : (
        <AppText variant="caption" color="tertiary" style={styles.qualityNoData}>
          No detailed metadata available
        </AppText>
      )}
    </View>
  );
};

// ─── AudioSubMenu Component ─────────────────────────────────

export const AudioSubMenu: React.FC<AudioSubMenuProps> = ({
  visible,
  onClose,
  colors,
  title,
  artist,
  album,
  albumArtUri,
  fileUri,
  metadata,
  bookmarkCount,
  liked,
  onLike,
  onAddToPlaylist,
  onBookmark,
}) => {
    const heartScale = useRef(new Animated.Value(1)).current;

  const dispatch = useAppDispatch();
  const playbackSpeed = useAppSelector(state => state.player.playbackSpeed);
  const sleepTimerEndTime = useAppSelector(state => state.player.sleepTimerEndTime);

  const handleLike = useCallback(() => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1.0,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onLike();

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        const RNHaptics = require('react-native-haptic-feedback');
        RNHaptics.default.trigger('impactMedium', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      } catch {}
    }
  }, [onLike, heartScale]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out "${title}" by ${artist} on SIMBA Player`,
      });
    } catch {}
  }, [title, artist]);

  const handleSongInfo = useCallback(() => {
    onClose();
    navigate('SongScreen', {
      fileUri,
      title,
      artist,
      album,
    });
  }, [onClose, fileUri, title, artist, album]);

    const handleSleepSelect = useCallback(
    (minutes: number) => {
      dispatch(setSleepTimer(minutes));
    },
    [dispatch],
  );

  const handleSleepCancel = useCallback(() => {
    dispatch(setSleepTimer(null));
  }, [dispatch]);

  const handleSpeedSelect = useCallback(
    (nextSpeed: number) => {
      dispatch(setPlaybackSpeed(nextSpeed));
      try {
        MpvPlayer.setSpeed(nextSpeed);
      } catch {}
    },
    [dispatch],
  );

  const containerBg = {backgroundColor: colors.background.elevated};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, containerBg]}>
          {/* ── Header: Artwork + Title/Artist ── */}
          <View style={styles.header}>
            <FastImage
              source={
                albumArtUri
                  ? {uri: albumArtUri, priority: FastImage.priority.normal}
                  : require('../../../../assets/icon.png')
              }
              style={styles.artwork}
            />
            <View style={styles.headerText}>
              <AppText variant="body1" color="primary" numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={1}>
                {artist}
              </AppText>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Action Rows ── */}
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {/* 1. Like/Unlike */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleLike}
              activeOpacity={0.7}>
              <Animated.View style={{transform: [{scale: heartScale}]}}>
                <AppText
                  style={[
                    styles.heartIcon,
                    {color: liked ? '#FF2D55' : '#EDEDED'},
                  ]}>
                  {liked ? '♥' : '♡'}
                </AppText>
              </Animated.View>
              <AppText variant="body2" color="primary" style={styles.actionLabel}>
                {liked ? 'Unlike' : 'Like'}
              </AppText>
            </TouchableOpacity>

            {/* 2. Add to Playlist */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onClose();
                onAddToPlaylist();
              }}
              activeOpacity={0.7}>
              <SvgIcon name="listMusic" size={20} color="#EDEDED" />
              <AppText variant="body2" color="primary" style={styles.actionLabel}>
                Add to Playlist
              </AppText>
            </TouchableOpacity>

            {/* 3. Bookmark */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onClose();
                onBookmark();
              }}
              activeOpacity={0.7}>
              <SvgIcon
                name="bookmark"
                size={20}
                color={bookmarkCount > 0 ? '#C9A84C' : '#EDEDED'}
              />
              <AppText
                variant="body2"
                color="primary"
                style={[
                  styles.actionLabel,
                  bookmarkCount > 0 ? {color: '#C9A84C'} : undefined,
                ]}>
                {bookmarkCount > 0
                  ? `Bookmarks (${bookmarkCount})`
                  : 'Bookmark'}
              </AppText>
            </TouchableOpacity>

            {/* 4. Sleep Timer */}
            <SleepTimerSection
              onSelect={handleSleepSelect}
              onCancel={handleSleepCancel}
              activeEndTime={sleepTimerEndTime}
              colors={colors}
            />

            {/* 5. Playback Speed */}
            <SpeedSection currentSpeed={playbackSpeed} onSelect={handleSpeedSelect} />

            {/* 6. Audio Quality */}
            <AudioQualityCard metadata={metadata} />

            {/* 7. Share */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleShare}
              activeOpacity={0.7}>
              <SvgIcon name="maximize" size={20} color="#EDEDED" />
              <AppText variant="body2" color="primary" style={styles.actionLabel}>
                Share
              </AppText>
            </TouchableOpacity>

            {/* 7. Song Info */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleSongInfo}
              activeOpacity={0.7}>
              <SvgIcon name="list" size={20} color="#EDEDED" />
              <AppText variant="body2" color="primary" style={styles.actionLabel}>
                Song Info
              </AppText>
            </TouchableOpacity>

            {/* Bottom padding */}
            <View style={{height: 24}} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayTouchArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionLabel: {
    marginLeft: 14,
    flex: 1,
  },
  heartIcon: {
    fontSize: 22,
    lineHeight: 26,
    width: 24,
    textAlign: 'center',
  },
  // ── Sleep Timer ──
  timerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 38,
    paddingBottom: 12,
  },
  timerChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  // ── Audio Quality ──
  qualityCard: {
    marginLeft: 38,
    marginVertical: 8,
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  qualityTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  qualityLabel: {
    flex: 1,
  },
  qualityValue: {
    flex: 1,
    textAlign: 'right',
  },
  qualityNoData: {
    fontStyle: 'italic',
  },
});

export default AudioSubMenu;
