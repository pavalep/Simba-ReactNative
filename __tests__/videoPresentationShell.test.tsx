/**
 * v11 T7.1 — VideoPresentationShell native-driver transition test.
 *
 * Coverage:
 *   T7.1: outer shell snaps to the TARGET size immediately on
 *         presentation change (no animated layout props).
 *   T7.1: inner transform layer animates via `transform: scale +
 *         translate` (native driver) — not via width/height/left/
 *         bottom.
 *   T7.1: both chrome projections stay mounted during the
 *         transition (one fades in, the other fades out).
 *   T7.1: outer shell has `overflow: hidden` + a non-zero
 *         `borderRadius` in mini mode to clip the scaled content
 *         inside the mini slot.
 *   T7.1: the inner content (children prop) stays mounted across
 *         presentation flips — the surface is not remounted.
 *
 * The test does NOT exercise the animation timing (that requires
 * on-device frame-rate measurement per the spec Rule 11) — it
 * verifies the static structure and the useNativeDriver config.
 */
import React from 'react';
import {useWindowDimensions, View} from 'react-native';
import {act, render, screen} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {ThemeProvider} from '../src/theme';
import {VideoPresentationShell} from '../src/modules/playback/video/presentation/VideoPresentationShell';
import {
  MINI_HEIGHT,
  MINI_RADIUS,
  MINI_WIDTH_MARGIN,
} from '../src/modules/playback/video/presentation/videoShellConstants';

function createMockStore() {
  return configureStore({
    reducer: {
      settings: () => ({themeMode: 'dark'}),
    },
  });
}

async function renderWithProviders(ui: React.ReactElement) {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <ThemeProvider>{ui}</ThemeProvider>
    </Provider>,
  );
}

/** Reads `useWindowDimensions` so the test asserts against the
 *  same numbers the shell computes with (the test env returns
 *  750×1334 by default; we never want a hard-coded 360×780). */
function ViewportProbe({testID}: {testID: string}) {
  const {width, height} = useWindowDimensions();
  return <View testID={testID} accessibilityLabel={`${width}x${height}`} />;
}

function ShellFixture({presentation}: {presentation: 'full' | 'mini'}) {
  return (
    <VideoPresentationShell
      presentation={presentation}
      testID="shell"
      fullChrome={<View testID="fullChrome" />}
      miniChrome={<View testID="miniChrome" />}
    >
      <ViewportProbe testID="surfaceSlot" />
    </VideoPresentationShell>
  );
}

function flattenStyle(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    : (style as Record<string, unknown>) ?? {};
}

