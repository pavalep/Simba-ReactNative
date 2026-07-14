import React, {useCallback} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useColors} from '../../context/ThemeContext';
import {makeStyles} from '../../utils/makeStyles';
import {AppText} from '../../components/core/AppText/AppText';
import {
  SectionHeader,
  PrefCard,
  PrefDivider,
  Toggle,
  SettingRow,
  InputGroup,
  ShortcutRow,
} from '../../components/preferences';
import {RootStackScreenProps} from '../../navigation/types';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  setAudioNormalization,
  setDialogueBoost,
  setHardwareAcceleration,
  setAutoLoadSubtitles,
  setPreferredLanguages,
  setExternalSubtitleDirectories,
  resetToDefaults,
} from '../../store/slices/settingsSlice';
import {radius} from '../../constants/radius';

type Props = RootStackScreenProps<'Preferences'>;

// ── Keyboard shortcuts data ────────────────────────
const SHORTCUTS: {key: string; action: string}[] = [
  {key: 'Space', action: 'Play / Pause'},
  {key: 'F / F11', action: 'Toggle Fullscreen'},
  {key: '← / →', action: 'Seek ±5s'},
  {key: 'Ctrl+← / Ctrl+→', action: 'Prev/Next Chapter'},
  {key: 'Shift+← / Shift+→', action: 'Seek ±30s'},
  {key: '↑ / ↓', action: 'Volume ±5%'},
  {key: 'M', action: 'Mute Toggle'},
  {key: 'C', action: 'Cycle Subtitles'},
  {key: 'Esc', action: 'Exit Fullscreen'},
  {key: 'Ctrl+O', action: 'Open File'},
  {key: 'Ctrl+P', action: 'Playlist'},
  {key: 'Ctrl+Shift+E', action: 'Equalizer'},
];

// ── Feature status data ────────────────────────────
const FEATURES: {icon: string; name: string; status: string}[] = [
  {icon: '✅', name: 'Hardware Acceleration', status: '✓ Active'},
  {icon: '✅', name: 'Audio Normalization', status: '✓ Active'},
  {icon: '✦', name: 'Dialogue Boost', status: '✦ Available'},
  {icon: '✅', name: 'Subtitles', status: '✓ Active'},
];

