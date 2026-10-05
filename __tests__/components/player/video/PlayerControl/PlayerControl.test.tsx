/// <reference types="node" />
/**
 * V19 W7.1 — `PlayerControl`: the player control primitive.
 *
 * Source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §3.2 and
 * invariants I11/I12 in `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §0.3.
 *
 * This suite exists because the whole W7 overhaul hangs off this one
 * component. Before it, five different hand-rolled `Pressable`s each
 * carried their own icon size, target size, and press treatment, and
 * they had drifted to 16 / 20 / 22 / 24 / 28 px. Nothing was
 * individually wrong; they simply did not belong to one system.
 *
 * The tests below pin the CONTRACT, not the current numbers, wherever
 * possible — they import the exported constants and assert the
 * relationship (e.g. the transport tier is larger than the floor), so
 * a future retune is a one-line change in the component rather than a
 * hunt through a dozen assertions.
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {PlayerControl} from '../../../../../src/components/player/video/PlayerControl/PlayerControl';
import {
  CONTROL_ICON_SIZE,
  CONTROL_ICON_SIZE_COMPACT,
  CONTROL_ICON_SIZE_TRANSPORT,
  CONTROL_PRIMARY_TARGET,
  CONTROL_TARGET,
} from '../../../../../src/components/player/video/PlayerControl/PlayerControl';
import {useHaptic} from '../../../../../src/infrastructure/player';

const mockHaptic = jest.fn();
jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = {
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useHaptic',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useTransport',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useReduceMotion',
    ),
  };
  return {
    ...actual,
    useHaptic: () => ({haptic: mockHaptic, isSupported: true}),
  };
});

// The theme is built from the REAL tokens rather than hand-written, so
// these tests cannot pass against a palette that no longer exists — the
// same rule the on-media chrome suite follows.
//
// Note the shape: `darkTokens` is a full `ThemeTokens`, so the colours
// the components read are on `darkTokens.colors`, not on
// `darkTokens` itself. Getting that nesting wrong is a silent trap — the
// mock returns an object and every read yields `undefined`.
jest.mock('../../../../../src/theme', () => {
  const actual = jest.requireActual('../../../../../src/theme/tokens');
  const tokens = actual.darkTokens;
  return {
    useTheme: () => ({
      theme: 'dark',
      tokens,
      colors: tokens.colors,
      spacing: tokens.spacing,
      // `AppText` destructures `typography` off the same hook, so a mock
      // that omits it makes every chip label throw on `variant` lookup.
      typography: tokens.typography,
      radius: tokens.radius,
      legacy: actual.legacyFromTokens(tokens),
    }),
  };
});

// A real host component rather than an invented tag name — a made-up
// intrinsic element does not typecheck, and the suite should not need a
// `// @ts-expect-error` to stand up its own double.
jest.mock('../../../../../src/components/utility/SvgIcon', () => {
  const {View} = jest.requireActual('react-native');
  return {
    SvgIcon: (props: {name: string; size: number; color: string}) => (
      <View testID="svg-placeholder" {...props} />
    ),
  };
});

const DARK = jest.requireActual('../../../../../src/theme/tokens')
  .darkTokens.colors;

/** Flatten a RN style prop (array | object | falsy) into one object. */
function flatten(style: unknown): Record<string, unknown> {
  const arr = Array.isArray(style) ? style.flat(Infinity) : [style];
  return Object.assign({}, ...arr.filter(Boolean)) as Record<string, unknown>;
}