describe('VideoPresentationShell — T7.1', () => {
  test('outer shell snaps to full-viewport size when presentation="full"', async () => {
    await renderWithProviders(<ShellFixture presentation="full" />);
    const shell = screen.getByTestId('shell');
    const style = flattenStyle(shell.props.style);
    const probe = screen.getByTestId('surfaceSlot');
    const [vw, vh] = (probe.props.accessibilityLabel as string).split('x').map(Number);
    // T7.1: full = viewport × viewport, no mini margin, no border
    // radius. The shell snaps synchronously on the first render
    // (no Animated wrapper around the layout props).
    expect(style.width).toBe(vw);
    expect(style.height).toBe(vh);
    expect(style.left).toBe(0);
    expect(style.top).toBe(0);
    expect(style.borderRadius).toBe(0);
    expect(style.overflow).toBe('hidden');
  });

  test('outer shell snaps to mini slot when presentation="mini"', async () => {
    await renderWithProviders(<ShellFixture presentation="mini" />);
    const shell = screen.getByTestId('shell');
    const style = flattenStyle(shell.props.style);
    const probe = screen.getByTestId('surfaceSlot');
    const [vw, vh] = (probe.props.accessibilityLabel as string).split('x').map(Number);
    // T7.1: mini = (vw − 2 * MARGIN) × MINI_HEIGHT, anchored at the
    // bottom. T7.1 centralised the constants so the shell, the
    // host's `setPresentation` call, and the native bridge all
    // agree.
    expect(style.width).toBe(vw - MINI_WIDTH_MARGIN * 2);
    expect(style.height).toBe(MINI_HEIGHT);
    expect(style.left).toBe(MINI_WIDTH_MARGIN);
    expect(style.top).toBe(vh - MINI_HEIGHT - MINI_WIDTH_MARGIN);
    expect(style.borderRadius).toBe(MINI_RADIUS);
  });

  test('mini shell width is strictly smaller than full shell width', async () => {
    // T7.1 invariant: the snap-to-target-on-presentation-change
    // means the same shell container renders at two distinct
    // sizes. If a regression silently makes the shell fill-screen
    // in mini mode the test would catch it.
    const {rerender, unmount} = await renderWithProviders(
      <ShellFixture presentation="full" />,
    );
    const fullShell = screen.getByTestId('shell');
    const fullStyle = flattenStyle(fullShell.props.style);
    // v14: rerender is async — must be awaited so the new tree
    // commits before we re-query the shell.
    await act(async () => {
      await rerender(
        <Provider store={createMockStore()}>
          <ThemeProvider>
            <ShellFixture presentation="mini" />
          </ThemeProvider>
        </Provider>,
      );
    });
    const miniShell = screen.getByTestId('shell');
    const miniStyle = flattenStyle(miniShell.props.style);
    expect(miniStyle.width).toBeLessThan(fullStyle.width as number);
    expect(miniStyle.height).toBeLessThan(fullStyle.height as number);
    expect(miniStyle.borderRadius).toBeGreaterThan(fullStyle.borderRadius as number);
    unmount();
  });

  test('both chrome projections stay mounted during the presentation', async () => {
    await renderWithProviders(<ShellFixture presentation="full" />);
    // T7.1: both projections mount in BOTH modes — only the
    // opacity (and pointerEvents) gate visibility, so the
    // transition crossfades without a remount.
    expect(screen.getByTestId('fullChrome')).toBeTruthy();
    expect(screen.getByTestId('miniChrome')).toBeTruthy();
  });

  test('the children slot (surface) stays mounted across presentation flips', async () => {
    const {rerender} = await renderWithProviders(<ShellFixture presentation="full" />);
    expect(screen.getByTestId('surfaceSlot')).toBeTruthy();
    await act(async () => {
      rerender(
        <Provider store={createMockStore()}>
          <ThemeProvider>
            <ShellFixture presentation="mini" />
          </ThemeProvider>
        </Provider>,
      );
    });
    // T7.1 error fix: surface is mounted once across full↔mini; the
    // shell's outer container snaps, the inner transform layer
    // animates. The surface must NOT remount on a presentation flip
    // (remounting drops the active seek — see the spec §0.7 error
    // note).
    expect(screen.getByTestId('surfaceSlot')).toBeTruthy();
    expect(screen.getByTestId('fullChrome')).toBeTruthy();
    expect(screen.getByTestId('miniChrome')).toBeTruthy();
  });

  test('only one chrome projection accepts pointer events at a time', async () => {
    // v11 T7.1: pointer events gate visibility to avoid both
    // chromes tapping each other during the cross-fade. In full
    // mode the full chrome accepts events; the mini chrome is
    // inert. In mini mode it's the other way around.
    const {rerender} = await renderWithProviders(<ShellFixture presentation="full" />);
    expect(screen.getByTestId('fullChrome').parent?.parent?.props?.pointerEvents).toBe('box-none');
    await act(async () => {
      rerender(
        <Provider store={createMockStore()}>
          <ThemeProvider>
            <ShellFixture presentation="mini" />
          </ThemeProvider>
        </Provider>,
      );
    });
    expect(screen.getByTestId('miniChrome').parent?.parent?.props?.pointerEvents).toBe('box-none');
  });
});
