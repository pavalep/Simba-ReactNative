import {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {useTheme} from '../context/ThemeContext';
import {ThemeTokens, NamedStyles} from '../context/theme.types';

export function makeStyles<T extends NamedStyles<T>>(
  styles: (colors: ThemeTokens) => T,
): () => T {
  return function useStyles(): T {
    const colors = useTheme();
    return useMemo(() => {
      const rawStyles = styles(colors);
      return StyleSheet.create(rawStyles) as T;
    }, [colors]);
  };
}
