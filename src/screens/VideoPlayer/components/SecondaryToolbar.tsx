import React, {useEffect, useRef, useCallback, useMemo, useState} from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';

// ─── Toolbar Btn Sub-component ──────────────────────────────

interface ToolbarBtnProps {
  icon: React.ComponentProps<typeof SvgIcon>['name'];
  active?: boolean;
  onPress?: () => void;
  label: string;
  isToggle?: boolean;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({icon, active, onPress, label, isToggle}) => {
  const {colors} = useTheme();
  const [showLabel, setShowLabel] = useState(false);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = useCallback(() => {
    labelTimer.current = setTimeout(() => setShowLabel(true), 600);
  }, []);

  const handlePressOut = useCallback(() => {
    if (labelTimer.current) {
      clearTimeout(labelTimer.current);
      labelTimer.current = null;
    }
    setShowLabel(false);
  }, []);

  const btnStyles = useMemo(
    () => ({
      container: {
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: active ? colors.accent.goldDim : 'rgba(255,255,255,0.08)',
        borderWidth: active ? 1 : 0.5,
        borderColor: active ? colors.accent.gold : 'rgba(255,255,255,0.08)',
        gap: 6,
      },
      labelTooltip: {
        position: 'absolute' as const,
        bottom: -22,
        backgroundColor: 'rgba(0,0,0,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        zIndex: 100,
      },
      labelText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '500' as const,
      },
      btnText: {
        fontSize: 12,
        fontWeight: '600' as const,
        color: active ? colors.accent.gold : '#FFFFFF',
      },
    }),
    [active, colors],
  );

