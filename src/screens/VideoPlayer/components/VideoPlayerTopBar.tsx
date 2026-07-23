import React, {useMemo} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerTopBarProps {
  title: string;
  onGoBack: () => void;
  topInset: number;
  isLandscape: boolean;
  onToggleRotate: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerTopBar: React.FC<VideoPlayerTopBarProps> = ({
  title,
  onGoBack,
  topInset,
  isLandscape,
  onToggleRotate,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background.floating,
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
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        backBtnIcon: {
          fontSize: 16,
          color: colors.text.primary,
        },
        openBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          paddingHorizontal: 8,
          height: 28,
        },
        openBtnText: {
          fontSize: 15,
          color: colors.text.primary,
        },
        openArrow: {
          fontSize: 10,
          color: colors.text.primary,
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
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        rotateBtnIcon: {
          fontSize: 18,
          color: colors.text.secondary,
        },

      }),
    [colors],
  );

  return (
    <View style={[styles.container, {paddingTop: topInset}]}>
      <View style={styles.row}>
        {/* Left: Back + Open */}
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.backBtn} onPress={onGoBack} accessibilityLabel="Go back" accessibilityRole="button">
            <AppText style={styles.backBtnIcon}>{'←'}</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.openBtn}>
            <AppText style={styles.openBtnText} variant="body2" color="primary">
              Open
            </AppText>
            <AppText style={styles.openArrow}>{'▾'}</AppText>
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

        {/* Right: expand toggle */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.rotateBtn} onPress={onToggleRotate} accessibilityLabel="Toggle rotation" accessibilityRole="button">
            <AppText style={styles.rotateBtnIcon}>
              {isLandscape ? '⤢' : '⛶'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
