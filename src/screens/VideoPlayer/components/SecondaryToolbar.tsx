import React, {useEffect, useRef, useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon/SvgIcon';

// ─── Toolbar Btn Sub-component ──────────────────────────────

interface ToolbarBtnProps {
  icon: React.ComponentProps<typeof SvgIcon>['name'];
  active?: boolean;
  onPress?: () => void;
  label: string;
  /** 31.7: announce toggle state to screen readers (checked/unchecked) */
  isToggle?: boolean;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({icon, active, onPress, label, isToggle}) => {
  const {colors} = useTheme();
  const [showLabel, setShowLabel] = useState(false);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconMuted = 'rgba(237,237,237,0.65)';

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
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: active ? 'rgba(201,168,76,0.15)' : 'transparent',
      },
      labelTooltip: {
        position: 'absolute' as const,
        bottom: -22,
        backgroundColor: 'rgba(8, 8, 10, 0.90)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.10)',
        zIndex: 100,
      },
      labelText: {
        fontSize: 9,
        color: colors.accent.gold,
        fontWeight: '500' as const,
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
      activeOpacity={0.6}>
      <SvgIcon
        name={icon}
        size={20}
        color={active ? colors.accent.gold : iconMuted}
      />
      {showLabel && (
        <View style={btnStyles.labelTooltip}>
          <Text style={btnStyles.labelText}>{label}</Text>
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
}

// ─── Component ──────────────────────────────────────────────

export const SecondaryToolbar: React.FC<SecondaryToolbarProps> = ({
  visible,
  enabled,
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
  onAutoHide,
  bottomInset,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideDuration = 5000;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          // Sit above the primary transport controls instead of competing for
          // the same bottom hit area.
          bottom: bottomInset + 92,
          left: 0,
          right: 0,
          zIndex: 14,
          alignItems: 'center',
        },
        card: {
          marginHorizontal: 12,
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: 'rgba(8, 8, 10, 0.58)',
        },
        glassBg: {
          ...StyleSheet.absoluteFill,
          backgroundColor: 'rgba(8, 8, 10, 0.58)',
        },
        toolbarContent: {
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: 10,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
        },
        btnRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        },
        subtitleGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        visToggle: {
          width: 32,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        visToggleText: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
      }),
    [bottomInset],
  );

  // ── Animate visibility ──
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

  // ── Auto-hide timer ──
  const resetAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }
    if (visible && enabled) {
      autoHideTimer.current = setTimeout(() => {
        onAutoHide();
      }, autoHideDuration);
    }
  }, [visible, enabled, autoHideDuration, onAutoHide]);

  useEffect(() => {
    resetAutoHide();
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [visible, resetAutoHide]);

  const handleInteraction = useCallback(() => {
    resetAutoHide();
  }, [resetAutoHide]);

  const getVisToggleStyle = useCallback(
    () => ({
      backgroundColor: subtitleVisible
        ? 'rgba(201,168,76,0.25)'
        : 'rgba(255,255,255,0.08)',
    }),
    [subtitleVisible],
  );

  const getVisToggleTextStyle = useCallback(
    () => ({
      color: subtitleVisible ? '#C9A84C' : 'rgba(237,237,237,0.65)',
    }),
    [subtitleVisible],
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
      pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.card}>
        <View style={styles.glassBg} pointerEvents="none" />
        <View
          style={styles.toolbarContent}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleInteraction}>
          <View style={styles.btnRow}>
            <ToolbarBtn
              icon="list"
              label="Chapters"
              onPress={onToggleChapters}
            />
            <ToolbarBtn
              icon="headphones"
              active={activeAudioTrack !== null}
              onPress={onToggleAudio}
              label={audioLabel ? `Audio (${audioLabel})` : 'Audio tracks'}
              isToggle
            />
            <View style={styles.subtitleGroup}>
              <ToolbarBtn
                icon="subtitles"
                active={activeSubtitle !== null}
                onPress={onToggleSubtitles}
                label={subtitleLabel ? `Subtitles (${subtitleLabel})` : 'Subtitles'}
                isToggle
              />
              {activeSubtitle !== null && onToggleSubtitleVisibility && (
                <TouchableOpacity
                  style={[
                    styles.visToggle,
                    getVisToggleStyle(),
                  ]}
                  onPress={onToggleSubtitleVisibility}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle subtitle visibility"
                  accessibilityState={{checked: subtitleVisible}}>
                  <Text
                    style={[
                      styles.visToggleText,
                      getVisToggleTextStyle(),
                    ]}>
                    {subtitleVisible ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ToolbarBtn
              icon="sliders"
              active={eqEnabled}
              onPress={onToggleEq}
              label="Equalizer"
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
              icon="music"
              onPress={onInfo}
              label="Details"
            />
          </View>

          <View style={styles.btnRow}>
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
            <ToolbarBtn icon="volume" onPress={onVolume} label="Volume" />
            <ToolbarBtn icon="speed" onPress={onSpeed} label="Playback speed" />
            <ToolbarBtn icon="camera" onPress={onScreenshot} label="Screenshot" />
            {onSleepTimer && <ToolbarBtn icon="sliders" onPress={onSleepTimer} label="Sleep timer" />}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export default SecondaryToolbar;
