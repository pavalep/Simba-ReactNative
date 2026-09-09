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
  },
};
