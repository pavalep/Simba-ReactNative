/**
 * V22 W22 — register item 68: `AppContent` locks the window to portrait ONCE.
 *
 * ## Why this file could not exist before
 *
 * `AppContent` imported `src/utils/orientation.ts`, which imported
 * `react-native-orientation-locker`, whose module body constructs a
 * `NativeEventEmitter` with no argument. Importing `AppContent` therefore
 * THREW — at MODULE level, before any assertion could run. That is why the
 * boot-time lock had no test at all, and why the "one writer per render"
 * shape of defect was never pinned here.
 *
 * ## What is real and what is mocked
 *
 * The thing under test is `AppContent`'s boot side effect, so the WORLD
 * around it is mocked and the effect is real:
 *
 *   - `src/infrastructure/player` — the facade. Its `usePlayer()` hands back a
 *     STABLE `commands` object, exactly as the lib does: the lib builds
 *     `commands` once at module load and gives every `usePlayer()` call the
 *     same reference. A mock that built a fresh object per call would change
 *     the effect's dependency on every render, and the test would then fail
 *     for the wrong reason.
 *   - `src/utils/orientation.ts` — NOT mocked. The real helper runs, so this
 *     file covers the whole chain: `AppContent` → `lockToPortrait` →
 *     `commands.setOrientation('portrait')`.
 *
 * The navigator, the deep-link plumbing and the three chrome components are
 * mocked away: `AppContent` is a composer, and the boot effect is the
 * contract this file pins.
 */

import React from 'react';
import {render} from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    // A CLASS component because `AppContent` passes a `ref` to it, and a
    // plain function component would log a warning about that on every
    // render.
    NavigationContainer: class extends ReactModule.Component {
      render() {
        return ReactModule.createElement(
          ReactModule.Fragment,
          null,
          this.props.children,
        );
      }
    },
  };
});

jest.mock('../../src/infrastructure/player', () => {
  const setOrientation = jest.fn();
  const openFromDeepLink = jest.fn();
  const commands = {setOrientation};
  return {
    __mockSetOrientation: setOrientation,
    useDeepLinkLaunch: () => openFromDeepLink,
    useQueueSync: () => undefined,
    usePlayer: () => ({state: {}, commands}),
  };
});

jest.mock('../../src/navigation', () => ({
  RootNavigator: () => null,
}));
jest.mock('../../src/navigation/navigationHelper', () => ({
  // `current` is what makes this a ref OBJECT in React 19 — a ref without
  // it is rejected ("Unexpected ref object provided").
  navigationRef: {current: null, navigate: jest.fn(), goBack: jest.fn()},
}));
jest.mock('../../src/navigation/linking', () => ({
  linking: {prefixes: [], config: {}},
}));
jest.mock('../../src/state', () => ({
  useDownloadsStore: {getState: () => ({hydrateDownloads: jest.fn()})},
}));
jest.mock('../../src/hooks/useAuthSession', () => ({
  useAuthSession: () => undefined,
}));
jest.mock('../../src/services/downloadService', () => ({
  downloadService: {ensureLoaded: () => Promise.resolve([])},
}));
jest.mock('../../src/utils/startupPerf', () => ({
  mark: jest.fn(),
}));
jest.mock('../../src/components/StatusBar', () => ({
  SimbaStatusBar: () => null,
}));
jest.mock('../../src/components/status/OfflineBanner/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));
jest.mock(
  '../../src/components/status/GlobalOperationProgress/GlobalOperationProgress',
  () => ({
    GlobalOperationProgress: () => null,
  }),
);

import {AppContent} from '../../src/app/AppContent';

const {__mockSetOrientation: setOrientation} = jest.requireMock(
  '../../src/infrastructure/player',
) as {__mockSetOrientation: jest.Mock};

describe('AppContent — the boot-time portrait lock', () => {
  beforeEach(() => {
    setOrientation.mockClear();
  });

  it('locks the window to portrait, once, at boot', async () => {
    await render(<AppContent />);

    expect(setOrientation).toHaveBeenCalledTimes(1);
    expect(setOrientation).toHaveBeenCalledWith('portrait');
  });

  it('does NOT re-lock on every render', async () => {
    const {rerender} = await render(<AppContent />);

    expect(setOrientation).toHaveBeenCalledTimes(1);

    await rerender(<AppContent />);
    await rerender(<AppContent />);

    // A boot-time lock that re-asserts on every render is a SECOND writer
    // of a value the player also owns — the same defect class as a
    // per-tree reconciliation. The dependency is the lib's module-singleton
    // `commands`, so the effect must fire exactly once for the life of the
    // tree.
    expect(setOrientation).toHaveBeenCalledTimes(1);
  });
});
