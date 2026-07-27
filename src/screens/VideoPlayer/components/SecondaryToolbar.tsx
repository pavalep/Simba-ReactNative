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
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({icon, active, onPress, label}) => {
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
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: active ? 'rgba(201,168,76,0.15)' : 'transparent',
      },
      labelTooltip: {
        position: 'absolute' as const,
        bottom: -22,
        backgroundColor: colors.background.elevated,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: colors.border.subtle,
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
      activeOpacity={0.6}>
      <SvgIcon
        name={icon}
        size={20}
        color={active ? colors.accent.gold : colors.text.secondary}
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
  activeAudioTrack: number | null;
  onToggleChapters: () => void;
  onToggleAudio: () => void;
  onToggleSubtitles: () => void;
  onToggleEq: () => void;
  onTogglePlaylist: () => void;
  onToggleQueue: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onInfo?: () => void;
  onVolume: () => void;
  onScreenshot: () => void;
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
  activeAudioTrack,
  onToggleChapters,
  onToggleAudio,
  onToggleSubtitles,
  onToggleEq,
  onTogglePlaylist,
  onToggleQueue,
  onToggleShuffle,
  onToggleLoop,
  onInfo,
  onVolume,
  onScreenshot,
  onAutoHide,
  bottomInset,
}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideDuration = 5000;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 14,
        },
        glassBg: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.background.floating,
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
      }),
    [colors],
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

  if (!visible) return null;

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
      {/* Glass background */}
      <View style={styles.glassBg} pointerEvents="none" />

      {/* Toolbar buttons */}
      <View
        style={styles.toolbarContent}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleInteraction}>
        {/* Row 1: Feature controls */}
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
            label="Audio tracks"
          />
          <ToolbarBtn
            icon="subtitles"
            active={activeSubtitle !== null}
            onPress={onToggleSubtitles}
            label="Subtitles"
          />
          <ToolbarBtn
            icon="sliders"
            active={eqEnabled}
            onPress={onToggleEq}
            label="Equalizer"
          />
          <ToolbarBtn
            icon="listMusic"
            active={playlistLength > 0}
            onPress={onTogglePlaylist}
            label="Playlist"
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

        {/* Row 2: Utility controls */}
        <View style={styles.btnRow}>
          <ToolbarBtn
            icon="shuffle"
            active={shuffleActive}
            onPress={onToggleShuffle}
            label="Shuffle"
          />
          <ToolbarBtn
            icon="repeat"
            active={loopMode !== 'none'}
            onPress={onToggleLoop}
            label="Loop"
          />
          <ToolbarBtn icon="volume" onPress={onVolume} label="Volume" />
          <ToolbarBtn icon="camera" onPress={onScreenshot} label="Screenshot" />
        </View>
      </View>
    </Animated.View>
  );
};

export default SecondaryToolbar;
