/* ═══════════════════════════════════════════════════
   Mockup Theme — Simba / SIMBA Mobile
   Design tokens extracted from the Avalonia desktop app
   ═══════════════════════════════════════════════════ */

// ── Palette ────────────────────────────────────────
export const colors = {
  // Core backgrounds
  bgPrimary: '#08080A',
  bgSecondary: '#0C0C0E',
  bgTertiary: '#0F0F12',

  // Glass surfaces
  glassBg: 'rgba(255,255,255,0.035)',
  glassBorder: 'rgba(255,255,255,0.05)',
  glassEdge: 'rgba(255,255,255,0.04)',

  // Card glass
  cardGlassBg: 'rgba(255,255,255,0.04)',
  cardGlassBorder: 'rgba(255,255,255,0.06)',

  // Accent / Brand (Bronze / Gold)
  accent: '#B88C4A',
  accentLight: '#C9A96E',
  accentGlow: 'rgba(185,140,74,0.25)',
  accentBorder: 'rgba(201,169,110,0.27)',
  accentDim: 'rgba(201,169,110,0.12)',

  // Text hierarchy
  textPrimary: '#EBEBEB',
  textSecondary: 'rgba(235,235,235,0.65)',
  textTertiary: 'rgba(235,235,235,0.40)',
  textHint: 'rgba(235,235,235,0.30)',

  // Overlay surfaces
  surfaceOverlay: 'rgba(20,20,24,0.92)',
  surfaceRaised: 'rgba(255,255,255,0.08)',
  hoverSubtle: 'rgba(255,255,255,0.04)',

  // Divider / Border
  divider: 'rgba(255,255,255,0.06)',
  borderDim: 'rgba(255,255,255,0.08)',

  // Controls
  osdForeground: '#EBEBEB',
  buttonHover: 'rgba(255,255,255,0.08)',

  // Seek bar
  seekTrack: 'rgba(255,255,255,0.12)',
  seekFill: '#B88C4A',
  seekThumb: '#141416',
  seekThumbBorder: '#B88C4A',

  // Popover / Dialog
  popoverBg: 'rgba(28,28,32,0.95)',
  popoverBorder: 'rgba(255,255,255,0.08)',

  // Gradient stops
  warmGlow: 'rgba(201,169,110,0.07)',
  coolGlow: 'rgba(255,255,255,0.015)',

  // Sheen
  glassSheenStart: 'rgba(255,255,255,0.06)',
  glassSheenMid: 'rgba(255,255,255,0.02)',
  glassSheenEnd: 'rgba(255,255,255,0.00)',

  // Preview / Info badges
  badgeBg: 'rgba(10,10,12,0.67)',
  badgeText: 'rgba(255,255,255,0.80)',

  // Tag / filter chips
  chipBg: 'rgba(255,255,255,0.08)',
  chipAccentBg: 'rgba(201,169,110,0.10)',

  // Section
  sectionHeader: 'rgba(235,235,235,0.30)',
}

// ── Typography ─────────────────────────────────────
export const typography = {
  display: {
    fontFamily: 'System',
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: 6,
  },
  wordmark: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 4,
  },
  subtitle1: {
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  body1: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  body2: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  overline: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  small: {
    fontSize: 9,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'] as const,
  },
}

// ── Spacing ────────────────────────────────────────
export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
}

// ── Radius ─────────────────────────────────────────
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

// ── Shadows (iOS) ──────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#B88C4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
}

// ── Sizing ─────────────────────────────────────────
export const sizes = {
  headerBar: 48,
  controlsBox: 74,
  seekBarHeight: 16,
  controlBtn: 36,
  transportBtn: 42,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
}
