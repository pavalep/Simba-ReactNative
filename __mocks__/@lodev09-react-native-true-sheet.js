// `@lodev09/react-native-true-sheet` — the ONE mock for the sheet engine.
//
// WHY IT HAS TO BE MOCKED
//
// The package ships ES modules in `lib/module` (`export * from
// './TrueSheet'`). Jest's `transformIgnorePatterns` does not transform
// that package, so a plain import blows up with
//
//     SyntaxError: Unexpected token 'export'
//
// the moment a test file reaches `BottomSheet` → `TrueSheet`.
//
// WHY IT IS ONE FILE AND NOT SEVEN
//
// Six test files used to carry their own byte-identical copy of this
// mock, each with its own `jest.fn()`s. A seventh and an eighth would
// have followed. The mock is now mapped in `jest.config.js`
// (`moduleNameMapper`), so a test that renders a sheet needs to say
// nothing at all.
//
// `BottomSheet.test.tsx` keeps its OWN local mock: it asserts on the
// props `BottomSheet` hands the engine, and a local `jest.mock` shadows
// the mapping, which is exactly what it needs.
//
// THE IMPERATIVE SURFACE
//
// `BottomSheet` drives the sheet through a ref: `present()`, `dismiss()`
// and `resize()`. A mock without that surface is a crash, not a sheet —
// so it is here.

const React = require('react');
const {View} = require('react-native');

const mockPresent = jest.fn(() => Promise.resolve());
const mockDismiss = jest.fn(() => Promise.resolve());
const mockResize = jest.fn(() => Promise.resolve());

const TrueSheet = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    present: mockPresent,
    dismiss: mockDismiss,
    resize: mockResize,
  }));
  return React.createElement(View, {testID: 'true-sheet'}, props.children);
});
TrueSheet.displayName = 'TrueSheet';

module.exports = {
  TrueSheet,
  __mockPresent: mockPresent,
  __mockDismiss: mockDismiss,
  __mockResize: mockResize,
};
