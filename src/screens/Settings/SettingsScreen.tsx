import React, {useMemo} from 'react';
import {Alert, ScrollView, StyleSheet, Switch, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  setHardwareAcceleration,
  setAudioNormalization,
  setDialogueBoost,
  setAutoLoadSubtitles,
  setThemeMode,
} from '../../store/slices/settingsSlice';
import {spacing} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';
import {SettingsScreenProps} from '../../navigation/types';

type Props = SettingsScreenProps;

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

export const SettingsScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors, spacing: s} = useTheme();
  const isDark = theme === 'dark';
  const dispatch = useAppDispatch();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        glow: {
          position: 'absolute',
          top: -60,
          left: '10%',
          width: '80%',
          height: 120,
          borderRadius: 60,
          opacity: isDark ? 0.3 : 0.15,
        },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        },
        scroll: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: spacing.xxxl,
        },
      }),
    [colors],
  );

  const hardwareAcceleration = useAppSelector(
    state => state.settings.isHardwareAccelerationEnabled,
  );
  const audioNormalization = useAppSelector(
    state => state.settings.isAudioNormalizationEnabled,
  );
  const dialogueBoost = useAppSelector(
    state => state.settings.isDialogueBoostEnabled,
  );
  const autoLoadSubtitles = useAppSelector(
    state => state.settings.isAutoLoadSubtitlesEnabled,
  );
  const themeMode = useAppSelector(state => state.settings.themeMode);
  const videoFolderCount = useAppSelector(
    state => state.settings.videoFolders.length,
  );
  const audioFolderCount = useAppSelector(
    state => state.settings.audioFolders.length,
  );

  const handleThemePress = () => {
    Alert.alert('Select Theme', 'Choose your preferred appearance', [
      {
        text: 'System',
        onPress: () => dispatch(setThemeMode('system')),
      },
      {
        text: 'Dark',
        onPress: () => dispatch(setThemeMode('dark')),
      },
      {
        text: 'Light',
        onPress: () => dispatch(setThemeMode('light')),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={
          [colors.background.primary, colors.background.primary]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient warm glow */}
      <View
        style={[
          styles.glow,
          {backgroundColor: colors.accent.goldGlow},
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <AppText variant="h1" color="primary">
          Settings
        </AppText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Appearance Section ── */}
        <SectionHeader label="Appearance" />
        <SettingsRow
          label="Theme"
          description={THEME_LABELS[themeMode] ?? 'System'}
          onPress={handleThemePress}
        />
        <SettingsRow label="Accent Color" description="Gold" />

        {/* ── Playback Section ── */}
        <SectionHeader label="Playback" />
        <SettingsRow
          label="Hardware Acceleration"
          trailing={
            <Switch
              value={hardwareAcceleration}
              onValueChange={val => { dispatch(setHardwareAcceleration(val)); }}
              trackColor={{
                false: colors.border.subtle,
                true: colors.accent.goldDim,
              }}
              thumbColor={
                hardwareAcceleration
                  ? colors.accent.gold
                  : colors.text.tertiary
              }
            />
          }
        />
        <SettingsRow
          label="Audio Normalization"
          trailing={
            <Switch
              value={audioNormalization}
              onValueChange={val => { dispatch(setAudioNormalization(val)); }}
              trackColor={{
                false: colors.border.subtle,
                true: colors.accent.goldDim,
              }}
              thumbColor={
                audioNormalization
                  ? colors.accent.gold
                  : colors.text.tertiary
              }
            />
          }
        />
        <SettingsRow
          label="Dialogue Boost"
          trailing={
            <Switch
              value={dialogueBoost}
              onValueChange={val => { dispatch(setDialogueBoost(val)); }}
              trackColor={{
                false: colors.border.subtle,
                true: colors.accent.goldDim,
              }}
              thumbColor={
                dialogueBoost
                  ? colors.accent.gold
                  : colors.text.tertiary
              }
            />
          }
        />

        {/* ── Library Section ── */}
        <SectionHeader label="Library" />
        <SettingsRow
          label="Auto-load Subtitles"
          trailing={
            <Switch
              value={autoLoadSubtitles}
              onValueChange={val => { dispatch(setAutoLoadSubtitles(val)); }}
              trackColor={{
                false: colors.border.subtle,
                true: colors.accent.goldDim,
              }}
              thumbColor={
                autoLoadSubtitles
                  ? colors.accent.gold
                  : colors.text.tertiary
              }
            />
          }
        />
        <SettingsRow
          label="Preferred Languages"
          onPress={() =>
            Alert.alert(
              'Coming Soon',
              'Language selection will be available in a future update.',
            )
          }
        />
        <SettingsRow
          label="Video Folders"
          description={`${videoFolderCount} folder${videoFolderCount !== 1 ? 's' : ''} linked`}
          onPress={() =>
            navigation.navigate('LinkedFolders', {type: 'video'})
          }
        />
        <SettingsRow
          label="Audio Folders"
          description={`${audioFolderCount} folder${audioFolderCount !== 1 ? 's' : ''} linked`}
          onPress={() =>
            navigation.navigate('LinkedFolders', {type: 'audio'})
          }
        />

        {/* ── Audio Section ── */}
        <SectionHeader label="Audio" />
        <SettingsRow
          label="Equalizer"
          onPress={() => navigation.navigate('AudioSettings')}
        />

        {/* ── About Section ── */}
        <SectionHeader label="About" />
        <SettingsRow
          label="About"
          onPress={() => navigation.navigate('About')}
        />

        {/* Bottom spacer */}
        <View style={{height: s.xxxl}} />
      </ScrollView>
    </SafeAreaView>
  );
};

