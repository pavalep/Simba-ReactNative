module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // react-native-worklets/plugin must be listed LAST (it wraps the
  // worklet transform that Reanimated v4 + @gorhom/bottom-sheet rely
  // on). Env vars come from react-native-config (native module, no
  // Babel plugin needed).
  plugins: ['react-native-worklets/plugin'],
};
