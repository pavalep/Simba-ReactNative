import {useState, useEffect} from 'react';
import {AccessibilityInfo} from 'react-native';

/**
 * Hook that returns accessibility state flags.
 *
 * - `reduceMotion`: true when the user has requested reduced motion
 *   (maps to `AccessibilityInfo.isReduceMotionEnabled()` /
 *    CSS `prefers-reduced-motion`).
 */
export function useAccessibility() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  return {reduceMotion};
}
