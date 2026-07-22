import React, {Component, ErrorInfo, ReactNode} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {AppText} from '../components/core/AppText/AppText';

// ─── Types ────────────────────────────────────────────────

export interface FallbackColors {
  background: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  accentDim: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackColors: FallbackColors;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

// ─── Component ────────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({errorInfo});
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({showDetails: !prev.showDetails}));
  };

  render() {
    if (this.state.hasError) {
      const {background, text, textSecondary, accent, border, accentDim} =
        this.props.fallbackColors;

      return (
        <View style={[styles.container, {backgroundColor: background}]}>
          {/* Icon */}
          <View style={[styles.iconContainer, {backgroundColor: accentDim}]}>
            <AppText
              style={[styles.iconText, {color: accent}]}
              variant="h1">
              !
            </AppText>
          </View>

          {/* Message */}
          <AppText variant="h2" style={[styles.title, {color: text}]}>
            Something went wrong
          </AppText>
          <AppText
            variant="body2"
            style={[styles.message, {color: textSecondary}]}>
            An unexpected error has occurred. Please try again or restart the
            app.
          </AppText>

          {/* Retry button */}
          <TouchableOpacity
            style={[styles.retryButton, {backgroundColor: accent}]}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try Again">
            <AppText
              variant="body2"
              style={[styles.retryText, {color: background}]}>
              Try Again
            </AppText>
          </TouchableOpacity>

          {/* Error details toggle */}
          {this.state.error && (
            <TouchableOpacity
              onPress={this.toggleDetails}
              style={styles.detailsToggle}
              accessibilityRole="button"
              accessibilityLabel={
                this.state.showDetails
                  ? 'Hide error details'
                  : 'Show error details'
              }>
              <AppText
                variant="caption"
                style={[{color: textSecondary}]}>
                {this.state.showDetails ? 'Hide Details' : 'Show Details'}
              </AppText>
            </TouchableOpacity>
          )}

          {/* Collapsible details */}
          {this.state.showDetails && this.state.error && (
            <ScrollView
              style={[
                styles.detailsContainer,
                {backgroundColor: border + '15', borderColor: border},
              ]}
              nestedScrollEnabled>
              <AppText variant="mono" style={[styles.detailText, {color: textSecondary}]}>
                {this.state.error.toString()}
              </AppText>
              {this.state.errorInfo && (
                <AppText
                  variant="mono"
                  style={[
                    styles.detailText,
                    {color: textSecondary, marginTop: 8},
                  ]}>
                  {this.state.errorInfo.componentStack}
                </AppText>
              )}
            </ScrollView>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontWeight: '700',
    fontSize: 36,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    minWidth: 160,
    alignItems: 'center',
  },
  retryText: {
    fontWeight: '600',
  },
  detailsToggle: {
    paddingVertical: 8,
  },
  detailsContainer: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
    width: '100%',
  },
  detailText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
