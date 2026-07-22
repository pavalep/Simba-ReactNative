import {useEffect, useRef, useCallback} from 'react';

export function useAutoHideControls(
  visible: boolean,
  setVisible: (v: boolean) => void,
  timeoutMs: number = 4000,
): {resetTimer: () => void} {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setVisibleRef = useRef(setVisible);
  setVisibleRef.current = setVisible;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setVisibleRef.current(false);
    }, timeoutMs);
  }, [clearTimer, timeoutMs]);

  useEffect(() => {
    if (visible) {
      resetTimer();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [visible, resetTimer, clearTimer]);

  return {resetTimer};
}
