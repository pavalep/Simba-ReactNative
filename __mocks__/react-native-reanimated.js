// Jest mock for react-native-reanimated. The native worklets
// module is not registered in the jest test env. We stub the
// public API to plain JS shims so component modules that import
// `runOnJS` / `useSharedValue` / `useAnimatedStyle` don't crash at
// require time.

const Animated = {
  Value: function (initial) {
    return {__val: initial, setValue: function (v) { this.__val = v; }};
  },
  timing: () => ({start: () => {}}),
  spring: () => ({start: () => {}}),
  sequence: () => ({start: () => {}}),
  parallel: () => ({start: () => {}}),
  loop: () => ({start: () => {}, stop: () => {}}),
  View: require('react-native').View,
  Text: require('react-native').Text,
  ScrollView: require('react-native').ScrollView,
  Image: require('react-native').Image,
  createAnimatedComponent: c => c,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  runOnJS: (fn) => fn,
  useSharedValue: (initial) => ({value: initial}),
  useAnimatedStyle: (fn) => fn(),
  useDerivedValue: (fn) => ({value: fn()}),
  Easing: {linear: () => 0, ease: () => 0, in: () => 0, out: () => 0, inOut: () => 0},
  withTiming: (v) => v,
  withSpring: (v) => v,
  withDelay: (d, v) => v,
  withSequence: (...args) => args[args.length - 1],
  withRepeat: (v) => v,
  cancelAnimation: () => {},
};
