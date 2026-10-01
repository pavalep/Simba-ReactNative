/// <reference types="node" />
/**
 * `BottomSheet` — the true-sheet wrapper.
 *
 * Two defects are pinned here, both of which shipped as "the sheet is
 * empty / the sheet warns about itself":
 *
 * 1. `scrollableRef` was never forwarded. true-sheet discovers a sheet's
 *    body by React tag, and `TrueSheetContentView.findScrollView()`
 *    returns null for a handle it never received — so the sheet could
 *    neither measure nor scroll its own content. Every caller with a
 *    scrolling body was affected.
 *
 * 2. The sheet was driven by a bare `visible` effect, which fires once
 *    on mount with `visible === false`. That called `dismiss()` on a
 *    sheet that had never been presented ("sheet is already dismissed"),
 *    and a consumer's `resize()` in the same commit raced the still-async
 *    `present()` ("Cannot resize. Sheet is not presented").
 *
 * See the file header on BottomSheet.tsx for the third, native half of
 * the empty-sheet bug: a body styled `flex: 1` measures to ZERO in
 * true-sheet 4.x's unconstrained pass, so the body must not use flex.
 * That part cannot be asserted in Jest — it is a Yoga pass in C++.
 */

import React from 'react';
import {Dimensions, Text, View} from 'react-native';
import {render, screen} from '@testing-library/react-native';

import {
  BottomSheet,
  type BottomSheetHandle,
} from '../../../../src/components/sheets/BottomSheet/BottomSheet';

