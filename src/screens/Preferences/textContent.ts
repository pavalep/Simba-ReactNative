/**
 * Preferences screen — quick-access settings for appearance, playback, and accessibility.
 */
const textContent = {
  headerTitle: 'Preferences',
  fullSettings: 'Full Settings',
  fullSettingsDesc: 'Playback, library, audio, and appearance',
  sectionAppearance: 'Appearance',
  themeMode: 'Theme Mode',
  themeModeDesc: 'Choose between Dark, Light, or System default',
  sectionPlayback: 'Playback',
  hardwareAccel: 'Hardware Acceleration',
  hardwareAccelDesc: 'Use GPU for video decoding and rendering',
  rememberPosition: 'Remember Position',
  rememberPositionDesc: 'Resume playback from where you left off',
  audioSettings: 'Audio Settings',
  audioSettingsDesc: 'Equalizer, normalization, and audio output',
  sectionAccessibility: 'Accessibility',
  largerControls: 'Larger Controls',
  largerControlsDesc: 'Increase the size of on-screen controls',
  highContrastSubtitles: 'High-Contrast Subtitles',
  highContrastSubtitlesDesc: 'Improve subtitle readability with higher contrast',
  sectionAdvanced: 'Advanced',
  about: 'About',
  aboutDesc: 'Version, licenses, and app information',
  resetToDefaults: 'Reset to Defaults',
  resetToDefaultsDesc: 'Restore all settings to their original values',
  reset: 'Reset',
  alertAppearanceTitle: 'Appearance',
  alertAppearanceMessage: 'Choose your preferred theme mode',
  dark: 'Dark',
  light: 'Light',
  system: 'System',
  cancel: 'Cancel',
  alertResetTitle: 'Reset to Defaults',
  alertResetMessage:
    'This will reset all preferences to their default values. This action cannot be undone.',
  resetDestructive: 'Reset',
} as const;

export default textContent;
