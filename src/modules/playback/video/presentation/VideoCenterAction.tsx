import React, {useCallback, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';
import {VideoIcon, type VideoIconName} from './VideoIcon';

const BUTTON_SIZE = 96;
const ICON_SIZE = 48;
const PRESS_DURATION_MS = 120;

export type VideoCenterPhase =
  | 'paused'
  | 'finished'
  | 'error';

export interface VideoCenterActionProps {
  readonly phase: VideoCenterPhase;
  readonly onPress: () => void;
  /** When true, the button is visible (T5.2 owns the visibility contract). */
  readonly visible?: boolean;
}

interface PhaseContent {
  readonly icon: VideoIconName;
  readonly label: string;
  readonly hint: string;
  readonly isRetry: boolean;
}

function contentFor(phase: VideoCenterPhase): PhaseContent {
  switch (phase) {
    case 'paused':
      return {
        icon: 'play',
        label: strings.videoCenterActionPlay,
        hint: '',
        isRetry: false,
      };
    case 'finished':
      return {
        icon: 'replay',
        label: strings.videoCenterActionReplay,
        hint: strings.videoCenterHintEnded,
        isRetry: false,
      };
    case 'error':
    default:
      return {
        icon: 'replay',
        label: strings.videoCenterActionRetry,
        hint: strings.videoCenterHintError,
        isRetry: true,
      };
  }
}

/**
 * v11: the 96×96 play / pause / replay action button centred on the
 * video content rect (spec §4.3). The actual visibility contract —
 * `phase ∈ {paused, finished, error}` AND `loadingState.kind ∈
 * {idle, error}` — is owned by T5.2. This component renders one of
 * three phases; the host decides which.
 */
export function VideoCenterAction({
  phase,
  onPress,
  visible = true,
}: VideoCenterActionProps) {
  const content = contentFor(phase);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      bounciness: 4,
      speed: 20,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 4,
      speed: 20,
    }).start();
  }, [scale]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={styles.container}
      testID="videoCenterAction"
    >
      <Animated.View style={{transform: [{scale}]}}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={content.label}
          accessibilityHint={content.hint || undefined}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={`videoCenterAction:pressable`}
          style={({pressed}) => [
            styles.button,
            content.isRetry && styles.buttonError,
            pressed && {opacity: 0.92},
          ]}
        >
          <VideoIcon
            name={content.icon}
            size={ICON_SIZE}
            color={cinemaColors.accent.gold}
          />
        </Pressable>
      </Animated.View>
      {content.hint ? (
        <Text
          style={styles.hint}
          numberOfLines={2}
          allowFontScaling={false}
          testID="videoCenterAction:hint"
        >
          {content.hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    // 96 px button → half = 48 → marginTop: -48 centres the button on
    // the 50% line. The hint sits BELOW the button, so the container
    // itself is positioned slightly above the visual centre.
    marginTop: -48,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: cinemaColors.accent.primaryCTA,
    borderWidth: 2,
    borderColor: cinemaColors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonError: {
    // The error variant keeps the same fill but picks up a faint red
    // rim so the affordance reads as "something is wrong" without
    // changing the spec'd primary-CTA fill.
    borderColor: cinemaColors.semantic.error,
  },
  hint: {
    // Cap the hint so a long localization never overflows below the
    // button on narrow screens (error fix in step 5).
    maxWidth: 240,
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.inter.regular,
    fontSize: 14,
    lineHeight: 20,
    color: cinemaColors.text.bright,
  },
});
