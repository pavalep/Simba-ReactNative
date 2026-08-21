import React, {useEffect, useRef, useCallback, useMemo, useState} from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {useTheme} from '../../../../theme';
import {SvgIcon} from '../../../../components/utility/SvgIcon/SvgIcon';
import {AppText} from '../../../../components/core/AppText/AppText';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import {radius, spacing} from '../../../../theme/tokens';

// ─── Toolbar Btn Sub-component (icon-only chip, label appears on long-press) ───

interface ToolbarBtnProps {
  icon: React.ComponentProps<typeof SvgIcon>['name'];
  active?: boolean;
  activeVariant?: 'soft' | 'strong'; // soft = goldDim, strong = gold wash
  onPress?: () => void;
  label: string;
  isToggle?: boolean;
  disabled?: boolean;
  /**
   * V6 7.3.1: when true, the label is always rendered below the icon
   * (Netflix style). When false, the label only appears as a tooltip
   * after a 500ms long-press.
   */
  showLabelInline?: boolean;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({
  icon,
  active = false,
  activeVariant = 'soft',
  onPress,
  label,
  isToggle,
  disabled = false,
  showLabelInline = false,
}) => {
  const {colors} = useTheme();
  const [showLabel, setShowLabel] = useState(false);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = useCallback(() => {
    // V6 9.2.1: tooltip delay reduced from 500ms → 200ms. The previous
    // 500ms felt sluggish — by the time the tooltip appeared the user
    // had already released the button. 200ms is the sweet spot for
    // "press and hold briefly to see the label" without firing on a
    // normal tap.
    labelTimer.current = setTimeout(() => setShowLabel(true), 200);
  }, []);

  const handlePressOut = useCallback(() => {
    if (labelTimer.current) {
      clearTimeout(labelTimer.current);
      labelTimer.current = null;
    }
    setShowLabel(false);
  }, []);

  // V6 7.3.3: clear tooltip timer on unmount
  React.useEffect(() => {
    return () => {
      if (labelTimer.current) {
        clearTimeout(labelTimer.current);
        labelTimer.current = null;
      }
    };
  }, []);

  const btnStyles = useMemo(
    () => ({
      // Production touch target: 44x44 minimum, no labels by default
      container: {
        width: 44,
        height: 44,
        borderRadius: 22,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: active
          ? activeVariant === 'strong'
            ? colors.accent.gold
            : colors.accent.goldDim
          : colors.background.highlight,
        borderWidth: active ? 0.5 : 0.5,
        borderColor: active
          ? activeVariant === 'strong'
            ? colors.accent.gold
            : colors.accent.goldGlow
          : colors.border.emphasis,
        opacity: disabled ? 0.4 : 1,
      },
      // V6 7.3.2: outer wrapper that stacks icon over inline label.
      // Keeps the chip's 36x36 hit area but reserves room for the
      // always-visible label below the icon (Netflix pattern).
      inlineWrapper: {
        alignItems: 'center' as const,
        width: 64,
        paddingVertical: 2,
      },
      labelTooltip: {
        position: 'absolute' as const,
        bottom: -26,
        backgroundColor: colors.background.scrimOpaque,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: colors.border.emphasis,
        zIndex: 100,
      },
      labelText: {
        fontSize: 10,
        color: colors.text.bright,
        fontWeight: '600' as const,
        letterSpacing: 0.2,
      },
      inlineLabel: {
        fontSize: 9,
        fontWeight: '500' as const,
        letterSpacing: 0.2,
        marginTop: 2,
        color: active
          ? activeVariant === 'strong'
            ? colors.text.inverse
            : colors.accent.gold
          : colors.text.onMediaSoft,
        maxWidth: 64,
        textAlign: 'center' as const,
      },
    }),
    [active, activeVariant, colors, disabled],
  );

  const iconColor = active
    ? activeVariant === 'strong'
      ? colors.text.inverse
      : colors.accent.gold
    : colors.text.bright;

  const chip = (
    <View style={btnStyles.container}>
      <SvgIcon name={icon} size={18} color={iconColor} />
      {showLabel && !showLabelInline && (
        <View style={btnStyles.labelTooltip}>
          <AppText style={btnStyles.labelText}>{label}</AppText>
        </View>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={showLabelInline ? btnStyles.inlineWrapper : btnStyles.container}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={isToggle ? {checked: !!active, disabled} : {disabled}}
      accessibilityHint={isToggle ? `Toggle ${label.toLowerCase()}` : undefined}
      activeOpacity={0.7}
      disabled={disabled}>
      {showLabelInline ? (
        <>
          {chip}
          <AppText
            numberOfLines={1}
            ellipsizeMode="tail"
            style={btnStyles.inlineLabel}>
            {label}
          </AppText>
        </>
      ) : (
        chip
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
  /** PiP (Picture-in-Picture) — optional; hidden if not provided */
  onTogglePip?: () => void;
  onAutoHide: () => void;
  bottomInset: number;
  volume?: number;
  muted?: boolean;
  onVolumeValueChange?: (value: number) => void;
  onToggleMute?: () => void;
  keepVisible?: boolean;
  /**
   * V6 7.3.1: when true, every toolbar button shows its label inline
   * below the icon (Netflix style). Caller should pass false in
   * landscape to save horizontal space.
   */
  showInlineLabels?: boolean;
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
  onTogglePip,
  onAutoHide: _onAutoHide,
  bottomInset: _bottomInset,
  volume: volumeProp = 65,
  muted: mutedProp = false,
  onVolumeValueChange,
  onToggleMute,
  keepVisible: _keepVisible,
  showInlineLabels = false,
}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // No card background — icon chips float directly on the bottom gradient.
        // This makes the secondary toolbar feel like an extension of the
        // transport row, not a separate band.
        container: {
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: 12,
        },
        scrollContent: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          paddingVertical: 6,
          gap: 6,
        },
        subtitleGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        visToggle: {
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 0.5,
        },
        visToggleText: {
          // v8: explicit Inter Bold via family key. See
          // Toast.tsx actionLabel comment.
          fontFamily: FONT_FAMILY.inter.bold,
          fontSize: 9,
          letterSpacing: 0.5,
        },
        volumeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 44,
          paddingHorizontal: 12,
          borderRadius: 22,
          backgroundColor: colors.background.highlight,
          borderWidth: 0.5,
          borderColor: colors.border.emphasis,
          minWidth: 132,
        },
        volumeSlider: {
          flex: 1,
          height: 24,
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
        ? colors.accent.goldDim
        : colors.background.highlight,
      borderColor: subtitleVisible
        ? colors.accent.gold
        : colors.border.emphasis,
    }),
    [subtitleVisible, colors],
  );

  const getVisToggleTextStyle = useCallback(
    () => ({
      color: subtitleVisible ? colors.accent.gold : colors.text.bright,
    }),
    [subtitleVisible, colors],
  );

  // Loop state: none / file / playlist → 'Off' / 'One' / 'All'
  const loopLabel = loopMode === 'file' ? 'One' : loopMode === 'playlist' ? 'All' : 'Off';
  const loopActive = loopMode !== 'none';
  const loopActiveVariant: 'soft' | 'strong' = loopMode === 'file' ? 'soft' : 'strong';

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <ToolbarBtn
          icon="list"
          onPress={onToggleChapters}
          label="Chapters"
          showLabelInline={showInlineLabels}
        />
        <ToolbarBtn
          icon="headphones"
          active={activeAudioTrack !== null}
          onPress={onToggleAudio}
          label={audioLabel ? `Audio (${audioLabel})` : 'Audio'}
          isToggle
          showLabelInline={showInlineLabels}
        />
        <View style={styles.subtitleGroup}>
          <ToolbarBtn
            icon="subtitles"
            active={activeSubtitle !== null}
            onPress={onToggleSubtitles}
            label={subtitleLabel ? `Sub (${subtitleLabel})` : 'Subtitles'}
            isToggle
            showLabelInline={showInlineLabels}
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
          icon="speed"
          onPress={onSpeed}
          label="Speed"
          showLabelInline={showInlineLabels}
        />
        {onVolumeValueChange ? (
          <View style={styles.volumeRow}>
            <TouchableOpacity
              onPress={onToggleMute}
              accessibilityRole="button"
              accessibilityLabel={mutedProp ? 'Unmute' : 'Mute'}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <SvgIcon
                name={mutedProp ? 'volumeMute' : 'volume'}
                size={18}
                color={mutedProp ? colors.text.secondary : colors.accent.gold}
              />
            </TouchableOpacity>
            <Slider
              style={styles.volumeSlider}
              value={mutedProp ? 0 : volumeProp}
              minimumValue={0}
              maximumValue={100}
              step={1}
              minimumTrackTintColor={colors.accent.gold}
              maximumTrackTintColor={colors.background.highlightStrong}
              thumbTintColor={colors.accent.gold}
              onValueChange={onVolumeValueChange}
              accessibilityLabel="Volume"
            />
          </View>
        ) : (
          <ToolbarBtn
            icon="volume"
            onPress={onVolume}
            label="Volume"
            showLabelInline={showInlineLabels}
          />
        )}
        {/* V6 7.1.1: audio-centric controls (EQ, Shuffle, Loop, Sleep Timer,
            Playlist, Queue, Screenshot, Info) are hidden from the
            secondary toolbar. They remain reachable via the more menu in
            the top bar (VideoPlayerTopBar.onMorePress). The toolbar now
            shows at most 5 essential controls: Chapters, Audio,
            Subtitles, Speed, Volume. */}
        {onTogglePip && (
          <ToolbarBtn
            icon="pictureInPicture"
            onPress={onTogglePip}
            label="PiP"
            showLabelInline={showInlineLabels}
          />
        )}
        <ToolbarBtn
          icon="settings"
          onPress={onInfo}
          label="More"
          showLabelInline={showInlineLabels}
        />
      </ScrollView>
    </Animated.View>
  );
};

// V6 8.1.1: wrap in React.memo so the toolbar does not re-render on every
// TransportContext tick (position changes ~4Hz). Only the active props
// (volume, muted, activeSubtitle, activeAudioTrack, eqEnabled) should
// trigger a re-render.
export default React.memo(SecondaryToolbar);
