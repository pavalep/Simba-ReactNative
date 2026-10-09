/**
 * `useConfirmDialog` — the auto-dismiss contract.
 *
 * The resume card is the case that matters. Its two buttons are
 * "Continue" and "Start from beginning", and the second one DISCARDS the
 * resume position the card exists to offer. The card auto-dismisses after
 * 8 s (Netflix, YouTube and Plex all do), which means the timeout path is
 * the path most users will actually take — they tap a tile, look away,
 * and let it go.
 *
 * If a timeout resolved to `false`, the majority of resume launches would
 * silently restart the media. That was the previous behaviour, and the
 * V19 spec (`SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md:604-611`) says the
 * opposite: "Auto-dismisses after 8 s; **default action is Resume**."
 *
 * So the property pinned here is narrow and absolute: **a timeout may never
 * produce the destructive option.**
 */

import React from 'react';
import {Text, Pressable} from 'react-native';
import {render, act, fireEvent} from '@testing-library/react-native';
import {useConfirmDialog} from '../../../../src/components/core/Dialog/ConfirmDialog';

// RNTL 14: every one of these returns a Promise and MUST be awaited.
// An unawaited `act` leaves a pending act queue that makes every later
// render resolve against a stale tree.

// Built entirely from `require` INSIDE the factory: a jest.mock factory
// may not reference out-of-scope bindings, and JSX would hoist
// `React.createElement` out here.
jest.mock('../../../../src/components/core/Dialog/Dialog', () => {
  const ReactLocal = require('react');
  const {View, Text: T, Pressable: P} = require('react-native');
  const h = ReactLocal.createElement;
  const Dialog = ({visible, title, message, actions}: any) =>
    visible
      ? h(
          View,
          {testID: 'dialog'},
          h(T, {testID: 'dialog-title'}, title),
          h(T, {testID: 'dialog-message'}, message),
          (actions ?? []).map((a: any) =>
            h(
              P,
              {key: a.label, testID: `action-${a.label}`, onPress: a.onPress},
              h(T, null, a.label),
            ),
          ),
        )
      : null;
  return {Dialog, DialogAction: {}};
});

function Harness({autoDismissMs}: {autoDismissMs?: number}) {
  const {confirm, dialog} = useConfirmDialog();
  return (
    <>
      <Pressable
        testID="open"
        onPress={() => {
          confirm({
            title: 'Continue watching?',
            message: 'Continue at 19:17 or start from the beginning.',
            confirmLabel: 'Continue',
            cancelLabel: 'Start from beginning',
            ...(autoDismissMs == null ? {} : {autoDismissMs}),
          });
        }}>
        <Text>open</Text>
      </Pressable>
      {dialog}
    </>
  );
}

describe('useConfirmDialog — auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // A pending timer would leak into the next test and fire against an
    // unmounted tree.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not auto-dismiss when no delay is supplied', async () => {
    const {getByTestId, queryByTestId} = await render(
      <Harness />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('open'));
    });
    expect(getByTestId('dialog')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    // Still open. Opt-in, never a hidden default — a dialog that vanishes
    // on a schedule the caller did not ask for is the same class of
    // surprise as a timeout that picks the destructive option.
    expect(queryByTestId('dialog')).toBeTruthy();
  });

  it('RESUMES on timeout — never restarts', async () => {
    // The whole point. `true` is the confirm/"Continue" path.
    const resolved: boolean[] = [];
    const Spy = () => {
      const {confirm, dialog} = useConfirmDialog();
      return (
        <>
          <Pressable
            testID="open"
            onPress={() => {
              confirm({
                title: 'Continue watching?',
                message: 'Continue at 19:17 or start from the beginning.',
                confirmLabel: 'Continue',
                cancelLabel: 'Start from beginning',
                autoDismissMs: 8000,
              }).then(v => resolved.push(v));
            }}>
            <Text>open</Text>
          </Pressable>
          {dialog}
        </>
      );
    };

    const {getByTestId} = await render(<Spy />);
    await act(async () => {
      fireEvent.press(getByTestId('open'));
    });

    await act(async () => {
      jest.advanceTimersByTime(8000);
    });

    expect(resolved).toEqual([true]);
  });

  it('an explicit "Start from beginning" tap still resolves false', async () => {
    // Auto-dismiss must not have swallowed the destructive path — the
    // user has to be able to actually choose it.
    const resolved: boolean[] = [];
    const Spy = () => {
      const {confirm, dialog} = useConfirmDialog();
      return (
        <>
          <Pressable
            testID="open"
            onPress={() => {
              confirm({
                title: 'Continue watching?',
                message: 'Continue at 19:17 or start from the beginning.',
                confirmLabel: 'Continue',
                cancelLabel: 'Start from beginning',
                autoDismissMs: 8000,
              }).then(v => resolved.push(v));
            }}>
            <Text>open</Text>
          </Pressable>
          {dialog}
        </>
      );
    };

    const {getByTestId} = await render(<Spy />);
    await act(async () => {
      fireEvent.press(getByTestId('open'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('action-Start from beginning'));
    });

    expect(resolved).toEqual([false]);
  });

  it('a tap cancels the pending timer instead of double-resolving', async () => {
    const resolved: boolean[] = [];
    const Spy = () => {
      const {confirm, dialog} = useConfirmDialog();
      return (
        <>
          <Pressable
            testID="open"
            onPress={() => {
              confirm({
                title: 't',
                message: 'm',
                confirmLabel: 'Continue',
                cancelLabel: 'Start from beginning',
                autoDismissMs: 8000,
              }).then(v => resolved.push(v));
            }}>
            <Text>open</Text>
          </Pressable>
          {dialog}
        </>
      );
    };

    const {getByTestId} = await render(<Spy />);
    await act(async () => {
      fireEvent.press(getByTestId('open'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('action-Continue'));
    });

    // The 8 s mark passes AFTER the user already answered. A live timer
    // here would resolve the promise a second time — which on the resume
    // seam means re-deciding a launch the user already made.
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });

    expect(resolved).toEqual([true]);
  });
});