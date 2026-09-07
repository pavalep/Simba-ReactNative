import {useCallback, useMemo, useState} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSettingsStore} from '../../../state';

import {spacing} from '../../../theme/tokens';

import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {useMediaScanner} from '../../../hooks/useMediaScanner';

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

const SECTION_COUNT = 7; // ACCOUNT, APPEARANCE, LIBRARY, DISCOVER, PLAYBACK, SUBTITLES, ABOUT

/** Get app version from package info */
function getAppVersion(): string {
  try {
    const pkg = require('../../../../package.json');
    return pkg.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/** Get build number from package info */
function getBuildNumber(): string {
  try {
    const pkg = require('../../../../package.json');
    return String(pkg.build ?? '1');
  } catch {
    return '1';
  }
}

export function useSettingsScreen() {
  const {theme, colors} = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const bottomChromeInset = insets.bottom + 104;

  const entrance = useAnimatedEntrance(SECTION_COUNT, {staggerDelay: 80});
  const {startScan, isScanning} = useMediaScanner();

  // ── Settings State (V17) ──

  const hardwareAcceleration = useSettingsStore(s => s.isHardwareAccelerationEnabled);
  const audioNormalization = useSettingsStore(s => s.isAudioNormalizationEnabled);
  const dialogueBoost = useSettingsStore(s => s.isDialogueBoostEnabled);
  const themeMode = useSettingsStore(s => s.themeMode);
  const mpvOptions = useSettingsStore(s => s.mpvOptions) ?? [];

  // Subtitle (Phase 22)
  const subtitleFontSize = useSettingsStore(s => s.subtitleFontSize);
  const subtitleTextColor = useSettingsStore(s => s.subtitleTextColor);
  const subtitleBackgroundOpacity = useSettingsStore(s => s.subtitleBackgroundOpacity);
  const autoLoadSubtitles = useSettingsStore(s => s.isAutoLoadSubtitlesEnabled);
  const preferredLanguages = useSettingsStore(s => s.preferredLanguages);

  // Playback extras
  const skipSilenceEnabled = useSettingsStore(s => s.skipSilenceEnabled);

  // Library
  const videoFolders = useSettingsStore(s => s.videoFolders) ?? [];
  const audioFolders = useSettingsStore(s => s.audioFolders) ?? [];
  const linkedFolderCount = videoFolders.length + audioFolders.length;

  // ── Local State ──
  const [isLoading, _setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mpvEditorVisible, setMpvEditorVisible] = useState(false);
  const [linkedFoldersDialogVisible, setLinkedFoldersDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  // Phase 44: subtitle language + style dialogs (was single font-size dialog)
  const [subtitleLanguageDialogVisible, setSubtitleLanguageDialogVisible] = useState(false);
  const [subtitleStyleDialogVisible, setSubtitleStyleDialogVisible] = useState(false);

  // ── Handlers ──
  const handleLinkedFoldersPress = useCallback(() => {
    setLinkedFoldersDialogVisible(true);
  }, []);

  const handleThemePress = useCallback(() => {
    setThemeDialogVisible(true);
  }, []);

  const handleSubtitleFontPress = useCallback(() => {
    setSubtitleStyleDialogVisible(true);
  }, []);

  const handleSubtitleLanguagePress = useCallback(() => {
    setSubtitleLanguageDialogVisible(true);
  }, []);

  const handleSubtitleColorPress = useCallback(() => {
    setSubtitleStyleDialogVisible(true);
  }, []);

  const handleSubtitleBgPress = useCallback(() => {
    setSubtitleStyleDialogVisible(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await startScan(true);
    } catch {
      setError('Failed to refresh the local library.');
    } finally {
      setRefreshing(false);
    }
  }, [startScan]);

  // ── Derived ──
  const appVersion = useMemo(() => getAppVersion(), []);
  const buildNumber = useMemo(() => getBuildNumber(), []);

  const subtitleFontLabel = useMemo(() => {
    if (subtitleFontSize <= 14) return 'Small';
    if (subtitleFontSize <= 18) return 'Medium';
    if (subtitleFontSize <= 22) return 'Large';
    return 'Extra Large';
  }, [subtitleFontSize]);

  const subtitleBgLabel = useMemo(() => {
    if (subtitleBackgroundOpacity <= 0.2) return 'None';
    if (subtitleBackgroundOpacity <= 0.5) return 'Light';
    if (subtitleBackgroundOpacity <= 0.75) return 'Medium';
    return 'Heavy';
  }, [subtitleBackgroundOpacity]);

  // ── Styles ──
  const styles = useMemo(
    () => ({
      root: {flex: 1} as const,
      glow: {
        position: 'absolute' as const,
        top: -60,
        left: '10%' as const,
        width: '80%' as const,
        height: 120,
        borderRadius: 60,
        opacity: isDark ? 0.3 : 0.15,
      },
      header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
      },
      scroll: {flex: 1} as const,
      scrollContent: {
        paddingBottom: bottomChromeInset,
      },
      // (Replaced by the shared <Placeholder> component.)
      retryButton: {
        marginTop: spacing.md,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        backgroundColor: colors.accent.goldDim,
      },
      sectionDivider: {
        height: 1,
        backgroundColor: colors.border.subtle,
        marginHorizontal: spacing.md,
        marginVertical: spacing.md,
      },
    }),
    [bottomChromeInset, isDark, colors],
  );

  return {
    theme,
    colors,
    insets,
    isDark,
    styles,
    entrance,
    isLoading,
    error,
    refreshing: refreshing || isScanning,
    // Redux state
    hardwareAcceleration,
    audioNormalization,
    dialogueBoost,
    themeMode,
    mpvOptions,
    // Subtitle state
    subtitleFontSize,
    subtitleTextColor,
    subtitleBackgroundOpacity,
    autoLoadSubtitles,
    preferredLanguages,
    subtitleFontLabel,
    subtitleBgLabel,
    // Playback extras
    skipSilenceEnabled,
    // Library
    videoFolders,
    audioFolders,
    linkedFolderCount,
    // About
    appVersion,
    buildNumber,
    // Misc
    THEME_LABELS,
    SECTION_COUNT,
    setError,
    mpvEditorVisible,
    linkedFoldersDialogVisible,
    themeDialogVisible,
    setMpvEditorVisible,
    setLinkedFoldersDialogVisible,
    setThemeDialogVisible,
    subtitleLanguageDialogVisible,
    setSubtitleLanguageDialogVisible,
    subtitleStyleDialogVisible,
    setSubtitleStyleDialogVisible,
    handleLinkedFoldersPress,
    handleThemePress,
    handleSubtitleFontPress,
    handleSubtitleLanguagePress,
    handleSubtitleColorPress,
    handleSubtitleBgPress,
    onRefresh,
  };
}
