// ────────────────────────────────────────────────────────
// Simba Player — KeyboardAwareView Core Component (53.4)
// Single shared keyboard-avoiding wrapper (previously the
// same Platform check was copy-pasted across 6 files).
// ────────────────────────────────────────────────────────

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}

export const KeyboardAwareView: React.FC<KeyboardAwareViewProps> = ({
  children,
  style,
  keyboardVerticalOffset,
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}>
      {children}
    </KeyboardAvoidingView>
  );
};
