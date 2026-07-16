import {ThemeTokens} from './theme.types';
import {palette} from '../constants/colors';

export const lightTheme: ThemeTokens = {
  // ── Existing (kept for backward compat) ──
  background: palette.gray50,
  surface: palette.white,
  surfaceVariant: palette.gray100,
  primary: palette.blue700,
  primaryVariant: palette.blue500,
  secondary: palette.gray700,
  text: palette.gray900,
  textSecondary: palette.gray600,
  textInverse: palette.white,
  border: palette.gray300,
  borderLight: palette.gray200,
  error: palette.red700,
  success: palette.green700,
  warning: palette.orange500,
  disabled: palette.gray400,
  overlay: 'rgba(0,0,0,0.5)',
  shadow: 'rgba(0,0,0,0.1)',
  tabBar: palette.white,
  tabBarInactive: palette.gray500,
  playerControls: 'rgba(0,0,0,0.7)',
  progressBar: palette.blue500,
  progressBarTrack: palette.gray300,
  icon: palette.gray700,
  iconActive: palette.blue500,
  transparent: palette.transparent,

  // ── New: Core backgrounds (light-adapted) ──
  bgPrimary: palette.gray50,
  bgSecondary: palette.gray100,
  bgTertiary: palette.gray200,

  // ── New: Glass surfaces ──
  glassBg: 'rgba(255,255,255,0.70)',
  glassBorder: 'rgba(0,0,0,0.06)',
  glassEdge: 'rgba(0,0,0,0.04)',
  logoCircleBg: 'rgba(212,175,55,0.32)',
  logoCircleBorder: 'rgba(138,111,10,0.16)',

  // ── New: Card glass ──
  cardGlassBg: 'rgba(255,255,255,0.80)',
  cardGlassBorder: 'rgba(0,0,0,0.08)',

  // ── New: Accent / Brand (Bronze) ──
  accent: palette.bronze,
  accentLight: palette.bronzeLight,
  accentGlow: 'rgba(185,140,74,0.15)',
  accentBorder: 'rgba(185,140,74,0.35)',
  accentDim: 'rgba(185,140,74,0.08)',

  // ── New: Text hierarchy ──
  textTertiary: 'rgba(0,0,0,0.40)',
  textHint: 'rgba(0,0,0,0.25)',

  // ── New: Overlay surfaces ──
  surfaceOverlay: 'rgba(240,240,244,0.95)',
  surfaceRaised: 'rgba(0,0,0,0.04)',
  hoverSubtle: 'rgba(0,0,0,0.03)',

  // ── New: Divider / Border ──
  divider: 'rgba(0,0,0,0.08)',
  borderDim: 'rgba(0,0,0,0.12)',

  // ── New: Controls ──
  osdForeground: '#1A1A1A',
  buttonHover: 'rgba(0,0,0,0.06)',

  // ── New: Seek bar ──
  seekTrack: 'rgba(0,0,0,0.12)',
  seekFill: palette.bronze,
  seekThumb: palette.white,
  seekThumbBorder: palette.bronze,

  // ── New: Popover / Dialog ──
  popoverBg: palette.white,
  popoverBorder: 'rgba(0,0,0,0.10)',

  // ── New: Gradient stops ──
  warmGlow: 'rgba(185,140,74,0.04)',
  coolGlow: 'rgba(0,0,0,0.01)',

  // ── New: Sheen ──
  glassSheenStart: 'rgba(255,255,255,0.80)',
  glassSheenMid: 'rgba(255,255,255,0.50)',
  glassSheenEnd: 'rgba(255,255,255,0.30)',

  // ── New: Badges ──
  badgeBg: 'rgba(255,255,255,0.90)',
  badgeText: 'rgba(0,0,0,0.80)',

  // ── New: Chips ──
  chipBg: 'rgba(0,0,0,0.06)',
  chipAccentBg: 'rgba(185,140,74,0.08)',

  // ── New: Section ──
  sectionHeader: 'rgba(0,0,0,0.30)',
};

