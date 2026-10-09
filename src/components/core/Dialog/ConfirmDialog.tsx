// ────────────────────────────────────────────────────────
// Simba Player — Confirm Dialog Component
// ────────────────────────────────────────────────────────
// Phase 14: A confirm/cancel dialog with support for
// destructive actions. Returns a boolean promise.

import React, {useCallback, useEffect, useState} from 'react';
import {Dialog, DialogAction} from './Dialog';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /**
   * Artwork shown above the title. Accepts a remote URL or a local file
   * path — both go through `{uri}`. Omitted entirely when absent, so a
   * dialog without artwork is not padded around an empty gap.
   */
  imageUri?: string;
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
  imageUri,
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
      imageUri={imageUri}
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
  /** Artwork above the title. A remote URL or a local file path. */
  imageUri?: string;
  /**
   * Auto-dismiss after this many ms of NO interaction, resolving as if
   * `confirmLabel` had been pressed.
   *
   * This is deliberately wired to CONFIRM and not to cancel. The resume
   * card is the case that matters: a user who says nothing for a few
   * seconds almost certainly means "carry on", and resolving a timeout to
   * "start from the beginning" would discard the very resume point the
   * card exists to offer. Netflix, YouTube and Plex all default a
   * dismissed resume card to continuing.
   *
   * A timeout must never be able to select a destructive option.
   */
  autoDismissMs?: number;
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
      imageUri={state.options.imageUri}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  // Runs while a dialog is open and `autoDismissMs` is set. Lives here
  // rather than inside ConfirmDialog so the timer is owned by the state
  // that can resolve the promise — a timer in the presentational
  // component would need a callback prop to do the same job, and a
  // second source of truth for "is it still open" is how double-resolve
  // bugs start.
  const autoDismissMs = state?.options.autoDismissMs;
  useEffect(() => {
    if (autoDismissMs == null) return undefined;
    const id = setTimeout(handleConfirm, autoDismissMs);
    return () => clearTimeout(id);
    // `handleConfirm` is stable per `state`; re-running on `state` is
    // exactly what restarts the clock for a NEW dialog and clears it when
    // the dialog closes.
  }, [autoDismissMs, state, handleConfirm]);

  return {confirm, dialog};
}
