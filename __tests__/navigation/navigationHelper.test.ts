/**
 * V21 W22 F/U #13 — `navigate` (the public wrapper around the
 * navigation ref) type-shape + behavior lock.
 *
 * The wrapper takes either:
 *   - `navigate('RouteName')` (1-tuple, no params)
 *   - `navigate('RouteName', params)` (2-tuple, with params)
 *
 * TS validates both forms at the call site via the conditional
 * rest-arg type. This test pins the two forms + the `isReady()` guard.
 *
 * 2026-11-12 (WAVE B9) — the form changed. The wrapper used to call
 * `navigationRef.navigate({name, params})`, the v7 OPTIONS-OBJECT form.
 * React Navigation 7 deprecated it: every navigation through this
 * helper logged
 *
 *   "Passing an object as the argument to 'navigate' is deprecated.
 *    Use 'navigate(name, params, options)' instead."
 *
 * The deprecation lives in `CommonActions.navigate` itself — its OBJECT
 * branch is the deprecated one and its STRING branch
 * (`navigate(name, params, options)`) is the supported form. The
 * wrapper therefore dispatches the STRING form through
 * `navigationRef.dispatch`, which is the same action without the
 * deprecation. Verified on the device: the warning no longer appears
 * in logcat after a reload.
 *
 * The test therefore pins the DISPATCHED ACTION, not a call on
 * `navigationRef.navigate` (which the wrapper no longer makes).
 */
import {CommonActions} from '@react-navigation/native';
import {navigate, navigationRef} from '../../src/navigation/navigationHelper';
import type {RootStackParamList} from '../../src/navigation/types';

jest.mock('@react-navigation/native', () => ({
  CommonActions: {
    navigate: jest.fn((name: string, params?: object) => ({
      type: 'NAVIGATE',
      payload: {name, params},
    })),
  },
  createNavigationContainerRef: () => ({
    isReady: jest.fn(),
    dispatch: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const mockedIsReady = navigationRef.isReady as jest.MockedFunction<
  typeof navigationRef.isReady
>;
const mockedDispatch = navigationRef.dispatch as jest.MockedFunction<
  typeof navigationRef.dispatch
>;
const mockedCommonNavigate = CommonActions.navigate as jest.Mock;

beforeEach(() => {
  mockedIsReady.mockReset();
  mockedDispatch.mockReset();
  mockedCommonNavigate.mockClear();
});

describe('navigate (V21 W22 F/U #13 — D-020 escape)', () => {
  it('dispatches CommonActions.navigate with the name and the params', () => {
    mockedIsReady.mockReturnValue(true);
    const params: RootStackParamList['NowPlaying'] = {
      fileUri: 'file:///x',
      fileTitle: 'X',
    };
    navigate('NowPlaying', params);
    expect(mockedCommonNavigate).toHaveBeenCalledWith('NowPlaying', params);
    expect(mockedDispatch).toHaveBeenCalledWith(
      mockedCommonNavigate.mock.results[0].value,
    );
  });

  it('forwards a 1-arg call (no params route) with undefined params', () => {
    // The conditional rest-arg type accepts `navigate(name)`
    // for routes whose param is `undefined` in
    // `RootStackParamList` (e.g. `Home: undefined`,
    // `Splash: undefined`, etc.). The internal call still
    // passes `params: undefined` to the action.
    mockedIsReady.mockReturnValue(true);
    navigate('Home');
    expect(mockedCommonNavigate).toHaveBeenCalledWith('Home', undefined);
    expect(mockedDispatch).toHaveBeenCalledWith(
      mockedCommonNavigate.mock.results[0].value,
    );
  });

  it('does NOT dispatch anything when the ref is not ready', () => {
    mockedIsReady.mockReturnValue(false);
    navigate('NowPlaying', {
      fileUri: 'file:///x',
      fileTitle: 'X',
    });
    expect(mockedDispatch).not.toHaveBeenCalled();
    expect(mockedCommonNavigate).not.toHaveBeenCalled();
  });
});
