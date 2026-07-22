import React, {useCallback, useState, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AudioSettingsScreenProps} from '../../navigation/types';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';

type Props = AudioSettingsScreenProps;

const AUDIO_DEVICES = ['Auto', 'Speaker', 'Headphones', 'Bluetooth'];
const SAMPLE_RATES = ['44.1kHz', '48kHz', '96kHz', '192kHz'];
const REPLAY_GAIN_OPTIONS = ['Off', 'Track', 'Album'];
const EQ_PRESETS = ['Flat', 'Rock', 'Pop', 'Jazz', 'Classical', 'Dance'];
const AUDIO_DELAYS = ['0ms', '-100ms', '+100ms', '-250ms', '+250ms'];

export const AudioSettingsScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  // Local UI state for toggles and selectors
  const [audioDevice, setAudioDevice] = useState('Auto');
  const [sampleRate, setSampleRate] = useState('48kHz');
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [dialogueBoost, setDialogueBoost] = useState(false);
  const [replayGain, setReplayGain] = useState('Off');
  const [enableEQ, setEnableEQ] = useState(false);
  const [eqPreset, setEqPreset] = useState('Flat');
  const [gaplessPlayback, setGaplessPlayback] = useState(false);
  const [audioDelay, setAudioDelay] = useState('0ms');

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
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        },
        backButton: {
          paddingRight: spacing.lg,
          paddingVertical: spacing.xs,
        },
        title: {
          fontSize: 28,
          fontWeight: '700',
        },
      }),
    [colors, insets.bottom],
  );

  const handleAudioDevicePress = useCallback(() => {
    Alert.alert('Audio Device', 'Select audio output device', [
      ...AUDIO_DEVICES.map(device => ({
        text: device,
        onPress: () => setAudioDevice(device),
      })),
      {text: 'Cancel', style: 'cancel' as const},
    ]);
  }, []);

  const handleSampleRatePress = useCallback(() => {
    Alert.alert('Sample Rate', 'Select audio sample rate', [
      ...SAMPLE_RATES.map(rate => ({
        text: rate,
        onPress: () => setSampleRate(rate),
      })),
      {text: 'Cancel', style: 'cancel' as const},
    ]);
  }, []);

  const handleReplayGainPress = useCallback(() => {
    Alert.alert('ReplayGain', 'Select ReplayGain mode', [
      ...REPLAY_GAIN_OPTIONS.map(option => ({
        text: option,
        onPress: () => setReplayGain(option),
      })),
      {text: 'Cancel', style: 'cancel' as const},
    ]);
  }, []);

  const handleEQPresetPress = useCallback(() => {
    Alert.alert('EQ Preset', 'Select equalizer preset', [
      ...EQ_PRESETS.map(preset => ({
        text: preset,
        onPress: () => setEqPreset(preset),
      })),
      {text: 'Cancel', style: 'cancel' as const},
    ]);
  }, []);

  const handleAudioDelayPress = useCallback(() => {
    Alert.alert('Audio Delay', 'Select audio delay', [
      ...AUDIO_DELAYS.map(delay => ({
        text: delay,
        onPress: () => setAudioDelay(delay),
      })),
      {text: 'Cancel', style: 'cancel' as const},
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <AppText variant="body1" color="accent">
            Back
          </AppText>
        </TouchableOpacity>
        <AppText variant="h2" color="primary" style={styles.title}>
          Audio Settings
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Output */}
        <SectionHeader label="Output" />
        <View style={styles.card}>
          <SettingsRow
            label="Audio Device"
            description="Select audio output device"
            onPress={handleAudioDevicePress}
            trailing={
              <AppText variant="caption" color="secondary">
                {audioDevice}
              </AppText>
            }
          />
          <SettingsRow
            label="Sample Rate"
            description="Select audio sample rate"
            onPress={handleSampleRatePress}
            trailing={
              <AppText variant="caption" color="secondary">
                {sampleRate}
              </AppText>
            }
          />
        </View>

        {/* Enhancements */}
        <SectionHeader label="Enhancements" />
        <View style={styles.card}>
          <SettingsRow
            label="Normalize Volume"
            description="Automatically normalize audio volume"
            trailing={
              <Switch
                value={normalizeVolume}
                onValueChange={setNormalizeVolume}
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
                onValueChange={setDialogueBoost}
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
            description="Select ReplayGain mode"
            onPress={handleReplayGainPress}
            trailing={
              <AppText variant="caption" color="secondary">
                {replayGain}
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
                value={enableEQ}
                onValueChange={setEnableEQ}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  enableEQ ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
          <SettingsRow
            label="Preset"
            description="Select EQ preset"
            onPress={handleEQPresetPress}
            trailing={
              <AppText variant="caption" color="secondary">
                {eqPreset}
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
                onValueChange={setGaplessPlayback}
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
            onPress={handleAudioDelayPress}
            trailing={
              <AppText variant="caption" color="secondary">
                {audioDelay}
              </AppText>
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
