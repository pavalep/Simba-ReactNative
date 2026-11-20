/**
 * V22 W32 (2026-10-28) — the app's ONE floating action button.
 *
 * ## Why the component exists
 *
 * The app had SIX files for one button: a Home one, three byte-identical
 * catalogue copies, two more byte-identical copies, and the Library's
 * drawn inline in a stylesheet. Every one of them positioned itself by
 * hand, and they had already drifted — different right margins,
 * different shadows, different z-indexes.
 *
 * A rule that lives in seven call sites is not a rule, it is seven
 * chances to get it wrong. So the rule lives HERE, in the one component
 * that draws a floating button, and the tests below are what hold it
 * there.
 *
 * ## What these tests pin
 *
 *   1. The button floats on the app's bottom-chrome rule — one spacing
 *      step above the safe area when nothing is playing, and clear of
 *      the mini-player dock when one is up. The old defect was exactly
 *      this: the dock's top 14 dp sat over the bottom of every button.
 *   2. It is a button, with a name, that calls its handler.
 *   3. It can hide itself, and it can carry a count.
 *   4. Its size is the one exported number.
 */

import React from 'react';
import {Dimensions, StyleSheet, type ViewStyle} from 'react-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import type {JsonNode} from 'test-renderer';
import {ThemeProvider} from '../../../../src/theme';
import {Fab, FAB_SIZE} from '../../../../src/components/core/Fab/Fab';
import type {SvgIconName} from '../../../../src/components/utility/SvgIcon/SvgIcon';
import {MINI_PLAYER_HEIGHT} from '../../../../src/infrastructure/player/miniPlayerChrome';
import {useNowPlayingStore} from '../../../../src/state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../../src/state/useAudioPresentationStore';
import {spacing} from '../../../../src/theme/tokens';
import {useKeyboard} from '../../../../src/hooks/useKeyboard';

/**
 * The keyboard is mocked rather than driven: the hook is a thin
 * wrapper over `Keyboard.addListener`, and what these tests are about
 * is the button's REACTION to a keyboard, not the hook.
 */
jest.mock('../../../../src/hooks/useKeyboard', () => ({
  useKeyboard: jest.fn(() => ({
    keyboardVisible: false,
    keyboardHeight: 0,
    keyboardTop: 0,
  })),
}));

const mockUseKeyboard = useKeyboard as jest.MockedFunction<typeof useKeyboard>;

/**
 * The `bottom` of the first node that declares one.
 *
 * The button itself does not carry a `bottom` — the OVERLAY does, and
 * the overlay is the button's absolutely-positioned wrapper. The badge
 * is anchored with `top`/`right`, so it cannot be mistaken for it.
 *
 * The tree's node type comes from `test-renderer` — the renderer RNTL
 * v14 actually uses. A node is either an element or a text string, so
 * a string carries no style and is skipped.
 */
