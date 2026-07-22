import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  requireNativeComponent,
} from 'react-native';
import type {ViewStyle} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Native video surface component ─────────────────────────

interface MpvRenderViewProps {
  nativePtr: number;
  style?: ViewStyle;
}

const MpvRenderViewNative =
  requireNativeComponent<MpvRenderViewProps>('MpvRenderView');

// ─── Props ───────────────────────────────────────────────────

export interface PlayerVideoSurfaceProps {
  nativePtr: number;
  showVideoSurface: boolean;
  isPlaying: boolean;
  controlsVisible: boolean;
}

// ─── Component ───────────────────────────────────────────────

export const PlayerVideoSurface: React.FC<PlayerVideoSurfaceProps> = ({
  nativePtr,
  showVideoSurface,
  isPlaying,
  controlsVisible,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        centerPlayBtnOverlay: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerPlayBtn: {
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.background.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerPlayIcon: {
          fontSize: 28,
          color: 'rgba(255,255,255,0.7)',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      {showVideoSurface && (
        <MpvRenderViewNative
          nativePtr={nativePtr}
          style={StyleSheet.absoluteFill}
        />
      )}
      {!controlsVisible && (
        <View style={styles.centerPlayBtnOverlay}>
          <View style={styles.centerPlayBtn}>
            <AppText style={styles.centerPlayIcon}>{'▶'}</AppText>
          </View>
        </View>
      )}
    </View>
  );
};
