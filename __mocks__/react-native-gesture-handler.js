// Jest mock for react-native-gesture-handler. The native
// `RNGestureHandlerModule` is not registered in the jest test
// env, so we stub the module's public API to plain no-op
// builder functions. `GestureDetector` returns its children
// untouched (the test env doesn't drive real gestures — tests
// that need scrub / press behavior should use `fireEvent.press`
// on the underlying Pressable or drive the ref-based state
// directly).

const Gesture = {
  Pan: () => {
    const builder = {
      minDistance: () => builder,
      activeOffsetX: () => builder,
      activeOffsetY: () => builder,
      failOffsetX: () => builder,
      failOffsetY: () => builder,
      onBegin: () => builder,
      onUpdate: () => builder,
      onEnd: () => builder,
    };
    return builder;
  },
  Tap: () => {
    const builder = {
      maxDuration: () => builder,
      onEnd: () => builder,
    };
    return builder;
  },
  Race: (a, b) => ({a, b}),
};

const GestureDetector = ({children}) => children;
const State = {};
const Directions = {};
const GestureHandlerRootView = ({children}) => children;
const PanGestureHandler = () => null;
const TapGestureHandler = () => null;
const LongPressGestureHandler = () => null;
const FlingGestureHandler = () => null;
const ForceTouchGestureHandler = () => null;
const PinchGestureHandler = () => null;
const RotationGestureHandler = () => null;
const RawButton = () => null;
const BaseButton = () => null;
const RectButton = () => null;
const BorderlessButton = () => null;
const GestureObject = function () {};

module.exports = {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  State,
  Directions,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  FlingGestureHandler,
  ForceTouchGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  RawButton,
  BaseButton,
  RectButton,
  BorderlessButton,
  GestureObject,
};
