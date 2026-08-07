import React, {useEffect} from 'react';
import {
  Animated,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {Placeholder} from '../../components/feedback/Placeholder';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {spacing} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {useToast} from '../../components/feedback/Toast';
import {MpvConfigEditor, LinkedFoldersDialog, ThemePickerDialog, SubtitleLanguageDialog, SubtitleStyleDialog} from './components';
import type {MpvOption} from './components/MpvConfigEditor';
import {SettingsScreenProps} from '../../navigation/types';
import {AccountSection} from '../../components/sections/AccountSection/AccountSection';
import {
  setHardwareAcceleration,
  setAudioNormalization,
  setDialogueBoost,
  setThemeMode,
  setMpvOptions,
  setSkipSilence,
  setAutoLoadSubtitles,
  setSubtitleFontSize,
  setSubtitleTextColor,
  setSubtitleBackgroundOpacity,
  setPreferredLanguages,
} from '../../store/slices/settingsSlice';
import {useSettingsScreen} from './hooks/useSettingsScreen';

type Props = SettingsScreenProps;

export const SettingsScreen: React.FC<Props> = ({navigation: _nav}) => {
  const nav = useNavigation<any>();
  const {
    colors,
    styles,
    entrance,
    isLoading,
    error,
    refreshing,
    hardwareAcceleration,
    audioNormalization,
    dialogueBoost,
    themeMode,
    mpvEditorVisible,
    linkedFoldersDialogVisible,
    themeDialogVisible,
    mpvOptions,
    subtitleTextColor,
    subtitleFontSize,
    subtitleBackgroundOpacity,
    subtitleFontLabel,
    subtitleBgLabel,
    autoLoadSubtitles,
    preferredLanguages,
    skipSilenceEnabled,
    linkedFolderCount,
    appVersion,
    buildNumber,
    THEME_LABELS,
    dispatch,
    setError,
    setMpvEditorVisible,
    setLinkedFoldersDialogVisible,
    setThemeDialogVisible,
    handleLinkedFoldersPress,
    handleThemePress,
    handleSubtitleFontPress,
    handleSubtitleLanguagePress,
    handleSubtitleColorPress,
    handleSubtitleBgPress,
    subtitleLanguageDialogVisible,
    setSubtitleLanguageDialogVisible,
    subtitleStyleDialogVisible,
    setSubtitleStyleDialogVisible,
    onRefresh,
  } = useSettingsScreen();
  const toast = useToast();

  // Surface settings-load failures as a top-of-screen toast with Retry.
  useEffect(() => {
    if (error) {
      toast.show(error, 'error', {
        duration: 8000,
        action: {label: 'Retry', onPress: () => setError(null)},
      });
    }
  }, [error, toast, setError]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary]}
        style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
      />

      {/* Ambient warm glow */}
      <View style={[styles.glow, {backgroundColor: colors.accent.goldGlow}]} />

      {/* Header — InternalHeader includes the chevron back arrow */}
      <InternalHeader title="Settings" />

      {isLoading ? (
        <Placeholder variant="loading" anchor="center" />
      ) : !error ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }>
          {/* ── Account Section (0) ── */}
          <Animated.View style={entrance.styles[0]}>
            <AccountSection />
            <View style={{height: spacing.sm}} />
          </Animated.View>

          {/* ── Appearance Section (1) ── */}
          <Animated.View style={entrance.styles[1]}>
            <SectionHeader label="Appearance" />
            <SettingsRow
              label="Theme"
              description={THEME_LABELS[themeMode] ?? 'System'}
              onPress={handleThemePress}
            />
            <SettingsRow label="Accent Color" description="Gold — Simba brand" />
          </Animated.View>
          <View style={styles.sectionDivider} />

          {/* ── Library Section (2) ── */}
          <Animated.View style={entrance.styles[2]}>
            <SectionHeader label="Library" />
            <SettingsRow
              label="Linked Folders"
              description={
                linkedFolderCount > 0
                  ? `${linkedFolderCount} folder${linkedFolderCount !== 1 ? 's' : ''}`
                  : 'None'
              }
              onPress={handleLinkedFoldersPress}
            />
            <SettingsRow
              label="MPV Options"
              description={
                mpvOptions.length > 0
                  ? `${mpvOptions.length} option${mpvOptions.length !== 1 ? 's' : ''} set`
                  : 'Default'
              }
              onPress={() => setMpvEditorVisible(true)}
            />
          </Animated.View>
          <View style={styles.sectionDivider} />

          {/* ── Playback Section (3) ── */}
          <Animated.View style={entrance.styles[3]}>
            <SectionHeader label="Playback" />
            <SettingsRow
              label="Hardware Acceleration"
              trailing={
                <Switch
                  value={hardwareAcceleration}
                  onValueChange={val => {
                    dispatch(setHardwareAcceleration(val));
                  }}
                  trackColor={{
                    false: colors.border.subtle,
                    true: colors.accent.goldDim,
                  }}
                  thumbColor={
                    hardwareAcceleration
                      ? colors.accent.gold
                      : colors.text.tertiary
                  }
                  accessibilityLabel="Hardware Acceleration"
                />
              }
            />
            <SettingsRow
              label="Audio Normalization"
              trailing={
                <Switch
                  value={audioNormalization}
                  onValueChange={val => {
                    dispatch(setAudioNormalization(val));
                  }}
                  trackColor={{
                    false: colors.border.subtle,
                    true: colors.accent.goldDim,
                  }}
                  thumbColor={
                    audioNormalization
                      ? colors.accent.gold
                      : colors.text.tertiary
                  }
                  accessibilityLabel="Audio Normalization"
                />
              }
            />
            <SettingsRow
              label="Dialogue Boost"
              trailing={
                <Switch
                  value={dialogueBoost}
                  onValueChange={val => {
                    dispatch(setDialogueBoost(val));
                  }}
                  trackColor={{
                    false: colors.border.subtle,
                    true: colors.accent.goldDim,
                  }}
                  thumbColor={
                    dialogueBoost ? colors.accent.gold : colors.text.tertiary
                  }
                  accessibilityLabel="Dialogue Boost"
                />
              }
            />
            <SettingsRow
              label="Skip Silence"
              description="Automatically skip silent sections"
              trailing={
                <Switch
                  value={skipSilenceEnabled}
                  onValueChange={val => {
                    dispatch(setSkipSilence(val));
                  }}
                  trackColor={{
                    false: colors.border.subtle,
                    true: colors.accent.goldDim,
                  }}
                  thumbColor={
                    skipSilenceEnabled
                      ? colors.accent.gold
                      : colors.text.tertiary
                  }
                  accessibilityLabel="Skip Silence"
                />
              }
            />
            <SettingsRow
              label="Subtitle Language"
              description={preferredLanguages || 'Default'}
              onPress={handleSubtitleLanguagePress}
            />
            {/* 57.3: AudioSettings/Equalizer were registered but unreachable */}
            <SettingsRow
              label="Audio Settings"
              description="Equalizer and audio tuning"
              onPress={() => nav.navigate('AudioSettings')}
            />
          </Animated.View>
          <View style={styles.sectionDivider} />

          {/* ── Subtitles Section (4) ── */}
          <Animated.View style={entrance.styles[4]}>
            <SectionHeader label="Subtitles" />
            <SettingsRow
              label="Font Size"
              description={subtitleFontLabel}
              onPress={handleSubtitleFontPress}
            />
            <SettingsRow
              label="Text Color"
              description={
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: subtitleTextColor,
                      borderWidth: 1,
                      borderColor: colors.border.subtle,
                    }}
                  />
                  <AppText variant="caption" style={{color: colors.text.secondary}}>
                    {subtitleTextColor}
                  </AppText>
                </View>
              }
              onPress={handleSubtitleColorPress}
            />
            <SettingsRow
              label="Background Opacity"
              description={subtitleBgLabel}
              onPress={handleSubtitleBgPress}
            />
            <SettingsRow
              label="Auto-Load Subtitles"
              trailing={
                <Switch
                  value={autoLoadSubtitles}
                  onValueChange={val => {
                    dispatch(setAutoLoadSubtitles(val));
                  }}
                  trackColor={{
                    false: colors.border.subtle,
                    true: colors.accent.goldDim,
                  }}
                  thumbColor={
                    autoLoadSubtitles
                      ? colors.accent.gold
                      : colors.text.tertiary
                  }
                  accessibilityLabel="Auto-Load Subtitles"
                />
              }
            />
          </Animated.View>
          <View style={styles.sectionDivider} />

          {/* ── About Section (5) ── */}
          <Animated.View style={entrance.styles[5]}>
            <SectionHeader label="About" />
            <SettingsRow
              label="Version"
              description={`${appVersion} (${buildNumber})`}
            />
            {/* 57.3: About/Credits were registered but unreachable */}
            <SettingsRow
              label="About Simba"
              onPress={() => nav.navigate('About')}
            />
            <SettingsRow
              label="Credits"
              onPress={() => nav.navigate('Credits')}
            />
            <SettingsRow
              label="Changelog"
              onPress={() => nav.navigate('Changelog')}
            />
            <SettingsRow
              label="Help"
              description="FAQ and troubleshooting"
              onPress={() => nav.navigate('Help')}
            />
            <SettingsRow
              label="Licenses"
              onPress={() => nav.navigate('Licenses')}
            />
          </Animated.View>

          {/* Bottom spacer */}
          <View style={{height: spacing.lg}} />
        </ScrollView>
      ) : null}

      <MpvConfigEditor
        visible={mpvEditorVisible}
        onClose={() => setMpvEditorVisible(false)}
        options={mpvOptions}
        onSave={(options: MpvOption[]) => dispatch(setMpvOptions(options))}
      />

      <LinkedFoldersDialog
        visible={linkedFoldersDialogVisible}
        onClose={() => setLinkedFoldersDialogVisible(false)}
        onNavigate={type => nav.navigate('LinkedFolders', {type})}
        colors={colors}
      />

      <ThemePickerDialog
        visible={themeDialogVisible}
        onClose={() => setThemeDialogVisible(false)}
        themeMode={themeMode}
        onSelectTheme={mode => dispatch(setThemeMode(mode))}
        colors={colors}
      />

      <SubtitleLanguageDialog
        visible={subtitleLanguageDialogVisible}
        onClose={() => setSubtitleLanguageDialogVisible(false)}
        preferredLanguages={preferredLanguages}
        onSelect={codes => dispatch(setPreferredLanguages(codes))}
        colors={colors}
      />

      <SubtitleStyleDialog
        visible={subtitleStyleDialogVisible}
        onClose={() => setSubtitleStyleDialogVisible(false)}
        fontSize={subtitleFontSize}
        textColor={subtitleTextColor}
        bgOpacity={subtitleBackgroundOpacity}
        onFontSize={px => dispatch(setSubtitleFontSize(px))}
        onTextColor={c => dispatch(setSubtitleTextColor(c))}
        onBgOpacity={o => dispatch(setSubtitleBackgroundOpacity(o))}
        colors={colors}
      />
    </SafeAreaView>
  );
};
