module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // react-native-worklets/plugin must be listed LAST (it wraps the worklet
  // transform that Reanimated v4 + @gorhom/bottom-sheet rely on).
  plugins: ['react-native-worklets/plugin'],
};