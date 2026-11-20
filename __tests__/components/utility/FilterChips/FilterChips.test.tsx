/**
 * B13-6 — the chip's TOUCH TARGET.
 *
 * The app's floor is 44 dp (`src/constants/touchTarget.ts`) and the
 * shared chip's PILL is 23 dp. The finding was that the floor was
 * applied NOWHERE: the chip's target WAS the pill, so a 23 dp pill was a
 * 23 dp target.
 *
 * These tests pin the two numbers separately, because they are two
 * different facts:
 *
 *   1. the TARGET is the app's floor — a 44 dp tall touchable;
 *   2. the PILL is still the 23 dp pill the boards draw.
 *
 * The second one is COMPUTED from the styles rather than asserted as a
 * literal, so a change to the chip's type or its padding cannot quietly
 * move the drawn chip without this test noticing.
 */

import React from 'react';
import {StyleSheet, type ViewStyle} from 'react-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import type {JsonNode} from 'test-renderer';
import {ThemeProvider} from '../../../../src/theme';
import {
  FilterChips,
  CHIP_HEIGHT,
} from '../../../../src/components/utility/FilterChips';
import {TOUCH_TARGET} from '../../../../src/constants/touchTarget';

const ITEMS = [
  {key: 'f:genre:Rock', label: 'Rock'},
  {key: 'f:country:Norway', label: 'Norway'},
];

/**
 * The first descendant whose style carries a border — the PILL.
 *
 * The touch target and the pill are two different nodes now (the target
 * is the 44 dp touchable, the pill is drawn inside it), so the pill has
 * to be found rather than assumed.
 */
function findPill(node: JsonNode | JsonNode[] | null): ViewStyle | null {
  if (node == null) return null;
  if (typeof node === 'string') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findPill(child);
      if (found) return found;
    }
    return null;
  }
  const style = node.props?.style;
  if (style) {
    const flat = StyleSheet.flatten(style as ViewStyle) as {borderWidth?: number};
    if (typeof flat.borderWidth === 'number') return flat as ViewStyle;
  }
  return findPill(node.children ?? null);
}

async function renderChips(props: Record<string, unknown> = {}) {
  return render(
    <ThemeProvider>
      <FilterChips
        items={ITEMS}
        selectedKey="f:genre:Rock"
        onSelect={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('FilterChips — the touch target', () => {
  it('answers to the 44 dp floor', async () => {
    await renderChips();

    const chip = screen.getByLabelText('Rock');
    const flat = StyleSheet.flatten(chip.props.style as ViewStyle) as {
      minHeight?: number;
    };
    expect(flat.minHeight).toBe(TOUCH_TARGET);
    expect(flat.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGET);
  });

  it('still draws the 23 dp pill the boards draw', async () => {
    const {toJSON} = await renderChips();

    const pill = StyleSheet.flatten(findPill(toJSON()) as ViewStyle) as {
      paddingVertical?: number;
      borderWidth?: number;
    };
    const label = StyleSheet.flatten(
      screen.getByText('Rock').props.style as ViewStyle,
    ) as {lineHeight?: number};

    // The drawn height is the padding, the label's line and the border —
    // computed, so a change to any of them is caught here.
    const drawn =
      (pill.paddingVertical ?? 0) * 2 +
      (pill.borderWidth ?? 0) * 2 +
      (label.lineHeight ?? 0);
    expect(drawn).toBe(CHIP_HEIGHT);
    expect(drawn).toBe(23);
  });

  it('selects the chip it was asked to select', async () => {
    const onSelect = jest.fn();
    await renderChips({onSelect});

    await fireEvent.press(screen.getByLabelText('Norway'));
    expect(onSelect).toHaveBeenCalledWith('f:country:Norway');
  });
});
