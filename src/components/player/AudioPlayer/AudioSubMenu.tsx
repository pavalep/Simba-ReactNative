import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
  Platform,
  Animated,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {SvgIcon} from '../../utility/SvgIcon';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';
import {radius, spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';
import type {TrackMetadata} from '../../../services/metadataService';
import {navigate} from '../../../navigation/navigationHelper';
import {useAppDispatch, useAppSelector} from '../../../store';
import {setPlaybackSpeed, setSleepTimer, setSleepTimerMode} from '../../../store/slices/playerSlice';
import {MpvPlayer} from '../../../native';
import {sleepTimerModeLabel} from '../../../utils/sleepTimer';
import {shareContent} from '../../../services/shareService';

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

const SLEEP_TIMER_OPTIONS = [5, 15, 30, 45, 60] as const;
const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

const formatRemaining = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SleepTimerSection: React.FC<{
  onSelect: (minutes: number) => void;
  onSelectMode: (mode: 'track' | 'chapter') => void;
  onCancel: () => void;
  activeEndTime: number | null;
  activeMode: 'time' | 'track' | 'chapter';
  colors: ColorTokens;
}> = ({onSelect, onSelectMode, onCancel, activeEndTime, activeMode, colors}) => {
  const [expanded, setExpanded] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [customMin, setCustomMin] = useState('');

  // Live countdown while the section is open
  useEffect(() => {
    if (!expanded || activeEndTime === null) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expanded, activeEndTime]);

  const remainingMs = activeEndTime !== null ? Math.max(0, activeEndTime - nowTick) : 0;
  const active = activeEndTime !== null && remainingMs > 0;
  const activeLabel = active
    ? `Sleep Timer (${formatRemaining(remainingMs)} left)`
    : sleepTimerModeLabel(activeMode);
  const customValid = (() => {
    const n = Number(customMin);
    return Number.isFinite(n) && n > 0 && n <= 480;
  })();

  return (
    <>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}>
        <SvgIcon name="sliders" size={20} color={colors.text.primary} />
        <AppText variant="body2" color="primary" style={styles.actionLabel}>
          {activeMode !== 'time' || active ? activeLabel : 'Sleep Timer'}
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
                {borderColor: colors.border.emphasis},
                active && Math.ceil(remainingMs / 60000) === min && {
                  backgroundColor: colors.accent.goldDim,
                  borderColor: colors.accent.gold,
                },
              ]}
              onPress={() => {
                onSelect(min);
                setCustomMin('');
                setExpanded(false);
              }}
              activeOpacity={0.7}>
              <AppText
                variant="caption"
                color="primary"
                style={
                  active && Math.ceil(remainingMs / 60000) === min
                    ? {color: colors.accent.gold}
                    : undefined
                }>
                {min} min
              </AppText>
            </TouchableOpacity>
          ))}

          {/* 50.1: custom minutes input (53.3 AppTextInput) */}
          <View style={styles.customRow}>
            <AppTextInput
              value={customMin}
              onChangeText={setCustomMin}
              placeholder="Custom"
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Custom sleep timer minutes"
              containerStyle={styles.customInputWrap}
              inputContainerStyle={[styles.customInput, {borderColor: colors.border.emphasis}]}
              inputStyle={styles.customInputText}
            />
            <TouchableOpacity
              style={[styles.timerChip, {borderColor: colors.border.emphasis}, !customValid && {opacity: 0.4}]}
              disabled={!customValid}
              onPress={() => {
                onSelect(Number(customMin));
                setCustomMin('');
                setExpanded(false);
              }}
              activeOpacity={0.7}>
              <AppText variant="caption" color="accent">
                Set
              </AppText>
            </TouchableOpacity>
          </View>

          {/* 50.2: end-of-track / end-of-chapter modes */}
          <View style={styles.modeRow}>
            {(['track', 'chapter'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.timerChip,
                  {borderColor: colors.border.emphasis},
                  activeMode === mode && {
                    backgroundColor: colors.accent.goldDim,
                    borderColor: colors.accent.gold,
                  },
                ]}
                onPress={() => {
                  onSelectMode(mode);
                  setExpanded(false);
                }}
                activeOpacity={0.7}>
                <AppText
                  variant="caption"
                  color={activeMode === mode ? 'accent' : 'primary'}
                  style={
                    activeMode === mode ? {color: colors.accent.gold} : undefined
                  }>
                  {sleepTimerModeLabel(mode)}
                </AppText>
              </TouchableOpacity>
            ))}
            {activeMode !== 'time' && (
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
  colors: ColorTokens;
}> = ({currentSpeed, onSelect, colors}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.actionRow}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}>
        <SvgIcon name="maximize" size={20} color={colors.text.primary} />
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
                {borderColor: colors.border.emphasis},
                currentSpeed === spd && {
                  backgroundColor: colors.accent.goldDim,
                  borderColor: colors.accent.gold,
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
                style={currentSpeed === spd ? {color: colors.accent.gold} : undefined}>
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
  colors: ColorTokens;
}> = ({metadata, colors}) => {
  const raw = metadata.raw || {};

  const qualityRows: {label: string; value: string}[] = [
    {label: 'Codec', value: raw.codec || raw.audio_codec || '—'},
    {label: 'Bitrate', value: raw['audio-bitrate'] || raw.bitrate || '—'},
    {label: 'Sample Rate', value: raw['sample-rate'] || raw.sample_rate || '—'},
    {label: 'Channels', value: raw.channels || raw.channel_count || '—'},
  ];

  const hasData = qualityRows.some(r => r.value !== '—');

  return (
    <View style={[styles.qualityCard, {backgroundColor: colors.background.highlightDim}]}>
      <AppText variant="caption" color="secondary" style={styles.qualityTitle}>
        Audio Quality
      </AppText>
      {hasData ? (
        /* 59.1: virtualized static info rows */
        <FlatList
          data={qualityRows}
          keyExtractor={row => row.label}
          renderItem={({item: row}) => (
            <View style={styles.qualityRow}>
              <AppText variant="caption" color="tertiary" style={styles.qualityLabel}>
                {row.label}
              </AppText>
              <AppText variant="caption" color="primary" style={styles.qualityValue}>
                {row.value}
              </AppText>
            </View>
          )}
        />
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
  const sleepTimerMode = useAppSelector(state => state.player.sleepTimerMode);

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
    // 56.4: real deep link (simbaplayer:// + https fallback)
    await shareContent({
      route: 'AudioPlayer',
      params: fileUri ? {fileUri, fileTitle: title} : undefined,
      title,
      subtitle: artist,
    });
  }, [fileUri, title, artist]);

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

  const handleSleepModeSelect = useCallback(
    (mode: 'track' | 'chapter') => {
      dispatch(setSleepTimerMode(mode));
    },
    [dispatch],
  );

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
      <View style={[styles.overlay, {backgroundColor: colors.background.floating}]}>
        <TouchableOpacity
          style={styles.overlayTouchArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, containerBg]}>
          {/* ── Header: Artwork + Title/Artist ── */}
          <View style={styles.header}>
            {albumArtUri ? (
              <FastImage
                source={{uri: albumArtUri, priority: FastImage.priority.normal}}
                style={styles.artwork}
              />
            ) : (
              <View
                style={[
                  styles.artwork,
                  styles.artworkPlaceholder,
                  {backgroundColor: colors.border.subtle},
                ]}>
                <AppText style={[styles.artworkIcon, {color: colors.text.tertiary}]}>
                  {'♫'}
                </AppText>
              </View>
            )}
            <View style={styles.headerText}>
              <AppText variant="body1" color="primary" numberOfLines={1}>
                {title}
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={1}>
                {artist}
              </AppText>
            </View>
          </View>

          <View style={[styles.divider, {backgroundColor: colors.background.highlight}]} />

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
                    {color: liked ? colors.accent.love : colors.text.primary},
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
              <SvgIcon name="listMusic" size={20} color={colors.text.primary} />
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
                color={bookmarkCount > 0 ? colors.accent.gold : colors.text.primary}
              />
              <AppText
                variant="body2"
                color="primary"
                style={[
                  styles.actionLabel,
                  bookmarkCount > 0 ? {color: colors.accent.gold} : undefined,
                ]}>
                {bookmarkCount > 0
                  ? `Bookmarks (${bookmarkCount})`
                  : 'Bookmark'}
              </AppText>
            </TouchableOpacity>

            {/* 4. Sleep Timer */}
            <SleepTimerSection
              onSelect={handleSleepSelect}
              onSelectMode={handleSleepModeSelect}
              onCancel={handleSleepCancel}
              activeEndTime={sleepTimerEndTime}
              activeMode={sleepTimerMode}
              colors={colors}
            />

            {/* 5. Playback Speed */}
            <SpeedSection currentSpeed={playbackSpeed} onSelect={handleSpeedSelect} colors={colors} />

            {/* 6. Audio Quality */}
            <AudioQualityCard metadata={metadata} colors={colors} />

            {/* 7. Share */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleShare}
              activeOpacity={0.7}>
              <SvgIcon name="share" size={20} color={colors.text.primary} />
              <AppText variant="body2" color="primary" style={styles.actionLabel}>
                Share
              </AppText>
            </TouchableOpacity>

            {/* 7. Song Info */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleSongInfo}
              activeOpacity={0.7}>
              <SvgIcon name="list" size={20} color={colors.text.primary} />
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
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkIcon: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
    gap: spacing.sm,
    paddingLeft: 38,
    paddingBottom: spacing.md,
  },
  timerChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  // 50.1: custom minutes row
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 38,
    paddingBottom: spacing.md,
    width: '100%',
  },
  customInputWrap: {
    flex: 1,
  },
  customInput: {
    minHeight: 38,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
  },
  customInputText: {
    fontSize: 13,
  },
  // 50.2: end-of-track / end-of-chapter modes row
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: 38,
    paddingBottom: spacing.md,
  },
  // ── Audio Quality ──
  qualityCard: {
    marginLeft: 38,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  qualityTitle: {
    marginBottom: spacing.sm,
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
