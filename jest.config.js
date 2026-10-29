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
  // ~4.0 s, which tips over the 5 s default. That produced 7 suites
  // failing with "Exceeded timeout of 5000 ms" while every other test in
  // those same files ran in 6–17 ms.
  //
  // V21 F5 A7 measured this ceiling and found it was being breached by
  // worker contention, not by any test being genuinely slow. See the
  // note beside `maxWorkers` for the measurement and the fix.
  //
  // V21 F5 A7 — the "15 s gives ~3.5x headroom" claim below was WRONG,
  // and the timeout was never the knob to turn. Measured on this machine
  // (16 logical cores, 13.3 GB RAM): Jest's default worker count is
  // `cores - 1` = 15, and 15 concurrent React Native test environments
  // is roughly the machine's whole memory budget. Under that contention
  // the heaviest suite measured 33.7 s WALL against ~10 s unloaded - a
  // ~3.3x multiplier on per-test cost, which is what pushed individual
  // tests past 15 s. That is contention, not slow tests.
  //
  // The fix is `maxWorkers` below. 15 s stays because it is honest again
  // once the multiplier is gone. Raising the timeout to cover contention
  // would have hidden the cause AND made a genuine hang take twice as
  // long to report.
  //
  // 15 s still catches a real hang (one that never resolves) while
  // leaving room for the Modal one-time init above.
  //
  // V21 F5 A7, part 2 — 15 s measured FALSE on a cold cache. Cleared
  // cache, every worker transforms simultaneously; the cold full run is
  // 114.6 s against 41.2 s warm, and the three heaviest component suites
  // (PlayerControl, PlayerChrome, onMediaChrome) blew the 15 s ceiling
  // with legitimate work — 6 timeouts. No single test is that slow
  // unloaded (onMediaChrome runs 23 tests in ~10 s), so 15 s was a
  // false-failure ceiling rather than a hang detector.
  //
  // 30 s absorbs the cold regime and still bounds a real hang at a
  // finite cost. `maxWorkers` above is what made the WARM case fast;
  // this is what makes the COLD case correct. They are different
  // problems and neither substitutes for the other.
  testTimeout: 30000,
  // V21 F5 A7 — half the logical cores. Jest's own docs recommend 50%
  // for memory-constrained setups, and this box is exactly that: 15
  // workers on 13.3 GB oversubscribed it, which is why per-test cost
  // tripled. The heavy suites (onMediaChrome, NowPlaying,
  // PlayerChrome, the TransportBar group) all render full component
  // trees; they are the ones that were starving each other.
  //
  // Measured, full suite, before -> after: total wall 43.97 s -> 41.20 s
  // (fewer workers was FASTER, so 15 was oversubscribing, not using spare
  // capacity). Worst suites: onMediaChrome 33.7 -> 19.5 s, NowPlaying
  // 31.0 -> 19.8 s, TransportBar 30.6 -> 19.2 s, VideoMoreSheet 26.6 ->
  // 16.3 s. That is the ~3.3x contention multiplier coming off.
  //
  // It does NOT fix the "worker process failed to exit gracefully" warning:
  // that is leaked handles in the suites themselves and is tracked
  // separately. I asserted otherwise in a first draft of this comment;
  // it was wrong, and the measurement is what caught it.
  maxWorkers: '50%',
  moduleNameMapper: {
    '^react-native-linear-gradient$':
      '<rootDir>/__mocks__/react-native-linear-gradient.js',
    '^react-native-safe-area-context$':
      '<rootDir>/__mocks__/react-native-safe-area-context.js',
    '^react-native-svg$':
      '<rootDir>/__mocks__/react-native-svg.js',
    '^react-native-fs$':
      '<rootDir>/__mocks__/react-native-fs.js',
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