  return (
    <TouchableOpacity
      style={btnStyles.container}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={isToggle ? {checked: !!active} : undefined}
      accessibilityHint={isToggle ? `Toggle ${label.toLowerCase()}` : undefined}
      activeOpacity={0.7}>
      <SvgIcon
        name={icon}
        size={18}
        color={active ? colors.accent.gold : '#FFFFFF'}
      />
      <AppText style={btnStyles.btnText}>{label}</AppText>
      {showLabel && (
        <View style={btnStyles.labelTooltip}>
          <AppText style={btnStyles.labelText}>{label}</AppText>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Props ──────────────────────────────────────────────────

export interface SecondaryToolbarProps {
  visible: boolean;
  enabled: boolean;
  eqEnabled: boolean;
  shuffleActive: boolean;
  loopMode: string;
  playlistLength: number;
  activeSubtitle: number | null;
  subtitleVisible: boolean;
  activeAudioTrack: number | null;
  subtitleLabel?: string;
  audioLabel?: string;
  onToggleChapters: () => void;
  onToggleAudio: () => void;
  onToggleSubtitles: () => void;
  onToggleSubtitleVisibility?: () => void;
  onToggleEq: () => void;
  onTogglePlaylist: () => void;
  onToggleQueue: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onInfo?: () => void;
  onVolume: () => void;
  onSpeed: () => void;
  onScreenshot: () => void;
  onSleepTimer?: () => void;
  onAutoHide: () => void;
  bottomInset: number;
  volume?: number;
  muted?: boolean;
  onVolumeValueChange?: (value: number) => void;
  onToggleMute?: () => void;
  keepVisible?: boolean;
}

// ─── Component ──────────────────────────────────────────────

export const SecondaryToolbar: React.FC<SecondaryToolbarProps> = ({
  visible: _visible,
  enabled: _enabled,
  eqEnabled,
  shuffleActive,
  loopMode,
  playlistLength,
  activeSubtitle,
  subtitleVisible,
  activeAudioTrack,
  subtitleLabel,
  audioLabel,
  onToggleChapters,
  onToggleAudio,
  onToggleSubtitles,
  onToggleSubtitleVisibility,
  onToggleEq,
  onTogglePlaylist,
  onToggleQueue,
  onToggleShuffle,
  onToggleLoop,
  onInfo,
  onVolume,
  onSpeed,
  onScreenshot,
  onSleepTimer,
  onAutoHide: _onAutoHide,
  bottomInset: _bottomInset,
  volume: volumeProp = 65,
  muted: mutedProp = false,
  onVolumeValueChange,
  onToggleMute,
  keepVisible: _keepVisible,
}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: 12,
        },
        card: {
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.12)',
          backgroundColor: 'rgba(18,18,18,0.88)',
          maxWidth: '100%',
        },
        scrollContent: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 8,
          gap: 8,
        },
        subtitleGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        visToggle: {
          height: 40,
          paddingHorizontal: 10,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 0.5,
        },
        visToggleText: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.5,
        },
        volumeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 40,
          paddingHorizontal: 10,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.08)',
          width: 130,
        },
        volumeIcon: {
          fontSize: 14,
        },
        volumeSlider: {
          flex: 1,
          height: 20,
        },
      }),
    [colors],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getVisToggleStyle = useCallback(
    () => ({
      backgroundColor: subtitleVisible
        ? colors.accent.goldGlow
        : 'rgba(255,255,255,0.08)',
      borderColor: subtitleVisible
        ? colors.accent.gold
        : 'rgba(255,255,255,0.12)',
    }),
    [subtitleVisible, colors],
  );

  const getVisToggleTextStyle = useCallback(
    () => ({
      color: subtitleVisible ? colors.accent.gold : '#FFFFFF',
    }),
    [subtitleVisible, colors],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}
      pointerEvents="auto">
      <View style={styles.card}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <ToolbarBtn
            icon="list"
            label="Chapters"
            onPress={onToggleChapters}
          />
          <ToolbarBtn
            icon="headphones"
            active={activeAudioTrack !== null}
            onPress={onToggleAudio}
            label={audioLabel ? `Audio (${audioLabel})` : 'Audio'}
            isToggle
          />
          <View style={styles.subtitleGroup}>
            <ToolbarBtn
              icon="subtitles"
              active={activeSubtitle !== null}
              onPress={onToggleSubtitles}
              label={subtitleLabel ? `Sub (${subtitleLabel})` : 'Subtitles'}
              isToggle
            />
            {activeSubtitle !== null && onToggleSubtitleVisibility && (
              <TouchableOpacity
                style={[styles.visToggle, getVisToggleStyle()]}
                onPress={onToggleSubtitleVisibility}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Toggle subtitle visibility"
                accessibilityState={{checked: subtitleVisible}}>
                <AppText style={[styles.visToggleText, getVisToggleTextStyle()]}>
                  {subtitleVisible ? 'ON' : 'OFF'}
                </AppText>
              </TouchableOpacity>
            )}
          </View>
          <ToolbarBtn
            icon="sliders"
            active={eqEnabled}
            onPress={onToggleEq}
            label="EQ"
            isToggle
          />
          <ToolbarBtn
            icon="listMusic"
            active={playlistLength > 0}
            onPress={onTogglePlaylist}
            label="Playlist"
            isToggle
          />
          <ToolbarBtn
            icon="layoutList"
            onPress={onToggleQueue}
            label="Queue"
          />
          <ToolbarBtn
            icon="speed"
            onPress={onSpeed}
            label="Speed"
          />
          <ToolbarBtn
            icon="shuffle"
            active={shuffleActive}
            onPress={onToggleShuffle}
            label="Shuffle"
            isToggle
          />
          <ToolbarBtn
            icon="repeat"
            active={loopMode !== 'none'}
            onPress={onToggleLoop}
            label="Loop"
            isToggle
          />
          {onVolumeValueChange ? (
            <View style={styles.volumeRow}>
              <TouchableOpacity
                onPress={onToggleMute}
                accessibilityRole="button"
                accessibilityLabel={mutedProp ? 'Unmute' : 'Mute'}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <AppText style={[styles.volumeIcon, {color: mutedProp ? colors.text.secondary : colors.accent.gold}]}>
                  {mutedProp ? '🔇' : '🔊'}
                </AppText>
              </TouchableOpacity>
              <Slider
                style={styles.volumeSlider}
                value={mutedProp ? 0 : volumeProp}
                minimumValue={0}
                maximumValue={100}
                step={1}
                minimumTrackTintColor={colors.accent.gold}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={colors.accent.gold}
                onValueChange={onVolumeValueChange}
                accessibilityLabel="Volume"
              />
            </View>
          ) : (
            <ToolbarBtn icon="volume" onPress={onVolume} label="Volume" />
          )}
          <ToolbarBtn icon="music" onPress={onInfo} label="Details" />
          <ToolbarBtn icon="camera" onPress={onScreenshot} label="Shot" />
          {onSleepTimer && <ToolbarBtn icon="sliders" onPress={onSleepTimer} label="Sleep" />}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

export default SecondaryToolbar;
