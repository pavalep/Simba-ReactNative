/// <reference types="node" />
/**
 * The UI half of the close verb.
 *
 * `useClosePlayback()` (infrastructure) reports an outcome; this wrapper
 * (components) DISPLAYS a failed close as a toast. The split exists
 * because an infrastructure module may not import a UI context, and
 * `useToast()` throws outside a `ToastProvider`.
 *
 * These tests pin the wrapper's whole job: the toast appears exactly when
 * the close failed, carries the message the infrastructure layer reported,
 * and stays silent when the close succeeded.
 *
 * The mock factories own their `jest.fn()`s and expose them on a `__`
 * property. A factory that closes over a `const` declared in this file
 * would run BEFORE that `const` is initialised — the imports are hoisted
 * above it — and the mock would cache `undefined`.
 */

import {act, renderHook} from '@testing-library/react-native';
import {useClosePlaybackWithToast} from '../../../src/components/player/useClosePlaybackWithToast';

jest.mock('../../../src/infrastructure/player/useClosePlayback', () => {
  const closePlayback = jest.fn();
  return {
    __closePlayback: closePlayback,
    useClosePlayback: () => closePlayback,
  };
});

jest.mock('../../../src/components/feedback/Toast', () => {
  const show = jest.fn();
  return {__show: show, useToast: () => ({show, hide: jest.fn()})};
});

const infraMock = jest.requireMock(
  '../../../src/infrastructure/player/useClosePlayback',
) as {__closePlayback: jest.Mock};
const toastMock = jest.requireMock(
  '../../../src/components/feedback/Toast',
) as {__show: jest.Mock};

describe('useClosePlaybackWithToast — the message is shown here', () => {
  beforeEach(() => {
    infraMock.__closePlayback.mockReset();
    toastMock.__show.mockReset();
  });

  it('shows the reported message when the close failed', async () => {
    infraMock.__closePlayback.mockReturnValue({
      ok: false,
      message: 'engine is gone',
    });

    const {result} = await renderHook(() => useClosePlaybackWithToast());

    await act(async () => {
      result.current();
    });

    expect(toastMock.__show).toHaveBeenCalledTimes(1);
    expect(toastMock.__show).toHaveBeenCalledWith('engine is gone', 'error');
  });

  it('stays SILENT when the close succeeded — a successful close is not news', async () => {
    infraMock.__closePlayback.mockReturnValue({ok: true});

    const {result} = await renderHook(() => useClosePlaybackWithToast());

    await act(async () => {
      result.current();
    });

    expect(infraMock.__closePlayback).toHaveBeenCalledTimes(1);
    expect(toastMock.__show).not.toHaveBeenCalled();
  });

  it('closes ONCE per call — the wrapper does not double-close', async () => {
    infraMock.__closePlayback.mockReturnValue({ok: true});

    const {result} = await renderHook(() => useClosePlaybackWithToast());

    await act(async () => {
      result.current();
    });

    expect(infraMock.__closePlayback).toHaveBeenCalledTimes(1);
  });
});
