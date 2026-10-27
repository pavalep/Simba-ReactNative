/**
 * `HomeFab` — where the Home FAB sits, and that it is a button.
 *
 * ## The defect this pins
 *
 * The Home FAB used to sit at `insets.bottom + 100`. That `100` was the
 * clearance for the floating bottom tab bar the app used to have (60 dp
 * plus a 10 dp margin). The tab bar was deleted in v11 Wave 1 and the
 * offset was never revised, so the button hung 124 dp above the bottom
 * edge — in the middle of the Explore Contents rail, overlapping a card
 * rather than floating in the corner.
 *
 * A FAB floats. It sits one spacing step above the safe area, and it
 * overlaps whatever is under it — that overlap is the point of a
 * floating button, not a defect. The app's other five FABs (Movies,
 * Music, Podcasts, Radio, Live TV) have always used
 * `insets.bottom + spacing.lg`, and this asserts the same rule here.
 *
 * The test uses the REAL `useSafeAreaInsets` from the repo's global
 * mock, which reports zero insets. That is deliberate: the assertion
 * below is about the OFFSET the component adds, not about a particular
 * device. A `+100` would read as `100` here and fail; `spacing.lg`
 * reads as `16` and passes.
 */

import React from 'react';
import {StyleSheet} from 'react-native';
import {render, screen, fireEvent} from '@testing-library/react-native';
import {ThemeProvider} from '../../../src/theme';
import {HomeFab} from '../../../src/screens/Home/components/HomeFab';
import {spacing} from '../../../src/theme/tokens';

async function renderFab(onPress = jest.fn()) {
  const result = await render(
    <ThemeProvider>
      <HomeFab onPress={onPress} />
    </ThemeProvider>,
  );
  return {...result, onPress};
}

describe('HomeFab', () => {
  it('floats one spacing step above the safe area, not 100 dp up', async () => {
    const {getByLabelText} = await renderFab();
    const fab = getByLabelText('Play media file');

    // `insets.bottom` is 0 under the repo's safe-area mock, so the
    // offset the component adds IS the bottom it lands on.
    const flat = StyleSheet.flatten(fab.props.style) as {bottom?: number};
    expect(flat.bottom).toBe(spacing.lg);
    expect(flat.bottom).not.toBe(100);
  });

  it('is a button, and pressing it calls the handler', async () => {
    const onPress = jest.fn();
    const {getByLabelText} = await renderFab(onPress);

    const fab = getByLabelText('Play media file');
    expect(fab.props.accessibilityRole).toBe('button');

    await fireEvent.press(fab);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps its own label, so a screen reader says what it does', async () => {
    await renderFab();
    expect(screen.getByLabelText('Play media file')).toBeTruthy();
  });
});
