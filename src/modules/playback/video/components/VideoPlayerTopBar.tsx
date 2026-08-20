import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Path, Rect, Circle} from 'react-native-svg';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useTheme} from '../../../../theme';
import {SvgIcon} from '../../../../components/utility/SvgIcon';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import {radius, spacing, typography} from '../../../../theme/tokens';

// ─── Local Vector SVG Icons for Guaranteed Rendering ─────────

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

const RotateLandscapeIcon = ({color = '#FFFFFF'}) => (
  // V6 2.3.2: Lucide `expand` icon — "enter fullscreen" / "expand to
  // landscape". Universally recognized (YouTube, Netflix, VLC).
  // 4 diagonal arrows pointing outward to the corners.
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="m15 15l6 6M15 9l6-6m0 13v5h-5m5-13V3h-5M3 16v5h5m-5 0l6-6M3 8V3h5m1 6L3 3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RotatePortraitIcon = ({color = '#FFFFFF'}) => (
  // V6 2.3.2: Lucide `minimize` icon — "exit fullscreen" / "back to
  // portrait". 4 arrows pointing inward to center. Unmistakable paired
  // with the expand icon above.
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m8 0v-3a2 2 0 0 1 2 2h3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockIcon = ({locked, color = '#FFFFFF'}: {locked: boolean; color?: string}) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="10" width="14" height="11" rx="2" stroke={color} strokeWidth="2" />
    {locked ? (
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    ) : (
      <Path d="M8 10V7a4 4 0 0 1 7.5-1.7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    )}
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
  /** Long-press the bookmark icon to open the bookmark list sheet */
  onBookmarkLongPress?: () => void;
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
  isLandscape,
  onToggleRotate,
  onMorePress,
  visible = true,
  onBookmark,
  onBookmarkLongPress,
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
        // Gradient overlay sits behind the chip row; the chip row floats over it
        gradientWrap: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          // Shorter row in landscape: 44 vs 54, and tighter horizontal padding
          height: isLandscape ? 44 : 52,
          paddingHorizontal: isLandscape ? 12 : 14,
          justifyContent: 'space-between',
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        centerSection: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          // Don't justify-center here — the title needs flex:1 to ellipsize
          // instead of overflowing under the right-section icons in portrait.
          paddingHorizontal: 6,
          gap: 6,
        },
        // Glass chip: faint white fill + hairline border, no hard shadow
        glassChip: {
          width: isLandscape ? 36 : 40,
          height: isLandscape ? 36 : 40,
          borderRadius: isLandscape ? 18 : 20,
          backgroundColor: 'rgba(255,255,255,0.10)',
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        glassChipActive: {
          backgroundColor: colors.accent.goldWash,
          borderColor: colors.accent.gold,
        },
        rightSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        title: {
          flex: 1,
          // Critical for portrait: shrinks below intrinsic width so the
          // text ellipsizes ("…") instead of overflowing under the
          // right-section icons (bookmark / more / rotate).
          flexShrink: 1,
          minWidth: 0,
          fontSize: isLandscape ? 14 : 13,
          fontWeight: '700',
          color: '#FFFFFF',
          letterSpacing: 0.2,
          textAlign: 'left',
          textShadowColor: 'rgba(0,0,0,0.45)',
          textShadowOffset: {width: 0, height: 1},
          textShadowRadius: 4,
        },
        liveBadge: {
          backgroundColor: colors.accent.gold,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
        liveBadgeText: {
          // v8: explicit Inter Bold via family key. See
          // Toast.tsx actionLabel comment.
          fontFamily: FONT_FAMILY.inter.bold,
          color: colors.text.inverse,
          fontSize: 10,
          letterSpacing: 1.2,
        },
      }),
    [colors, isLandscape],
  );

  // Compute the gradient's total height = topInset + row height
  const gradientHeight = topInset + (isLandscape ? 44 : 52) + 16; // extra fade tail

  return (
    <Animated.View
      style={[styles.gradientWrap, {height: gradientHeight, opacity, transform: [{translateY}]}]}
      pointerEvents={visible ? 'auto' : 'none'}>
      {/* Top-down gradient: opaque at top, fading to transparent at bottom */}
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={{paddingTop: topInset}}>
        <View style={styles.row}>
          {/* Left section: back + channel nav */}
          <View style={styles.leftSection}>
            <TouchableOpacity
              style={styles.glassChip}
              onPress={onGoBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
              {/* V6: canonical chevron back arrow (matches the shared
                  BackButton used on every other internal page). */}
              <SvgIcon
                name="chevronRight"
                size={20}
                color="#FFFFFF"
                style={{transform: [{rotate: '180deg'}]}}
              />
            </TouchableOpacity>
            {!controlsLocked && channelDown && (
              <TouchableOpacity
                style={styles.glassChip}
                onPress={channelDown}
                accessibilityLabel="Previous channel"
                accessibilityRole="button"
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                <SvgIcon name="chevronDown" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {!controlsLocked && channelUp && (
              <TouchableOpacity
                style={styles.glassChip}
                onPress={channelUp}
                accessibilityLabel="Next channel"
                accessibilityRole="button"
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
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
              variant="displaySerif"
              numberOfLines={1}
              style={styles.title}
              accessibilityLabel={`Now playing ${title}`}
              accessibilityLiveRegion="polite">
              {title}
            </AppText>
          </View>

          {/* Right section: action icons.
              Ordered by frequency of use for non-tech-savvy users:
              bookmark (most common) → channel nav (live TV) → overflow.
              Share + screenshot moved into the overflow menu (`:`) to
              keep the visible action surface small. */}
          <View style={styles.rightSection}>
            {onToggleLock && (
              <TouchableOpacity
                style={[styles.glassChip, controlsLocked && styles.glassChipActive]}
                onPress={onToggleLock}
                accessibilityLabel={controlsLocked ? 'Unlock video controls' : 'Lock video controls'}
                accessibilityRole="button"
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                <LockIcon locked={controlsLocked} color={controlsLocked ? colors.accent.gold : '#FFFFFF'} />
              </TouchableOpacity>
            )}
            {!controlsLocked && onBookmark && (
              <Animated.View style={{transform: [{scale: bookmarkPulse}]}}>
                <TouchableOpacity
                  style={[styles.glassChip, bookmarkActive && styles.glassChipActive]}
                  onPress={onBookmark}
                  accessibilityLabel={
                    bookmarkActive ? 'Remove bookmark' : 'Save bookmark'
                  }
                  accessibilityRole="button"
                  hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                  <SvgIcon
                    name={bookmarkActive ? 'bookmarkFilled' : 'bookmark'}
                    size={18}
                    color={bookmarkActive ? colors.accent.gold : '#FFFFFF'}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
            {!controlsLocked && (onShare || onMorePress) && (
              <TouchableOpacity
                style={styles.glassChip}
                onPress={onMorePress}
                accessibilityLabel="More options"
                accessibilityRole="button"
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                <MoreIcon color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.glassChip}
              onPress={onToggleRotate}
              accessibilityLabel={isLandscape ? 'Switch to portrait' : 'Switch to landscape'}
              accessibilityRole="button"
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
              {isLandscape ? (
                <RotatePortraitIcon color="#FFFFFF" />
              ) : (
                <RotateLandscapeIcon color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// V6 8.1.3: export a memoized wrapper. The top bar re-renders on every
// position tick (because the hook recomputes `secondaryVisible` based on
// position); without memo the gradient and all glass chips re-paint
// every 250ms during playback.
export const MemoizedVideoPlayerTopBar = React.memo(VideoPlayerTopBar);
export default MemoizedVideoPlayerTopBar;
