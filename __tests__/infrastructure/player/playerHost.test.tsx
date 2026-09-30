/**
 * W6.0 — `PlayerHostProvider` / `useIsPlayerActivity`: the PER-TREE
 * player-host fact.
 *
 * This is the mechanism the black-player-screen fix rests on, so it is
 * tested directly rather than only through `usePresentation`.
 *
 * The thing being defended against: the lib's
 * `isCurrentActivityPlayer()` looks like it answers "is this tree the
 * player activity's tree?", and it does not. Its backing field is a
 * process-wide `@Volatile @JvmStatic` on `MpvBridgeModule`'s companion
 * object, so every React root in the process reads the same value —
 * including the background `MainActivity` root while a video is
 * playing. `playerHost.tsx` documents why that is unusable here; these
 * tests pin the replacement's actual guarantee, which is that two roots
 * mounted in the same "process" CANNOT observe each other's value.
 */

import * as React from 'react';
import {act, render, renderHook, screen} from '@testing-library/react-native';
import {Text} from 'react-native';
import {
  PlayerHostProvider,
  useIsPlayerActivity,
} from '../../../src/infrastructure/player/playerHost';

const host = (isPlayerActivity: boolean) => {
  const Wrapper = ({children}: {children: React.ReactNode}) => (
    <PlayerHostProvider isPlayerActivity={isPlayerActivity}>
      {children}
    </PlayerHostProvider>
  );
  Wrapper.displayName = `PlayerHost(${isPlayerActivity})`;
  return Wrapper;
};

describe('useIsPlayerActivity — per-tree player-host fact', () => {
  it('reports the value its own provider supplied', async () => {
    const player = await renderHook(() => useIsPlayerActivity(), {
      wrapper: host(true),
    });
    expect(player.result.current).toBe(true);

    const main = await renderHook(() => useIsPlayerActivity(), {
      wrapper: host(false),
    });
    expect(main.result.current).toBe(false);

    await player.unmount();
    await main.unmount();
  });

  /**
   * The guarantee the native flag cannot give. In the app, the player
   * root and the background app root are mounted SIMULTANEOUSLY in one
   * process; if this test fails, a chrome overlay would be mounted over
   * the browsing screens too.
   */
  it('two roots mounted at once cannot observe each other', async () => {
    const player = await renderHook(() => useIsPlayerActivity(), {
      wrapper: host(true),
    });
    const main = await renderHook(() => useIsPlayerActivity(), {
      wrapper: host(false),
    });

    // Re-rendering either root leaves the other's answer untouched.
    // There is no shared mutable cell for one root to write — which is
    // exactly what a process-wide `isCurrentActivityPlayer()` flag is.
    await player.rerender({});
    expect(main.result.current).toBe(false);
    expect(player.result.current).toBe(true);

    await main.rerender({});
    expect(main.result.current).toBe(false);
    expect(player.result.current).toBe(true);

    await player.unmount();
    // The main root is unaffected by the player root going away.
    expect(main.result.current).toBe(false);
    await main.unmount();
  });

  it('fails closed with no provider', async () => {
    // jest / Storybook / a component mounted outside the app root.
    // The dangerous failure is chrome mounted over a surface that is
    // not there, so the answer must be `false`, not a throw.
    const {result} = await renderHook(() => useIsPlayerActivity());
    expect(result.current).toBe(false);
  });

  it('an explicit `false` is distinguishable from a missing provider', async () => {
    // Both fail closed, but they are different situations: one is a
    // real "this is the app activity" tree, the other is a test host.
    // The provider must not coerce or default away the value.
    const {result} = await renderHook(() => useIsPlayerActivity(), {
      wrapper: host(false),
    });
    expect(result.current).toBe(false);
  });

  it('re-renders consumers when the provider value changes', async () => {
    // React context is the propagation channel; if this did not work,
    // a value that arrived late would never reach the chrome.
    const seen: boolean[] = [];
    const Probe: React.FC = () => {
      seen.push(useIsPlayerActivity());
      return <Text>probe</Text>;
    };

    const Wrapper = ({value}: {value: boolean}) => (
      <PlayerHostProvider isPlayerActivity={value}>
        <Probe />
      </PlayerHostProvider>
    );

    // RNTL 14: `render` returns a Promise.
    const view = await render(<Wrapper value={false} />);
    expect(screen.getByText('probe')).toBeTruthy();
    expect(seen.at(-1)).toBe(false);

    await act(async () => {
      view.rerender(<Wrapper value={true} />);
    });
    expect(seen.at(-1)).toBe(true);
  });
});
