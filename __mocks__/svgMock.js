// V21 W22 F/U #3 — SVG asset mock.
//
// `react-native-svg-transformer` (used in babel.config.js for
// Metro) converts `.svg` imports into React components at
// build time. Jest doesn't run that pipeline, so any
// `import FooSvg from './foo.svg'` would resolve to the raw
// file (or fail) without a transform.
//
// Rather than wire a full jest transformer (heavy, slow,
// fragile), we map `*.svg` to a tiny placeholder component.
// Every `SvgIcon` consumer renders the icon the same way
// (`<SvgXml xml={...} width={size} height={size} />`), so
// a placeholder is sufficient for "did the screen render
// without crashing" smoke tests.
//
// The placeholder renders a `<View>` with the requested size
// so any layout-sensitive assertions (e.g. "the header icon
// is 24px tall") still pass.

const React = require('react');
const {View} = require('react-native');

const SvgPlaceholder = ({width, height, style}) =>
  React.createElement(View, {
    testID: 'svg-placeholder',
    style: [{width, height}, style],
  });

module.exports = SvgPlaceholder;
module.exports.default = SvgPlaceholder;
