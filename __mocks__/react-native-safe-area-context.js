// V21 W22 F/U #3 — upgraded to expose `SafeAreaInsetsContext` so
// `@react-navigation/elements`'s `SafeAreaProviderCompat` can
// read it. The pre-W22 mock only exported 3 symbols
// (`SafeAreaProvider` + `SafeAreaView` + `useSafeAreaInsets`),
// which crashed `NavigationContainer` with "Cannot read
// properties of undefined (reading '$$typeof')" because the
// compat shim does `useContext(SafeAreaInsetsContext)` and
// the context object itself was `undefined`.
//
// The mock still provides synthetic zeros (no real window
// measurement in jest) so it's still safe to use in every
// existing test.
const React = require('react');

const SafeAreaInsetsContext = React.createContext({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

module.exports = {
  SafeAreaProvider: ({children}) => children,
  SafeAreaView: 'SafeAreaView',
  SafeAreaInsetsContext,
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  // `initialWindowMetrics` is a synthetic 320×640 frame that
  // `react-native-safe-area-context` exports for SSR + test
  // environments. Re-export it so test code can pass it to the
  // real `SafeAreaProvider` (e.g. inside `renderWithProviders`)
  // when the mock's passthrough isn't enough.
  initialWindowMetrics: {
    frame: {x: 0, y: 0, width: 320, height: 640},
    insets: {top: 0, left: 0, right: 0, bottom: 0},
  },
};
