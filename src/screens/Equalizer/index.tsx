import React, {useCallback, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {EqualizerScreenProps} from '../../navigation/types';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {VideoPlayerEqualizerPanel} from '../../components/player/VideoPlayerEqualizerPanel/VideoPlayerEqualizerPanel';
import {useAppDispatch, useAppSelector} from '../../store';
import {useSettingsStore} from '../../state';

import {
  EQ_PRESETS,
  applyAudioSettingsToMpv,
} from '../../services/audioSettingsService';

type Props = EqualizerScreenProps;

/**
 * Phase 45.3/45.4: standalone equalizer — 10 band sliders + presets,
 * fully backed by settingsSlice and applied live to mpv.
 */
export const EqualizerScreen: React.FC<Props> = ({navigation: _navigation}) => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();

  const eqGains = useSettingsStore(s => s.eqGains);
  const eqEnabled = useSettingsStore(s => s.eqEnabled);

  // Push current EQ state to mpv on open (covers audio playback too)
  useEffect(() => {
    applyAudioSettingsToMpv();
  }, []);

  const handleBandChange = useCallback(
    (index: number, value: number) => {
      const next = [...eqGains];
      next[index] = value;
      useSettingsStore.getState().setEqGains(next);
      setTimeout(applyAudioSettingsToMpv, 0);
    },
    [eqGains, dispatch],
  );

  const handleToggle = useCallback(() => {
    useSettingsStore.getState().setEqEnabled(!eqEnabled);
    setTimeout(applyAudioSettingsToMpv, 0);
  }, [eqEnabled, dispatch]);

  const handleApplyPreset = useCallback(
    (name: string) => {
      const preset = EQ_PRESETS[name];
      if (!preset) return;
      useSettingsStore.getState().setEqPreset(name);
      useSettingsStore.getState().setEqGains([...preset]);
      setTimeout(applyAudioSettingsToMpv, 0);
    },
    [dispatch],
  );

  const handleReset = useCallback(() => {
    useSettingsStore.getState().setEqGains([...EQ_PRESETS.Flat]);
    useSettingsStore.getState().setEqPreset('Flat');
    useSettingsStore.getState().setEqEnabled(false);
    setTimeout(applyAudioSettingsToMpv, 0);
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      <InternalHeader title="Equalizer" />

      <AppText
        variant="caption"
        color="secondary"
        style={styles.hint}>
        Adjustments apply immediately to audio and video playback.
      </AppText>

      <View style={styles.panel}>
        <VideoPlayerEqualizerPanel
          eqGains={eqGains}
          eqEnabled={eqEnabled}
          onBandChange={handleBandChange}
          onToggle={handleToggle}
          onApplyPreset={handleApplyPreset}
          onReset={handleReset}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hint: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    opacity: 0.8,
  },
  panel: {
    flex: 1,
  },
});
