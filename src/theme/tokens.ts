// ────────────────────────────────────────────────────────
// Simba Player — Design Tokens (Atlas Spec v1.0)
// ────────────────────────────────────────────────────────
// Do NOT edit inline. Changes must go through the Atlas.

import {TextStyle, ViewStyle, ImageStyle} from 'react-native';
import {FONT_FAMILY} from '../constants/fontFamily';

// ─── Color Tokens ────────────────────────────────────────

export interface ColorTokens {
  background: {
    primary: string;
    elevated: string;
    floating: string;
    overlay: string;
    glass: string;
    /** 55.2: dark scrims layered over artwork/hero imagery */
    scrim: string;
    scrimMid: string;
    scrimStrong: string;
    scrimOpaque: string;
    /** 55.2b: media-layer scrims — hero gradients, overlay scrims */
    scrimFaint: string;
    scrimSoft: string;
    scrimDim: string;
    scrimDeep: string;
    /** 55.2b: near-black surface for video overlay cards (always dark) */
    surfaceDark: string;
    /** 55.2b: warm parchment start for light-mode hero gradients */
    warm: string;
    /** 55.2: translucent white fill for chips/highlights over media */
    highlight: string;
    highlightDim: string;
    /** 55.2b: stronger white fill — media chips, progress tracks over artwork */
    highlightStrong: string;
  };
  border: {
    subtle: string;
    emphasis: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    /** 55.2: pure white — on-image/on-artwork labels, thumbs */
    bright: string;
    /** 55.2b: white-on-media text at 80%/70% (hero cards, overlays) */
    onMediaSoft: string;
    onMediaMuted: string;
  };
  accent: {
    gold: string;
    goldDim: string;
    goldGlow: string;
    /** 55.2: like/heart accent (pink) */
    love: string;
    /** 55.2b: gold fills — faint/soft/wash steps of goldDim */
    goldFaint: string;
    goldSoft: string;
    goldWash: string;
    /** 55.2b: sky blue — video-type indicators */
    sky: string;
  };
  /** 55.2: shadow color used with elevation/shadow styles */
  shadow: string;
  semantic: {
    success: string;
    error: string;
    warning: string;
    /** 55.2b: translucent error fill (remove buttons, badges) */
    errorDim: string;
  };
}

export const darkColors: ColorTokens = {
  background: {
    primary: '#0A0A0C',
    elevated: '#141416',
    floating: 'rgba(0,0,0,0.55)',
    overlay: 'rgba(10,10,12,0.85)',
    glass: 'rgba(20,20,22,0.65)',
    scrim: 'rgba(10,10,12,0.50)',
    scrimMid: 'rgba(10,10,12,0.78)',
    scrimStrong: 'rgba(10,10,12,0.92)',
    scrimOpaque: 'rgba(10,10,12,0.98)',
    scrimFaint: 'rgba(0,0,0,0.10)',
    scrimSoft: 'rgba(0,0,0,0.20)',
    scrimDim: 'rgba(0,0,0,0.45)',
    scrimDeep: 'rgba(0,0,0,0.65)',
    surfaceDark: 'rgba(18,18,22,0.92)',
    warm: 'rgba(240,235,225,0.95)',
    highlight: 'rgba(255,255,255,0.08)',
    highlightDim: 'rgba(255,255,255,0.04)',
    highlightStrong: 'rgba(255,255,255,0.15)',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    emphasis: 'rgba(255,255,255,0.12)',
  },
  text: {
    primary: '#EDEDED',
    secondary: 'rgba(237,237,237,0.55)',
    tertiary: 'rgba(237,237,237,0.30)',
    inverse: '#0A0A0C',
    bright: '#FFFFFF',
    onMediaSoft: 'rgba(255,255,255,0.80)',
    onMediaMuted: 'rgba(255,255,255,0.70)',
  },
  accent: {
    gold: '#C9A84C',
    goldDim: 'rgba(201,168,76,0.15)',
    goldGlow: 'rgba(201,168,76,0.25)',
    love: '#FF2D55',
    goldFaint: 'rgba(201,168,76,0.06)',
    goldSoft: 'rgba(201,168,76,0.10)',
    goldWash: 'rgba(201,168,76,0.18)',
    sky: 'rgba(100,181,246,0.15)',
  },
  semantic: {
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',
    errorDim: 'rgba(239,83,80,0.15)',
  },
  shadow: '#000000',
};