describe('PlayerControl — the design system contract', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── The numbers ────────────────────────────────────────────────────

  // These are the invariants that make the tier system meaningful. They
  // are relational on purpose: the defect was four unrelated sizes, so a
  // test that pins absolute values would not catch a new tier being
  // invented at an arbitrary size between two existing ones.
  //
  // The order is COMPACT < FLOOR < TRANSPORT. That looks backwards until
  // you remember what the tiers are for: `CONTROL_ICON_SIZE` (24) is the
  // default for a bare secondary control, `COMPACT` (22) is one notch
  // below it for the densest row, and `TRANSPORT` (28) is the primary
  // cluster. The floor that matters is the SMALLEST — COMPACT must never
  // fall back to the old 16/20 px marks, which is precisely what it was
  // added to stop.
  it('the icon tiers are ordered and the smallest never drops below 22', () => {
    expect(CONTROL_ICON_SIZE_COMPACT).toBeLessThan(CONTROL_ICON_SIZE);
    expect(CONTROL_ICON_SIZE).toBeLessThan(CONTROL_ICON_SIZE_TRANSPORT);
    // The regression this whole component exists to prevent: the old
    // captions/repeat marks were 16 px and More/PiP were 20 px.
    expect(CONTROL_ICON_SIZE_COMPACT).toBeGreaterThanOrEqual(22);
  });

  // 44 is the platform hit-area norm and the WCAG 2.2 §2.5.8 floor for
  // this kind of control; the primary CTA earns more but never less.
  it('the target tiers are ordered and never below 44', () => {
    expect(CONTROL_TARGET).toBeGreaterThanOrEqual(44);
    expect(CONTROL_PRIMARY_TARGET).toBeGreaterThan(CONTROL_TARGET);
  });

  it('every target is large enough to hold the icon it wraps', () => {
    // A target SMALLER than its glyph means the glyph is clipped or the
    // hit area is effectively the glyph, which is the "partially hidden"
    // complaint in a different guise.
    for (const [icon, target] of [
      [CONTROL_ICON_SIZE, CONTROL_TARGET],
      [CONTROL_ICON_SIZE_COMPACT, CONTROL_TARGET],
      [CONTROL_ICON_SIZE_TRANSPORT, CONTROL_TARGET],
      [CONTROL_ICON_SIZE_TRANSPORT, CONTROL_PRIMARY_TARGET],
    ] as const) {
      expect(target).toBeGreaterThanOrEqual(icon);
    }
  });

  // ── Bare tier ──────────────────────────────────────────────────────

  it('renders a square target sized by targetSize', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
      />,
    );
    const style = flatten(getByLabelText('Play').props.style);
    expect(style.width).toBe(CONTROL_TARGET);
    expect(style.height).toBe(CONTROL_TARGET);
  });

  it('honours a targetSize override', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
        targetSize={CONTROL_PRIMARY_TARGET}
      />,
    );
    const style = flatten(getByLabelText('Play').props.style);
    expect(style.height).toBe(CONTROL_PRIMARY_TARGET);
  });

  it('draws the icon at the default 24px floor', async () => {
    const {getByTestId} = await render(
      <PlayerControl
        testID="ctl"
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
      />,
    );
    expect(getByTestId('svg-placeholder').props.size).toBe(
      CONTROL_ICON_SIZE,
    );
  });

  // ── I11: a control that cannot act must say so ─────────────────────

  it('a disabled control does not fire its handler', async () => {
    const onPress = jest.fn();
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={onPress}
        accessibilityLabel="Play"
        disabled
      />,
    );
    fireEvent.press(getByLabelText('Play'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('a disabled control reports disabled in the accessibility tree', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
        disabled
      />,
    );
    expect(getByLabelText('Play').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('a disabled control renders visibly muted, not invisible', async () => {
    const {getByTestId} = await render(
      <PlayerControl
        testID="ctl"
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
        disabled
      />,
    );
    // A fully hidden control reads as a rendering bug; "unavailable" has
    // to still be identifiable as a control.
    const inner = flatten(getByTestId('ctl__inner').props.style);
    expect(inner.opacity).toBeGreaterThan(0);
    expect(inner.opacity).toBeLessThan(1);
  });

  // ── Press feedback ─────────────────────────────────────────────────

  it('fires the handler and a haptic on press', async () => {
    const onPress = jest.fn();
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={onPress}
        accessibilityLabel="Play"
      />,
    );
    fireEvent.press(getByLabelText('Play'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockHaptic).toHaveBeenCalledWith('light');
  });

  it('uses the medium haptic for a control that asks for it', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
        haptic="medium"
      />,
    );
    fireEvent.press(getByLabelText('Play'));
    expect(mockHaptic).toHaveBeenCalledWith('medium');
  });

  it('does NOT haptic a disabled control — it did not act', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
        disabled
      />,
    );
    fireEvent.press(getByLabelText('Play'));
    expect(mockHaptic).not.toHaveBeenCalled();
  });

  // The reported "not clickable" defect was `hitSlop={8}` inflating
  // every control 8 px past its own bounds, so adjacent controls in a
  // dense row overlapped and competed for the same tap. The primitive
  // is a real target instead, so `hitSlop` must stay absent — otherwise
  // a future tap bug gets "fixed" by reinstating it.
  it('never inflates its touch area with hitSlop', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
      />,
    );
    expect(getByLabelText('Play').props.hitSlop).toBeUndefined();
  });

  // ── The chip tier ──────────────────────────────────────────────────

  it('a chip is a pill sized to its content, not a square', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        chip
        icon="repeat"
        label="Repeat all"
        onPress={jest.fn()}
        accessibilityLabel="Repeat mode: Repeat all"
      />,
    );
    const style = flatten(getByLabelText('Repeat mode: Repeat all').props.style);
    // No fixed width — the pill hugs "Repeat all" vs "Off" so neither
    // is clipped or left ragged.
    expect(style.width).toBeUndefined();
    expect(style.height).toBe(CONTROL_TARGET);
    expect(style.borderRadius).toBe(CONTROL_TARGET / 2);
  });

  // This is the token-discipline assertion. The video frame is dark in
  // BOTH themes, so a light-theme player still needs a dark pill; the
  // near-identical `background.floating` and `background.highlight`
  // tokens both flip to light-theme values and would wash the row out.
  it('a chip uses the always-dark on-media pill surface, not a themed one', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        chip
        icon="repeat"
        label="Off"
        onPress={jest.fn()}
        accessibilityLabel="Repeat mode: Off"
      />,
    );
    const style = flatten(getByLabelText('Repeat mode: Off').props.style);
    expect(style.backgroundColor).toBe(DARK.background.onMediaPill);
    expect(style.backgroundColor).not.toBe(DARK.background.floating);
    expect(style.backgroundColor).not.toBe(DARK.background.highlight);
  });

  it('an active chip switches to the gold fill and border', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        chip
        active
        icon="repeat"
        label="Repeat all"
        onPress={jest.fn()}
        accessibilityLabel="Repeat mode: Repeat all"
      />,
    );
    const style = flatten(getByLabelText('Repeat mode: Repeat all').props.style);
    expect(style.backgroundColor).toBe(DARK.accent.goldDim);
    expect(style.borderColor).toBe(DARK.accent.gold);
  });

  it('renders the chip label as text', async () => {
    const {getByText} = await render(
      <PlayerControl
        chip
        icon="repeat"
        label="Repeat all"
        onPress={jest.fn()}
        accessibilityLabel="Repeat mode: Repeat all"
      />,
    );
    expect(getByText('Repeat all')).toBeTruthy();
  });

  it('an active chip tints its icon gold', async () => {
    const {getByTestId} = await render(
      <PlayerControl
        testID="ctl"
        chip
        active
        icon="repeat"
        label="Repeat all"
        onPress={jest.fn()}
        accessibilityLabel="Repeat mode: Repeat all"
      />,
    );
    expect(getByTestId('svg-placeholder').props.color).toBe(
      DARK.accent.gold,
    );
  });

  // ── Switch semantics ───────────────────────────────────────────────

  // Gold ink alone is not an accessible signal (WCAG 1.4.1), so a
  // two-state control must ALSO carry the state in the a11y tree.
  it('a switch reports its checked state', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="lock"
        onPress={jest.fn()}
        accessibilityLabel="Lock orientation"
        accessibilityRole="switch"
        accessibilityChecked
      />,
    );
    const node = getByLabelText('Lock orientation');
    expect(node.props.accessibilityRole).toBe('switch');
    expect(node.props.accessibilityState).toMatchObject({checked: true});
  });

  it('defaults to the button role', async () => {
    const {getByLabelText} = await render(
      <PlayerControl
        icon="play"
        onPress={jest.fn()}
        accessibilityLabel="Play"
      />,
    );
    expect(getByLabelText('Play').props.accessibilityRole).toBe('button');
  });
});
