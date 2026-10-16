/**
 * V21 F5 follow-up — the compositing invariant, pinned.
 *
 * The bug this guards against was invisible to every gate in this repo. The
 * video was loading and playing, the transport was advancing, the chrome was
 * mounted and laid out, all 1103 unit tests passed — and the picture was
 * completely hidden, because the browsing stack painted over the native
 * surface composited at `android.R.id.content` index 0.
 *
 * No unit test could have caught it, because the failure lives in what
 * several components *collectively* do to the screen. So this suite does not
 * test `VideoPlayer`, and it does not test the navigator. It tests the one
 * seam that owns the rule: when video owns the window, the browsing stack
 * must not paint and must not take touches.
 *
 * The third test is the one that matters most. "Don't paint" has an obvious
 * wrong implementation — return `null` — and that implementation passes
 * every assertion about pixels while destroying the user's back stack.
 */

import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {BrowsingStack} from '../../src/app/BrowsingStack';

/** The wrapper's own host props — the thing that decides compositing. */
function rootProps() {
  const tree = screen.toJSON();
  if (Array.isArray(tree) || tree === null) {
    throw new Error('expected a single root host element');
  }
  return {
    pointerEvents: tree.props.pointerEvents,
    style: StyleSheet.flatten(tree.props.style) as Record<string, unknown>,
  };
}

describe('BrowsingStack', () => {
  it('paints and accepts touches when not hidden', async () => {
    await render(
      <BrowsingStack hidden={false}>
        <Text>feed</Text>
      </BrowsingStack>,
    );

    expect(screen.getByText('feed')).toBeTruthy();
    expect(rootProps().style.opacity).toBeUndefined();
    expect(rootProps().pointerEvents).toBe('auto');
  });

  it('stops painting AND stops taking touches when hidden', async () => {
    await render(
      <BrowsingStack hidden={true}>
        <Text>feed</Text>
      </BrowsingStack>,
    );

    // Two properties, one decision. `opacity: 0` alone would leave a
    // blanked-but-touchable stack sitting over the video surface, swallowing
    // the tap that toggles the chrome — a player that looks blank and feels
    // dead. Both are asserted together so neither can be dropped alone.
    expect(rootProps().style.opacity).toBe(0);
    expect(rootProps().pointerEvents).toBe('none');
  });

  it('does not unmount the stack, so the back stack survives a round trip', async () => {
    let mounts = 0;
    let unmounts = 0;

    const Stateful = () => {
      React.useEffect(() => {
        mounts += 1;
        return () => {
          unmounts += 1;
        };
      }, []);
      return <Text>feed</Text>;
    };

    const {rerender} = await render(
      <BrowsingStack hidden={false}>
        <Stateful />
      </BrowsingStack>,
    );

    await rerender(
      <BrowsingStack hidden={true}>
        <Stateful />
      </BrowsingStack>,
    );

    // Present in the tree while blanked — blanking is a paint decision, not
    // a removal.
    expect(screen.getByText('feed')).toBeTruthy();

    await rerender(
      <BrowsingStack hidden={false}>
        <Stateful />
      </BrowsingStack>,
    );

    // A fullscreen video is a MODE OF THE WINDOW, not a place in the
    // navigation stack. An unmount here would throw away the user's position
    // in the app: open a title from the Movies list, press back, and land on
    // Home instead of the list you left. Asserted as mount/unmount counts
    // rather than as rendered state, because "did it unmount" is the
    // mechanism that decides whether state survives — and this stays honest
    // if the child later stops being stateful.
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
  });

  it('does not route touches to hidden content', async () => {
    const onPress = jest.fn();
    await render(
      <BrowsingStack hidden={true}>
        <Text onPress={onPress}>feed</Text>
      </BrowsingStack>,
    );

    fireEvent.press(screen.getByText('feed'));
    expect(onPress).not.toHaveBeenCalled();
  });
});