export const lightColors: ColorTokens = {
  background: {
    primary: '#F5F0E8',
    elevated: '#FFFFFF',
    floating: 'rgba(245,240,232,0.90)',
    overlay: 'rgba(245,240,232,0.88)',
    glass: 'rgba(255,255,255,0.70)',
    scrim: 'rgba(10,10,12,0.35)',
    scrimMid: 'rgba(10,10,12,0.60)',
    scrimStrong: 'rgba(10,10,12,0.78)',
    scrimOpaque: 'rgba(10,10,12,0.90)',
    scrimFaint: 'rgba(0,0,0,0.08)',
    scrimSoft: 'rgba(0,0,0,0.15)',
    scrimDim: 'rgba(0,0,0,0.40)',
    scrimDeep: 'rgba(0,0,0,0.60)',
    surfaceDark: 'rgba(18,18,22,0.92)',
    warm: 'rgba(240,235,225,0.95)',
    highlight: 'rgba(0,0,0,0.05)',
    highlightDim: 'rgba(0,0,0,0.03)',
    highlightStrong: 'rgba(0,0,0,0.12)',
  },
  border: {
    subtle: 'rgba(0,0,0,0.06)',
    emphasis: 'rgba(0,0,0,0.10)',
  },
  text: {
    primary: '#1A1A1C',
    secondary: 'rgba(26,26,28,0.55)',
    tertiary: 'rgba(26,26,28,0.30)',
    inverse: '#1A1A1C',
    bright: '#FFFFFF',
    onMediaSoft: 'rgba(255,255,255,0.80)',
    onMediaMuted: 'rgba(255,255,255,0.70)',
  },
  accent: {
    gold: '#B8922E',
    goldDim: 'rgba(184,146,46,0.12)',
    goldGlow: 'rgba(184,146,46,0.20)',
    love: '#E02447',
    goldFaint: 'rgba(184,146,46,0.06)',
    goldSoft: 'rgba(184,146,46,0.08)',
    goldWash: 'rgba(184,146,46,0.12)',
    sky: 'rgba(66,133,244,0.12)',
  },
  semantic: {
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',
    errorDim: 'rgba(211,47,47,0.12)',
  },
  shadow: '#000000',
};

// ─── Typography Tokens ────────────────────────────────────
// v8 architecture. Every variant declares its `fontFamily` via
// the v8 per-weight `FONT_FAMILY` keys (src/constants/fontFamily.ts)
// — never as a hard-coded string, never with a `fontWeight` field.
//
// The `fontWeight` axis has been REMOVED from the typography
// tokens. Why: Android's font-weight picker is biased to Bold for
// weights > 500 when the family has only 2 weight files. So
// (fontFamily: Manrope + fontWeight: 600) resolved to
// Manrope-Bold.ttf (chunky) instead of Manrope-SemiBold.ttf
// (the spec's intent). Encoding the weight in the family key
// eliminates the cross-axis ambiguity — there's only one TTF
// per `(family, style)` tuple, so the pick is deterministic.
//
// See `md/UI_UX_Elevation_Specification_v8.md` §2 for the full
// rationale and the Android picker bug analysis.

export interface TypographyTokens {
  // v3 Atlas variants (Inter, workhorse) — weight encoded in the
  // family key (e.g. `FONT_FAMILY.inter.bold` → Inter-Bold.ttf).
  display: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  bodySmall: TextStyle;
  caption: TextStyle;
  overline: TextStyle;
  button: TextStyle;
  tab: TextStyle;
  // Mono (JetBrains Mono)
  mono: TextStyle;
  // v7 NEW: brand wordmark (Allura, single weight).
  brandScript: TextStyle;
  // v7 NEW: cinematic display / hero titles (Cormorant Garamond Bold).
  displaySerif: TextStyle;
  // v7 NEW: section titles (Manrope SemiBold).
  displaySans: TextStyle;
}

