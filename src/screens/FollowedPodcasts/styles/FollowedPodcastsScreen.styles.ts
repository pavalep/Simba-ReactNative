// ─── "My Podcasts" — screen styles ─────────────────────────────────────
// The house pattern: one factory per screen, the colours resolved once
// from the token layer, and the screen itself free of inline colours.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

/** The circular cover on a row. */
export const ARTWORK_SIZE = 56;

/** The app's minimum touch target. */
const TOUCH_TARGET = 44;

export const createFollowedPodcastsScreenStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    list: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
    },
    artwork: {
      width: ARTWORK_SIZE,
      height: ARTWORK_SIZE,
      borderRadius: ARTWORK_SIZE / 2,
      overflow: 'hidden',
    },
    artworkImage: {
      width: '100%',
      height: '100%',
    },
    artworkFallback: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent.goldDim,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      // The weight lives in the FAMILY key, never in a `fontWeight` prop
      // (see `constants/fontFamily.ts`).
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    author: {
      marginTop: 2,
    },
    unfollow: {
      // The row's action is the page's whole reason to exist, so it
      // carries the app's 44 dp touch target — the label alone was
      // about 24 dp tall, which is under the platform minimum.
      minHeight: TOUCH_TARGET,
      minWidth: TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
  });