export const darkTheme: ThemeTokens = {
  // ── Existing (kept for backward compat) ──
  background: palette.gray900,
  surface: palette.gray800,
  surfaceVariant: palette.gray700,
  primary: palette.blue200,
  primaryVariant: palette.blue500,
  secondary: palette.gray400,
  text: palette.gray100,
  textSecondary: palette.gray500,
  textInverse: palette.gray900,
  border: palette.gray700,
  borderLight: palette.gray600,
  error: palette.red500,
  success: palette.green500,
  warning: palette.orange500,
  disabled: palette.gray600,
  overlay: 'rgba(0,0,0,0.7)',
  shadow: 'rgba(0,0,0,0.3)',
  tabBar: palette.gray800,
  tabBarInactive: palette.gray500,
  playerControls: 'rgba(0,0,0,0.85)',
  progressBar: palette.blue200,
  progressBarTrack: palette.gray600,
  icon: palette.gray400,
  iconActive: palette.blue200,
  transparent: palette.transparent,

  // ── New: Core backgrounds (dark — mockup values) ──
  bgPrimary: palette.charcoal,
  bgSecondary: palette.charcoalLight,
  bgTertiary: palette.charcoalLighter,

  // ── New: Glass surfaces ──
  glassBg: 'rgba(255,255,255,0.035)',
  glassBorder: 'rgba(255,255,255,0.05)',
  glassEdge: 'rgba(255,255,255,0.04)',
  logoCircleBg: 'rgba(0,0,0,0.45)',
  logoCircleBorder: 'rgba(255,255,255,0.10)',

  // ── New: Card glass ──
  cardGlassBg: 'rgba(255,255,255,0.04)',
  cardGlassBorder: 'rgba(255,255,255,0.06)',

  // ── New: Accent / Brand (Bronze) ──
  accent: palette.bronze,
  accentLight: palette.bronzeLight,
  accentGlow: palette.bronzeGlow,
  accentBorder: palette.bronzeBorder,
  accentDim: palette.bronzeDim,

  // ── New: Text hierarchy ──
  textTertiary: 'rgba(235,235,235,0.40)',
  textHint: 'rgba(235,235,235,0.30)',

  // ── New: Overlay surfaces ──
  surfaceOverlay: 'rgba(20,20,24,0.92)',
  surfaceRaised: 'rgba(255,255,255,0.08)',
  hoverSubtle: 'rgba(255,255,255,0.04)',

  // ── New: Divider / Border ──
  divider: 'rgba(255,255,255,0.06)',
  borderDim: 'rgba(255,255,255,0.08)',

  // ── New: Controls ──
  osdForeground: '#EBEBEB',
  buttonHover: 'rgba(255,255,255,0.08)',

  // ── New: Seek bar ──
  seekTrack: 'rgba(255,255,255,0.12)',
  seekFill: palette.bronze,
  seekThumb: '#141416',
  seekThumbBorder: palette.bronze,

  // ── New: Popover / Dialog ──
  popoverBg: 'rgba(28,28,32,0.95)',
  popoverBorder: 'rgba(255,255,255,0.08)',

  // ── New: Gradient stops ──
  warmGlow: 'rgba(201,169,110,0.07)',
  coolGlow: 'rgba(255,255,255,0.015)',

  // ── New: Sheen ──
  glassSheenStart: 'rgba(255,255,255,0.06)',
  glassSheenMid: 'rgba(255,255,255,0.02)',
  glassSheenEnd: 'rgba(255,255,255,0.00)',

  // ── New: Badges ──
  badgeBg: 'rgba(10,10,12,0.67)',
  badgeText: 'rgba(255,255,255,0.80)',

  // ── New: Chips ──
  chipBg: 'rgba(255,255,255,0.08)',
  chipAccentBg: 'rgba(201,169,110,0.10)',

  // ── New: Section ──
  sectionHeader: 'rgba(235,235,235,0.30)',
};