export const typography: TypographyTokens = {
  // v3 Atlas variants — all Inter, weight picked via family key.
  display:     {fontFamily: FONT_FAMILY.inter.bold,     fontSize: 36, lineHeight: 44},
  h1:          {fontFamily: FONT_FAMILY.inter.bold,     fontSize: 32, lineHeight: 40},
  h2:          {fontFamily: FONT_FAMILY.inter.bold,     fontSize: 24, lineHeight: 32},
  h3:          {fontFamily: FONT_FAMILY.inter.semibold, fontSize: 20, lineHeight: 28},
  body1:       {fontFamily: FONT_FAMILY.inter.regular,  fontSize: 17, lineHeight: 24},
  body2:       {fontFamily: FONT_FAMILY.inter.regular,  fontSize: 15, lineHeight: 22},
  bodySmall:   {fontFamily: FONT_FAMILY.inter.regular,  fontSize: 14, lineHeight: 20},
  caption:     {fontFamily: FONT_FAMILY.inter.regular,  fontSize: 13, lineHeight: 18},
  overline:    {fontFamily: FONT_FAMILY.inter.medium,   fontSize: 11, lineHeight: 16, letterSpacing: 0.5},
  button:      {fontFamily: FONT_FAMILY.inter.semibold, fontSize: 15, lineHeight: 22, letterSpacing: 0.3},
  tab:         {fontFamily: FONT_FAMILY.inter.medium,   fontSize: 13, lineHeight: 18, letterSpacing: 0.2},
  mono:        {fontFamily: FONT_FAMILY.jetbrainsMono.regular, fontSize: 13, lineHeight: 20},
  // v7 NEW: brand wordmark — Allura, single weight, no fontWeight field.
  brandScript: {fontFamily: FONT_FAMILY.allura,           fontSize: 48, lineHeight: 56},
  // v7 NEW: cinematic display — Cormorant Garamond Bold.
  displaySerif:{fontFamily: FONT_FAMILY.cormorant.bold,   fontSize: 48, lineHeight: 56},
  // v7 NEW: section titles — Manrope SemiBold.
  displaySans: {fontFamily: FONT_FAMILY.manrope.semibold, fontSize: 22, lineHeight: 28},
};

// ─── Spacing Tokens (4pt Grid) ────────────────────────────

export interface SpacingTokens {
  xs: number; // 4px
  sm: number; // 8px
  md: number; // 12px
  lg: number; // 16px
  xl: number; // 20px
  xxl: number; // 24px
  xxxl: number; // 32px
}

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ─── Border Radius Tokens ─────────────────────────────────

export interface RadiusTokens {
  none: number;
  sm: number;
  md: number;
  lg: number;
  full: number;
  pill: number;
}

export const radius: RadiusTokens = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
  pill: 9999,
};

// ─── Shadow Tokens ────────────────────────────────────────

export interface ShadowTokens {
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  gold: ViewStyle;
}

export const darkShadows: ShadowTokens = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 12,
  },
  gold: {
    shadowColor: '#C9A84C',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
};

export const lightShadows: ShadowTokens = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  gold: {
    shadowColor: '#B8922E',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
};

// ─── Motion Tokens ────────────────────────────────────────

export interface MotionTokens {
  duration: {
    fast: number;
    normal: number;
    slow: number;
    glacial: number;
  };
}

export const motion: MotionTokens = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    glacial: 500,
  },
};

// ─── Full Theme Token Set ─────────────────────────────────

export interface FullThemeTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  motion: MotionTokens;
  isDark: boolean;
}

export const darkTokens: FullThemeTokens = {
  colors: darkColors,
  typography,
  spacing,
  radius,
  shadows: darkShadows,
  motion,
  isDark: true,
};

export const lightTokens: FullThemeTokens = {
  colors: lightColors,
  typography,
  spacing,
  radius,
  shadows: lightShadows,
  motion,
  isDark: false,
};

// ─── mergeTokens Utility ──────────────────────────────────

export function mergeTokens(
  base: FullThemeTokens,
  overrides: Partial<FullThemeTokens>,
): FullThemeTokens {
  return {
    ...base,
    ...overrides,
    colors: overrides.colors
      ? {...base.colors, ...overrides.colors}
      : base.colors,
    typography: overrides.typography
      ? {...base.typography, ...overrides.typography}
      : base.typography,
    spacing: overrides.spacing
      ? {...base.spacing, ...overrides.spacing}
      : base.spacing,
    radius: overrides.radius
      ? {...base.radius, ...overrides.radius}
      : base.radius,
    shadows: overrides.shadows
      ? {...base.shadows, ...overrides.shadows}
      : base.shadows,
    motion: overrides.motion
      ? {...base.motion, ...overrides.motion}
      : base.motion,
  };
}

