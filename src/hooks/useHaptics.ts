import {useCallback} from 'react';
import {useHaptics as useRNHaptics} from 'react-native-haptic-feedback';
import type {HapticFeedbackTypes} from 'react-native-haptic-feedback';

const defaultOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

type HapticType =
  | keyof typeof HapticFeedbackTypes
  | HapticFeedbackTypes;

/**
 * Semantic haptic feedback hook.
 *
 * - `light`  — tab selection (impactLight)
 * - `medium` — button press, toggle (impactMedium)
 * - `heavy`  — slider snap, gesture threshold (impactHeavy)
 *
 * Also exposes `trigger()` for direct access to any haptic type.
 */
export function useHaptics() {
  const haptics = useRNHaptics(defaultOptions);

  const light = useCallback(() => {
    haptics.trigger('impactLight' as HapticType);
  }, [haptics]);

  const medium = useCallback(() => {
    haptics.trigger('impactMedium' as HapticType);
  }, [haptics]);

  const heavy = useCallback(() => {
    haptics.trigger('impactHeavy' as HapticType);
  }, [haptics]);

  const trigger = useCallback(
    (type: HapticType) => {
      haptics.trigger(type);
    },
    [haptics],
  );

  return {light, medium, heavy, trigger};
}
