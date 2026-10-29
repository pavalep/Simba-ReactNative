/**
 * `HomeMediaShelf` — the Recently Played card's line and spoken label.
 *
 * ## The defect this pins
 *
 * The shelf rendered
 *
 * ```tsx
 * `${formatDuration(item.position ?? 0)} / ${formatDuration(item.duration)}`
 * ```
 *
 * — always both segments. `formatDuration(0)` returns `''`, so a card with
 * a duration and NO resume position read
 *
 *     " / 21:58"
 *
 * a line that opens with a separator and claims a position that does not
 * exist. The accessibility label did the same in prose:
 *
 *     "The Rifle,  of 21:58"
 *
 * with a dangling "of" and nothing in front of it.
 *
 * ## Both halves, together
 *
 * The visible line and the spoken label are asserted in the same test on
 * purpose. A fix that corrected the subtitle but left the label dangling
 * would still ship a screen reader a sentence with a hole in it, and a fix
 * that corrected the label but left the subtitle alone would still show the
 * user a stray separator.
 */

import React from 'react';
import {render, screen} from '@testing-library/react-native';
import {ThemeProvider} from '../../../src/theme';
import {
  HomeMediaShelf,
  type HomeMediaShelfItem,
} from '../../../src/screens/Home/components/HomeMediaShelf';

async function renderShelf(items: HomeMediaShelfItem[]) {
  return await render(
    <ThemeProvider>
      <HomeMediaShelf
        title="Recently Played"
        items={items}
        onItemPress={jest.fn()}
      />
    </ThemeProvider>,
  );
}

const WITH_POSITION: HomeMediaShelfItem = {
  id: 'rifle',
  fileUri: 'https://example.test/the-rifle.mp4',
  title: 'The Rifle',
  mediaType: 'video',
  // A thumbnail is given so the card takes its IMAGE branch too. Without
  // it the card renders the placeholder, and a broken image component
  // would never be noticed — which is how a mock's missing `resizeMode`
  // static survived for as long as it did.
  resumeThumbnailPath:
    '/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_1_30000.jpg',
  position: 97,
  duration: 1318,
};

const WITHOUT_POSITION: HomeMediaShelfItem = {
  id: 'plain',
  fileUri: 'https://example.test/plain.mp4',
  title: 'Plain Film',
  mediaType: 'video',
  position: 0,
  duration: 1318,
};

describe('HomeMediaShelf — the card line', () => {
  it('renders "position / duration" when there is a position', async () => {
    await renderShelf([WITH_POSITION]);

    expect(screen.getByText('1:37 / 21:58')).toBeTruthy();
    expect(screen.getByLabelText('The Rifle, 1:37 of 21:58')).toBeTruthy();
  });

  it('renders the duration ALONE when there is no position', async () => {
    // The regression. The old template printed " / 21:58".
    await renderShelf([WITHOUT_POSITION]);

    expect(screen.getByText('21:58')).toBeTruthy();
    expect(screen.queryByText(' / 21:58')).toBeNull();
    expect(screen.queryByText('/ 21:58')).toBeNull();
  });

  it('never leaves a dangling "of" in the spoken label', async () => {
    // The regression, in prose. The old shape produced "Plain Film,  of
    // 21:58".
    await renderShelf([WITHOUT_POSITION]);

    const label = screen.getByLabelText('Plain Film, 21:58 long');
    expect(label).toBeTruthy();
    expect(label.props.accessibilityLabel).not.toMatch(/,\s*,/);
  });

  it('renders no line at all when the duration is unknown', async () => {
    await renderShelf([{...WITHOUT_POSITION, duration: undefined}]);

    expect(screen.queryByText('21:58')).toBeNull();
    expect(screen.getByLabelText('Plain Film')).toBeTruthy();
  });
});
