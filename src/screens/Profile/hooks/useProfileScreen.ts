// ────────────────────────────────────────────────────────────────
// Simba Player — the Profile's state
//
// The Profile and the Settings page are ONE page (2026-11-11,
// `md/PROFILE_SETTINGS_MERGE.md`). This hook is the merged screen's
// state: the identity and the account stay in the screen itself, and
// everything the old `useSettingsScreen` owned lives here.
//
// WHAT IS HERE AND WHAT IS NOT
// ────────────────────────────
//
// Here: the preferences (theme, playback, subtitles, linked folders,
// MPV options), the labels the rows show, and the five dialogs' visibility.
//
// NOT here, on purpose:
//
//   • the entrance animation. The old Settings page faded its seven
//     sections in with a stagger; the Profile's grammar is the quiet
//     Cormorant divider, and a staggered fade on a nine-group page is
//     noise.
//   • the pull-to-refresh rescan. The Library page owns the rescan —
//     it is the page that lists what was scanned.
//   • the error toast. It existed because the Settings page could fail
//     to load a scan; the Profile never scans.
//
// The store is read ONE field per subscription, so a row only
// re-renders when its own value changes.
// ────────────────────────────────────────────────────────────────

import {useCallback, useMemo, useState} from 'react';
import {useSettingsStore} from '../../../state';
import {SUBTITLE_LANGUAGES} from '../components/SubtitleLanguageDialog';

/**
 * The names of the three theme modes, as the row shows them.
 *
 * The key is the store's value and the label is what the user reads.
 */
export const THEME_LABELS: Record<string, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

export function useProfileScreen() {
  // ── Appearance ────────────────────────────────────────────────────────
  const themeMode = useSettingsStore(s => s.themeMode);

  // ── Playback ──────────────────────────────────────────────────────────
  const hardwareAcceleration = useSettingsStore(
    s => s.isHardwareAccelerationEnabled,
  );
  const audioNormalization = useSettingsStore(s => s.isAudioNormalizationEnabled);
  const dialogueBoost = useSettingsStore(s => s.isDialogueBoostEnabled);
  const skipSilenceEnabled = useSettingsStore(s => s.skipSilenceEnabled);
  const preferredLanguages = useSettingsStore(s => s.preferredLanguages);

  // ── Subtitles ─────────────────────────────────────────────────────────
  const subtitleFontSize = useSettingsStore(s => s.subtitleFontSize);
  const subtitleTextColor = useSettingsStore(s => s.subtitleTextColor);
  const subtitleBackgroundOpacity = useSettingsStore(
    s => s.subtitleBackgroundOpacity,
  );
  const autoLoadSubtitles = useSettingsStore(s => s.isAutoLoadSubtitlesEnabled);

  // ── Library ───────────────────────────────────────────────────────────
  const mpvOptions = useSettingsStore(s => s.mpvOptions) ?? [];
  const videoFolders = useSettingsStore(s => s.videoFolders) ?? [];
  const audioFolders = useSettingsStore(s => s.audioFolders) ?? [];
  const linkedFolderCount = videoFolders.length + audioFolders.length;

  // ── the five dialogs ──────────────────────────────────────────────────
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [mpvEditorVisible, setMpvEditorVisible] = useState(false);
  const [linkedFoldersDialogVisible, setLinkedFoldersDialogVisible] =
    useState(false);
  const [subtitleLanguageDialogVisible, setSubtitleLanguageDialogVisible] =
    useState(false);
  const [subtitleStyleDialogVisible, setSubtitleStyleDialogVisible] =
    useState(false);

  const handleThemePress = useCallback(() => setThemeDialogVisible(true), []);
  const handleMpvPress = useCallback(() => setMpvEditorVisible(true), []);
  const handleLinkedFoldersPress = useCallback(
    () => setLinkedFoldersDialogVisible(true),
    [],
  );
  const handleSubtitleLanguagePress = useCallback(
    () => setSubtitleLanguageDialogVisible(true),
    [],
  );
  const handleSubtitleStylePress = useCallback(
    () => setSubtitleStyleDialogVisible(true),
    [],
  );

  // ── the labels the rows show ─────────────────────────────────────────
  //
  // The four subtitle sizes and the four background opacities are the
  // app's own bands — the same ones the old Settings page used.
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

  const linkedFoldersLabel = useMemo(
    () =>
      linkedFolderCount > 0
        ? `${linkedFolderCount} folder${linkedFolderCount !== 1 ? 's' : ''}`
        : 'None',
    [linkedFolderCount],
  );

  const mpvOptionsLabel = useMemo(
    () =>
      mpvOptions.length > 0
        ? `${mpvOptions.length} option${mpvOptions.length !== 1 ? 's' : ''} set`
        : 'Default',
    [mpvOptions.length],
  );

  /**
   * The languages as NAMES, not as mpv codes.
   *
   * The row used to show the raw store value — "eng, jpn, und" — while the
   * picker it opens showed "English", "Japanese", "Default (auto)". The
   * names come from the picker's own table, so the row and the dialog
   * cannot drift apart.
   */
  const preferredLanguagesLabel = useMemo(() => {
    const codes = preferredLanguages
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return 'Default';
    return codes
      .map(code => SUBTITLE_LANGUAGES.find(l => l.code === code)?.label ?? code)
      .join(', ');
  }, [preferredLanguages]);

  return {
    // Appearance
    themeMode,
    themeLabel: THEME_LABELS[themeMode] ?? 'System',
    // Playback
    hardwareAcceleration,
    audioNormalization,
    dialogueBoost,
    skipSilenceEnabled,
    preferredLanguages,
    preferredLanguagesLabel,
    // Subtitles
    subtitleFontSize,
    subtitleTextColor,
    subtitleBackgroundOpacity,
    subtitleFontLabel,
    subtitleBgLabel,
    autoLoadSubtitles,
    // Library
    mpvOptions,
    linkedFolderCount,
    linkedFoldersLabel,
    mpvOptionsLabel,
    // the dialogs
    themeDialogVisible,
    setThemeDialogVisible,
    mpvEditorVisible,
    setMpvEditorVisible,
    linkedFoldersDialogVisible,
    setLinkedFoldersDialogVisible,
    subtitleLanguageDialogVisible,
    setSubtitleLanguageDialogVisible,
    subtitleStyleDialogVisible,
    setSubtitleStyleDialogVisible,
    handleThemePress,
    handleMpvPress,
    handleLinkedFoldersPress,
    handleSubtitleLanguagePress,
    handleSubtitleStylePress,
  };
}
