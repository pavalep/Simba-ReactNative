// ────────────────────────────────────────────────────────
// Simba Player — Animation Presets (Atlas Spec v1.0)
// ────────────────────────────────────────────────────────

import {Easing} from 'react-native';
import {motion} from './tokens';

export interface AnimationsConfig {
  duration: {
    normal: number;
  };
  easing: {
    decelerate: ReturnType<typeof Easing.out>;
    accelerate: ReturnType<typeof Easing.in>;
  };
  spring: {
    snappy: {
      damping: number;
      mass: number;
      stiffness: number;
      overshootClamping: boolean;
      restDisplacementThreshold: number;
      restSpeedThreshold: number;
    };
  };
}

export const animations: AnimationsConfig = {
  duration: {
    normal: motion.duration.normal,
  },
  easing: {
    decelerate: Easing.out(Easing.cubic),
    accelerate: Easing.in(Easing.cubic),
  },
  spring: {
    snappy: {
      damping: 14,
      mass: 1,
      stiffness: 200,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    },
  },
};
