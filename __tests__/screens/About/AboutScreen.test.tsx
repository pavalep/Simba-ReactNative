/**
 * The About screen — the four things that were wrong with it.
 *
 * 2026-11-12. The page the owner screenshotted showed:
 *
 *   1. the link list as a COLUMN OF UNLABELLED ICONS — a `FlatList`
 *      inside an `alignItems: 'center'` column, each row declaring
 *      `width: '100%'`, a circular constraint Yoga resolves by
 *      collapsing the list to the width of its widest fixed child;
 *   2. "Version 1.0.0" while the build is 1.1.0 (2);
 *   3. "Built with: … Redux Toolkit" — the app has not used Redux
 *      since V17;
 *   4. a second, red "Reset all settings" — the Profile owns the reset.
 *
 * The list's collapse is a LAYOUT defect, and a render test cannot
 * measure a width — but it CAN prove the mechanism is gone: the rows
 * are the app's own `SettingsRow` (a full-bleed row with a hairline
 * under it), and nothing above them is a centered column any more.
 * The width itself is proved on the device (see `md/ABOUT_PAGE_FIX.md`
 * §6).
 */

import React from 'react';
import {StyleSheet, type ViewStyle} from 'react-native';
import {renderWithProviders} from '../../helpers/renderWithProviders';
import {AboutScreen} from '../../../src/screens/About/components/AboutScreen';
import {APP_VERSION_LABEL} from '../../../src/constants/appVersion';

/**
 * The nine links, in the order the page shows them.
 *
 * The labels are the pages' own titles — the Terms screen says "Terms
 * of Use", so the About row says "Terms of Use" too.
 */
const LINK_LABELS = [
  'Changelog',
  'Credits',
  'Open Source Licenses',
  'Privacy Policy',
  'Terms of Use',
  'Rate on Play Store',
  'Share App',
  'Report Bug',
  'Contact / Feedback',
];

/**
 * The entrance animation is not what this test is about, and its
 * starting `opacity: 0` hides every row from a plain query. The rows
 * are then matched with `includeHiddenElements`, and the layout
 * assertions below read the STYLES, which the animation does not
 * touch.
 */
const HIDDEN = {includeHiddenElements: true} as const;

describe('About screen', () => {
  it('shows every link with its label — the list is not a column of icons', async () => {
    const {getByText} = await renderWithProviders(AboutScreen, {
      routeName: 'About',
    });

    for (const label of LINK_LABELS) {
      expect(getByText(label, HIDDEN)).toBeTruthy();
    }
  });

  it('draws each link as the app’s own full-width row', async () => {
    const {getByLabelText} = await renderWithProviders(AboutScreen, {
      routeName: 'About',
    });

    // The row's own container is the child of the touchable that
    // carries the hairline that separates it from the next row.
    const touchable = getByLabelText('Changelog', HIDDEN);
    const hosts = (touchable.children as Array<unknown>).filter(
      child => typeof child !== 'string',
    ) as Array<{props?: {style?: ViewStyle}}>;
    const row = hosts
      .map(child => StyleSheet.flatten(child.props?.style))
      .find(style => style.borderBottomWidth);

    expect(row).toBeDefined();
    expect(row?.flexDirection).toBe('row');
    expect(row?.minHeight).toBe(52);
  });

  it('puts the rows in no centered column — the cause of the collapse', async () => {
    const {getByLabelText} = await renderWithProviders(AboutScreen, {
      routeName: 'About',
    });

    // Walk up from the first row to the screen root. The old bug was
    // an ancestor with `alignItems: 'center'`: a column shrink-wraps
    // its children, so a `width: '100%'` row resolved against a width
    // that depended on the row.
    let node = getByLabelText('Changelog', HIDDEN).parent;
    while (node) {
      const style = StyleSheet.flatten(node.props?.style ?? {});
      expect(style.alignItems).not.toBe('center');
      node = node.parent;
    }
  });

  it('shows the app’s real version', async () => {
    const {getByText} = await renderWithProviders(AboutScreen, {
      routeName: 'About',
    });

    expect(getByText(APP_VERSION_LABEL, HIDDEN)).toBeTruthy();
    expect(getByText('Version 1.1.0 (2)', HIDDEN)).toBeTruthy();
  });

  it('names the stack the app actually ships', async () => {
    const {getByText, queryByText} = await renderWithProviders(AboutScreen, {
      routeName: 'About',
    });

    for (const chip of [
      'React Native',
      'TypeScript',
      'MPV',
      'Zustand',
      'MMKV',
      'React Navigation',
    ]) {
      expect(getByText(chip, HIDDEN)).toBeTruthy();
    }
    expect(queryByText(/Redux/i, HIDDEN)).toBeNull();
  });

  it('has no second reset — the Profile owns it', async () => {
    const {queryByText} = await renderWithProviders(AboutScreen, {
      routeName: 'About',
    });

    expect(queryByText(/reset/i, HIDDEN)).toBeNull();
  });
});
