module.exports = {
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(immer|@reduxjs/toolkit|react-redux|redux-persist|@react-navigation|@react-native|react-native(-.*)?|@simba-dev)/)',
  ],
  // V18.10: jest setup file (see jest.setup.ts for the
  // notifyManager microtask-scheduler shim that eliminates the
  // "worker process has failed to exit gracefully" warning
  // on every `npx jest` run).
  // V21 P01 / D-003: the prior key was `setupFilesAfterEach`,
  // which Jest 29 silently ignores (the actual valid keys are
  // `setupFiles` and `setupFilesAfterEnv` — verified in
  // `node_modules/jest-config/build/ValidConfig.js:170-171`).
  // The shim was not being loaded, which is why every run
  // printed the open-async-handle warning. `setupFilesAfterEnv`
  // runs after the test framework is set up, which is what the
  // TanStack notifyManager replacement needs.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // V19: raised from Jest's 5 s default.
  //
  // RN's `Modal` has a ONE-TIME init cost on its first visible render
  // in the jest environment (~800 ms measured with a bare
  // `<Modal><Text/></Modal>`; the second render is 0 ms). On a real
  // sheet tree (ModeSheet / CaptionsSheet / MoreSheet — several rows,
  // theme lookups, TouchableOpacity) the same one-time cost measures
  // ~4.0 s, which sits directly on the 5 s default and tips over under
  // parallel worker load. That produced 7 suites failing with
  // "Exceeded timeout of 5000 ms" while every other test in those
  // same files ran in 6–17 ms.
  //
  // 15 s gives ~3.5x headroom over the observed worst case and still
  // catches a genuine hang (one that never resolves), so this raises
  // the ceiling without hiding a defect. A blanket bump is the right
  // fix here precisely BECAUSE the slowness is a known framework
  // one-off, not per-test work that could be optimised away.
  testTimeout: 15000,
  moduleNameMapper: {
    '^react-native-linear-gradient$':
      '<rootDir>/__mocks__/react-native-linear-gradient.js',
    '^react-native-safe-area-context$':
      '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^react-native-svg$':
      '<rootDir>/__mocks__/react-native-svg.js',
    '^react-native-fs$':
      '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-fast-image$':
      '<rootDir>/__mocks__/react-native-fast-image.js',
    '^@react-native-documents/picker$':
      '<rootDir>/__mocks__/@react-native-documents-picker.js',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage-async-storage.js',
    // V21 W5 P17 — MMKV mock is Map-backed (see __mocks__/react-native-mmkv.js).
    '^react-native-mmkv$':
      '<rootDir>/__mocks__/react-native-mmkv.js',
    // V21 W22 F/U #3 — SVG asset mock (see __mocks__/svgMock.js).
    // Every `import FooSvg from './foo.svg'` resolves to a tiny
    // `<View>` placeholder. Lets screen tests render without
    // wiring a full jest transformer for `react-native-svg`.
    '\\.svg$':
      '<rootDir>/__mocks__/svgMock.js',
  },
};