// ─── Backward Compat: Old ThemeTokens (Legacy) ────────────
// Keep until all old components are migrated.

export interface LegacyThemeTokens {
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
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  glassBg: string;
  glassBorder: string;
  glassEdge: string;
  logoCircleBg: string;
  logoCircleBorder: string;
  cardGlassBg: string;
  cardGlassBorder: string;
  accent: string;
  accentLight: string;
  accentGlow: string;
  accentBorder: string;
  accentDim: string;
  textTertiary: string;
  textHint: string;
  surfaceOverlay: string;
  surfaceRaised: string;
  hoverSubtle: string;
  divider: string;
  borderDim: string;
  osdForeground: string;
  buttonHover: string;
  seekTrack: string;
  seekFill: string;
  seekThumb: string;
  seekThumbBorder: string;
  popoverBg: string;
  popoverBorder: string;
  warmGlow: string;
  coolGlow: string;
  glassSheenStart: string;
  glassSheenMid: string;
  glassSheenEnd: string;
  badgeBg: string;
  badgeText: string;
  chipBg: string;
  chipAccentBg: string;
  sectionHeader: string;
}

export function legacyFromTokens(tokens: FullThemeTokens): LegacyThemeTokens {
  const {colors} = tokens;
  return {
    background: colors.background.primary,
    surface: colors.background.elevated,
    surfaceVariant: colors.background.elevated,
    primary: colors.accent.gold,
    primaryVariant: colors.accent.gold,
    secondary: colors.text.secondary,
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    textInverse: colors.background.primary,
    border: colors.border.emphasis,
    borderLight: colors.border.subtle,
    error: colors.semantic.error,
    success: colors.semantic.success,
    warning: colors.semantic.warning,
    disabled: colors.text.tertiary,
    overlay: colors.background.overlay,
    shadow: tokens.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
    tabBar: colors.background.floating,
    tabBarInactive: colors.text.tertiary,
    playerControls: colors.background.floating,
    progressBar: colors.accent.gold,
    progressBarTrack: colors.text.tertiary,
    icon: colors.text.secondary,
    iconActive: colors.accent.gold,
    transparent: 'transparent',
    bgPrimary: colors.background.primary,
    bgSecondary: colors.background.elevated,
    bgTertiary: colors.border.emphasis,
    glassBg: colors.background.floating,
    glassBorder: colors.border.subtle,
    glassEdge: colors.border.subtle,
    logoCircleBg: colors.accent.goldDim,
    logoCircleBorder: colors.accent.goldDim,
    cardGlassBg: colors.background.elevated,
    cardGlassBorder: colors.border.emphasis,
    accent: colors.accent.gold,
    accentLight: colors.accent.gold,
    accentGlow: colors.accent.goldGlow,
    accentBorder: colors.accent.goldDim,
    accentDim: colors.accent.goldDim,
    textTertiary: colors.text.tertiary,
    textHint: colors.text.tertiary,
    surfaceOverlay: colors.background.overlay,
    surfaceRaised: colors.background.elevated,
    hoverSubtle: colors.border.subtle,
    divider: colors.border.subtle,
    borderDim: colors.border.emphasis,
    osdForeground: colors.text.primary,
    buttonHover: colors.accent.goldDim,
    seekTrack: colors.text.tertiary,
    seekFill: colors.accent.gold,
    seekThumb: colors.accent.gold,
    seekThumbBorder: colors.accent.gold,
    popoverBg: colors.background.elevated,
    popoverBorder: colors.border.emphasis,
    warmGlow: colors.accent.goldDim,
    coolGlow: colors.border.subtle,
    glassSheenStart: colors.background.floating,
    glassSheenMid: colors.border.subtle,
    glassSheenEnd: colors.background.primary,
    badgeBg: colors.accent.gold,
    badgeText: colors.background.primary,
    chipBg: colors.border.subtle,
    chipAccentBg: colors.accent.goldDim,
    sectionHeader: colors.text.secondary,
  };
}

// ─── Re-export NamedStyles for backward compat ────────────

export type NamedStyles<T> = {
  [P in keyof T]: TextStyle | ViewStyle | ImageStyle;
};
