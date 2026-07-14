import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {useColorScheme} from 'react-native';
import {lightTheme, darkTheme} from './themes';
import {ThemeContextType, ThemeTokens} from './theme.types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<'light' | 'dark'>(
    systemScheme === 'dark' ? 'dark' : 'light',
  );

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
  }, []);

  const colors = theme === 'light' ? lightTheme : darkTheme;

  const value = useMemo(
    () => ({theme, toggleTheme, setTheme, colors}),
    [theme, toggleTheme, setTheme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeTokens => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx.theme === 'light' ? lightTheme : darkTheme;
};

export const useThemeContext = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return ctx;
};

export const useColors = (): ThemeTokens => useTheme();
