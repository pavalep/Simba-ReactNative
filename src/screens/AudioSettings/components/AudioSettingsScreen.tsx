import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AudioSettingsScreenProps} from '../types';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {AppText} from '../../../components/core/AppText/AppText';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../../components/utility/SettingsRow/SettingsRow';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {OptionSheetDialog, OptionSheetOption} from '../../../components/core/OptionSheetDialog/OptionSheetDialog';
import {applyAudioSettingsToMpv} from '../../../services/audioSettingsService';
import {useSettingsStore} from '../../../state';

type Props = AudioSettingsScreenProps;

const SAMPLE_RATE_OPTIONS: OptionSheetOption[] = [
  {label: 'Auto', value: 0},
  {label: '44.1 kHz', value: 44100},
  {label: '48 kHz', value: 48000},
  {label: '96 kHz', value: 96000},
];

const REPLAY_GAIN_OPTIONS: OptionSheetOption[] = [
  {label: 'Off', value: 'no'},
  {label: 'Track', value: 'track'},
  {label: 'Album', value: 'album'},
];

const AUDIO_DELAY_OPTIONS: OptionSheetOption[] = [
  {label: '0 ms', value: 0},
  {label: '−100 ms', value: -0.1},
  {label: '+100 ms', value: 0.1},
  {label: '−250 ms', value: -0.25},
  {label: '+250 ms', value: 0.25},
];

type PickerKind = 'sampleRate' | 'replayGain' | 'audioDelay' | null;

export const AudioSettingsScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  // ── Slice state (Phase 45: all controls live in settingsSlice) ──
  const sampleRate = useSettingsStore(s => s.sampleRate);
  const replayGain = useSettingsStore(s => s.replayGain);
  const gaplessPlayback = useSettingsStore(s => s.gaplessPlayback);
  const audioDelay = useSettingsStore(s => s.audioDelay);
  const eqEnabled = useSettingsStore(s => s.eqEnabled);
  const eqPreset = useSettingsStore(s => s.eqPreset);
  const normalizeVolume = useSettingsStore(s => s.isAudioNormalizationEnabled);
  const dialogueBoost = useSettingsStore(s => s.isDialogueBoostEnabled);

  const [picker, setPicker] = useState<PickerKind>(null);

  // ── Push persisted audio settings to mpv whenever the screen opens ──
  useEffect(() => {
    applyAudioSettingsToMpv();
  }, []);

  const toggleAndApply = useCallback(
    (next: boolean, apply: (val: boolean) => void) => {
      apply(next);
      setTimeout(applyAudioSettingsToMpv, 0);
    },
    [],
  );

  const selectAndApply = useCallback(
    (value: string | number) => {
      if (picker === 'sampleRate') {
        useSettingsStore.getState().setSampleRate(Number(value));
      } else if (picker === 'replayGain') {
        useSettingsStore.getState().setReplayGain(value as 'no' | 'track' | 'album');
      } else if (picker === 'audioDelay') {
        useSettingsStore.getState().setAudioDelay(Number(value));
      }
      setPicker(null);
      setTimeout(applyAudioSettingsToMpv, 0);
    },
    [, picker],
  );

  const sampleRateLabel =
    SAMPLE_RATE_OPTIONS.find(o => o.value === sampleRate)?.label ?? 'Auto';
  const replayGainLabel =
    REPLAY_GAIN_OPTIONS.find(o => o.value === replayGain)?.label ?? 'Off';
  const audioDelayLabel =
    AUDIO_DELAY_OPTIONS.find(o => o.value === audioDelay)?.label ?? '0 ms';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        scrollContent: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom,
        },
        card: {
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        },
      }),
    [colors, insets.bottom],
  );

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      <InternalHeader title="Audio Settings" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Output */}
        <SectionHeader label="Output" />
        <View style={styles.card}>
          <SettingsRow
            label="Sample Rate"
            description="Resampling rate; Auto matches the source"
            onPress={() => setPicker('sampleRate')}
            trailing={
              <AppText variant="caption" color="secondary">
                {sampleRateLabel}
              </AppText>
            }
          />
        </View>

        {/* Enhancements */}
        <SectionHeader label="Enhancements" />
        <View style={styles.card}>
          <SettingsRow
            label="Normalize Volume"
            description="Cap peaks for consistent loudness"
            trailing={
              <Switch
                value={normalizeVolume}
                onValueChange={val =>
                  toggleAndApply(val, useSettingsStore.getState().setAudioNormalization)
                }
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  normalizeVolume ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
          <SettingsRow
            label="Dialogue Boost"
            description="Enhance dialogue clarity"
            trailing={
              <Switch
                value={dialogueBoost}
                onValueChange={val =>
                  toggleAndApply(val, useSettingsStore.getState().setDialogueBoost)
                }
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  dialogueBoost ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
          <SettingsRow
            label="ReplayGain"
            description="Loudness normalization from track/album tags"
            onPress={() => setPicker('replayGain')}
            trailing={
              <AppText variant="caption" color="secondary">
                {replayGainLabel}
              </AppText>
            }
          />
        </View>

        {/* Equalizer */}
        <SectionHeader label="Equalizer" />
        <View style={styles.card}>
          <SettingsRow
            label="Enable EQ"
            description="Toggle equalizer"
            trailing={
              <Switch
                value={eqEnabled}
                onValueChange={val =>
                  toggleAndApply(val, useSettingsStore.getState().setEqEnabled)
                }
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={eqEnabled ? colors.accent.gold : colors.text.tertiary}
              />
            }
          />
          <SettingsRow
            label="Preset"
            description="Open the 10-band equalizer"
            onPress={() => nav.navigate('Equalizer')}
            trailing={
              <AppText variant="caption" color="accent">
                {eqPreset} ›
              </AppText>
            }
          />
        </View>

        {/* Advanced */}
        <SectionHeader label="Advanced" />
        <View style={styles.card}>
          <SettingsRow
            label="Gapless Playback"
            description="Seamless transition between tracks"
            trailing={
              <Switch
                value={gaplessPlayback}
                onValueChange={val =>
                  toggleAndApply(val, useSettingsStore.getState().setGaplessPlayback)
                }
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  gaplessPlayback ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
          <SettingsRow
            label="Audio Delay"
            description="Adjust audio synchronization delay"
            onPress={() => setPicker('audioDelay')}
            trailing={
              <AppText variant="caption" color="secondary">
                {audioDelayLabel}
              </AppText>
            }
          />
        </View>
      </ScrollView>

      <OptionSheetDialog
        visible={picker === 'sampleRate'}
        title="Sample Rate"
        options={SAMPLE_RATE_OPTIONS}
        selectedValue={sampleRate}
        onSelect={selectAndApply}
        onClose={() => setPicker(null)}
        colors={colors}
      />
      <OptionSheetDialog
        visible={picker === 'replayGain'}
        title="ReplayGain"
        options={REPLAY_GAIN_OPTIONS}
        selectedValue={replayGain}
        onSelect={selectAndApply}
        onClose={() => setPicker(null)}
        colors={colors}
      />
      <OptionSheetDialog
        visible={picker === 'audioDelay'}
        title="Audio Delay"
        options={AUDIO_DELAY_OPTIONS}
        selectedValue={audioDelay}
        onSelect={selectAndApply}
        onClose={() => setPicker(null)}
        colors={colors}
      />
    </SafeAreaView>
  );
};
