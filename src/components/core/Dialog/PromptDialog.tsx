// ────────────────────────────────────────────────────────
// Simba Player — Prompt Dialog Component
// ────────────────────────────────────────────────────────
// Phase 14: A dialog with a text input field, similar to
// window.prompt(). Returns string | null.

import React, {useEffect, useRef, useState, useCallback} from 'react';
import {StyleSheet} from 'react-native';
import type {TextInput} from 'react-native';
import {AppTextInput} from '../AppTextInput/AppTextInput';
import {Dialog, DialogAction} from './Dialog';

interface PromptDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  visible,
  title,
  message,
  initialValue = '',
  placeholder = '',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, initialValue]);

  const actions: DialogAction[] = [
    {label: cancelLabel, onPress: onCancel, variant: 'default'},
    {
      label: confirmLabel,
      onPress: () => onSubmit(value),
      variant: 'primary',
      disabled: value.trim().length === 0,
    },
  ];

  return (
    <Dialog
      visible={visible}
      onClose={onCancel}
      title={title}
      message={message}
      actions={actions}>
      {/* 53.3: AppTextInput inside the prompt dialog */}
      <AppTextInput
        inputRef={inputRef}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => {
          if (value.trim().length > 0) onSubmit(value);
        }}
        containerStyle={styles.inputWrap}
      />
    </Dialog>
  );
};

/**
 * Promise-based prompt — usage: const name = await promptAsync(...);
 */
interface PromptOptions {
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function usePromptDialog() {
  const [state, setState] = useState<{
    options: PromptOptions;
    resolve: (value: string | null) => void;
  } | null>(null);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise(resolve => {
      setState({options, resolve});
    });
  }, []);

  const handleSubmit = useCallback(
    (value: string) => {
      state?.resolve(value);
      setState(null);
    },
    [state],
  );

  const handleCancel = useCallback(() => {
    state?.resolve(null);
    setState(null);
  }, [state]);

  const dialog = state ? (
    <PromptDialog
      visible
      title={state.options.title}
      message={state.options.message}
      initialValue={state.options.initialValue}
      placeholder={state.options.placeholder}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  ) : null;

  return {prompt, dialog};
}

const styles = StyleSheet.create({
  inputWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
});
