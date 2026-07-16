import {TextStyle, ViewStyle, ImageStyle} from 'react-native';

export interface ThemeTokens {
  // ── Existing (kept for backward compat) ──
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryVariant: string;
  secondary: string;
  text: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  warning: string;
  disabled: string;
  overlay: string;
  shadow: string;
  tabBar: string;
  tabBarInactive: string;
  playerControls: string;
  progressBar: string;
  progressBarTrack: string;
  icon: string;
  iconActive: string;
  transparent: string;

  // ── New: Core backgrounds ──
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // ── New: Glass surfaces ──
  glassBg: string;
  glassBorder: string;
  glassEdge: string;
  logoCircleBg: string;
  logoCircleBorder: string;

  // ── New: Card glass ──
  cardGlassBg: string;
  cardGlassBorder: string;

  // ── New: Accent / Brand (Bronze) ──
  accent: string;
  accentLight: string;
  accentGlow: string;
  accentBorder: string;
  accentDim: string;

  // ── New: Text hierarchy ──
  textTertiary: string;
  textHint: string;

  // ── New: Overlay surfaces ──
  surfaceOverlay: string;
  surfaceRaised: string;
  hoverSubtle: string;

  // ── New: Divider / Border ──
  divider: string;
  borderDim: string;

  // ── New: Controls ──
  osdForeground: string;
  buttonHover: string;

  // ── New: Seek bar ──
  seekTrack: string;
  seekFill: string;
  seekThumb: string;
  seekThumbBorder: string;

  // ── New: Popover / Dialog ──
  popoverBg: string;
  popoverBorder: string;

  // ── New: Gradient stops ──
  warmGlow: string;
  coolGlow: string;

  // ── New: Sheen ──
  glassSheenStart: string;
  glassSheenMid: string;
  glassSheenEnd: string;

  // ── New: Badges ──
  badgeBg: string;
  badgeText: string;

  // ── New: Chips ──
  chipBg: string;
  chipAccentBg: string;

  // ── New: Section ──
  sectionHeader: string;
}

export type NamedStyles<T> = {
  [P in keyof T]: TextStyle | ViewStyle | ImageStyle;
};

export interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeTokens;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
