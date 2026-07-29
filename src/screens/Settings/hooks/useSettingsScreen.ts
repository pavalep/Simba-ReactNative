import {useCallback, useMemo, useState} from 'react';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppDispatch, useAppSelector} from '../../../store';
import {
  setHardwareAcceleration,
  setAudioNormalization,
  setDialogueBoost,
  setThemeMode,
  setMpvOptions,
} from '../../../store/slices/settingsSlice';
import {spacing} from '../../../theme/tokens';
import type {MpvOption} from '../components/MpvConfigEditor';

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

export function useSettingsScreen() {
  const {theme, colors} = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const dispatch = useAppDispatch();
  const bottomChromeInset = insets.bottom + 104;

  // ── Redux State ──
  const hardwareAcceleration = useAppSelector(state => state.settings.isHardwareAccelerationEnabled);
  const audioNormalization = useAppSelector(state => state.settings.isAudioNormalizationEnabled);
  const dialogueBoost = useAppSelector(state => state.settings.isDialogueBoostEnabled);
  const themeMode = useAppSelector(state => state.settings.themeMode);
  const mpvOptions = useAppSelector(state => state.settings.mpvOptions) ?? [];

  // ── Local State ──
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mpvEditorVisible, setMpvEditorVisible] = useState(false);
  const [linkedFoldersDialogVisible, setLinkedFoldersDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);

  // ── Handlers ──
  const handleLinkedFoldersPress = useCallback(() => {
    setLinkedFoldersDialogVisible(true);
  }, []);

  const handleThemePress = useCallback(() => {
    setThemeDialogVisible(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to refresh settings.');
    } finally {
      setRefreshing(false);
    }
  }, []);

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
      centerContainer: {
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        paddingHorizontal: spacing.lg,
      },
      retryButton: {
        marginTop: spacing.md,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        backgroundColor: colors.accent.goldDim,
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
    THEME_LABELS,
    dispatch,
    setError,
    setMpvEditorVisible,
    setLinkedFoldersDialogVisible,
    setThemeDialogVisible,
    handleLinkedFoldersPress,
    handleThemePress,
    onRefresh,
  };
}
