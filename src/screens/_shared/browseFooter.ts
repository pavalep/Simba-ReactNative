// ─── The browse lists' in-flow footer ─────────────────────────────────
//
// The three browse lists (Music, Movies, Podcasts) put their footer INSIDE
// the list — the FlatList's `ListFooterComponent` — so the footer's own row
// is the last thing on screen when the list ends.
//
// THE HOLE THIS FILE CLOSES
// -------------------------
// The list reserves the FAB's clearance at the bottom:
//
//     paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md
//
// The footer sits ABOVE that padding, so the loader row was left with a
// 68 dp hole under it: the "Loading more…" line floated in the middle of
// the screen with a screenful of nothing below it. None of the shipping
// apps do that — YouTube, Plex and the TV apps all put the paging spinner
// on the BOTTOM line of the list, where the thumb is.
//
// THE FOOTER GIVES THE CLEARANCE BACK
// ----------------------------------
// The footer pulls ITSELF down into the clearance the list reserved, by
// exactly the amount the list added for the button:
//
//     marginBottom: -(FAB_SIZE + spacing.md)
//
// The list's padding is NOT changed, so the CARDS still clear the button
// (the app's bottom-chrome rule). What moves is the footer row, and the
// geometry that falls out of it is the shipping apps' layout:
//
//   • the footer row's centre lands on the FAB's own centre — the loader
//     is centred, the button is at the right, so they share the line and
//     do not collide;
//   • the last card's bottom lands on the FAB's top, so the row still
//     clears the button;
//   • below the footer there is only the safe area.
//
// The number is DERIVED from the app's own rules (the button's size and
// the list's spacing step), not measured off a screenshot.

import {FAB_SIZE} from '../../components/core/Fab/Fab';
import {spacing} from '../../theme/tokens';

/**
 * The bottom margin the in-flow footer carries.
 *
 * Negative: the footer pulls itself down into the clearance the list
 * reserved for the FAB. The list's padding is unchanged, so the cards
 * still clear the button — only the footer's row moves.
 *
 * `-68`: the button's 56 dp plus the list's 12 dp spacing step.
 */
export const BROWSE_FOOTER_MARGIN_BOTTOM = -(FAB_SIZE + spacing.md);
