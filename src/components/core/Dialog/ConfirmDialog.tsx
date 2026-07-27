// ────────────────────────────────────────────────────────
// Simba Player — Confirm Dialog Component
// ────────────────────────────────────────────────────────
// Phase 14: A confirm/cancel dialog with support for
// destructive actions. Returns a boolean promise.

import React, {useCallback, useState} from 'react';
import {Dialog, DialogAction} from './Dialog';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const actions: DialogAction[] = [
    {
      label: cancelLabel,
      onPress: onCancel,
      variant: 'default',
    },
    {
      label: confirmLabel,
      onPress: onConfirm,
      variant: destructive ? 'destructive' : 'primary',
    },
  ];

  return (
    <Dialog
      visible={visible}
      onClose={onCancel}
      title={title}
      message={message}
      actions={actions}
    />
  );
};

/**
 * Promise-based confirm — usage: const ok = await confirmAsync(...);
 * Renders a ConfirmDialog and resolves on user action.
 */
interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({options, resolve});
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      visible
      title={state.options.title}
      message={state.options.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      destructive={state.options.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return {confirm, dialog};
}
