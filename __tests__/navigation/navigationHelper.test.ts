/**
 * V21 W22 F/U #13 — `navigate` (the public wrapper around
 * `navigationRef.navigate`) type-shape + behavior lock.
 *
 * The wrapper takes either:
 *   - `navigate('RouteName')` (1-tuple, no params)
 *   - `navigate('RouteName', params)` (2-tuple, with params)
 *
 * TS validates both forms at the call site via the conditional
 * rest-arg type. This test pins the two forms + the
 * `isReady()` guard. The actual `navigationRef.navigate`
 * call uses the v7 options-object form internally
 * (see `navigationHelper.ts:35` for the docstring on the
 * D-020 escape).
 */
import {navigate, navigationRef} from '../../src/navigation/navigationHelper';
import type {RootStackParamList} from '../../src/navigation/types';

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: jest.fn(),
    navigate: jest.fn(),
    canGoBack: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const mockedIsReady = navigationRef.isReady as jest.MockedFunction<
  typeof navigationRef.isReady
>;
const mockedNavigate = navigationRef.navigate as jest.MockedFunction<
  typeof navigationRef.navigate
>;

beforeEach(() => {
  mockedIsReady.mockReset();
  mockedNavigate.mockReset();
});

describe('navigate (V21 W22 F/U #13 — D-020 escape)', () => {
  it('calls navigationRef.navigate with the v7 options-object form', () => {
    mockedIsReady.mockReturnValue(true);
    const params: RootStackParamList['NowPlaying'] = {
      fileUri: 'file:///x',
      fileTitle: 'X',
    };
    navigate('NowPlaying', params);
    expect(mockedNavigate).toHaveBeenCalledWith({
      name: 'NowPlaying',
      params,
    });
  });

  it('forwards a 1-arg call (no params route) as the options form with undefined params', () => {
    // The conditional rest-arg type accepts `navigate(name)`
    // for routes whose param is `undefined` in
    // `RootStackParamList` (e.g. `Home: undefined`,
    // `Splash: undefined`, etc.). The internal call still
    // passes `params: undefined` in the options object — that's
    // the v7 shape and the `as never` is the narrowest escape.
    mockedIsReady.mockReturnValue(true);
    navigate('Home');
    expect(mockedNavigate).toHaveBeenCalledWith({
      name: 'Home',
      params: undefined,
    });
  });

  it('does NOT call navigationRef.navigate when the ref is not ready', () => {
    mockedIsReady.mockReturnValue(false);
    navigate('NowPlaying', {
      fileUri: 'file:///x',
      fileTitle: 'X',
    });
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});
