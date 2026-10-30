/// <reference types="node" />
/**
 * The close verb restores the window's orientation.
 *
 * The app is portrait whenever there is no session. The window can be in
 * landscape while a session lives — the orientation lock pins it there, and
 * the device can simply be rotated — so ending the session has to hand the
 * window back.
 *
 * `MainActivity.onResume()` restores portrait too, but only on a
 * background -> foreground transition. It cannot help when the session ends
 * while the app is ALREADY in front, which is the common case: the user
 * closes the player and lands on the feed.
 *
 * These tests pin that `useClosePlayback()` — the ONE owner of the
 * teardown — restores portrait, and that it does so only when the session
 * really ended.
 *
 * The mock factories own their `jest.fn()`s and expose them on a `__`
 * property. A factory that closes over a `const` declared in this file
 * would run BEFORE that `const` is initialised — the imports are hoisted
 * above it — and the mock would cache `undefined`.
 */

import {act, renderHook} from '@testing-library/react-native';
import {useClosePlayback} from '../../../src/infrastructure/player/useClosePlayback';

jest.mock('@simba-dev/react-native-media-player', () => {
  const stopPlayback = jest.fn();
  const setOrientation = jest.fn();
  return {
    __stopPlayback: stopPlayback,
    __setOrientation: setOrientation,
    getMpvPlayerModule: () => ({stopPlayback, setOrientation}),
  };
});

jest.mock('../../../src/components/feedback/Toast', () => {
  const show = jest.fn();
  return {__show: show, useToast: () => ({show})};
});

jest.mock('../../../src/state/nowPlayingStore', () => {
  const end = jest.fn();
  return {
    __end: end,
    useNowPlayingStore: (selector: (s: {end: () => void}) => unknown) =>
      selector({end}),
  };
});

const libMock = jest.requireMock('@simba-dev/react-native-media-player') as {
  __stopPlayback: jest.Mock;
  __setOrientation: jest.Mock;
};
const toastMock = jest.requireMock('../../../src/components/feedback/Toast') as {
  __show: jest.Mock;
};
const storeMock = jest.requireMock('../../../src/state/nowPlayingStore') as {
  __end: jest.Mock;
};

describe('useClosePlayback — the window goes back to portrait', () => {
  beforeEach(() => {
    libMock.__stopPlayback.mockReset();
    libMock.__setOrientation.mockReset();
    toastMock.__show.mockReset();
    storeMock.__end.mockReset();
  });

  it('restores portrait when the session ends', async () => {
    const {result} = await renderHook(() => useClosePlayback());

    await act(async () => {
      result.current();
    });

    expect(libMock.__stopPlayback).toHaveBeenCalledTimes(1);
    expect(storeMock.__end).toHaveBeenCalledTimes(1);
    expect(libMock.__setOrientation).toHaveBeenCalledTimes(1);
    expect(libMock.__setOrientation).toHaveBeenCalledWith('portrait');
  });

  it('does NOT restore portrait when the stop failed — the media is still playing', async () => {
    // The player is still standing, so the window still belongs to it.
    // Restoring portrait here would snap a landscape film to portrait
    // mid-playback.
    libMock.__stopPlayback.mockImplementation(() => {
      throw new Error('engine is gone');
    });

    const {result} = await renderHook(() => useClosePlayback());

    await act(async () => {
      result.current();
    });

    expect(storeMock.__end).not.toHaveBeenCalled();
    expect(libMock.__setOrientation).not.toHaveBeenCalled();
    expect(toastMock.__show).toHaveBeenCalledTimes(1);
  });
});
