export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  blue50: '#E3F2FD',
  blue100: '#BBDEFB',
  blue200: '#90CAF9',
  blue500: '#2196F3',
  blue700: '#1976D2',
  red500: '#F44336',
  red700: '#D32F2F',
  green500: '#4CAF50',
  green700: '#388E3C',
  orange500: '#FF9800',
  yellow500: '#FFEB3B',
  transparent: 'transparent',

  // ── New: Bronze / Accent ──
  bronze: '#B88C4A',
  bronzeLight: '#C9A96E',
  bronzeGlow: 'rgba(185,140,74,0.25)',
  bronzeBorder: 'rgba(201,169,110,0.27)',
  bronzeDim: 'rgba(201,169,110,0.12)',

  // ── New: Dark charcoal backgrounds ──
  charcoal: '#08080A',
  charcoalLight: '#0C0C0E',
  charcoalLighter: '#0F0F12',
} as const;

export type PaletteKey = keyof typeof palette;
