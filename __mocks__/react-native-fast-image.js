/**
 * The FastImage mock.
 *
 * It renders as a HOST element named 'FastImage', so a test can find the
 * image in the tree and read its `source` prop — which is how the image-URI
 * contract is asserted.
 *
 * It also carries the statics the real library exposes. Components read
 * them at RENDER time (`FastImage.resizeMode.cover`), so the mock used to
 * be a bare string — and a string has no properties, so every component
 * that rendered an image with a `resizeMode` threw
 * "Cannot read properties of undefined (reading 'cover')" the moment it
 * took the image branch.
 *
 * The mock has to match the library's API SURFACE, not just its element
 * name. A mock that only matches the name hides the fact that the code
 * under test cannot run at all.
 */
const React = require('react');

const FastImage = props => React.createElement('FastImage', props);

FastImage.resizeMode = {
  contain: 'contain',
  cover: 'cover',
  stretch: 'stretch',
  center: 'center',
};

FastImage.priority = {
  normal: 'normal',
  high: 'high',
  low: 'low',
};

FastImage.cacheControl = {
  immutable: 'immutable',
  web: 'web',
  webp: 'webp',
};

module.exports = FastImage;
