/**
 * Jest mock for react-native-haptic-feedback.
 * The native TurboModule (RNHapticFeedback) is unavailable in the test env.
 */
const trigger = jest.fn();

const useHaptics = () => ({
  trigger,
});

module.exports = {
  useHaptics,
  trigger,
  default: {trigger, useHaptics},
};