export const PreferencesScreen: React.FC<Props> = ({navigation}) => {
  const colors = useColors();
  const styles = useStyles();
  const dispatch = useAppDispatch();

  const {
    isAudioNormalizationEnabled,
    isDialogueBoostEnabled,
    isHardwareAccelerationEnabled,
    isAutoLoadSubtitlesEnabled,
    preferredLanguages,
    externalSubtitleDirectories,
  } = useAppSelector(s => s.settings);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleResetDefaults = useCallback(() => {
    dispatch(resetToDefaults());
  }, [dispatch]);

  return (
    <View style={styles.root}>
      {/* ══ HEADER ══ */}
      <View style={styles.header}>
        <AppText variant="body1" color={colors.osdForeground} style={styles.headerTitle}>
          Preferences
        </AppText>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.7}
          onPress={handleClose}
        >
          <AppText variant="body1" color={colors.textSecondary}>
            ✕
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── License & Features ── */}
        <SectionHeader>License & Features</SectionHeader>
        <PrefCard>
          {/* License Tier */}
          <View style={styles.licenseRow}>
            <View>
              <AppText variant="body2" color={colors.osdForeground} style={styles.licenseLabel}>
                License Tier
              </AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                Unlimited License
              </AppText>
            </View>
            <AppText variant="body2" color={colors.osdForeground} style={styles.licenseValue}>
              Pro
            </AppText>
          </View>

          <PrefDivider />

          {/* Feature Status */}
          <AppText variant="caption" color={colors.textTertiary} style={styles.featureHeader}>
            Feature Status
          </AppText>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <AppText style={styles.featureIcon}>{f.icon}</AppText>
              <View style={styles.featureInfo}>
                <AppText variant="caption" color={colors.osdForeground}>
                  {f.name}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textSecondary}>
                {f.status}
              </AppText>
            </View>
          ))}
        </PrefCard>

        {/* ── General ── */}
        <SectionHeader>General</SectionHeader>
        <PrefCard>
          <SettingRow
            label="Audio Normalization"
            description="Dynamic range compression for consistent volume"
            control={
              <Toggle
                value={isAudioNormalizationEnabled}
                onValueChange={v => dispatch(setAudioNormalization(v))}
              />
            }
          />
          <PrefDivider />
          <SettingRow
            label="Dialogue Boost"
            description="Enhance speech clarity using spectral compression"
            control={
              <Toggle
                value={isDialogueBoostEnabled}
                onValueChange={v => dispatch(setDialogueBoost(v))}
              />
            }
          />
        </PrefCard>

        {/* ── Rendering ── */}
        <SectionHeader>Rendering</SectionHeader>
        <PrefCard>
          <SettingRow
            label="Hardware Acceleration"
            description="Use GPU for video decoding and rendering. Disable if experiencing playback issues."
            control={
              <Toggle
                value={isHardwareAccelerationEnabled}
                onValueChange={v => dispatch(setHardwareAcceleration(v))}
              />
            }
          />
        </PrefCard>

        {/* ── Subtitles ── */}
        <SectionHeader>Subtitles</SectionHeader>
        <PrefCard>
          <SettingRow
            label="Auto-load External Subtitles"
            description="Automatically scan for .srt / .ass files in media directory"
            control={
              <Toggle
                value={isAutoLoadSubtitlesEnabled}
                onValueChange={v => dispatch(setAutoLoadSubtitles(v))}
              />
            }
          />
          <PrefDivider />
          <InputGroup
            label="Preferred Languages"
            value={preferredLanguages}
            hint="Comma-separated language codes. First match is auto-selected."
            onChangeText={v => dispatch(setPreferredLanguages(v))}
          />
          <PrefDivider />
          <InputGroup
            label="External Subtitle Directories"
            value={externalSubtitleDirectories}
            hint="Relative to media file directory. Comma-separated."
            onChangeText={v => dispatch(setExternalSubtitleDirectories(v))}
          />
        </PrefCard>

        {/* ── Keyboard Shortcuts ── */}
        <SectionHeader>Keyboard Shortcuts</SectionHeader>
        <PrefCard>
          {SHORTCUTS.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.shortcutBorder} />}
              <ShortcutRow keyCombo={s.key} action={s.action} />
            </React.Fragment>
          ))}
          <TouchableOpacity
            style={styles.viewAllBtn}
            activeOpacity={0.7}
          >
            <AppText variant="body2" color={colors.accentLight} style={styles.viewAllText}>
              View All Shortcuts (Ctrl+/)
            </AppText>
          </TouchableOpacity>
        </PrefCard>

        {/* ── About ── */}
        <SectionHeader>About</SectionHeader>
        <PrefCard>
          <View style={styles.aboutSection}>
            <View style={[styles.aboutLogo, {borderColor: colors.divider}]}>
              <AppText style={styles.aboutPlayIcon}>▶</AppText>
            </View>
            <AppText variant="body1" color={colors.osdForeground} style={styles.aboutName}>
              Cine Media Player
            </AppText>
            <AppText variant="body2" color={colors.textSecondary} style={styles.aboutVer}>
              Version 1.0.0
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              Built with React Native &amp; libmpv
            </AppText>
          </View>
        </PrefCard>

        <View style={styles.scrollSpacer} />
      </ScrollView>

      {/* ══ FOOTER ══ */}
      <View style={styles.footer}>
        <View style={styles.footerBorder} />
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.footerBtnDestructive}
            activeOpacity={0.7}
            onPress={handleResetDefaults}
          >
            <AppText variant="body2" color={colors.textSecondary}>
              Reset to Defaults
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerBtnPrimary}
            activeOpacity={0.8}
            onPress={handleClose}
          >
            <AppText variant="body2" color={colors.osdForeground} style={styles.footerBtnPrimaryText}>
              Close
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────
const useStyles = makeStyles(colors =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '500',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Scroll ──
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    scrollSpacer: {
      height: 16,
    },

    // ── License & Features ──
    licenseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    licenseLabel: {
      fontWeight: '500',
    },
    licenseValue: {
      fontWeight: '500',
    },
    featureHeader: {
      fontWeight: '600',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 3,
    },
    featureIcon: {
      fontSize: 14,
      width: 20,
      textAlign: 'center',
    },
    featureInfo: {
      flex: 1,
    },

    // ── Shortcuts ──
    shortcutBorder: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    viewAllBtn: {
      paddingTop: 12,
      paddingBottom: 4,
      alignItems: 'center',
    },
    viewAllText: {
      fontWeight: '500',
    },

    // ── About ──
    aboutSection: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    aboutLogo: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      backgroundColor: colors.hoverSubtle,
    },
    aboutPlayIcon: {
      fontSize: 20,
      color: colors.osdForeground,
      marginLeft: 2,
    },
    aboutName: {
      fontWeight: '700',
    },
    aboutVer: {
      marginTop: 2,
    },

    // ── Footer ──
    footer: {
      paddingBottom: 24,
    },
    footerBorder: {
      height: 1,
      backgroundColor: colors.popoverBorder,
      marginBottom: 8,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 16,
    },
    footerBtnDestructive: {
      paddingVertical: 10,
      paddingHorizontal: 28,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderDim,
    },
    footerBtnPrimary: {
      paddingVertical: 10,
      paddingHorizontal: 28,
      borderRadius: radius.sm,
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.accentBorder,
    },
    footerBtnPrimaryText: {
      fontWeight: '600',
    },
  }),
);
