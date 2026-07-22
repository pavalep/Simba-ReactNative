// ────────────────────────────────────────────────────────
// Simba Player — Theme Provider & Hooks
// ────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {useColorScheme} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import type {RootState} from '../store';
import {setThemeMode as setThemeModeAction} from '../store/slices/settingsSlice';
import {
  darkTokens,
  lightTokens,
  type FullThemeTokens,
  type LegacyThemeTokens,
  type SpacingTokens,
  type TypographyTokens,
  type ShadowTokens,
  type RadiusTokens,
  type MotionTokens,
  type ColorTokens,
  legacyFromTokens,
} from './tokens';

// ─── Types ────────────────────────────────────────────────

type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeContextValue {
  /** Resolved theme name */
  theme: 'dark' | 'light';
  /** Full new token set */
  tokens: FullThemeTokens;
  /** Shortcut to tokens.colors */
  colors: ColorTokens;
  /** Legacy flat token map (for backward compat) */
  legacy: LegacyThemeTokens;
  /** Shortcut to tokens.spacing */
  spacing: SpacingTokens;
  /** Shortcut to tokens.typography */
  typography: TypographyTokens;
  /** Shortcut to tokens.shadows */
  shadows: ShadowTokens;
  /** Shortcut to tokens.radius */
  radius: RadiusTokens;
  /** Shortcut to tokens.motion */
  motion: MotionTokens;
  /** Whether currently in dark mode */
  isDark: boolean;
  /** Set theme mode: 'dark' | 'light' | 'system' */
  setTheme: (mode: ThemeMode) => void;
  /** Current theme mode from Redux */
  themeMode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const dispatch = useDispatch();
  const themeMode = useSelector(
    (state: RootState) => state.settings.themeMode,
  );
  const systemScheme = useColorScheme();

  const resolvedTheme: 'dark' | 'light' = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  const tokens = resolvedTheme === 'dark' ? darkTokens : lightTokens;
  const legacy = useMemo(() => legacyFromTokens(tokens), [tokens]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      dispatch(setThemeModeAction(mode));
    },
    [dispatch],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolvedTheme,
      tokens,
      colors: tokens.colors,
      legacy,
      spacing: tokens.spacing,
      typography: tokens.typography,
      shadows: tokens.shadows,
      radius: tokens.radius,
      motion: tokens.motion,
      isDark: resolvedTheme === 'dark',
      setTheme,
      themeMode,
    }),
    [resolvedTheme, tokens, legacy, setTheme, themeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// ─── Hooks ────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

/** Alias of useTheme — returns the full context value.
 *  Code that previously called useTheme() expecting ThemeTokens
 *  should switch to .legacy or .tokens as needed. */
export function useThemeContext(): ThemeContextValue {
  return useTheme();
}

/** Returns the legacy flat ThemeTokens object for backward compat.
 *  New code should use useTheme() and access .tokens or .colors directly. */
export function useColors(): LegacyThemeTokens {
  return useTheme().legacy;
}
