// react-native-fs mock — jest-friendly surface that supports the
// calls `src/services/fileService.ts` and
// `src/infrastructure/device/metadata/metadataService.ts` actually
// make: `readDir(dir)` + `stat(uri)`. Every method is a `jest.fn`
// so individual tests can override the implementation per case.
//
// The real `react-native-fs` is a native-module wrapper around
// Java/Kotlin `FileManager` (Android) / `FileManager` (iOS). The
// mock returns whatever the test configures — there are no
// realistic I/O semantics here.
//
// **Important**: `jest` is only defined in the jest VM. This file
// is auto-loaded by jest via the `__mocks__/` convention, so
// `jest.fn()` is available at module-evaluation time. Production
// code that calls any other RNFS surface (e.g. `exists`, `unlink`,
// `writeFile`) would need this mock extended. As of W5 P18 + P19
// the only callers are the two above.

const makeItem = ({name, path, size, isDir, mtime}) => ({
  name,
  path,
  size,
  isFile: () => !isDir,
  isDirectory: () => !!isDir,
  mtime: mtime ? new Date(mtime) : undefined,
});

const defaultStat = () =>
  Promise.resolve({
    size: 0,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  });

// Bind at module-evaluation time so the same function instance is
// returned every time production code reads `RNFS.readDir` /
// `RNFS.stat`. Using getters here would create a new `jest.fn()`
// on every property access, breaking the test's `mockResolvedValue`
// configuration (the test would mock one function and the
// production code would call a different one).
const readDirFn = jest.fn(() => Promise.resolve([]));
const statFn = jest.fn(defaultStat);

const fs = {
  readDir: readDirFn,
  stat: statFn,
  // Test helpers — call from `beforeEach` to reset between cases.
  __resetForTests: () => {
    readDirFn.mockReset();
    statFn.mockReset();
    readDirFn.mockImplementation(() => Promise.resolve([]));
    statFn.mockImplementation(defaultStat);
  },
  __makeItem: makeItem,
};

module.exports = fs;
module.exports.default = fs;