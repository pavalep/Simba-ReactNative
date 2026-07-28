import React from 'react';
import {useTheme} from '../../../theme';
import {ErrorBoundary, FallbackColors} from '../../../app/ErrorBoundary';

interface ScreenErrorBoundaryProps {
  children: React.ReactNode;
  onGoBack?: () => void;
}

/**
 * Wraps its children in an ErrorBoundary with theme-aware fallback colors.
 * Optionally accepts an `onGoBack` callback shown in the error fallback UI.
 *
 * Usage in a navigator:
 *   <ScreenErrorBoundary onGoBack={() => navigation.goBack()}>
 *     <SomeScreen />
 *   </ScreenErrorBoundary>
 */
export const ScreenErrorBoundary: React.FC<ScreenErrorBoundaryProps> = ({
  children,
  onGoBack,
}) => {
  const {colors} = useTheme();

  const fallbackColors: FallbackColors = {
    background: colors.background.primary,
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    accent: colors.accent.gold,
    border: colors.border.subtle,
    accentDim: colors.accent.goldDim,
  };

  return (
    <ErrorBoundary fallbackColors={fallbackColors} onGoBack={onGoBack}>
      {children}
    </ErrorBoundary>
  );
};
