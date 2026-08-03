import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import Svg, {Path, Rect, Circle} from 'react-native-svg';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {radius, spacing} from '../../../theme/tokens';

// ─── Local Vector SVG Icons for Guaranteed Rendering ─────────

const BackIcon = ({color = '#FFFFFF'}) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LockIcon = ({color = '#FFFFFF'}) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" />
  </Svg>
);

const UnlockIcon = ({color = '#FFFFFF'}) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M7 11V7a5 5 0 019.9-1" stroke={color} strokeWidth="2" />
  </Svg>
);

const MoreIcon = ({color = '#FFFFFF'}) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

const RotateIcon = ({color = '#FFFFFF'}) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerTopBarProps {
  title: string;
  onGoBack: () => void;
  topInset: number;
  isLandscape: boolean;
  onToggleRotate: () => void;
  onMorePress?: () => void;
  visible?: boolean;
  onBookmark?: () => void;
  bookmarkActive?: boolean;
  onShare?: () => void;
  controlsLocked?: boolean;
  onToggleLock?: () => void;
  liveBadge?: boolean;
  channelUp?: () => void;
  channelDown?: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerTopBar: React.FC<VideoPlayerTopBarProps> = ({
  title,
  onGoBack,
  topInset,
  isLandscape: _isLandscape,
  onToggleRotate,
  onMorePress,
  visible = true,
  onBookmark,
  bookmarkActive = false,
  onShare,
  controlsLocked = false,
  onToggleLock,
  liveBadge = false,
  channelUp,
  channelDown,
}) => {
  const {colors} = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const bookmarkPulse = useRef(new Animated.Value(1)).current;
  const prevBookmarkActive = useRef(bookmarkActive);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true}),
      Animated.timing(translateY, {toValue: visible ? 0 : -14, duration: 220, useNativeDriver: true}),
    ]).start();
  }, [opacity, translateY, visible]);

  useEffect(() => {
    if (bookmarkActive && !prevBookmarkActive.current) {
      Animated.sequence([
        Animated.spring(bookmarkPulse, {
          toValue: 1.4,
          useNativeDriver: true,
          friction: 4,
          tension: 160,
        }),
        Animated.spring(bookmarkPulse, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
          tension: 100,
        }),
      ]).start();
    }
    prevBookmarkActive.current = bookmarkActive;
  }, [bookmarkActive, bookmarkPulse]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          borderBottomWidth: 0.5,
          borderBottomColor: 'rgba(255,255,255,0.1)',
          zIndex: 20,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 54,
          paddingHorizontal: 16,
          justifyContent: 'space-between',
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        glassBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerSection: {
          flex: 1,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 8,
        },
        title: {
          fontSize: 15,
          fontWeight: '600',
          color: '#FFFFFF',
          letterSpacing: 0.2,
          textAlign: 'center',
        },
        rightSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        lockBtnActive: {
          backgroundColor: colors.accent.goldWash,
          borderColor: colors.accent.gold,
          borderWidth: 1,
        },
        liveBadge: {
          backgroundColor: colors.accent.goldDim,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
        liveBadgeText: {
          color: colors.accent.gold,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1,
        },
      }),
    [colors],
  );

  return (
    <Animated.View
      style={[styles.container, {paddingTop: topInset, opacity, transform: [{translateY}]}]}
      pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.row}>
        {/* Left section: back button + channel nav */}
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.glassBtn} onPress={onGoBack} accessibilityLabel="Go back" accessibilityRole="button">
            <BackIcon color="#FFFFFF" />
          </TouchableOpacity>
          {!controlsLocked && channelDown && (
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={channelDown}
              accessibilityLabel="Previous channel"
              accessibilityRole="button">
              <SvgIcon name="chevronDown" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {!controlsLocked && channelUp && (
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={channelUp}
              accessibilityLabel="Next channel"
              accessibilityRole="button">
              <SvgIcon name="chevronUp" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Center section: title */}
        <View style={styles.centerSection}>
          {liveBadge ? (
            <View style={styles.liveBadge}>
              <AppText style={styles.liveBadgeText}>LIVE</AppText>
            </View>
          ) : null}
          <AppText
            numberOfLines={1}
            style={styles.title}
            accessibilityLabel={`Now playing ${title}`}
            accessibilityLiveRegion="polite">
            {title}
          </AppText>
        </View>

        {/* Right section: action icons */}
        <View style={styles.rightSection}>
          {onToggleLock && (
            <TouchableOpacity
              style={[styles.glassBtn, controlsLocked && styles.lockBtnActive]}
              onPress={onToggleLock}
              accessibilityLabel={controlsLocked ? 'Unlock controls' : 'Lock controls'}
              accessibilityRole="button"
              accessibilityState={{selected: controlsLocked}}>
              {controlsLocked ? <LockIcon color={colors.accent.gold} /> : <UnlockIcon color="#FFFFFF" />}
            </TouchableOpacity>
          )}
          {!controlsLocked && onMorePress && (
            <TouchableOpacity style={styles.glassBtn} onPress={onMorePress} accessibilityLabel="More options" accessibilityRole="button">
              <MoreIcon color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {!controlsLocked && onBookmark && (
            <Animated.View style={{transform: [{scale: bookmarkPulse}]}}>
              <TouchableOpacity
                style={styles.glassBtn}
                onPress={onBookmark}
                accessibilityLabel={bookmarkActive ? 'Bookmark saved' : 'Save bookmark'}
                accessibilityRole="button">
                <SvgIcon
                  name="bookmark"
                  size={18}
                  color={bookmarkActive ? colors.accent.gold : '#FFFFFF'}
                />
              </TouchableOpacity>
            </Animated.View>
          )}
          {!controlsLocked && onShare && (
            <TouchableOpacity
              style={styles.glassBtn}
              onPress={onShare}
              accessibilityLabel="Share video"
              accessibilityRole="button">
              <SvgIcon name="share" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={onToggleRotate}
            accessibilityLabel="Toggle orientation"
            accessibilityRole="button"
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <RotateIcon color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};
