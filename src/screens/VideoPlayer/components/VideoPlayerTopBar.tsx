import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {radius, spacing} from '../../../theme/tokens';


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
  // 56.4: native share sheet with deep link
  onShare?: () => void;
  // 31.1 lock controls
  controlsLocked?: boolean;
  onToggleLock?: () => void;
  // P36.5: live playback (IPTV) — LIVE badge + channel up/down
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
  bookmarkActive = false,
  onShare,
  controlsLocked = false,
  onToggleLock,
  liveBadge = false,
  channelUp,
  channelDown,
}) => {
  const {colors} = useTheme();
  const iconColor = colors.text.primary;
  const iconMuted = colors.text.secondary;
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

  // Bookmark pulse animation when bookmark is saved
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
          backgroundColor: colors.background.scrimMid,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.subtle,
          zIndex: 20,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          paddingHorizontal: 12,
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        backBtn: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
        backBtnIcon: {
          fontSize: 16,
          color: iconColor,
        },
        centerSection: {
          flex: 1,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
        },
        title: {
          maxWidth: 200,
        },
        rightSection: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        rotateBtn: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rotateBtnIcon: {
          fontSize: 18,
          color: iconMuted,
        },
        lockBtnActive: {
          backgroundColor: colors.accent.goldWash,
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
        channelBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors, iconColor, iconMuted],
  );

  return (
    <Animated.View
      style={[styles.container, {paddingTop: topInset, opacity, transform: [{translateY}]}]}
      pointerEvents={visible ? 'auto' : 'none'}>
      <View style={styles.row}>
        {/* Left: unambiguous back affordance */}
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack} accessibilityLabel="Go back" accessibilityRole="button">
            <AppText style={styles.backBtnIcon}>{'←'}</AppText>
          </TouchableOpacity>
          {!controlsLocked && channelDown && (
            <TouchableOpacity
              style={styles.channelBtn}
              onPress={channelDown}
              accessibilityLabel="Previous channel"
              accessibilityRole="button">
              <SvgIcon name="chevronDown" size={20} color={iconMuted} />
            </TouchableOpacity>
          )}
          {!controlsLocked && channelUp && (
            <TouchableOpacity
              style={styles.channelBtn}
              onPress={channelUp}
              accessibilityLabel="Next channel"
              accessibilityRole="button">
              <SvgIcon name="chevronUp" size={20} color={iconMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Title + LIVE badge */}
        <View style={styles.centerSection}>
          {liveBadge ? (
            <View style={styles.liveBadge}>
              <AppText style={styles.liveBadgeText}>LIVE</AppText>
            </View>
          ) : null}
          <AppText
            variant="body2"
            color="primary"
            numberOfLines={1}
            style={styles.title}
            accessibilityLabel={`Now playing ${title}`}
            accessibilityLiveRegion="polite">
            {title}
          </AppText>
        </View>

        {/* Right: lock chip (31.1) + More + expand toggle */}
        <View style={styles.rightSection}>
          {onToggleLock && (
            <TouchableOpacity
              style={[styles.rotateBtn, controlsLocked && styles.lockBtnActive]}
              onPress={onToggleLock}
              accessibilityLabel={controlsLocked ? 'Unlock controls' : 'Lock controls'}
              accessibilityRole="button"
              accessibilityState={{selected: controlsLocked}}>
              <AppText style={styles.rotateBtnIcon}>
                {controlsLocked ? '\u{1F513}' : '\u{1F512}'}
              </AppText>
            </TouchableOpacity>
          )}
          {!controlsLocked && onMorePress && (
            <TouchableOpacity style={styles.rotateBtn} onPress={onMorePress} accessibilityLabel="More options" accessibilityRole="button">
              <AppText style={styles.rotateBtnIcon}>{'⋮'}</AppText>
            </TouchableOpacity>
          )}
          {!controlsLocked && onBookmark && (
            <Animated.View style={{transform: [{scale: bookmarkPulse}]}}>
              <TouchableOpacity
                style={styles.rotateBtn}
                onPress={onBookmark}
                accessibilityLabel={bookmarkActive ? 'Bookmark saved' : 'Save bookmark'}
                accessibilityRole="button">
                <SvgIcon
                  name="bookmark"
                  size={22}
                  color={bookmarkActive ? colors.accent.gold : iconMuted}
                />
              </TouchableOpacity>
            </Animated.View>
          )}
          {!controlsLocked && onShare && (
            <TouchableOpacity
              style={styles.rotateBtn}
              onPress={onShare}
              accessibilityLabel="Share video"
              accessibilityRole="button">
              <SvgIcon name="share" size={20} color={iconMuted} />
            </TouchableOpacity>
          )}
          {!controlsLocked && (
            <TouchableOpacity
              style={styles.rotateBtn}
              onPress={onToggleRotate}
              accessibilityLabel="Toggle rotation"
              accessibilityRole="button"
              accessibilityState={{selected: isLandscape}}>
              <AppText style={styles.rotateBtnIcon}>
                {isLandscape ? '⤢' : '⛶'}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};
