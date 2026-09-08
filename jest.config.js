module.exports = {
  preset: '@react-native/jest-preset',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(immer|@reduxjs/toolkit|react-redux|redux-persist|@react-navigation|@react-native|react-native(-.*)?)/)',
  ],
  // V18.10: jest setup file (see jest.setup.ts for the
  // notifyManager sync-scheduler shim that eliminates the
  // "worker process has failed to exit gracefully" warning
  // on every `npx jest` run).
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
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
  },
};
