// ────────────────────────────────────────────────────────
// Simba Player — AppTextInput Core Component (Phase 53.1)
// Tokens-based input with label, error, clear button and
// blur validation — the only place raw TextInput may live.
// ────────────────────────────────────────────────────────

import React, {useCallback, useState} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';

export interface AppTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  /** External validation error (takes precedence over internal). */
  error?: string | null;
  /** 53.5: runs on blur; returning a message shows it as the field error. */
  validate?: (value: string) => string | undefined;
  clearable?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  inputRef?: React.Ref<TextInput>;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error: externalError,
  validate,
  clearable = false,
  secureTextEntry = false,
  keyboardType,
  maxLength,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoFocus = false,
  multiline = false,
  returnKeyType,
  onSubmitEditing,
  disabled = false,
  accessibilityLabel,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  inputRef,
}) => {
  const {colors} = useTheme();
  const [blurError, setBlurError] = useState<string | undefined>(undefined);
  const [focused, setFocused] = useState(false);

  const error = externalError ?? blurError;

  const handleChange = useCallback(
    (text: string) => {
      if (blurError) setBlurError(undefined);
      onChangeText(text);
    },
    [blurError, onChangeText],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (validate) {
      const message = validate(value);
      setBlurError(message);
    }
  }, [validate, value]);

  const resolvedLabel = accessibilityLabel ?? label ?? placeholder;

  return (
    <View style={[styles.root, containerStyle]}>
      {label && (
        <AppText variant="caption" color="secondary" style={styles.label}>
          {label}
        </AppText>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background.floating,
            borderColor: error
              ? colors.semantic.error
              : focused
              ? colors.accent.gold
              : colors.border.subtle,
          },
          multiline && styles.inputContainerMultiline,
          disabled && styles.inputContainerDisabled,
          inputContainerStyle,
        ]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {color: colors.text.primary},
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoFocus={autoFocus}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={!disabled}
          accessibilityLabel={resolvedLabel}
          accessibilityHint={error ? error : undefined}
        />
        {clearable && value.length > 0 && !disabled && (
          <TouchableOpacity
            onPress={() => handleChange('')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${resolvedLabel ?? 'input'}`}
            style={styles.clearButton}>
            <SvgIcon name="close" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <AppText
          variant="caption"
          color="error"
          style={styles.errorText}
          accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    minHeight: 90,
    paddingTop: spacing.sm,
  },
  inputContainerDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  clearButton: {
    marginLeft: spacing.sm,
  },
  errorText: {
    marginTop: spacing.xs,
  },
});
