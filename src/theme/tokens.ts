// ────────────────────────────────────────────────────────
// Simba Player — Design Tokens (Atlas Spec v1.0)
// ────────────────────────────────────────────────────────
// Do NOT edit inline. Changes must go through the Atlas.

import {TextStyle, ViewStyle, ImageStyle} from 'react-native';

// ─── Color Tokens ────────────────────────────────────────

export interface ColorTokens {
  background: {
    primary: string;
    elevated: string;
    floating: string;
    overlay: string;
  };
  border: {
    subtle: string;
    emphasis: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  accent: {
    gold: string;
    goldDim: string;
    goldGlow: string;
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
  };
}

export const darkColors: ColorTokens = {
  background: {
    primary: '#0A0A0C',
    elevated: '#141416',
    floating: 'rgba(0,0,0,0.55)',
    overlay: 'rgba(10,10,12,0.85)',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    emphasis: 'rgba(255,255,255,0.10)',
  },
  text: {
    primary: '#EDEDED',
    secondary: 'rgba(237,237,237,0.55)',
    tertiary: 'rgba(237,237,237,0.30)',
  },
  accent: {
    gold: '#C9A84C',
    goldDim: 'rgba(201,168,76,0.15)',
    goldGlow: 'rgba(201,168,76,0.25)',
  },
  semantic: {
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',
  },
};

export const lightColors: ColorTokens = {
  background: {
    primary: '#F5F0E8',
    elevated: '#FFFFFF',
    floating: 'rgba(245,240,232,0.90)',
    overlay: 'rgba(245,240,232,0.88)',
  },
  border: {
    subtle: 'rgba(0,0,0,0.06)',
    emphasis: 'rgba(0,0,0,0.08)',
  },
  text: {
    primary: '#1A1A1C',
    secondary: 'rgba(26,26,28,0.55)',
    tertiary: 'rgba(26,26,28,0.30)',
  },
  accent: {
    gold: '#B8922E',
    goldDim: 'rgba(184,146,46,0.12)',
    goldGlow: 'rgba(184,146,46,0.20)',
  },
  semantic: {
    success: '#4CAF50',
    error: '#EF5350',
    warning: '#FFA726',
  },
};

// ─── Typography Tokens ────────────────────────────────────

export interface TypographyTokens {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  caption: TextStyle;
  overline: TextStyle;
  mono: TextStyle;
}

export const typography: TypographyTokens = {
  h1: {fontSize: 32, fontWeight: '700', lineHeight: 40},
  h2: {fontSize: 24, fontWeight: '700', lineHeight: 32},
  h3: {fontSize: 20, fontWeight: '600', lineHeight: 28},
  body1: {fontSize: 17, fontWeight: '400', lineHeight: 24},
  body2: {fontSize: 15, fontWeight: '400', lineHeight: 22},
  caption: {fontSize: 13, fontWeight: '400', lineHeight: 18},
  overline: {fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5},
  mono: {fontSize: 14, fontWeight: '400', lineHeight: 20, fontFamily: 'monospace'},
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
  pill: number;
}

export const radius: RadiusTokens = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
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
