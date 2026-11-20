/**
 * B13-6 — the filter sheet's chip TOUCH TARGET.
 *
 * The sheet's chip is 32 dp and the app's floor is 44 dp. The chip
 * REACHES past its pill rather than growing its row: the sheet's chips
 * are stacked, and a 44 dp row would push the rows apart and change the
 * sheet's rhythm — the sheet is drawn on a board.
 *
 * These tests pin the reach, that it reaches VERTICALLY ONLY (a
 * horizontal reach would make the chips in a row fight over the same
 * taps), and that the reach is enough to answer to the floor.
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {ThemeProvider} from '../../../../src/theme';
import {
  FilterSheet,
  FILTER_SHEET_CHIP_HEIGHT,
  FILTER_SHEET_CHIP_REACH,
} from '../../../../src/components/sheets/FilterSheet/FilterSheet';
import {TOUCH_TARGET} from '../../../../src/constants/touchTarget';

const GROUPS = [
  {
    id: 'genre',
    title: 'Genre',
    rows: [
      {key: 'rock', label: 'Rock'},
      {key: 'pop', label: 'Pop'},
    ],
  },
];

describe('FilterSheet — the chip and its target', () => {
  it('reaches past the pill so the chip answers to the floor', async () => {
    await render(
      <ThemeProvider>
        <FilterSheet
          visible
          groups={GROUPS}
          value={{}}
          onChange={jest.fn()}
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    );

    const chip = screen.getByLabelText('Rock');
    const slop = chip.props.hitSlop as {
      top: number;
      bottom: number;
      left?: number;
      right?: number;
    };

    expect(slop.top).toBe(FILTER_SHEET_CHIP_REACH);
    expect(slop.bottom).toBe(FILTER_SHEET_CHIP_REACH);
    expect(slop.top * 2 + FILTER_SHEET_CHIP_HEIGHT).toBeGreaterThanOrEqual(
      TOUCH_TARGET,
    );
  });

  it('reaches VERTICALLY only — the chips in a row must not fight', async () => {
    await render(
      <ThemeProvider>
        <FilterSheet
          visible
          groups={GROUPS}
          value={{}}
          onChange={jest.fn()}
          onClose={jest.fn()}
        />
      </ThemeProvider>,
    );

    const slop = screen.getByLabelText('Rock').props.hitSlop as {
      left?: number;
      right?: number;
    };
    expect(slop.left ?? 0).toBe(0);
    expect(slop.right ?? 0).toBe(0);
  });
});