function findBottom(node: JsonNode | JsonNode[] | null): number | undefined {
  if (node == null) return undefined;
  if (typeof node === 'string') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findBottom(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const style = node.props?.style;
  if (style) {
    const flat = StyleSheet.flatten(style as ViewStyle) as {bottom?: number};
    if (typeof flat.bottom === 'number') return flat.bottom;
  }
  return findBottom(node.children ?? null);
}

/** The parts of the FAB's props a test may override. */
interface FabOverrides {
  icon?: SvgIconName;
  label?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  visible?: boolean;
  badgeCount?: number;
}

async function renderFab(overrides: FabOverrides = {}) {
  const onPress = overrides.onPress ?? jest.fn();
  const shared = {
    onPress,
    accessibilityLabel: overrides.accessibilityLabel ?? 'Filter options',
    visible: overrides.visible,
    badgeCount: overrides.badgeCount,
  };
  // `icon` and `label` are mutually exclusive in `FabProps`, so the
  // element is built on the branch that is wanted rather than spread.
  // A spread of a union is the one shape TypeScript will not assign.
  const element =
    overrides.label !== undefined ? (
      <Fab label={overrides.label} {...shared} />
    ) : (
      <Fab icon={overrides.icon ?? 'sliders'} {...shared} />
    );
  const result = await render(<ThemeProvider>{element}</ThemeProvider>);
  return {...result, onPress};
}

function beginAudioSession() {
  useNowPlayingStore.getState().begin({
    uri: 'file:///media/clip.mkv',
    title: 'Clip',
    startPositionMs: 0,
    streamType: 'audio',
  });
  useAudioPresentationStore.setState({mode: 'mini'});
}

afterEach(() => {
  useNowPlayingStore.getState().reset();
  useAudioPresentationStore.setState({mode: 'expanded'});
  mockUseKeyboard.mockReturnValue({
    keyboardVisible: false,
    keyboardHeight: 0,
    keyboardTop: 0,
  });
});

describe('Fab', () => {
  it('floats one spacing step above the safe area when nothing is playing', async () => {
    const {toJSON} = await renderFab();

    // The repo's safe-area mock reports zero insets, so the offset the
    // component adds IS the bottom it lands on.
    expect(findBottom(toJSON())).toBe(spacing.lg);
  });

  it('lifts clear of the mini-player dock when one is up', async () => {
    beginAudioSession();
    const {toJSON} = await renderFab();

    // The defect this pins: the dock is 54 dp tall at the window bottom
    // and the button used to stay at 40 dp, so the dock's top 14 dp sat
    // over the bottom of the button.
    expect(findBottom(toJSON())).toBe(MINI_PLAYER_HEIGHT + spacing.lg);
    expect(findBottom(toJSON())).not.toBe(spacing.lg);
  });

  it('lifts clear of the keyboard, measured from the keyboard top edge', async () => {
    // The defect (B13-3): on a window that does NOT resize behind the
    // keyboard (iOS, and Android from API 35 where edge-to-edge is
    // enforced), a button anchored to the window bottom edge sat UNDER
    // the keyboard, where nothing could reach it. The lift is therefore
    // MEASURED from the keyboard top edge, not assumed per platform.
    const windowHeight = Dimensions.get('window').height;
    mockUseKeyboard.mockReturnValue({
      keyboardVisible: true,
      keyboardHeight: 300,
      keyboardTop: windowHeight - 300,
    });

    const {toJSON} = await renderFab();

    // The distance from the window bottom edge down to the keyboard top
    // edge is what the button has to clear.
    expect(findBottom(toJSON())).toBe(300 + spacing.lg);
  });

  it('keeps its normal clearance when the window resizes behind the keyboard', async () => {
    // Older Android shrinks the window, so the window bottom edge IS the
    // keyboard top edge: there is nothing extra to clear, and lifting
    // would put the button in the middle of the screen.
    const windowHeight = Dimensions.get('window').height;
    mockUseKeyboard.mockReturnValue({
      keyboardVisible: true,
      keyboardHeight: 300,
      keyboardTop: windowHeight,
    });

    const {toJSON} = await renderFab();

    expect(findBottom(toJSON())).toBe(spacing.lg);
  });

  it('clears the keyboard rather than the mini-player dock while it is up', async () => {
    // The dock is 54 dp tall at the window bottom and it sits BEHIND the
    // keyboard while the keyboard is up, so the keyboard IS the bottom
    // edge to clear.
    beginAudioSession();
    const windowHeight = Dimensions.get('window').height;
    mockUseKeyboard.mockReturnValue({
      keyboardVisible: true,
      keyboardHeight: 300,
      keyboardTop: windowHeight - 300,
    });

    const {toJSON} = await renderFab();

    expect(findBottom(toJSON())).toBe(300 + spacing.lg);
    expect(findBottom(toJSON())).not.toBe(MINI_PLAYER_HEIGHT + spacing.lg);
  });

  it('is a button, with a name, that calls its handler', async () => {
    const onPress = jest.fn();
    await renderFab({onPress});

    const fab = screen.getByLabelText('Filter options');
    expect(fab.props.accessibilityRole).toBe('button');

    await fireEvent.press(fab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is the exported size', async () => {
    await renderFab();

    const fab = screen.getByLabelText('Filter options');
    const flat = StyleSheet.flatten(fab.props.style as ViewStyle) as {
      width?: number;
      height?: number;
    };
    expect(flat.width).toBe(FAB_SIZE);
    expect(flat.height).toBe(FAB_SIZE);
    expect(FAB_SIZE).toBe(56);
  });

  it('renders nothing when it is not wanted', async () => {
    await renderFab({visible: false});
    expect(screen.queryByLabelText('Filter options')).toBeNull();
  });

  it('carries a count on its corner and says so', async () => {
    await renderFab({badgeCount: 3});

    // The badge changes what the button MEANS, so the name has to
    // change with it — a screen reader that says "Filter options" for a
    // button that has three filters on it is lying.
    expect(screen.getByLabelText('Filter options, 3 active')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('draws a text glyph when there is no icon for it', async () => {
    await renderFab({icon: undefined, label: '+'});
    expect(screen.getByText('+')).toBeTruthy();
  });
});