// BottomSheet reads the theme, and its title row renders through AppText,
// which reads the theme again. Mock `useTheme` with the REAL token set
// rather than a hand-rolled colour stub: a partial stub silently fails
// on the first nested consumer that reaches for a different token, and
// the failure lands far from the mock. Safe-area insets are a constant
// zeroed stub — this suite is about the sheet's native contract, not
// its colours.
jest.mock('../../../../src/theme', () => {
  const tokens = jest.requireActual('../../../../src/theme/tokens');
  return {
    useTheme: () => ({
      theme: 'dark',
      tokens: tokens.darkTokens,
      colors: tokens.darkColors,
      legacy: tokens.legacyFromTokens(tokens.darkTokens),
      spacing: tokens.spacing,
      typography: tokens.typography,
      shadows: tokens.darkShadows,
      radius: tokens.radius,
      motion: tokens.motion,
      isDark: true,
      setTheme: jest.fn(),
      themeMode: 'dark',
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

// ── The true-sheet mock ──
// Records every prop it is handed (so a dropped pass-through is visible)
// and exposes the imperative surface our wrapper drives.
interface RecordedProps {
  scrollableRef?: unknown;
  detents?: unknown[];
  maxContentHeight?: number;
  [key: string]: unknown;
}

const mockProps: RecordedProps[] = [];
const mockPresent = jest.fn<Promise<void>, [number?]>();
const mockDismiss = jest.fn<Promise<void>, []>();
const mockResize = jest.fn<Promise<void>, [number]>();

jest.mock('@lodev09/react-native-true-sheet', () => {
  const ReactLocal = require('react');
  const {View: RNView} = require('react-native');

  return {
    TrueSheet: ReactLocal.forwardRef((props: RecordedProps, ref: unknown) => {
      mockProps.push(props);
      ReactLocal.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
        resize: mockResize,
      }));
      return ReactLocal.createElement(
        RNView,
        {testID: 'true-sheet'},
        props.children,
      );
    }),
  };
});

/** Let queued microtasks (and the present promise) settle. */
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

const lastProps = () => mockProps[mockProps.length - 1];

describe('BottomSheet', () => {
  beforeEach(() => {
    mockProps.length = 0;
    mockPresent.mockReset().mockResolvedValue(undefined);
    mockDismiss.mockReset().mockResolvedValue(undefined);
    mockResize.mockReset().mockResolvedValue(undefined);
  });

  it('mounts closed without dismissing a sheet that was never presented', async () => {
    // The regression: a `visible` effect firing on mount called
    // dismiss() on a never-presented sheet.
    await render(
      <BottomSheet visible={false} onClose={jest.fn()}>
        <Text>body</Text>
      </BottomSheet>,
    );
    await flush();

    expect(mockPresent).not.toHaveBeenCalled();
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('presents on the closed → open transition, and dismisses on the way back', async () => {
    const {rerender} = await render(
      <BottomSheet visible={false} onClose={jest.fn()} initialSnap={1}>
        <Text>body</Text>
      </BottomSheet>,
    );
    await flush();
    expect(mockPresent).not.toHaveBeenCalled();

    await rerender(
      <BottomSheet visible onClose={jest.fn()} initialSnap={1}>
        <Text>body</Text>
      </BottomSheet>,
    );
    await flush();
    expect(mockPresent).toHaveBeenCalledWith(1);

    await rerender(
      <BottomSheet visible={false} onClose={jest.fn()} initialSnap={1}>
        <Text>body</Text>
      </BottomSheet>,
    );
    await flush();
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not re-present while already open', async () => {
    const {rerender} = await render(
      <BottomSheet visible onClose={jest.fn()}>
        <Text>body</Text>
      </BottomSheet>,
    );
    await flush();
    expect(mockPresent).toHaveBeenCalledTimes(1);

    await rerender(
      <BottomSheet visible onClose={jest.fn()}>
        <Text>body again</Text>
      </BottomSheet>,
    );
    await flush();

    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  describe('scrollableRef', () => {
    it("forwards the caller's ref so true-sheet can find the body", async () => {
      // A ref that is NOT forwarded is the whole empty-sheet bug: the
      // native side resolves it to a React tag and looks the body up by
      // that tag, so a dropped prop means a body it can never find.
      const bodyRef = React.createRef<View>();
      await render(
        <BottomSheet visible={false} onClose={jest.fn()} scrollableRef={bodyRef}>
          <View ref={bodyRef} />
        </BottomSheet>,
      );
      await flush();

      expect(lastProps().scrollableRef).toBe(bodyRef);
    });

    it('leaves the prop undefined when the caller has no scrollable body', async () => {
      await render(
        <BottomSheet visible={false} onClose={jest.fn()}>
          <Text>static body</Text>
        </BottomSheet>,
      );
      await flush();

      expect(lastProps().scrollableRef).toBeUndefined();
    });
  });

  describe('resize', () => {
    it('defers a resize that arrives before presentation onto the present promise', async () => {
      // true-sheet rejects resize() until the sheet is presented
      // ("Cannot resize. Sheet is not presented"), and present() is async.
      // A consumer resizing in the same commit as the open must be
      // deferred, not dropped and not fired early.
      let releasePresent: () => void = () => {};
      mockPresent.mockImplementation(
        () => new Promise<void>(resolve => (releasePresent = resolve)),
      );

      const ref = React.createRef<BottomSheetHandle>();
      await render(
        <BottomSheet ref={ref} visible onClose={jest.fn()}>
          <Text>body</Text>
        </BottomSheet>,
      );
      await flush();

      ref.current?.resize(1);
      await flush();
      // Still presenting — the resize must not have hit the native side.
      expect(mockResize).not.toHaveBeenCalled();

      releasePresent();
      await flush();
      expect(mockResize).toHaveBeenCalledWith(1);
    });

    it('resizes immediately once the sheet is presented', async () => {
      const ref = React.createRef<BottomSheetHandle>();
      await render(
        <BottomSheet ref={ref} visible onClose={jest.fn()}>
          <Text>body</Text>
        </BottomSheet>,
      );
      await flush();

      ref.current?.resize(1);
      await flush();

      expect(mockResize).toHaveBeenCalledWith(1);
    });
  });

  describe('detents', () => {
    it("passes an 'auto' detent through as a keyword, not a fraction", async () => {
      await render(
        <BottomSheet visible={false} onClose={jest.fn()} snapPoints={['auto', '92%']}>
          <Text>body</Text>
        </BottomSheet>,
      );
      await flush();

      expect(lastProps().detents).toEqual(['auto', 0.92]);
    });

    it("caps 'auto' at the largest explicit detent so the stops stay ordered", async () => {
      // 'auto' alone would grow to the full window height, making detent 0
      // taller than detent 1. The cap is what keeps a long body from
      // inverting the sheet's rest stops.
      await render(
        <BottomSheet visible={false} onClose={jest.fn()} snapPoints={['auto', '92%']}>
          <Text>body</Text>
        </BottomSheet>,
      );
      await flush();

      const cap = lastProps().maxContentHeight as number;
      expect(cap).toBeGreaterThan(0);
      expect(cap).toBeLessThanOrEqual(
        Dimensions.get('window').height,
      );
      // Within a point of 92% of the window.
      expect(cap).toBeCloseTo(Dimensions.get('window').height * 0.92, -1);
    });

    it('sends no cap when there is no auto detent', async () => {
      // A cap with no 'auto' detent would silently shrink a fixed-fraction
      // sheet, so it must stay undefined.
      await render(
        <BottomSheet visible={false} onClose={jest.fn()} snapPoints={['50%', '90%']}>
          <Text>body</Text>
        </BottomSheet>,
      );
      await flush();

      expect(lastProps().detents).toEqual([0.5, 0.9]);
      expect(lastProps().maxContentHeight).toBeUndefined();
    });
  });

  it('renders its children and the optional title', async () => {
    await render(
      <BottomSheet visible={false} onClose={jest.fn()} title="Filters">
        <Text>the body</Text>
      </BottomSheet>,
    );
    await flush();

    expect(screen.getByText('Filters')).toBeTruthy();
    expect(screen.getByText('the body')).toBeTruthy();
    expect(screen.getByTestId('true-sheet')).toBeTruthy();
  });
});
