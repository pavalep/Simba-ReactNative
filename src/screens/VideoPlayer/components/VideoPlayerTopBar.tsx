import React, {useEffect, useMemo, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';


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
}) => {
  const {colors} = useTheme();
  const iconColor = '#EDEDED';
  const iconMuted = 'rgba(237,237,237,0.65)';
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true}),
      Animated.timing(translateY, {toValue: visible ? 0 : -14, duration: 220, useNativeDriver: true}),
    ]).start();
  }, [opacity, translateY, visible]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(8, 8, 10, 0.72)',
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

      }),
    [colors],
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
        </View>

        {/* Center: Title */}
        <View style={styles.centerSection}>
          <AppText
            variant="body2"
            color="primary"
            numberOfLines={1}
            style={styles.title}>
            {title}
          </AppText>
        </View>

        {/* Right: More + expand toggle */}
        <View style={styles.rightSection}>
          {onMorePress && (
            <TouchableOpacity style={styles.rotateBtn} onPress={onMorePress} accessibilityLabel="More options" accessibilityRole="button">
              <AppText style={styles.rotateBtnIcon}>{'⋮'}</AppText>
            </TouchableOpacity>
          )}
          {onBookmark && (
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
          )}
          <TouchableOpacity style={styles.rotateBtn} onPress={onToggleRotate} accessibilityLabel="Toggle rotation" accessibilityRole="button">
            <AppText style={styles.rotateBtnIcon}>
              {isLandscape ? '⤢' : '⛶'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};
